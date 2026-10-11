-- Kiểm thử các lỗi tìm thấy khi rà soát (migration 20261018000001_audit_fixes.sql). Chạy sau ops.sql.
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);

-- 30. Tồn kho: đặt vượt kho (đặt trước) rồi hủy không làm kho tăng ảo
update public.products set stock = 12 where id = 1001;
select set_config('role', 'anon', false);
do $$
declare r jsonb; s0 int;
begin
  r := public.place_order('[{"id":1001,"qty":99}]', '{"name":"Đặt Vượt Kho","phone":"0966000001"}', '{"method":"pickup","store":"Q7"}', 'cod');
  perform set_config('dt.over', r ->> 'code', false);
  perform public.cancel_order(r ->> 'code', '0966000001');
end $$;
select set_config('role', 'postgres', false);
do $$
declare r jsonb;
begin
  assert (select stock from public.products where id = 1001) = 12, format('hủy đơn hoàn đúng 12, kho = %s', (select stock from public.products where id = 1001));
  -- Khôi phục đơn đã hủy: trừ lại theo số đang có
  update public.orders set status = 'pending' where code = current_setting('dt.over');
  assert (select stock from public.products where id = 1001) = 0, 'khôi phục đơn trừ lại kho';
  assert (select stock_taken from public.order_items i join public.orders o on o.id = i.order_id where o.code = current_setting('dt.over')) = 12, 'ghi số đã trừ';
  update public.orders set status = 'cancelled' where code = current_setting('dt.over');
  assert (select stock from public.products where id = 1001) = 12, 'hủy lần 2 vẫn đúng 12';
  raise notice 'OK 30 - đặt vượt kho rồi hủy không làm tăng kho ảo';
end $$;

-- 31. Mã giảm giá giới hạn 1 lượt: đơn thứ 2 bị từ chối
insert into public.coupons (code, type, value, min, description, is_public, usage_limit) values ('MOTLAN', 'fixed', 100000, 0, 'Một lần', false, 1);
select set_config('role', 'anon', false);
do $$
begin
  perform public.place_order('[{"id":1002,"qty":1}]', '{"name":"Mã Một","phone":"0966000002"}', '{"method":"pickup","store":"Q7"}', 'cod', null, null, 'MOTLAN');
  begin
    perform public.place_order('[{"id":1002,"qty":1}]', '{"name":"Mã Hai","phone":"0966000003"}', '{"method":"pickup","store":"Q7"}', 'cod', null, null, 'motlan');
    raise exception 'lượt thứ 2 phải bị từ chối';
  exception when others then assert sqlerrm like '%hết lượt%', sqlerrm; end;
  raise notice 'OK 31 - mã giảm giá không vượt giới hạn lượt dùng';
end $$;
select set_config('role', 'postgres', false);

-- 32. Chuyển khoản 1 phần rồi trả online: chỉ thu phần còn thiếu; tiền vào đơn đã đủ -> báo hoàn tiền
do $$
declare r jsonb; s jsonb; v_total bigint;
begin
  r := public.place_order('[{"id":1003,"qty":1}]', '{"name":"Trả Hai Lần","phone":"0966000004"}', '{"method":"pickup","store":"Q7"}', 'bank');
  v_total := (r ->> 'total')::bigint;
  perform public.payment_bank_transfer('AUD1', 'CK ' || (r ->> 'code'), 5000000);
  assert (select payment_status from public.orders where code = r ->> 'code') = 'partial', 'chuyển 1 phần';
  s := public.payment_start(r ->> 'code', '0966000004', 'vnpay');
  assert (s ->> 'amount')::bigint = v_total - 5000000, format('chỉ thu %s còn thiếu, link %s', v_total - 5000000, s ->> 'amount');
  assert public.payment_confirm(s ->> 'txnRef', v_total - 5000000, true) = 'ok', 'IPN';
  assert (select payment_status from public.orders where code = r ->> 'code') = 'paid', 'đủ tiền -> đã thanh toán';
  assert (public.payment_bank_transfer('AUD2', 'CK lai ' || (r ->> 'code'), 200000) ->> 'result') = 'extra', 'chuyển thêm vào đơn đã đủ';
  assert exists (select 1 from public.notifications n join public.orders o on o.id = n.order_id
                 where o.code = r ->> 'code' and n.data ->> 'paymentStatus' = 'duplicate' and (n.data ->> 'amount')::bigint = 200000), 'báo nhân viên hoàn tiền';
  raise notice 'OK 32 - thanh toán phần còn thiếu, báo tiền thừa';
end $$;

-- 33. Dữ liệu riêng tư: khách không đọc SĐT người đánh giá, ghi chú nội bộ của đơn
insert into public.reviews (product_id, name, phone, rating, text, status) values (1001, 'Người Ẩn Số', '0966000099', 5, 'Tốt', 'approved');
update public.orders set staff_note = 'Ghi chú nội bộ bí mật' where phone = '0911000002' or user_id is not null;
select set_config('role', 'anon', false);
do $$ begin
  assert exists (select 1 from public.reviews where name = 'Người Ẩn Số'), 'anon vẫn đọc đánh giá';
  begin perform phone from public.reviews limit 1; raise exception 'anon KHÔNG được đọc SĐT người đánh giá';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 33a - ẩn SĐT người đánh giá';
end $$;
select set_config('role', 'authenticated', false);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.orders) = 0, 'khách không đọc trực tiếp bảng đơn';
  assert jsonb_array_length(public.my_orders()) >= 1 and not (public.my_orders() -> 0 ? 'staffNote'), 'my_orders không có ghi chú nội bộ';
  begin perform phone from public.reviews limit 1; raise exception 'khách đăng nhập KHÔNG được đọc SĐT';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 33 - khách không đọc ghi chú nội bộ, SĐT người đánh giá';
end $$;

-- 34. Kế toán thấy sản phẩm đã ẩn (báo cáo); lời nhắc nhân viên đã bỏ không bật lại khi lưu đơn
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);
update public.products set active = false where id = 1071;
do $$
declare r jsonb; v_id bigint; o_id bigint;
begin
  r := public.place_order('[{"id":1020,"qty":1}]', '{"name":"Nhắc Bỏ","phone":"0966000005"}', '{"method":"pickup","store":"Q7"}', 'cod');
  select id into o_id from public.orders where code = r ->> 'code';
  update public.orders set maintenance_optin = true, status = 'done' where id = o_id;
  select id into v_id from public.notifications where event = 'maintenance_reminder' and order_id = o_id order by next_at limit 1;
  update public.notifications set status = 'done', results = '{"cancelled":{"ok":true,"reason":"staff"}}' where id = v_id;
  update public.orders set status = 'done', maintenance_optin = true, staff_note = 'Lưu lại', payment_status = 'paid' where id = o_id;
  assert (select status from public.notifications where id = v_id) = 'done', 'lần nhắc nhân viên bỏ vẫn giữ nguyên khi lưu đơn';
  update public.orders set maintenance_optin = false where id = o_id;
  update public.orders set maintenance_optin = true where id = o_id;
  assert (select status from public.notifications where id = v_id) = 'done', 'bật lại đồng ý cũng không bật lần nhân viên bỏ';
  assert (select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = o_id and status = 'pending') = 3, 'các lần khác bật lại';
end $$;
select set_config('role', 'authenticated', false);
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', false);
do $$ begin
  assert exists (select 1 from public.products where id = 1071), 'kế toán thấy sản phẩm đã ẩn';
  raise notice 'OK 34 - kế toán thấy sản phẩm ẩn; lời nhắc đã bỏ giữ nguyên';
end $$;
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);
update public.products set active = true where id = 1071;
