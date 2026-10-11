-- Kiểm thử nhanh nghiệp vụ & phân quyền trên PostgreSQL cục bộ.
-- Chạy: auth_stub.sql -> migrations/*.sql -> seed.sql -> file này (psql -v ON_ERROR_STOP=1)
-- Mỗi khối DO ném lỗi nếu sai; in "OK ..." nếu đúng.

-- Helper: chạy câu lệnh với vai trò & JWT giả lập
create or replace function pg_temp.as_user(p_role text, p_sub uuid) returns void language plpgsql as $$
begin
  perform set_config('role', p_role, false);
  perform set_config('request.jwt.claims', coalesce(json_build_object('sub', p_sub, 'role', p_role)::text, ''), false);
end $$;
create or replace function pg_temp.reset_user() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claims', '', false);
end $$;

-- 1. Khách vãng lai đọc được catalog, không đọc được dữ liệu nội bộ
select pg_temp.as_user('anon', null);
do $$ begin
  assert (select count(*) from public.products) = 56, 'anon phải đọc được 56 sản phẩm';
  assert (select count(*) from public.coupons) = 3, 'anon đọc được mã công khai';
  begin perform * from public.leads; raise exception 'anon KHÔNG được đọc leads';
  exception when insufficient_privilege then null; end;
  begin perform * from public.orders; raise exception 'anon KHÔNG được đọc orders';
  exception when insufficient_privilege then null; end;
  begin perform public.order_json(o) from (select null::public.orders o) x; raise exception 'anon KHÔNG được gọi order_json';
  exception when insufficient_privilege then null; end;
  begin update public.products set price = 1; raise exception 'anon KHÔNG được sửa giá';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 1 - phân quyền đọc của khách vãng lai';
end $$;

-- 2. Đặt hàng: giá lấy từ DB (bỏ qua giá client gửi lên), mã giảm giá, phí lắp đặt
do $$
declare r jsonb; p public.products; stock_before int;
begin
  select * into p from public.products where id = 1001;  -- máy lạnh, có miễn phí lắp đặt hay không tùy dữ liệu
  stock_before := p.stock;
  r := public.place_order(
    jsonb_build_array(jsonb_build_object('id', 1001, 'qty', 2, 'install', true, 'price', 1)),  -- price giả mạo bị bỏ qua
    '{"name":"Nguyễn Test","phone":"0901 234 567","gender":"Anh"}',
    '{"method":"delivery","province":"TP. Hồ Chí Minh","district":"Q7","address":"12 NTT"}',
    'cod', null, 'gọi trước', 'cool10');
  assert (r ->> 'subtotal')::bigint = p.price * 2, 'subtotal phải tính theo giá DB';
  assert (r ->> 'install')::bigint = case when p.free_install then 0 else 600000 end, 'phí lắp đặt sai';
  assert (r ->> 'discount')::bigint = least(p.price * 2 / 10, 1000000), 'giảm 10% tối đa 1tr';
  assert (r ->> 'total')::bigint = (r->>'subtotal')::bigint + (r->>'install')::bigint + (r->>'shippingFee')::bigint - (r->>'discount')::bigint, 'tổng sai';
  assert r -> 'customer' ->> 'phone' = '0901234567', 'SĐT phải được chuẩn hóa';
  assert jsonb_array_length(r -> 'history') = 1, 'phải có lịch sử trạng thái';
  perform set_config('test.code', r ->> 'code', false);
  raise notice 'OK 2 - đặt hàng % tổng %', r ->> 'code', r ->> 'total';
end $$;

-- 3. Tra cứu đơn: đúng SĐT mới xem được; hủy đơn hoàn tồn kho
do $$
declare c text := current_setting('test.code');
begin
  assert public.track_order(c, '0909999999') is null, 'sai SĐT không được xem đơn';
  assert public.track_order(lower(c), '0901.234.567') ->> 'status' = 'pending', 'tra cứu đúng phải thấy đơn';
  assert public.cancel_order(c, '0901234567') ->> 'status' = 'cancelled', 'hủy đơn';
  begin perform public.cancel_order(c, '0901234567'); raise exception 'không được hủy 2 lần';
  exception when raise_exception then null; end;
  raise notice 'OK 3 - tra cứu & hủy đơn';
end $$;

-- 4. Dữ liệu sai bị từ chối
do $$ begin
  begin perform public.place_order('[{"id":1001,"qty":1}]', '{"name":"A","phone":"123"}', '{"method":"pickup"}', 'cod');
    raise exception 'SĐT sai phải bị chặn'; exception when raise_exception then
    if sqlerrm not like '%điện thoại%' then raise; end if; end;
  begin perform public.place_order('[{"id":1001,"qty":0}]', '{"name":"A","phone":"0901234567"}', '{"method":"pickup"}', 'cod');
    raise exception 'qty 0 phải bị chặn'; exception when raise_exception then
    if sqlerrm not like '%Số lượng%' then raise; end if; end;
  begin perform public.place_order('[{"id":1001,"qty":1}]', '{"name":"A","phone":"0901234567"}', '{"method":"pickup"}', 'cod', null, null, 'KHONGCO');
    raise exception 'mã sai phải bị chặn'; exception when raise_exception then
    if sqlerrm not like '%không tồn tại%' then raise; end if; end;
  assert (public.validate_coupon('GIAM300K', 1000000) ->> 'ok')::boolean = false, 'GIAM300K cần đơn từ 3tr';
  assert (public.validate_coupon('GIAM300K', 5000000) ->> 'discount')::bigint = 300000, 'GIAM300K giảm 300k';
  raise notice 'OK 4 - kiểm tra dữ liệu đầu vào';
end $$;

-- 5. Lead & đánh giá từ khách vãng lai
do $$
declare r jsonb;
begin
  r := public.submit_lead('b2b-quote', '{"company":"Cty ABC","name":"Anh B","phone":"0912345678","email":"b@abc.vn","items":"10 bộ âm trần"}', 'https://x/bao-gia');
  assert r ->> 'code' like 'L%', 'lead phải có mã';
  insert into public.reviews (product_id, name, rating, text) values (1001, 'Khách A', 5, 'Tốt');
  assert not exists (select 1 from public.reviews where name = 'Khách A'), 'đánh giá chờ duyệt không hiện công khai';
  begin insert into public.reviews (product_id, name, rating, text, status) values (1001, 'Spam', 5, 'x', 'approved');
    raise exception 'không được tự duyệt đánh giá'; exception when insufficient_privilege then null; end;
  raise notice 'OK 5 - lead % và đánh giá', r ->> 'code';
end $$;

-- 6. Khách đăng nhập: profile tự tạo, không tự nâng quyền, chỉ thấy đơn của mình
select pg_temp.reset_user();
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', '0901111111@khach.local', '{"name":"Khách Một","phone":"0901111111"}'),
  ('22222222-2222-2222-2222-222222222222', '0902222222@khach.local', '{"name":"Khách Hai","phone":"0902222222"}'),
  ('33333333-3333-3333-3333-333333333333', 'staff@dt.vn', '{"name":"Nhân viên","phone":"0903333333"}');
update public.profiles set role = 'staff' where id = '33333333-3333-3333-3333-333333333333';

select pg_temp.as_user('authenticated', '11111111-1111-1111-1111-111111111111');
do $$
declare r jsonb;
begin
  assert (select name from public.profiles) = 'Khách Một', 'chỉ thấy profile của mình';
  begin update public.profiles set role = 'admin'; raise exception 'không được tự nâng quyền';
  exception when insufficient_privilege then null; end;
  update public.profiles set addresses = '[{"address":"1 A","default":true}]';
  r := public.place_order('[{"id":1014,"qty":1}]', '{"name":"Khách Một","phone":"0901111111"}', '{"method":"pickup","store":"Q7"}', 'bank');
  assert (r ->> 'shippingFee')::bigint = 0, 'nhận tại cửa hàng miễn phí ship';
  assert jsonb_array_length(public.my_orders()) = 1, 'khách 1 thấy 1 đơn';
  assert (select count(*) from public.orders) = 0, 'khách không đọc trực tiếp bảng đơn (ghi chú nội bộ), xem qua my_orders()';
  assert (select count(*) from public.leads) = 0, 'khách không đọc được leads';
  raise notice 'OK 6 - tài khoản khách hàng';
end $$;

select pg_temp.as_user('authenticated', '22222222-2222-2222-2222-222222222222');
do $$ begin
  assert jsonb_array_length(public.my_orders()) = 0, 'khách 2 không thấy đơn của khách 1';
  assert (select count(*) from public.orders) = 0, 'RLS chặn đơn người khác';
  raise notice 'OK 7 - cô lập dữ liệu giữa các khách';
end $$;

-- 8. Nhân viên: đọc lead, đơn; duyệt đánh giá; đổi trạng thái đơn ghi lịch sử
select pg_temp.as_user('authenticated', '33333333-3333-3333-3333-333333333333');
do $$
declare oid bigint;
begin
  assert (select count(*) from public.leads) = 1, 'staff đọc được leads';
  assert (select count(*) from public.orders) = 2, 'staff đọc được mọi đơn';
  update public.reviews set status = 'approved' where name = 'Khách A';
  select id into oid from public.orders where status = 'pending' limit 1;
  update public.orders set status = 'confirmed' where id = oid;
  assert (select count(*) from public.order_status_history where order_id = oid) = 2, 'đổi trạng thái phải ghi lịch sử';
  begin update public.settings set value = '{}' where key = 'store';
    assert not found, 'staff không được sửa cấu hình (chỉ admin)';
  end;
  raise notice 'OK 8 - quyền nhân viên';
end $$;

select pg_temp.as_user('anon', null);
do $$ begin
  assert exists (select 1 from public.reviews where name = 'Khách A'), 'đánh giá đã duyệt hiện công khai';
  raise notice 'OK 9 - đánh giá đã duyệt hiển thị';
end $$;
select pg_temp.reset_user();

-- 10. Hoàn kho khi hủy: khách hủy và nhân viên hủy đều hoàn đúng 1 lần
select pg_temp.reset_user();
do $$
declare r jsonb; s0 int; s1 int;
begin
  select stock into s0 from public.products where id = 1020;
  r := public.place_order('[{"id":1020,"qty":2}]', '{"name":"Test Kho","phone":"0904444444"}', '{"method":"pickup"}', 'cod');
  select stock into s1 from public.products where id = 1020;
  assert s1 = greatest(s0 - 2, 0), 'đặt hàng phải trừ kho';
  perform public.cancel_order(r ->> 'code', '0904444444');
  assert (select stock from public.products where id = 1020) = s1 + 2, 'khách hủy hoàn kho đúng 1 lần';
  r := public.place_order('[{"id":1020,"qty":1}]', '{"name":"Test Kho","phone":"0904444445"}', '{"method":"pickup"}', 'cod');
  select stock into s1 from public.products where id = 1020;
  update public.orders set status = 'shipping' where code = r ->> 'code';
  update public.orders set status = 'cancelled' where code = r ->> 'code';
  assert (select stock from public.products where id = 1020) = s1 + 1, 'nhân viên hủy (kể cả đang giao) cũng hoàn kho';
  raise notice 'OK 10 - hoàn tồn kho khi hủy đơn';
end $$;
