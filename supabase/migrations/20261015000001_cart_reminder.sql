-- =====================================================================
-- Nhắc khách hoàn tất giỏ hàng bị bỏ dở
-- - Ở trang thanh toán, khách nhập SĐT hợp lệ + tick đồng ý nhận nhắc -> website gọi save_cart_reminder()
-- - Hệ thống xếp 1 thông báo 'cart_reminder' vào hàng đợi, đến hạn sau 2 giờ (mỗi SĐT chỉ giữ 1 lời nhắc mới nhất)
-- - Khách đặt hàng (cùng SĐT) trước khi đến hạn -> lời nhắc tự hủy, không gửi
-- - Đến hạn: Edge Function "notify" gửi email / Zalo ZNS cho khách + báo nhân viên gọi chốt đơn
-- =====================================================================

alter table public.notifications drop constraint if exists notifications_event_check;
alter table public.notifications add constraint notifications_event_check
  check (event in ('order_new', 'order_status', 'order_paid', 'lead_new', 'cart_reminder'));
create index if not exists notifications_cart_phone_idx on public.notifications ((data ->> 'phone'))
  where event = 'cart_reminder' and status = 'pending';

-- SĐT dạng chuẩn để so khớp (+84xxxxxxxxx -> 0xxxxxxxxx)
create or replace function public.phone_key(p text) returns text
language sql immutable as $$
  select regexp_replace(public.normalize_phone(p), '^\+84', '0')
$$;

-- p_contact: { name, phone, email, consent }   p_items: [{ id, qty }]
create or replace function public.save_cart_reminder(p_contact jsonb, p_items jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_phone text := public.phone_key(p_contact ->> 'phone');
  v_email text := nullif(trim(coalesce(p_contact ->> 'email', '')), '');
  v_items jsonb;
  v_total bigint;
begin
  if not public.valid_phone(v_phone) then
    raise exception 'Số điện thoại không hợp lệ' using errcode = 'P0001';
  end if;
  -- Khách bỏ tick đồng ý -> xóa lời nhắc đang chờ
  delete from public.notifications where event = 'cart_reminder' and status = 'pending' and data ->> 'phone' = v_phone;
  if coalesce((p_contact ->> 'consent')::boolean, false) is not true then
    return jsonb_build_object('scheduled', false);
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_email := null; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Giỏ hàng không hợp lệ' using errcode = 'P0001';
  end if;
  -- Chống lạm dụng: tối đa 10 lời nhắc / SĐT / ngày
  if (select count(*) from public.notifications where event = 'cart_reminder' and data ->> 'phone' = v_phone
        and created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('scheduled', false);
  end if;
  -- Giá & tên lấy từ database (không tin dữ liệu gửi lên)
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'sku', p.sku, 'name', p.name, 'price', p.price, 'qty', x.qty) order by x.ord), '[]'::jsonb),
         coalesce(sum(p.price * x.qty), 0)
    into v_items, v_total
  from (
    select (e ->> 'id')::bigint as id, least(greatest(coalesce((e ->> 'qty')::int, 1), 1), 99) as qty, ord
    from jsonb_array_elements(p_items) with ordinality as t(e, ord)
    where (e ->> 'id') ~ '^\d+$'
  ) x join public.products p on p.id = x.id and p.active;
  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('scheduled', false);
  end if;
  insert into public.notifications (event, data, next_at)
  values ('cart_reminder', jsonb_build_object(
    'phone', v_phone, 'email', v_email, 'name', left(nullif(trim(coalesce(p_contact ->> 'name', '')), ''), 100),
    'gender', left(p_contact ->> 'gender', 10), 'items', v_items, 'total', v_total
  ), now() + interval '2 hours');
  return jsonb_build_object('scheduled', true);
end $$;

-- Khách đã đặt hàng -> hủy lời nhắc đang chờ của SĐT đó
create or replace function public.cancel_cart_reminder_on_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.notifications
  set status = 'done', processed_at = now(),
      results = results || jsonb_build_object('converted', jsonb_build_object('ok', true, 'at', now(), 'order', new.code))
  where event = 'cart_reminder' and status = 'pending' and data ->> 'phone' = public.phone_key(new.phone);
  return new;
end $$;

create trigger orders_cancel_cart_reminder after insert on public.orders
  for each row execute function public.cancel_cart_reminder_on_order();

revoke execute on function public.cancel_cart_reminder_on_order() from public, anon, authenticated;
grant execute on function public.save_cart_reminder(jsonb, jsonb) to anon, authenticated;
grant execute on function public.phone_key(text) to anon, authenticated, service_role;
