-- Kiểm thử đồng bộ quản trị ↔ website trên database
-- Chạy sau các file test khác (run-local.sh)

-- 1. Mã giảm giá công khai: khách chỉ thấy mã đã tới ngày bắt đầu và chưa hết hạn
insert into public.coupons (code, type, value, min, description, is_public, active, starts_at)
values ('SYNCFUTURE', 'percent', 5, 0, 'Chưa tới ngày', true, true, now() + interval '7 days'),
       ('SYNCNOW', 'percent', 5, 0, 'Đang chạy', true, true, now() - interval '1 day');
select set_config('role', 'anon', false);
do $$ begin
  assert not exists (select 1 from public.coupons where code = 'SYNCFUTURE'), 'khách không được thấy mã chưa tới ngày bắt đầu';
  assert exists (select 1 from public.coupons where code = 'SYNCNOW'), 'khách thấy mã đang chạy';
  raise notice 'OK sync 1 - mã giảm giá theo ngày bắt đầu';
end $$;
select set_config('role', 'postgres', false);

-- 2. Thương hiệu: logo sửa trong quản trị đọc được công khai; thương hiệu ẩn không hiện
update public.brands set logo = 'https://example.com/logo.png' where id = 'thuong-hieu';
insert into public.brands (id, name, active) values ('hang-an', 'Hãng ẩn', false);
select set_config('role', 'anon', false);
do $$ begin
  assert (select logo from public.brands where id = 'thuong-hieu') = 'https://example.com/logo.png', 'khách đọc được logo thương hiệu';
  assert not exists (select 1 from public.brands where id = 'hang-an'), 'thương hiệu ẩn không hiện cho khách';
  raise notice 'OK sync 2 - logo & ẩn thương hiệu';
end $$;
select set_config('role', 'postgres', false);
delete from public.brands where id = 'hang-an';
delete from public.coupons where code in ('SYNCFUTURE', 'SYNCNOW');
