begin;
set local role postgres;
select set_config('request.jwt.claims', '', true);

do $$
declare
  result jsonb;
  v_order_id bigint;
begin
  update public.products set active = true, options = '{"Size":"S, M, L", "Model":"R32; R410A"}' where id = 1001;
  result := public.place_order(
    '[{"id":1001,"qty":2,"options":{"Size":"M","Model":"R32"}},
      {"id":1001,"qty":1,"options":{"Size":"L","Model":"R410A"}}]',
    '{"name":"Option test","phone":"0955112233"}',
    '{"method":"pickup","store":"Q7"}', 'cod'
  );
  if jsonb_array_length(result -> 'items') is distinct from 2 then raise exception 'Variant lines were merged'; end if;
  if result #>> '{items,0,options,Size}' is distinct from 'M' or result #>> '{items,1,options,Model}' is distinct from 'R410A' then
    raise exception 'Selections missing from order response';
  end if;
  select id into v_order_id from public.orders where code = result ->> 'code';
  if (select count(*) from public.order_items where order_id = v_order_id and options <> '{}'::jsonb) <> 2 then
    raise exception 'Selections not persisted';
  end if;
  begin
    perform public.place_order('[{"id":1001,"qty":1}]',
      '{"name":"Missing","phone":"0955112234"}', '{"method":"pickup","store":"Q7"}', 'cod');
    raise exception 'Missing selections accepted' using errcode = 'XX000';
  exception when sqlstate 'P0001' then null;
  end;
  begin
    perform public.place_order('[{"id":1001,"qty":1,"options":{"Size":"XXL","Model":"R32"}}]',
      '{"name":"Invalid","phone":"0955112235"}', '{"method":"pickup","store":"Q7"}', 'cod');
    raise exception 'Invalid selections accepted' using errcode = 'XX000';
  exception when sqlstate 'P0001' then null;
  end;
  if public.validate_product_options('{"Size":["S","M"],"Blank":" , "}', '{"Size":"M","Extra":"ignored"}') <> '{"Size":"M"}'::jsonb then
    raise exception 'Array values or canonical selections failed';
  end if;
  raise notice 'PASS: selected options persist, variant lines remain separate, invalid choices rejected';
end $$;

rollback;
