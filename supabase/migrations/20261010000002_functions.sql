-- =====================================================================
-- Hàm nghiệp vụ: đặt hàng, tra cứu, mã giảm giá, trigger bảo vệ dữ liệu
-- Các hàm security definer luôn đặt search_path cố định.
-- =====================================================================

-- ---------------------------------------------------------------- Phân quyền
-- Phiên quản trị hệ thống (SQL editor của Supabase, service_role key) được coi là admin.
-- Website luôn chạy với role anon/authenticated nên không lọt vào nhánh này.
create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(nullif(current_setting('role', true), ''), 'none') in ('none', 'postgres', 'service_role', 'supabase_admin') then 'admin'
    else coalesce((select role from public.profiles where id = auth.uid()), 'anon')
  end
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() in ('staff', 'admin')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'admin'
$$;

create or replace function public.normalize_phone(p text) returns text
language sql immutable as $$
  select regexp_replace(coalesce(p, ''), '[\s.\-]', '', 'g')
$$;

create or replace function public.valid_phone(p text) returns boolean
language sql immutable as $$
  select public.normalize_phone(p) ~ '^(0|\+84)(3|5|7|8|9)[0-9]{8}$'
$$;

-- ---------------------------------------------------------------- Tài khoản
-- Tạo profile khi có user mới trong Supabase Auth (name/phone lấy từ metadata đăng ký)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(public.normalize_phone(new.raw_user_meta_data ->> 'phone'), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'contact_email', ''), new.email)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Khách không tự nâng quyền / đổi số điện thoại đăng nhập
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Không có quyền thay đổi vai trò' using errcode = '42501';
  end if;
  if new.phone is distinct from old.phone and not public.is_staff() then
    raise exception 'Không thể đổi số điện thoại đăng nhập' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

-- ---------------------------------------------------------------- Đánh giá & lead
-- Dữ liệu gửi từ website luôn ở trạng thái chờ duyệt; nhân viên mới được đặt khác.
create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    new.status := 'pending';
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where i.product_id = new.product_id and o.status = 'done'
        and auth.uid() is not null and o.user_id = auth.uid()
    );
    new.user_id := auth.uid();
  end if;
  return new;
end $$;

create trigger reviews_guard before insert on public.reviews
  for each row execute function public.guard_review();

create or replace function public.guard_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    new.status := 'new';
    new.assigned_to := null;
    new.staff_note := null;
    if new.phone is not null and new.phone <> '' then
      new.phone := public.normalize_phone(new.phone);
      if (select count(*) from public.leads where phone = new.phone and created_at > now() - interval '10 minutes') >= 5 then
        raise exception 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger leads_guard before insert on public.leads
  for each row execute function public.guard_lead();

-- ---------------------------------------------------------------- Lịch sử trạng thái đơn
create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, created_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger orders_status_log after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- ---------------------------------------------------------------- Định dạng đơn trả về frontend
create or replace function public.order_json(o public.orders) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', o.code,
    'createdAt', o.created_at,
    'status', o.status,
    'paymentStatus', o.payment_status,
    'customer', o.customer,
    'shipping', o.shipping,
    'payment', o.payment,
    'invoice', o.invoice,
    'note', o.note,
    'subtotal', o.subtotal,
    'install', o.install_fee,
    'shippingFee', o.shipping_fee,
    'discount', o.discount,
    'coupon', o.coupon,
    'total', o.total,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.product_id, 'sku', i.sku, 'name', i.name, 'price', i.price, 'qty', i.qty, 'install', i.install) order by i.id)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at) order by h.created_at)
      from public.order_status_history h where h.order_id = o.id), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------- Mã giảm giá
-- Trả về mức giảm cho tạm tính; không làm thay đổi dữ liệu.
create or replace function public.coupon_discount(p_code text, p_subtotal bigint, p_shipping bigint)
returns table (ok boolean, message text, discount bigint, free_ship boolean, coupon jsonb)
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found or not c.active then
    return query select false, 'Mã giảm giá không tồn tại'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if (c.starts_at is not null and now() < c.starts_at) or (c.ends_at is not null and now() > c.ends_at) then
    return query select false, 'Mã giảm giá đã hết hạn'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select false, 'Mã giảm giá đã hết lượt sử dụng'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if p_subtotal < c.min then
    return query select false, format('Đơn hàng tối thiểu %s₫ để dùng mã này', to_char(c.min, 'FM999G999G999G999')), 0::bigint, false, null::jsonb; return;
  end if;
  return query select
    true,
    coalesce(c.description, 'Đã áp dụng mã giảm giá'),
    case c.type
      when 'percent' then least(p_subtotal * c.value / 100, coalesce(c.max, p_subtotal))
      when 'fixed' then least(c.value, p_subtotal)
      else 0 end::bigint,
    c.type = 'ship',
    jsonb_build_object('code', c.code, 'type', c.type, 'value', c.value, 'max', c.max, 'min', c.min, 'desc', c.description);
end $$;

-- Dùng ở giỏ hàng để kiểm tra mã (kể cả mã không công khai)
create or replace function public.validate_coupon(p_code text, p_subtotal bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', ok, 'msg', message, 'discount', discount, 'coupon', coupon)
  from public.coupon_discount(p_code, p_subtotal, 0)
$$;

-- ---------------------------------------------------------------- Đặt hàng
-- p_items: [{id, qty, install}]  - giá luôn lấy từ bảng products, không tin dữ liệu client.
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
    update public.coupons set used_count = used_count + 1 where code = v_coupon;
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

  -- Trừ tồn kho (không âm), tăng số lượng đã bán
  update public.products pr set stock = greatest(pr.stock - x.qty, 0), sold = pr.sold + x.qty
  from (select (l ->> 'id')::bigint id, sum((l ->> 'qty')::int) qty from jsonb_array_elements(lines) l group by 1) x
  where pr.id = x.id;

  return public.order_json(v_order);
end $$;

-- ---------------------------------------------------------------- Tra cứu / hủy đơn
create or replace function public.track_order(p_code text, p_phone text) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.order_json(o) from public.orders o
  where o.code = upper(trim(p_code)) and o.phone = public.normalize_phone(p_phone)
$$;

create or replace function public.cancel_order(p_code text, p_phone text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set status = 'cancelled'
  where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) and status = 'pending'
  returning * into o;
  if not found then raise exception 'Không thể hủy đơn hàng này' using errcode = 'P0001'; end if;
  -- Hoàn lại tồn kho
  update public.products pr set stock = pr.stock + i.qty, sold = greatest(pr.sold - i.qty, 0)
  from public.order_items i where i.order_id = o.id and pr.id = i.product_id;
  return public.order_json(o);
end $$;

-- Đơn của tài khoản đang đăng nhập. Chỉ theo user_id: số điện thoại khi đăng ký
-- chưa xác minh OTP nên không dùng để ghép đơn (tránh xem trộm đơn người khác).
create or replace function public.my_orders() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.order_json(o) order by o.created_at desc), '[]'::jsonb)
  from public.orders o
  where auth.uid() is not null and o.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------- Gửi form (lead)
-- Trả về mã yêu cầu để hiển thị cho khách; khách không có quyền đọc bảng leads.
create or replace function public.submit_lead(p_type text, p_data jsonb, p_source_url text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare l public.leads;
begin
  if p_type not in ('contact', 'service', 'b2b-quote', 'newsletter') then
    raise exception 'Loại yêu cầu không hợp lệ' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 10000 then
    raise exception 'Dữ liệu không hợp lệ' using errcode = 'P0001';
  end if;
  if p_type <> 'newsletter' and not public.valid_phone(p_data ->> 'phone') then
    raise exception 'Số điện thoại không hợp lệ' using errcode = 'P0001';
  end if;
  insert into public.leads (type, name, phone, email, company, data, source_url)
  values (p_type, left(p_data ->> 'name', 100), nullif(p_data ->> 'phone', ''), nullif(p_data ->> 'email', ''),
          nullif(p_data ->> 'company', ''), p_data, left(p_source_url, 500))
  returning * into l;
  return jsonb_build_object('code', l.code, 'createdAt', l.created_at);
end $$;
