begin;
set local role postgres;
select set_config('request.jwt.claims', '', true);
do $$
declare
  saved jsonb;
begin
  saved := public.save_brand('{"name":"Test brand", "slug":"test-brand", "active":true, "logo":"https://example.com/logo.png", "product_ids":[1002,1001]}');
  if saved ->> 'id' is distinct from 'test-brand' then raise exception 'Brand creation failed'; end if;
  if (select count(*) from public.products where id in (1001,1002) and brand = 'test-brand') <> 2 then raise exception 'Assignments missing'; end if;
  if saved -> 'product_ids' is distinct from '[1002,1001]'::jsonb then raise exception 'Product order lost'; end if;
  saved := public.save_brand('{"name":"Renamed brand", "slug":"renamed-brand", "active":false, "product_ids":[1001,1002]}', 'test-brand');
  if saved ->> 'id' is distinct from 'test-brand' or saved ->> 'slug' is distinct from 'renamed-brand' then raise exception 'Rename broke identity'; end if;
  begin
    perform public.save_brand('{"name":"Broken brand", "slug":"broken-brand", "product_ids":[99999999]}');
    raise exception 'Invalid product accepted' using errcode = 'XX000';
  exception when sqlstate 'P0001' then null;
  end;
  if exists(select 1 from public.brands where id = 'broken-brand') then raise exception 'Partial brand write'; end if;
  raise notice 'PASS: atomic brand save, assignments, order, stable ID, invalid products';
end $$;
set local role anon;
do $$ begin
  begin
    perform public.save_brand('{"name":"Forbidden", "slug":"forbidden"}');
    raise exception 'Anonymous write allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
