begin;

insert into public.crm_customers(profile_id, name, phone, email, addresses, created_at)
select id, left(coalesce(nullif(trim(name), ''), 'Khách hàng'), 150),
       phone, coalesce(email, ''), coalesce(addresses, '[]'::jsonb), created_at
from public.profiles
on conflict (profile_id) do nothing;

create or replace function public.crm_attach_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_customers(
    profile_id, name, phone, email, addresses, created_at
  ) values (
    new.id,
    left(coalesce(nullif(trim(new.name), ''), 'Khách hàng'), 150),
    new.phone,
    coalesce(new.email, ''),
    coalesce(new.addresses, '[]'::jsonb),
    new.created_at
  ) on conflict (profile_id) do nothing;

  return new;
end
$$;


create or replace view public.crm_customer_summary
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
  ('VIP' = any(c.tags)) as is_vip,
  coalesce(p.role, 'customer') as role

from public.crm_customers c
left join public.profiles p on p.id = c.profile_id

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

commit;
