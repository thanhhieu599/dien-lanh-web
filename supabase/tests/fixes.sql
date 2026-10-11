-- Kiểm thử các bản sửa lỗi (migration 20261013000001_fixes.sql). Chạy sau phase4.sql.
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);

-- 18. Nhân viên đánh dấu đã thanh toán -> có thời điểm; chuyển lại chưa thanh toán -> xóa
do $$
declare c text;
begin
  c := public.place_order('[{"id":1001,"qty":1}]', '{"name":"Fix A","phone":"0966000001"}', '{"method":"pickup","store":"Q7"}', 'cod') ->> 'code';
  update public.orders set payment_status = 'paid' where code = c;
  assert (select paid_at is not null from public.orders where code = c), 'paid_at khi đánh dấu đã thanh toán';
  update public.orders set payment_status = 'unpaid' where code = c;
  assert (select paid_at is null from public.orders where code = c), 'xóa paid_at khi bỏ thanh toán';
  raise notice 'OK 18 - thời điểm thanh toán';
end $$;

-- 19. Hủy đơn trả lại lượt dùng mã giảm giá
do $$
declare c text; n int;
begin
  update public.coupons set used_count = 0, usage_limit = 1 where code = 'GIAM300K';
  c := public.place_order('[{"id":1001,"qty":1}]', '{"name":"Fix B","phone":"0966000002"}', '{"method":"pickup","store":"Q7"}', 'cod', null, null, 'GIAM300K') ->> 'code';
  assert (select used_count from public.coupons where code = 'GIAM300K') = 1, 'dùng 1 lượt';
  perform public.cancel_order(c, '0966000002');
  assert (select used_count from public.coupons where code = 'GIAM300K') = 0, 'hủy đơn trả lượt';
  -- Lượt được dùng lại cho khách khác
  perform public.place_order('[{"id":1001,"qty":1}]', '{"name":"Fix C","phone":"0966000003"}', '{"method":"pickup","store":"Q7"}', 'cod', null, null, 'GIAM300K');
  update public.coupons set usage_limit = null where code = 'GIAM300K';
  raise notice 'OK 19 - hủy đơn trả lượt mã giảm giá';
end $$;

-- 20. Mã lead không trùng, chống spam đánh giá & nhận tin
do $$
declare i int; ok boolean;
begin
  for i in 1..30 loop perform public.submit_lead('contact', jsonb_build_object('name', 'L' || i, 'phone', '09770000' || lpad(i::text, 2, '0'))); end loop;
  assert (select count(distinct code) = count(*) from public.leads), 'mã lead không trùng';
  perform set_config('role', 'anon', false);
  for i in 1..3 loop insert into public.reviews (product_id, name, phone, rating, text) values (1001, 'Spam', '0988 000 111', 5, 'x'); end loop;
  ok := false;
  begin insert into public.reviews (product_id, name, phone, rating, text) values (1001, 'Spam', '0988000111', 5, 'x');
  exception when others then ok := sqlerrm like '%nhiều đánh giá%'; end;
  assert ok, 'chặn đánh giá thứ 4 trong 10 phút';
  perform public.submit_lead('newsletter', '{"email":"tin@example.com"}');
  ok := false;
  begin perform public.submit_lead('newsletter', '{"email":"TIN@example.com"}'); exception when others then ok := sqlerrm like '%vừa đăng ký%'; end;
  assert ok, 'chặn đăng ký nhận tin lặp';
  ok := false;
  begin perform public.submit_lead('newsletter', '{"email":"khong-hop-le"}'); exception when others then ok := sqlerrm like '%Email không hợp lệ%'; end;
  assert ok, 'email nhận tin không hợp lệ';
  perform set_config('role', 'postgres', false);
  raise notice 'OK 20 - mã lead, chống spam';
end $$;
