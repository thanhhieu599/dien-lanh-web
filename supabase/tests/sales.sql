-- Kiểm thử nhắc giỏ hàng bỏ dở (migration 20261015000001_cart_reminder.sql). Chạy sau fixes.sql.
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);

-- 21. Khách (anon) lưu lời nhắc: giá lấy từ DB, đến hạn sau 2 giờ, mỗi SĐT 1 lời nhắc
select set_config('role', 'anon', false);
do $$
declare r jsonb;
begin
  r := public.save_cart_reminder('{"name":"Khách Giỏ","phone":"+84 977 000 111","email":"gio@example.com","consent":true}',
                                 '[{"id":1001,"qty":2,"price":1},{"id":999999,"qty":1},{"id":"x"}]');
  assert (r ->> 'scheduled')::boolean, 'phải lên lịch nhắc';
  r := public.save_cart_reminder('{"name":"Khách Giỏ","phone":"0977000111","consent":true}', '[{"id":1001,"qty":1}]');
  begin perform public.save_cart_reminder('{"phone":"123","consent":true}', '[{"id":1001,"qty":1}]'); raise exception 'SĐT sai phải báo lỗi';
  exception when others then if sqlerrm not like '%không hợp lệ%' then raise; end if; end;
  begin perform * from public.notifications; raise exception 'anon KHÔNG được đọc notifications';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 21 - khách lưu lời nhắc giỏ hàng';
end $$;
select set_config('role', 'postgres', false);
do $$
declare n public.notifications;
begin
  assert (select count(*) from public.notifications where event = 'cart_reminder' and status = 'pending' and data ->> 'phone' = '0977000111') = 1,
    'mỗi SĐT chỉ giữ 1 lời nhắc mới nhất';
  select * into n from public.notifications where event = 'cart_reminder' and data ->> 'phone' = '0977000111' and status = 'pending';
  assert (n.data -> 'items' -> 0 ->> 'qty')::int = 1 and (n.data ->> 'total')::bigint = (select price from public.products where id = 1001), 'giá theo DB';
  assert n.next_at between now() + interval '119 minutes' and now() + interval '121 minutes', 'đến hạn sau 2 giờ';
  assert not exists (select 1 from jsonb_array_elements(public.notifications_claim(100)) x where x ->> 'event' = 'cart_reminder'), 'chưa đến hạn thì chưa gửi';
  update public.notifications set status = 'pending', next_at = now() + interval '5 minutes' where status = 'processing'; -- trả lại lô vừa lấy thử
  raise notice 'OK 22 - lời nhắc đến hạn sau 2 giờ, giá lấy từ DB';
end $$;

-- 23. Bỏ tick đồng ý -> xóa lời nhắc; đặt hàng -> lời nhắc tự hủy
do $$
declare r jsonb;
begin
  r := public.save_cart_reminder('{"phone":"0977000111","consent":false}', '[{"id":1001,"qty":1}]');
  assert not (r ->> 'scheduled')::boolean and not exists (select 1 from public.notifications where event = 'cart_reminder' and status = 'pending' and data ->> 'phone' = '0977000111'), 'bỏ đồng ý thì xóa lời nhắc';
  perform public.save_cart_reminder('{"phone":"0977000222","consent":true}', '[{"id":1003,"qty":1}]');
  perform public.place_order('[{"id":1003,"qty":1}]', '{"name":"Đã Mua","phone":"+84977000222"}', '{"method":"pickup","store":"Q7"}', 'cod');
  assert exists (select 1 from public.notifications where event = 'cart_reminder' and data ->> 'phone' = '0977000222' and status = 'done' and results ? 'converted'), 'đặt hàng thì hủy lời nhắc';
  -- Đến hạn -> được lấy ra gửi kèm dữ liệu giỏ hàng
  perform public.save_cart_reminder('{"name":"Chưa Mua","phone":"0977000333","email":"x@example.com","consent":true}', '[{"id":1002,"qty":1}]');
  update public.notifications set next_at = now() where event = 'cart_reminder' and data ->> 'phone' = '0977000333';
  assert exists (select 1 from jsonb_array_elements(public.notifications_claim(100)) x where x ->> 'event' = 'cart_reminder' and x -> 'data' ->> 'name' = 'Chưa Mua'), 'đến hạn thì gửi';
  update public.notifications set status = 'done' where status = 'processing';
  raise notice 'OK 23 - bỏ đồng ý / đặt hàng hủy lời nhắc; đến hạn thì gửi';
end $$;
