-- =====================================================================
-- Sửa lỗi sau rà soát toàn bộ dự án
-- 1. Tồn kho: đặt hàng khi kho không đủ (đặt trước) chỉ trừ số thực có; hủy đơn hoàn đúng số đã trừ
--    (trước đây đặt 99 cái khi kho còn 12 rồi hủy -> kho thành 99)
-- 2. Mã giảm giá có giới hạn lượt: 2 đơn đặt cùng lúc không còn vượt giới hạn
-- 3. Thanh toán online sau khi đã chuyển khoản một phần: chỉ thu số còn thiếu
-- 4. Khách trả tiền trùng (link cũ, chuyển khoản vào đơn đã thanh toán / đã hủy): báo nhân viên để hoàn tiền
-- 5. Số điện thoại người đánh giá, ghi chú nội bộ & nguồn quảng cáo của đơn: không còn đọc được từ website
-- 6. Kế toán đọc được sản phẩm đã ẩn (báo cáo doanh thu theo danh mục đúng)
-- 7. Lời nhắc bảo trì do nhân viên bỏ không tự bật lại khi lưu đơn
-- =====================================================================

-- ---------------------------------------------------------------- 1. Tồn kho
alter table public.order_items add column if not exists stock_taken int;
update public.order_items set stock_taken = qty where stock_taken is null;
alter table public.order_items alter column stock_taken set default 0;
alter table public.order_items alter column stock_taken set not null;

-- Trừ kho cho các dòng của đơn: mỗi dòng lấy tối đa số đang có (khóa dòng sản phẩm, không âm)
create or replace function public.take_stock(p_order_id bigint) returns void
language plpgsql volatile security definer set search_path = public as $$
declare r record; v_stock int; v_take int;
begin
  for r in select i.id, i.product_id, i.qty from public.order_items i where i.order_id = p_order_id and i.product_id is not null order by i.product_id, i.id loop
    select stock into v_stock from public.products where id = r.product_id for update;
    if not found then continue; end if;
    v_take := least(greatest(v_stock, 0), r.qty);
    update public.products set stock = stock - v_take, sold = sold + r.qty where id = r.product_id;
    update public.order_items set stock_taken = v_take where id = r.id;
  end loop;
end $$;

create or replace function public.place_order(
  p_items    jsonb,
  p_customer jsonb,
  p_shipping jsonb,
  p_payment  text,
  p_invoice  jsonb default null,
  p_note     text  default null,
  p_coupon   text  default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  cfg        jsonb := coalesce((select value from public.settings where key = 'store'), '{}'::jsonb);
  v_phone    text  := public.normalize_phone(p_customer ->> 'phone');
  v_name     text  := trim(coalesce(p_customer ->> 'name', ''));
  v_method   text  := coalesce(p_shipping ->> 'method', 'delivery');
  v_install_fee bigint := coalesce((cfg ->> 'installFee')::bigint, 300000);
  v_ship_fee    bigint := coalesce((cfg ->> 'shippingFee')::bigint, 50000);
  v_free_ship   bigint := coalesce((cfg ->> 'freeShipThreshold')::bigint, 2000000);
  v_subtotal bigint := 0;
  v_install  bigint := 0;
  v_shipping bigint := 0;
  v_discount bigint := 0;
  v_coupon   text;
  v_code     text;
  v_order    public.orders;
  it   jsonb;
  p    public.products;
  qty  int;
  inst boolean;
  cp   record;
  lines jsonb := '[]'::jsonb;
begin
  -- Kiểm tra dữ liệu đầu vào
  if v_name = '' or length(v_name) > 100 then raise exception 'Vui lòng nhập họ tên hợp lệ' using errcode = 'P0001'; end if;
  if not public.valid_phone(v_phone) then raise exception 'Số điện thoại không hợp lệ' using errcode = 'P0001'; end if;
  if p_payment not in ('cod', 'bank', 'card', 'wallet', 'installment') then raise exception 'Phương thức thanh toán không hợp lệ' using errcode = 'P0001'; end if;
  if v_method not in ('delivery', 'pickup') then raise exception 'Hình thức nhận hàng không hợp lệ' using errcode = 'P0001'; end if;
  if v_method = 'delivery' and (coalesce(trim(p_shipping ->> 'address'), '') = '' or coalesce(trim(p_shipping ->> 'province'), '') = '') then
    raise exception 'Vui lòng nhập địa chỉ giao hàng' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Giỏ hàng trống hoặc không hợp lệ' using errcode = 'P0001';
  end if;
  -- Chống spam: tối đa 5 đơn / số điện thoại / 10 phút
  if (select count(*) from public.orders where phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Bạn đặt quá nhiều đơn trong thời gian ngắn, vui lòng gọi hotline' using errcode = 'P0001';
  end if;

  -- Tính tiền từng dòng
  for it in select * from jsonb_array_elements(p_items) loop
    qty  := coalesce((it ->> 'qty')::int, 0);
    inst := coalesce((it ->> 'install')::boolean, false);
    if qty < 1 or qty > 99 then raise exception 'Số lượng không hợp lệ' using errcode = 'P0001'; end if;
    select * into p from public.products where id = (it ->> 'id')::bigint and active;
    if not found then raise exception 'Sản phẩm % không còn kinh doanh', it ->> 'id' using errcode = 'P0001'; end if;
    v_subtotal := v_subtotal + p.price * qty;
    inst := inst and p.cat = 'may-lanh';
    if inst and not p.free_install then v_install := v_install + v_install_fee * qty; end if;
    lines := lines || jsonb_build_object('id', p.id, 'sku', p.sku, 'name', p.name, 'price', p.price, 'qty', qty, 'install', inst);
  end loop;

  v_shipping := case when v_method = 'pickup' or v_subtotal >= v_free_ship then 0 else v_ship_fee end;

  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    select * into cp from public.coupon_discount(p_coupon, v_subtotal, v_shipping);
    if not cp.ok then raise exception '%', cp.message using errcode = 'P0001'; end if;
    v_discount := cp.discount;
    if cp.free_ship then v_shipping := 0; end if;
    v_coupon := upper(trim(p_coupon));
    -- Khóa dòng mã giảm giá khi tăng lượt dùng: 2 đơn đặt cùng lúc không vượt giới hạn
    update public.coupons set used_count = used_count + 1
    where code = v_coupon and (usage_limit is null or used_count < usage_limit);
    if not found then raise exception 'Mã giảm giá đã hết lượt sử dụng' using errcode = 'P0001'; end if;
  end if;

  -- Mã đơn: DT + yymmdd + 4 số ngẫu nhiên (không trùng)
  loop
    v_code := 'DT' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders (code, user_id, phone, customer, shipping, payment, invoice, note,
                             subtotal, install_fee, shipping_fee, discount, coupon, total)
  values (
    v_code, auth.uid(), v_phone,
    jsonb_build_object('gender', p_customer ->> 'gender', 'name', v_name, 'phone', v_phone, 'email', nullif(p_customer ->> 'email', '')),
    p_shipping, p_payment, p_invoice, nullif(trim(coalesce(p_note, '')), ''),
    v_subtotal, v_install, v_shipping, v_discount, v_coupon,
    greatest(0, v_subtotal + v_install + v_shipping - v_discount)
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, sku, name, price, qty, install)
  select v_order.id, (l ->> 'id')::bigint, l ->> 'sku', l ->> 'name', (l ->> 'price')::bigint, (l ->> 'qty')::int, (l ->> 'install')::boolean
  from jsonb_array_elements(lines) l;

  -- Trừ tồn kho theo số thực có (hàng đặt trước khi hết kho vẫn nhận đơn), ghi lại số đã trừ để hủy đơn hoàn đúng
  perform public.take_stock(v_order.id);

  return public.order_json(v_order);
end $$;

create or replace function public.restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    -- Hoàn đúng số đã trừ khi đặt; số đã bán giảm theo số lượng đơn
    update public.products pr set stock = pr.stock + x.taken, sold = greatest(pr.sold - x.qty, 0)
    from (select product_id, sum(stock_taken) taken, sum(qty) qty from public.order_items where order_id = new.id group by 1) x
    where pr.id = x.product_id;
    update public.order_items set stock_taken = 0 where order_id = new.id;
    if new.coupon is not null then
      update public.coupons set used_count = greatest(used_count - 1, 0) where code = new.coupon;
    end if;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    -- Khôi phục đơn: trừ lại kho theo số đang có
    update public.products pr set sold = greatest(pr.sold - x.qty, 0)
    from (select product_id, sum(qty) qty from public.order_items where order_id = new.id group by 1) x
    where pr.id = x.product_id;  -- take_stock cộng lại sold
    perform public.take_stock(new.id);
    if new.coupon is not null then
      update public.coupons set used_count = used_count + 1 where code = new.coupon;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- 3. Thanh toán online: chỉ thu số còn thiếu
create or replace function public.payment_start(p_code text, p_phone text, p_provider text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  n int;
  v_ref text;
  v_due bigint;
begin
  if p_provider not in ('vnpay', 'momo') then raise exception 'Cổng thanh toán không hợp lệ' using errcode = 'P0001'; end if;
  select * into o from public.orders
  where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) for update;
  if not found then raise exception 'Không tìm thấy đơn hàng' using errcode = 'P0001'; end if;
  if o.status = 'cancelled' then raise exception 'Đơn hàng đã hủy, không thể thanh toán' using errcode = 'P0001'; end if;
  if o.payment_status in ('paid', 'refunded') then raise exception 'Đơn hàng đã được thanh toán' using errcode = 'P0001'; end if;
  v_due := o.total - coalesce((select sum(amount) from public.payments where order_id = o.id and status = 'paid'), 0);
  if v_due <= 0 then raise exception 'Đơn hàng không cần thanh toán thêm' using errcode = 'P0001'; end if;
  select count(*) into n from public.payments where order_id = o.id and provider <> 'bank';
  if n >= 10 then raise exception 'Bạn đã thử thanh toán quá nhiều lần, vui lòng gọi hotline' using errcode = 'P0001'; end if;
  update public.payments set status = 'expired' where order_id = o.id and status = 'pending' and provider <> 'bank';
  v_ref := o.code || 'P' || lpad((n + 1)::text, 2, '0');
  insert into public.payments (order_id, provider, txn_ref, amount) values (o.id, p_provider, v_ref, v_due);
  update public.orders set payment = case p_provider when 'vnpay' then 'card' else 'wallet' end
  where id = o.id and payment <> case p_provider when 'vnpay' then 'card' else 'wallet' end;
  return jsonb_build_object('txnRef', v_ref, 'amount', v_due, 'code', o.code);
end $$;

-- ---------------------------------------------------------------- 4. Tiền vào trùng / vào đơn đã hủy -> báo nhân viên hoàn tiền
create or replace function public.alert_extra_payment(p_order public.orders, p_amount bigint, p_ref text, p_provider text) returns void
language sql volatile security definer set search_path = public as $$
  insert into public.notifications (event, order_id, data)
  values ('order_paid', p_order.id, jsonb_build_object('paymentStatus', 'duplicate', 'amount', p_amount, 'txnRef', p_ref, 'provider', p_provider,
    'reason', case when p_order.status = 'cancelled' then 'cancelled' else 'already_paid' end))
$$;

create or replace function public.payment_confirm(
  p_txn_ref text, p_amount bigint, p_success boolean,
  p_provider_txn text default null, p_message text default null, p_raw jsonb default null
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare pay public.payments; o public.orders; v_paid bigint;
begin
  select * into pay from public.payments where txn_ref = p_txn_ref for update;
  if not found then return 'not_found'; end if;
  if pay.amount <> p_amount then return 'amount_mismatch'; end if;
  if pay.status in ('paid', 'failed') then return 'already'; end if;
  if not p_success then
    update public.payments set status = 'failed', provider_txn = p_provider_txn, message = p_message, raw = p_raw where id = pay.id;
    return 'failed';
  end if;
  select * into o from public.orders where id = pay.order_id for update;
  update public.payments set status = 'paid', paid_at = now(), provider_txn = p_provider_txn, message = p_message, raw = p_raw where id = pay.id;
  if o.payment_status in ('paid', 'refunded') or o.status = 'cancelled' then
    perform public.alert_extra_payment(o, p_amount, p_txn_ref, pay.provider);
    return 'ok';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id and status = 'paid';
  update public.orders
  set payment_status = case when v_paid >= o.total then 'paid' else 'partial' end,
      paid_at = case when v_paid >= o.total then now() else paid_at end
  where id = o.id;
  return 'ok';
end $$;

create or replace function public.payment_bank_transfer(p_ref text, p_content text, p_amount bigint, p_raw jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_code text := upper(substring(coalesce(p_content, '') from '(?i)DT[0-9]{10}'));
  o public.orders;
  v_id bigint;
  v_paid bigint;
begin
  if coalesce(p_ref, '') = '' or p_amount is null or p_amount <= 0 then return jsonb_build_object('result', 'invalid'); end if;
  if v_code is null then return jsonb_build_object('result', 'no_code'); end if;
  select * into o from public.orders where code = v_code for update;
  if not found then return jsonb_build_object('result', 'not_found', 'code', v_code); end if;
  insert into public.payments (order_id, provider, txn_ref, amount, status, paid_at, provider_txn, message, raw)
  values (o.id, 'bank', 'BANK' || p_ref, p_amount, 'paid', now(), p_ref, left(p_content, 300), p_raw)
  on conflict (txn_ref) do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('result', 'already', 'code', v_code); end if;
  if o.payment_status in ('paid', 'refunded') or o.status = 'cancelled' then
    perform public.alert_extra_payment(o, p_amount, 'BANK' || p_ref, 'bank');
    return jsonb_build_object('result', 'extra', 'code', v_code);
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id and status = 'paid';
  update public.orders
  set payment_status = case when v_paid >= o.total then 'paid' else 'partial' end,
      paid_at = case when v_paid >= o.total then now() else paid_at end
  where id = o.id;
  return jsonb_build_object('result', 'ok', 'code', v_code, 'paid', v_paid, 'total', o.total);
end $$;

-- ---------------------------------------------------------------- 5. Dữ liệu riêng tư không đọc trực tiếp từ website
-- Đánh giá: khách (anon / tài khoản thường) chỉ đọc các cột công khai, không có số điện thoại
revoke select on public.reviews from anon, authenticated;
grant select (id, product_id, user_id, name, rating, text, status, verified, created_at) on public.reviews to anon, authenticated;
-- Đơn hàng: khách xem đơn của mình qua my_orders() / track_order() (không có ghi chú nội bộ, nguồn quảng cáo)
drop policy if exists orders_own_read on public.orders;
create policy orders_staff_read on public.orders for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------- 6. Kế toán đọc sản phẩm đã ẩn (báo cáo)
create policy products_accountant_read on public.products for select to authenticated using (public.is_accountant());

-- ---------------------------------------------------------------- 7. Lời nhắc nhân viên đã bỏ giữ nguyên khi lưu đơn
create or replace function public.maintenance_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_store jsonb := coalesce((select value from public.settings where key = 'store'), '{}'::jsonb);
  v_months int := least(greatest(case when v_store ->> 'maintenanceMonths' ~ '^\s*\d{1,3}\s*$' then (v_store ->> 'maintenanceMonths')::int else 6 end, 1), 24);
  v_cycles int := least(greatest(case when v_store ->> 'maintenanceCycles' ~ '^\s*\d{1,3}\s*$' then (v_store ->> 'maintenanceCycles')::int else 4 end, 1), 10);
  v_units int;
  v_items text;
  v_base timestamp := date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh');
begin
  -- Không đổi trạng thái / đồng ý thì không làm gì (lưu ghi chú, thanh toán... không ảnh hưởng lịch nhắc)
  if new.status is not distinct from old.status and new.maintenance_optin is not distinct from old.maintenance_optin then
    return new;
  end if;
  if new.status <> 'done' or not new.maintenance_optin then
    update public.notifications
    set status = 'done', processed_at = now(),
        results = results || jsonb_build_object('cancelled', jsonb_build_object('ok', true, 'at', now(),
          'reason', case when new.status = 'cancelled' then 'order_cancelled' when not new.maintenance_optin then 'opt_out' else 'order_reopened' end))
    where event = 'maintenance_reminder' and order_id = new.id and status = 'pending';
    return new;
  end if;
  if exists (select 1 from public.notifications where event = 'maintenance_reminder' and order_id = new.id) then
    -- Bật lại lần nhắc bị hủy tự động (không bật lại lần nhân viên đã chủ động bỏ)
    update public.notifications
    set status = 'pending', processed_at = null, results = results - 'cancelled'
    where event = 'maintenance_reminder' and order_id = new.id and status = 'done' and results ? 'cancelled'
      and coalesce(results -> 'cancelled' ->> 'reason', '') <> 'staff' and next_at > now();
    return new;
  end if;
  select coalesce(sum(i.qty), 0), string_agg(i.qty || ' x ' || i.name, '; ' order by i.id)
    into v_units, v_items
  from public.order_items i join public.products p on p.id = i.product_id
  where i.order_id = new.id and p.cat = 'may-lanh';
  if v_units = 0 then return new; end if;
  insert into public.notifications (event, order_id, data, next_at)
  select 'maintenance_reminder', new.id, jsonb_build_object(
      'cycle', n, 'months', v_months * n, 'phone', public.phone_key(new.phone),
      'name', left(new.customer ->> 'name', 100), 'gender', left(new.customer ->> 'gender', 10), 'email', nullif(new.customer ->> 'email', ''),
      'units', v_units, 'items', left(v_items, 500), 'orderCode', new.code, 'doneAt', now()),
    ((v_base + make_interval(months => v_months * n) + interval '9 hours') at time zone 'Asia/Ho_Chi_Minh')
  from generate_series(1, v_cycles) n;
  return new;
end $$;

-- ---------------------------------------------------------------- Quyền thực thi
revoke execute on function public.take_stock(bigint), public.alert_extra_payment(public.orders, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.payment_start(text, text, text), public.payment_confirm(text, bigint, boolean, text, text, jsonb),
  public.payment_bank_transfer(text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.payment_start(text, text, text), public.payment_confirm(text, bigint, boolean, text, text, jsonb),
  public.payment_bank_transfer(text, text, bigint, jsonb) to service_role;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, jsonb, text, text) to anon, authenticated;
