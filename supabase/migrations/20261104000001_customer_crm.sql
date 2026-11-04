begin;

create table public.crm_customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique
    references public.profiles(id) on delete restrict,

  name text not null
    check (length(trim(name)) between 1 and 150),

  phone text,
  email text not null default '',

  addresses jsonb not null default '[]'::jsonb
    check (jsonb_typeof(addresses) = 'array'),

  note text not null default '',
  tags text[] not null default '{}',
  marketing_opt_in boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index crm_guest_phone_unique
  on public.crm_customers(phone)
  where profile_id is null and phone is not null;

-- Chuẩn hóa +84/84 về 0 để nhóm đơn khách vãng lai.
create function public.crm_normalize()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := trim(new.name);

  new.phone := nullif(
    regexp_replace(
      regexp_replace(
        coalesce(new.phone, ''),
        '[^0-9+]',
        '',
        'g'
      ),
      '^\+?84',
      '0'
    ),
    ''
  );

  new.updated_at := now();
  return new;
end
$$;

create trigger crm_normalize
before insert or update on public.crm_customers
for each row execute function public.crm_normalize();

-- Chỉ admin/staff được sử dụng CRM.
alter table public.crm_customers enable row level security;

grant select, insert on public.crm_customers to authenticated;

grant update(
  name, phone, email, addresses,
  note, tags, marketing_opt_in
) on public.crm_customers to authenticated;

create policy crm_read
on public.crm_customers
for select to authenticated
using (public.is_staff());

create policy crm_insert
on public.crm_customers
for insert to authenticated
with check (
  public.is_staff()
  and profile_id is null
);

create policy crm_update
on public.crm_customers
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

-- Tìm hoặc tạo hồ sơ CRM cho một đơn hàng.
create function public.crm_resolve(
  p_user uuid,
  p_phone text,
  p_customer jsonb,
  p_invoice jsonb,
  p_shipping jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;

  v_phone text := nullif(
    regexp_replace(
      regexp_replace(
        coalesce(p_phone, ''),
        '[^0-9+]',
        '',
        'g'
      ),
      '^\+?84',
      '0'
    ),
    ''
  );

  v_name text := left(
    coalesce(
      nullif(trim(p_invoice->>'company'), ''),
      nullif(trim(p_customer->>'name'), ''),
      'Khách hàng'
    ),
    150
  );

  v_addresses jsonb := '[]'::jsonb;
begin
  if p_shipping->>'method' = 'delivery' then
    v_addresses := jsonb_build_array(
      jsonb_build_object(
        'name', p_customer->>'name',
        'phone', v_phone,
        'address', p_shipping->>'address',
        'district', p_shipping->>'district',
        'province', p_shipping->>'province',
        'default', true
      )
    );
  end if;

  if p_user is not null then
    insert into public.crm_customers(
      profile_id, name, phone, email, addresses
    )
    values (
      p_user,
      v_name,
      v_phone,
      coalesce(p_customer->>'email', ''),
      v_addresses
    )
    on conflict(profile_id)
    do update set profile_id = excluded.profile_id
    returning id into v_id;
  else
    insert into public.crm_customers(
      name, phone, email, addresses
    )
    values (
      v_name,
      v_phone,
      coalesce(p_customer->>'email', ''),
      v_addresses
    )
    on conflict(phone)
      where profile_id is null and phone is not null
    do update set phone = excluded.phone
    returning id into v_id;
  end if;

  return v_id;
end
$$;

revoke all on function
  public.crm_resolve(uuid, text, jsonb, jsonb, jsonb)
from public, anon, authenticated;

-- Tạo hồ sơ từ tài khoản khách hàng hiện có.
insert into public.crm_customers(
  profile_id, name, phone, email, addresses, created_at
)
select
  id,
  left(coalesce(nullif(trim(name), ''), 'Khách hàng'), 150),
  phone,
  coalesce(email, ''),
  coalesce(addresses, '[]'::jsonb),
  created_at
from public.profiles
where role = 'customer';

-- Liên kết đơn hàng với hồ sơ CRM.
alter table public.orders
add column customer_id uuid
references public.crm_customers(id);

create index orders_customer_created_idx
on public.orders(customer_id, created_at desc, id desc);

update public.orders o
set customer_id = public.crm_resolve(
  o.user_id,
  o.phone,
  o.customer,
  o.invoice,
  o.shipping
);

create function public.crm_attach_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.customer_id := public.crm_resolve(
    new.user_id,
    new.phone,
    new.customer,
    new.invoice,
    new.shipping
  );

  return new;
end
$$;

revoke all on function public.crm_attach_order()
from public, anon, authenticated;

create trigger orders_crm
before insert on public.orders
for each row execute function public.crm_attach_order();

-- Tài khoản khách hàng mới cũng xuất hiện trong CRM.
create function public.crm_attach_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'customer' then
    perform public.crm_resolve(
      new.id,
      new.phone,
      jsonb_build_object(
        'name', new.name,
        'email', new.email
      ),
      null,
      null
    );
  end if;

  return new;
end
$$;

revoke all on function public.crm_attach_profile()
from public, anon, authenticated;

create trigger profiles_crm
after insert on public.profiles
for each row execute function public.crm_attach_profile();

revoke all on function public.crm_normalize()
from public, anon, authenticated;

-- Thống kê được tính trên database, không tải toàn bộ đơn về browser.
create view public.crm_customer_summary
with (security_invoker = true)
as
select
  c.*,
  coalesce(s.order_count, 0) as order_count,
  coalesce(s.paid_count, 0) as paid_count,
  coalesce(s.total_spent, 0) as total_spent,

  coalesce(
    s.total_spent / nullif(s.paid_count, 0),
    0
  ) as average_spent,

  last_o.id as last_order_id,
  last_o.code as last_order_code,
  ('VIP' = any(c.tags)) as is_vip

from public.crm_customers c

left join lateral (
  select
    count(*) filter(
      where status <> 'cancelled'
    ) as order_count,

    count(*) filter(
      where status <> 'cancelled'
        and payment_status = 'paid'
    ) as paid_count,

    sum(total) filter(
      where status <> 'cancelled'
        and payment_status = 'paid'
    ) as total_spent

  from public.orders
  where customer_id = c.id
) s on true

left join lateral (
  select id, code
  from public.orders
  where customer_id = c.id
    and status <> 'cancelled'
  order by created_at desc, id desc
  limit 1
) last_o on true;

-- Sản phẩm đã mua: chỉ tính đơn hoàn thành, thanh toán đủ.
create view public.crm_customer_products
with (security_invoker = true)
as
select
  o.customer_id,
  i.product_id,
  i.sku,
  i.name,
  sum(i.qty) as quantity,
  max(o.created_at) as last_bought_at

from public.orders o
join public.order_items i on i.order_id = o.id

where o.status = 'done'
  and o.payment_status = 'paid'

group by
  o.customer_id,
  i.product_id,
  i.sku,
  i.name;

grant select on
  public.crm_customer_summary,
  public.crm_customer_products
to authenticated;

commit;