begin;

alter table public.brands add column slug text;
update public.brands set slug = id;
alter table public.brands alter column slug set not null;
alter table public.brands add constraint brands_slug_key unique (slug);
alter table public.brands add constraint brands_slug_format check (slug ~ '^[a-z0-9-]+$');
alter table public.brands add column product_ids bigint[] not null default '{}';

-- Preserve inserts from older clients that still use the brand ID as the slug.
create function public.brand_slug_default() returns trigger
language plpgsql set search_path = public as $$
begin
  new.slug := coalesce(nullif(new.slug, ''), new.id);
  return new;
end $$;
create trigger brand_slug_default before insert on public.brands
for each row execute function public.brand_slug_default();
revoke all on function public.brand_slug_default() from public, anon, authenticated;

-- Save the brand and product assignments together in one transaction.
create function public.save_brand(p_brand jsonb, p_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slug text := p_brand ->> 'slug';
  v_name text := trim(p_brand ->> 'name');
  v_id text := coalesce(p_id, v_slug);
  v_ids bigint[];
  v_brand public.brands;
begin
  if not public.is_staff() then raise exception 'Không có quyền sửa thương hiệu' using errcode = '42501'; end if;
  if coalesce(v_name, '') = '' or coalesce(v_slug, '') !~ '^[a-z0-9-]+$' then
    raise exception 'Tên hoặc đường dẫn thương hiệu không hợp lệ' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.brands where id <> coalesce(p_id, '') and id = v_slug) then
    raise exception 'Đường dẫn thương hiệu đã tồn tại' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(distinct value::bigint), '{}'::bigint[]) into v_ids
  from jsonb_array_elements_text(coalesce(p_brand -> 'product_ids', '[]'::jsonb));
  if exists (select 1 from unnest(v_ids) pid where not exists (select 1 from public.products where id = pid)) then
    raise exception 'Sản phẩm không còn tồn tại, vui lòng tải lại' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.brands(id, name, slug, active, logo, product_ids)
    values(v_id, v_name, v_slug, coalesce((p_brand ->> 'active')::boolean, true), p_brand ->> 'logo',
      array(select value::bigint from jsonb_array_elements_text(coalesce(p_brand -> 'product_ids', '[]'::jsonb))))
    returning * into v_brand;
  else
    update public.brands set name = v_name, slug = v_slug,
      active = coalesce((p_brand ->> 'active')::boolean, true), logo = p_brand ->> 'logo',
      product_ids = array(select value::bigint from jsonb_array_elements_text(coalesce(p_brand -> 'product_ids', '[]'::jsonb)))
    where id = p_id returning * into v_brand;
    if not found then raise exception 'Không tìm thấy thương hiệu' using errcode = 'P0001'; end if;
  end if;
  update public.products set brand = v_id where id = any(v_ids) and brand is distinct from v_id;
  return to_jsonb(v_brand);
end $$;
revoke all on function public.save_brand(jsonb, text) from public, anon;
grant execute on function public.save_brand(jsonb, text) to authenticated;

commit;
