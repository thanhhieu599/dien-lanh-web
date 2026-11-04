begin;

alter table public.products
  add column description text not null default '',
  add column product_tags text[] not null default '{}',
  add column options jsonb not null default '{}'::jsonb
    check (jsonb_typeof(options) = 'object'),
  add column requires_shipping boolean not null default true,
  add column weight numeric not null default 0 check (weight >= 0),
  add column weight_unit text not null default 'g' check (weight_unit in ('g', 'kg'));

commit;
