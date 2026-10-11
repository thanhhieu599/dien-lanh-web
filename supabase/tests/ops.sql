-- Kiểm thử vận hành & quản trị (migration 20261017000001_ops.sql). Chạy sau trust.sql.
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);
insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-5555-5555-5555-555555555551', 'sales1@dt.vn', '{"name":"KD Một","phone":"0905555551"}'),
  ('55555555-5555-5555-5555-555555555552', 'sales2@dt.vn', '{"name":"KD Hai","phone":"0905555552"}'),
  ('66666666-6666-6666-6666-666666666666', 'ketoan@dt.vn', '{"name":"Kế toán","phone":"0906666666"}');
update public.profiles set role = 'sales' where id in ('55555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555552');
update public.profiles set role = 'accountant' where id = '66666666-6666-6666-6666-666666666666';

-- Lead: 1 giao cho KD Một, 1 giao cho KD Hai, 1 chưa giao
select set_config('role', 'anon', false);
select public.submit_lead('b2b-quote', '{"name":"Lead KD1","phone":"0911000001","company":"Cty A"}');
select public.submit_lead('b2b-quote', '{"name":"Lead KD2","phone":"0911000002","company":"Cty B"}');
select public.submit_lead('contact', '{"name":"Lead chưa giao","phone":"0911000003"}');
select set_config('role', 'postgres', false);
update public.leads set assigned_to = '55555555-5555-5555-5555-555555555551' where name = 'Lead KD1';
update public.leads set assigned_to = '55555555-5555-5555-5555-555555555552' where name = 'Lead KD2';

-- 25. Kinh doanh: chỉ thấy lead của mình; chỉ sửa trạng thái / ghi chú; không thấy đơn, thanh toán
select set_config('role', 'authenticated', false);
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555551","role":"authenticated"}', false);
do $$ begin
  assert public.current_role_name() = 'sales' and not public.is_staff(), 'vai trò sales, không phải staff';
  assert (select count(*) from public.leads) = 1 and (select name from public.leads) = 'Lead KD1', 'sales chỉ thấy lead được giao';
  update public.leads set status = 'contacted', staff_note = 'Đã gọi' where name = 'Lead KD1';
  assert found, 'sales cập nhật được trạng thái lead của mình';
  update public.leads set status = 'won' where name = 'Lead KD2';
  assert not found, 'sales KHÔNG sửa được lead người khác';
  begin update public.leads set phone = '0999999999' where name = 'Lead KD1'; raise exception 'sales KHÔNG được sửa thông tin khách';
  exception when insufficient_privilege then null; end;
  begin update public.leads set assigned_to = '55555555-5555-5555-5555-555555555552' where name = 'Lead KD1'; raise exception 'sales KHÔNG được chuyển lead';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.orders) = 0, 'sales không thấy đơn hàng';
  assert (select count(*) from public.payments) = 0, 'sales không thấy giao dịch';
  begin update public.profiles set role = 'admin' where id = auth.uid(); raise exception 'sales KHÔNG được tự nâng quyền';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 25 - nhân viên kinh doanh chỉ thấy & xử lý lead của mình';
end $$;

-- 26. Kế toán: thấy đơn + giao dịch; chỉ sửa trạng thái thanh toán; không thấy lead
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', false);
do $$
declare oid bigint;
begin
  assert public.is_accountant() and not public.is_staff(), 'vai trò accountant';
  assert (select count(*) from public.orders) > 0, 'kế toán đọc được đơn hàng';
  assert (select count(*) from public.order_items) > 0, 'kế toán đọc được chi tiết đơn (xuất MISA)';
  assert (select count(*) from public.payments) > 0, 'kế toán đọc được giao dịch';
  assert (select count(*) from public.leads) = 0, 'kế toán KHÔNG thấy lead';
  select id into oid from public.orders where payment_status = 'unpaid' and status <> 'cancelled' order by id limit 1;
  update public.orders set payment_status = 'paid' where id = oid;
  assert (select paid_at is not null from public.orders where id = oid), 'kế toán xác nhận đã thanh toán';
  begin update public.orders set status = 'done' where id = oid; raise exception 'kế toán KHÔNG được đổi trạng thái đơn';
  exception when insufficient_privilege then null; end;
  begin update public.orders set total = 1 where id = oid; raise exception 'kế toán KHÔNG được sửa tiền';
  exception when insufficient_privilege then null; end;
  begin delete from public.orders where id = oid; assert not found, 'kế toán KHÔNG được xóa đơn';
  exception when insufficient_privilege then null; end;
  update public.settings set value = '{}' where key = 'store';
  assert not found, 'kế toán không sửa cấu hình';
  raise notice 'OK 26 - kế toán chỉ xem & cập nhật thanh toán';
end $$;

-- 27. Khách đặt máy lạnh + đồng ý nhắc bảo trì + nguồn quảng cáo
select set_config('role', 'anon', false);
select set_config('request.jwt.claims', '', false);
do $$
declare r jsonb; v_code text;
begin
  r := public.place_order('[{"id":1001,"qty":2},{"id":1025,"qty":1}]', '{"name":"Khách Bảo Trì","phone":"0988777666","email":"bt@example.com"}', '{"method":"pickup","store":"Q7"}', 'cod');
  v_code := r ->> 'code';
  r := public.order_extras(v_code, '0988 777 666', true, '{"source":"google","medium":"cpc","campaign":"he-2026","gclid":"abc","evil":"x"}');
  assert (r ->> 'maintenance')::boolean, 'lưu đồng ý nhắc bảo trì';
  perform public.order_extras(v_code, '0988777666', null, '{"source":"facebook"}');
  begin perform public.order_extras(v_code, '0900000000', true, null); raise exception 'sai SĐT phải báo lỗi';
  exception when others then if sqlerrm not like '%Không tìm thấy%' then raise; end if; end;
  begin perform * from public.notifications; raise exception 'anon KHÔNG đọc notifications';
  exception when insufficient_privilege then null; end;
  perform set_config('dt.maint_code', v_code, false);
end $$;
select set_config('role', 'postgres', false);
do $$
declare o public.orders; n int;
begin
  select * into o from public.orders where code = current_setting('dt.maint_code');
  assert o.maintenance_optin, 'đơn có cờ nhắc bảo trì';
  assert o.attribution ->> 'source' = 'google' and o.attribution ->> 'gclid' = 'abc' and not o.attribution ? 'evil', 'nguồn khách chỉ ghi 1 lần, lọc khóa lạ';
  assert not exists (select 1 from public.notifications where event = 'maintenance_reminder' and order_id = o.id), 'chưa hoàn thành thì chưa xếp lịch';
  update public.orders set status = 'done' where id = o.id;
  select count(*) into n from public.notifications where event = 'maintenance_reminder' and order_id = o.id and status = 'pending';
  assert n = 4, format('xếp 4 lần nhắc (6/12/18/24 tháng), có %s', n);
  assert (select (data ->> 'units')::int from public.notifications where event = 'maintenance_reminder' and order_id = o.id limit 1) = 2, 'chỉ đếm máy lạnh';
  assert (select min(next_at) from public.notifications where event = 'maintenance_reminder' and order_id = o.id)
         between now() + interval '5 months' and now() + interval '7 months', 'lần đầu sau 6 tháng';
  assert (select max(next_at) from public.notifications where event = 'maintenance_reminder' and order_id = o.id)
         between now() + interval '23 months' and now() + interval '25 months', 'lần cuối sau 24 tháng';
  assert (select extract(hour from min(next_at) at time zone 'Asia/Ho_Chi_Minh') from public.notifications where event = 'maintenance_reminder' and order_id = o.id) = 9, 'gửi lúc 9h sáng';
  -- Cập nhật lại trạng thái done (không đổi) không xếp trùng
  update public.orders set status = 'done', staff_note = 'x' where id = o.id;
  assert (select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = o.id) = 4, 'không xếp trùng';
  -- Khách bỏ đồng ý -> hủy; đồng ý lại -> bật lại
  update public.orders set maintenance_optin = false where id = o.id;
  assert (select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = o.id and status = 'pending') = 0, 'bỏ đồng ý thì hủy nhắc';
  update public.orders set maintenance_optin = true where id = o.id;
  assert (select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = o.id and status = 'pending' and not results ? 'cancelled') = 4, 'đồng ý lại thì bật lại';
  -- Đến hạn -> notify lấy ra gửi, có dữ liệu đơn
  update public.notifications set next_at = now() where event = 'maintenance_reminder' and order_id = o.id and (data ->> 'cycle')::int = 1;
  assert exists (select 1 from jsonb_array_elements(public.notifications_claim(100)) x
                 where x ->> 'event' = 'maintenance_reminder' and x -> 'order' ->> 'code' = o.code and x -> 'data' ->> 'phone' = '0988777666'), 'đến hạn thì gửi';
  perform public.notification_finish(id, '{"email_customer":{"ok":true}}', true) from public.notifications where status = 'processing';
  update public.notifications set status = 'pending', next_at = now() + interval '5 minutes' where status = 'processing';
  raise notice 'OK 27 - xếp lịch nhắc bảo trì khi đơn máy lạnh hoàn thành';
end $$;

-- 28. Khách đặt lịch vệ sinh (cùng SĐT) -> ghi nhận chuyển đổi; hủy đơn -> hủy nhắc; đơn không có máy lạnh -> không nhắc
select set_config('role', 'anon', false);
select public.submit_lead('service', '{"name":"Khách Bảo Trì","phone":"+84988777666","service":"ve-sinh"}');
select set_config('role', 'postgres', false);
do $$
declare o public.orders; r jsonb;
begin
  select * into o from public.orders where code = current_setting('dt.maint_code');
  assert exists (select 1 from public.notifications where event = 'maintenance_reminder' and order_id = o.id and (data ->> 'cycle')::int = 1 and results ? 'booked'), 'lời nhắc đã gửi được ghi nhận chuyển đổi';
  assert (select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = o.id and status = 'pending') = 3, 'các lần nhắc sau vẫn giữ';
  update public.orders set status = 'cancelled' where id = o.id;
  assert (select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = o.id and status = 'pending') = 0, 'hủy đơn thì hủy nhắc';
  r := public.place_order('[{"id":1025,"qty":1}]', '{"name":"Tủ Lạnh","phone":"0988777555"}', '{"method":"pickup","store":"Q7"}', 'cod');
  update public.orders set maintenance_optin = true, status = 'done' where code = r ->> 'code';
  assert not exists (select 1 from public.notifications n join public.orders x on x.id = n.order_id where x.code = r ->> 'code' and n.event = 'maintenance_reminder'), 'không có máy lạnh thì không nhắc';
  -- Cấu hình chu kỳ 3 tháng x 2 lần
  update public.settings set value = value || '{"maintenanceMonths":"3","maintenanceCycles":2}' where key = 'store';
  r := public.place_order('[{"id":1002,"qty":1}]', '{"name":"Chu Kỳ","phone":"0988777444"}', '{"method":"pickup","store":"Q7"}', 'cod');
  update public.orders set maintenance_optin = true where code = r ->> 'code';
  update public.orders set status = 'done' where code = r ->> 'code';
  assert (select count(*) from public.notifications n join public.orders x on x.id = n.order_id where x.code = r ->> 'code' and n.event = 'maintenance_reminder') = 2, 'theo cấu hình số lần nhắc';
  assert (select max(n.next_at) from public.notifications n join public.orders x on x.id = n.order_id where x.code = r ->> 'code' and n.event = 'maintenance_reminder')
         between now() + interval '5 months' and now() + interval '7 months', 'theo cấu hình số tháng';
  -- Cấu hình sai không làm lỗi cập nhật đơn
  update public.settings set value = value || '{"maintenanceMonths":"abc"}' where key = 'store';
  r := public.place_order('[{"id":1003,"qty":1}]', '{"name":"Cấu Hình Sai","phone":"0988777333"}', '{"method":"pickup","store":"Q7"}', 'cod');
  update public.orders set maintenance_optin = true, status = 'done' where code = r ->> 'code';
  assert (select count(*) from public.notifications n join public.orders x on x.id = n.order_id where x.code = r ->> 'code' and n.event = 'maintenance_reminder') = 2, 'cấu hình sai dùng mặc định 6 tháng';
  update public.settings set value = value - 'maintenanceMonths' - 'maintenanceCycles' where key = 'store';
  raise notice 'OK 28 - đặt lịch ghi nhận chuyển đổi, hủy đơn hủy nhắc, cấu hình chu kỳ';
end $$;

-- 29. Nhân viên (staff) đọc được lịch nhắc, bấm bỏ nhắc / gửi ngay; kinh doanh & kế toán không đọc được
select set_config('role', 'authenticated', false);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
do $$
declare v_id bigint;
begin
  assert (select count(*) from public.notifications where event = 'maintenance_reminder') > 0, 'staff thấy lịch nhắc';
  select n.id into v_id from public.notifications n join public.orders o on o.id = n.order_id
  where n.event = 'maintenance_reminder' and n.status = 'pending' and o.status = 'done' order by n.next_at limit 1;
  assert public.maintenance_skip(v_id, true), 'staff bỏ 1 lần nhắc';
  assert (select results -> 'cancelled' ->> 'reason' from public.notifications where id = v_id) = 'staff', 'ghi lý do bỏ nhắc';
  assert public.maintenance_skip(v_id, false), 'staff bật lại';
  assert (select status from public.notifications where id = v_id) = 'pending', 'bật lại -> chờ gửi';
  update public.notifications set next_at = now() where id = v_id;
  assert found, 'staff bấm gửi ngay';
  update public.notifications set next_at = now() + interval '30 days' where id = v_id;
  raise notice 'OK 29a - staff xem, bỏ / bật lại, gửi ngay lời nhắc';
end $$;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555551","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from public.notifications) = 0, 'sales không đọc nhật ký thông báo';
  begin perform public.maintenance_skip(1, true); raise exception 'sales KHÔNG được bỏ nhắc';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 29 - quyền xem lịch nhắc bảo trì';
end $$;
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);
