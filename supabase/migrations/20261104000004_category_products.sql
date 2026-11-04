begin;

alter table public.categories
  add column image text,
  add column product_ids bigint[] not null default '{}',
  add column excluded_product_ids bigint[] not null default '{}';

commit;
