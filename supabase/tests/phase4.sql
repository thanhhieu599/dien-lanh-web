-- Kiểm thử giai đoạn 4: thanh toán online, chuyển khoản, hàng đợi thông báo.
-- Chạy sau smoke.sql (run-local.sh).

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

-- Supabase cấp sẵn toàn quyền bảng cho service_role (bypass RLS); giả lập trên Postgres thường
grant select, insert, update, delete on all tables in schema public to service_role;

select pg_temp.reset_user();

-- 11. Đặt hàng tạo sự kiện "order_new"; khách không gọi được hàm thanh toán nội bộ
do $$
declare r jsonb;
begin
  r := public.place_order('[{"id":1001,"qty":1}]', '{"name":"Khách Online","phone":"0912345678","email":"khach@example.com"}',
                          '{"method":"pickup","store":"Q7"}', 'card');
  perform set_config('test.pcode', r ->> 'code', false);
  assert exists (select 1 from public.notifications n join public.orders o on o.id = n.order_id
                 where o.code = r ->> 'code' and n.event = 'order_new' and n.status = 'pending'), 'phải có sự kiện order_new';
  raise notice 'OK 11 - đơn % tạo sự kiện thông báo', r ->> 'code';
end $$;

select pg_temp.as_user('anon', null);
do $$ begin
  begin perform public.payment_start(current_setting('test.pcode'), '0912345678', 'vnpay'); raise exception 'anon KHÔNG được gọi payment_start';
  exception when insufficient_privilege then null; end;
  begin perform public.payment_confirm('x', 1, true); raise exception 'anon KHÔNG được gọi payment_confirm';
  exception when insufficient_privilege then null; end;
  begin perform public.notifications_claim(10); raise exception 'anon KHÔNG được gọi notifications_claim';
  exception when insufficient_privilege then null; end;
  begin perform * from public.payments; raise exception 'anon KHÔNG được đọc payments';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 12 - hàm thanh toán & hàng đợi chỉ dành cho máy chủ';
end $$;

-- 13. VNPay/MoMo: bắt đầu thanh toán, IPN sai số tiền bị từ chối, IPN đúng -> đã thanh toán, IPN lặp -> already
select pg_temp.as_user('service_role', null);
do $$
declare c text := current_setting('test.pcode'); s jsonb; s2 jsonb; total bigint;
begin
  begin perform public.payment_start(c, '0999999999', 'vnpay'); raise exception 'sai SĐT phải lỗi';
  exception when others then assert sqlerrm like 'Không tìm thấy%', sqlerrm; end;
  s := public.payment_start(c, '0912345678', 'vnpay');
  total := (s ->> 'amount')::bigint;
  assert s ->> 'txnRef' = c || 'P01', 'mã giao dịch lần 1';
  s2 := public.payment_start(lower(c), '0912 345 678', 'momo');
  assert s2 ->> 'txnRef' = c || 'P02', 'mã giao dịch lần 2';
  assert (select status from public.payments where txn_ref = c || 'P01') = 'expired', 'link cũ hết hiệu lực';
  assert (select payment from public.orders where code = c) = 'wallet', 'đổi sang ví khi chọn MoMo';
  assert public.payment_confirm(c || 'P02', total + 1, true) = 'amount_mismatch', 'sai số tiền';
  assert public.payment_confirm('KHONGCO', total, true) = 'not_found', 'mã lạ';
  assert public.payment_confirm(c || 'P02', total, true, 'MOMO123', 'Thành công', '{"x":1}') = 'ok', 'IPN thành công';
  assert public.payment_confirm(c || 'P02', total, true) = 'already', 'IPN lặp';
  assert (select payment_status from public.orders where code = c) = 'paid', 'đơn đã thanh toán';
  assert (select paid_at is not null from public.orders where code = c), 'có thời điểm thanh toán';
  -- Link cũ (đã expired) vẫn được ghi nhận nếu khách đã trả bằng link đó
  assert public.payment_confirm(c || 'P01', total, true) = 'ok', 'IPN link cũ vẫn ghi nhận';
  assert exists (select 1 from public.notifications n join public.orders o on o.id = n.order_id
                 where o.code = c and n.event = 'order_paid'), 'phải có sự kiện order_paid';
  assert (select count(*) from public.notifications n join public.orders o on o.id = n.order_id
          where o.code = c and n.event = 'order_paid') = 1, 'chỉ 1 sự kiện order_paid';
  begin perform public.payment_start(c, '0912345678', 'vnpay'); raise exception 'đơn đã trả không được thanh toán lại';
  exception when others then assert sqlerrm like '%đã được thanh toán%', sqlerrm; end;
  assert public.payment_lookup(c || 'P02') ->> 'paymentStatus' = 'paid', 'tra cứu theo mã giao dịch';
  raise notice 'OK 13 - VNPay/MoMo: tạo giao dịch, IPN, chống trùng';
end $$;

select pg_temp.reset_user();

-- 14. IPN thất bại; đơn hủy không thanh toán được
do $$
declare r jsonb; s jsonb;
begin
  begin perform public.cancel_order(current_setting('test.pcode'), '0912345678'); raise exception 'khách không tự hủy đơn đã thanh toán';
  exception when others then assert sqlerrm like '%hoàn tiền%', sqlerrm; end;
  r := public.place_order('[{"id":1002,"qty":1}]', '{"name":"Khách B","phone":"0933333333"}', '{"method":"pickup","store":"Q7"}', 'card');
  s := public.payment_start(r ->> 'code', '0933333333', 'vnpay');
  assert public.payment_confirm(s ->> 'txnRef', (s ->> 'amount')::bigint, false, null, 'Khách hủy') = 'failed', 'IPN thất bại';
  assert public.payment_confirm(s ->> 'txnRef', (s ->> 'amount')::bigint, true) = 'already', 'đã chốt thất bại thì không đổi';
  assert (select payment_status from public.orders where code = r ->> 'code') = 'unpaid', 'vẫn chưa thanh toán';
  -- Thử lại được
  s := public.payment_start(r ->> 'code', '0933333333', 'vnpay');
  assert s ->> 'txnRef' like '%P02', 'thanh toán lại';
  perform public.cancel_order(r ->> 'code', '0933333333');
  begin perform public.payment_start(r ->> 'code', '0933333333', 'vnpay'); raise exception 'đơn hủy không được thanh toán';
  exception when others then assert sqlerrm like '%đã hủy%', sqlerrm; end;
  raise notice 'OK 14 - thanh toán thất bại, thử lại, đơn hủy';
end $$;

-- 15. Chuyển khoản (SePay): tìm mã đơn trong nội dung, cộng dồn, chống trùng
do $$
declare r jsonb; c text; t bigint; x jsonb;
begin
  r := public.place_order('[{"id":1003,"qty":1}]', '{"name":"Khách CK","phone":"0944444444"}', '{"method":"pickup","store":"Q7"}', 'bank');
  c := r ->> 'code'; t := (r ->> 'total')::bigint;
  assert public.payment_bank_transfer('TX1', 'chuyen tien khong ma', 1000, null) ->> 'result' = 'no_code', 'không có mã đơn';
  assert public.payment_bank_transfer('TX2', 'DT9901019999 0944', 1000, null) ->> 'result' = 'not_found', 'mã đơn không tồn tại';
  x := public.payment_bank_transfer('TX3', 'MBVCB.123.' || lower(c) || ' 0944444444.CT tu ...', t - 100000, '{"id":3}');
  assert x ->> 'result' = 'ok', x::text;
  assert (select payment_status from public.orders where code = c) = 'partial', 'chuyển thiếu -> một phần';
  assert public.payment_bank_transfer('TX3', c, t - 100000, null) ->> 'result' = 'already', 'webhook lặp';
  x := public.payment_bank_transfer('TX4', c, 100000, null);
  assert (x ->> 'paid')::bigint = t, 'cộng dồn';
  assert (select payment_status from public.orders where code = c) = 'paid', 'đủ tiền -> đã thanh toán';
  assert (select count(*) from public.notifications n join public.orders o on o.id = n.order_id where o.code = c and n.event = 'order_paid') = 2,
    'thông báo cả lần thiếu tiền và lần đủ';
  raise notice 'OK 15 - đối soát chuyển khoản tự động';
end $$;

-- 16. Hàng đợi: lead tạo sự kiện; claim / finish / thử lại / failed
do $$
declare b jsonb; e jsonb; id1 bigint; n int;
begin
  perform public.submit_lead('b2b-quote', '{"name":"Anh Tuấn","phone":"0955555555","company":"Cty ABC","items":"20 máy lạnh"}');
  assert exists (select 1 from public.notifications where event = 'lead_new'), 'lead tạo sự kiện';
  update public.orders set status = 'confirmed' where code = current_setting('test.pcode');
  assert exists (select 1 from public.notifications where event = 'order_status' and data ->> 'status' = 'confirmed'), 'đổi trạng thái tạo sự kiện';

  select count(*) into n from public.notifications where status = 'pending';
  b := public.notifications_claim(100);
  assert jsonb_array_length(b) = n, format('claim hết %s sự kiện', n);
  assert (select count(*) from public.notifications where status = 'processing') = n, 'đang xử lý';
  assert jsonb_array_length(public.notifications_claim(100)) = 0, 'không claim lại khi đang xử lý';
  select x into e from jsonb_array_elements(b) x where x ->> 'event' = 'order_new' limit 1;
  assert e -> 'order' ->> 'code' is not null and (e -> 'order' ->> 'id') is not null, 'kèm dữ liệu đơn';
  select x into e from jsonb_array_elements(b) x where x ->> 'event' = 'lead_new' limit 1;
  assert e -> 'lead' ->> 'company' = 'Cty ABC' and not (e -> 'lead' ? 'staff_note'), 'kèm dữ liệu lead';

  id1 := (e ->> 'id')::bigint;
  perform public.notification_finish(id1, '{"email_staff":{"ok":true}}', false);
  assert (select status = 'pending' and next_at > now() + interval '1 minute' from public.notifications where id = id1), 'lỗi -> hẹn thử lại';
  assert (select results ? 'email_staff' from public.notifications where id = id1), 'lưu kết quả từng kênh';
  update public.notifications set attempts = 6 where id = id1;
  perform public.notification_finish(id1, '{"zalo_staff":{"ok":false}}', false);
  assert (select status from public.notifications where id = id1) = 'failed', 'quá số lần -> failed';
  update public.notifications set status = 'done' where status in ('pending', 'processing');
  raise notice 'OK 16 - hàng đợi thông báo';
end $$;

-- 17. Nhân viên xem được giao dịch & nhật ký thông báo, khách đăng nhập thì không
select pg_temp.reset_user();
select pg_temp.as_user('authenticated', (select id from public.profiles where role = 'staff' limit 1));
do $$ begin
  assert (select count(*) from public.payments) >= 5, 'staff đọc payments';
  assert (select count(*) from public.notifications) >= 5, 'staff đọc notifications';
  update public.notifications set status = 'pending', next_at = now() where event = 'lead_new';
  begin perform * from public.integration_tokens; raise exception 'staff KHÔNG được đọc token';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.reset_user();
select pg_temp.as_user('authenticated', (select id from public.profiles where role = 'customer' limit 1));
do $$ begin
  assert (select count(*) from public.payments) = 0, 'khách không thấy payments';
  assert (select count(*) from public.notifications) = 0, 'khách không thấy notifications';
  raise notice 'OK 17 - phân quyền giao dịch & nhật ký thông báo';
end $$;
select pg_temp.reset_user();
