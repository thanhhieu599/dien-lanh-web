begin;

alter table public.coupons
  add column combine_discounts boolean not null default true,
  add column scope text not null default 'all' check (scope in ('all','categories','products')),
  add column product_ids bigint[] not null default '{}',
  add column category_ids text[] not null default '{}',
  add column condition_type text not null default 'none' check (condition_type in ('none','order_min','eligible_min','eligible_qty')),
  add column condition_value bigint not null default 0 check (condition_value >= 0),
  add column customer_groups text[] not null default '{}',
  add column once_per_customer boolean not null default false;
alter table public.coupons add constraint coupons_percent_valid check (type <> 'percent' or value <= 100);
alter table public.coupons add constraint coupons_limits_valid check (min >= 0 and (max is null or max >= 0) and (usage_limit is null or usage_limit > 0));
alter table public.coupons add constraint coupons_time_valid check (starts_at is null or ends_at is null or ends_at > starts_at);

create function public.coupon_cart_discount(p_code text, p_items jsonb, p_phone text default null)
returns table (ok boolean, message text, discount bigint, free_ship boolean, coupon jsonb)
language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons;
  p public.products;
  it jsonb;
  qty int;
  v_subtotal bigint := 0;
  v_base bigint := 0;
  v_qty bigint := 0;
  v_phone text := public.normalize_phone(p_phone);
  eligible boolean;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found or not c.active then
    return query select false, 'Mã giảm giá không tồn tại hoặc đã tắt'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if (c.starts_at is not null and now() < c.starts_at) or (c.ends_at is not null and now() >= c.ends_at) then
    return query select false, 'Mã giảm giá chưa có hiệu lực hoặc đã hết hạn'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select false, 'Mã giảm giá đã hết lượt sử dụng'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    return query select false, 'Giỏ hàng không hợp lệ'::text, 0::bigint, false, null::jsonb; return;
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    qty := (it ->> 'qty')::int;
    if qty is null or qty < 1 or qty > 99 then raise exception 'Số lượng không hợp lệ' using errcode = 'P0001'; end if;
    select * into p from public.products where id = (it ->> 'id')::bigint and active;
    if not found then raise exception 'Sản phẩm không còn kinh doanh' using errcode = 'P0001'; end if;
    v_subtotal := v_subtotal + p.price * qty;
    eligible := c.scope = 'all' or (c.scope = 'products' and p.id = any(c.product_ids)) or
      (c.scope = 'categories' and exists(select 1 from public.categories cat where cat.id = any(c.category_ids)
        and (p.cat = cat.id or p.id = any(cat.product_ids)) and not p.id = any(cat.excluded_product_ids)));
    if not c.combine_discounts and (p.old_price > p.price or p.flash_sale) then eligible := false; end if;
    if eligible then v_base := v_base + p.price * qty; v_qty := v_qty + qty; end if;
  end loop;
  if v_qty = 0 then
    return query select false, 'Giỏ hàng chưa có sản phẩm đủ điều kiện áp dụng mã'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if v_subtotal < c.min then
    return query select false, format('Đơn hàng tối thiểu %s₫ để dùng mã này', c.min), 0::bigint, false, null::jsonb; return;
  end if;
  if (c.condition_type = 'eligible_min' and v_base < c.condition_value) or (c.condition_type = 'eligible_qty' and v_qty < c.condition_value) then
    return query select false, 'Chưa đạt giá trị hoặc số lượng sản phẩm khuyến mãi tối thiểu'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if coalesce(v_phone, '') = '' and auth.uid() is not null then select phone into v_phone from public.profiles where id = auth.uid(); end if;
  if (c.once_per_customer or cardinality(c.customer_groups) > 0) and coalesce(v_phone, '') = '' then
    return query select false, 'Vui lòng đăng nhập hoặc nhập số điện thoại thanh toán để áp dụng mã'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if c.once_per_customer and exists(select 1 from public.orders o where o.coupon = c.code and o.phone = v_phone and o.status <> 'cancelled') then
    return query select false, 'Khách hàng đã sử dụng mã này'::text, 0::bigint, false, null::jsonb; return;
  end if;
  if cardinality(c.customer_groups) > 0 and not exists (
    select 1 from public.crm_customers cu, unnest(c.customer_groups) g
    where cu.phone = v_phone and ((g = 'vip' and 'VIP' = any(cu.tags)) or (g = 'marketing' and cu.marketing_opt_in)
      or (g like 'tag:%' and substring(g from 5) = any(cu.tags)))
  ) then
    return query select false, 'Mã chỉ dành cho nhóm khách hàng đã được chọn'::text, 0::bigint, false, null::jsonb; return;
  end if;
  return query select true, coalesce(c.description, 'Đã áp dụng mã giảm giá'),
    case c.type when 'percent' then least(v_base * c.value / 100, coalesce(c.max, v_base))
      when 'fixed' then least(c.value, v_base) else 0 end::bigint,
    c.type = 'ship', to_jsonb(c);
end $$;
revoke all on function public.coupon_cart_discount(text, jsonb, text) from public, anon, authenticated;

create function public.validate_coupon_cart(p_code text, p_items jsonb, p_phone text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', ok, 'msg', message, 'discount', discount, 'free_ship', free_ship, 'coupon', coupon)
  from public.coupon_cart_discount(p_code, p_items, p_phone)
$$;
revoke all on function public.validate_coupon_cart(text, jsonb, text) from public;
grant execute on function public.validate_coupon_cart(text, jsonb, text) to anon, authenticated;

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
    lines := lines || jsonb_build_object('id', p.id, 'sku', p.sku, 'name', p.name, 'price', p.price, 'qty', qty, 'install', inst, 'options', public.validate_product_options(p.options, coalesce(it -> 'options', '{}'::jsonb)));
  end loop;

  v_shipping := case when v_method = 'pickup' or v_subtotal >= v_free_ship then 0 else v_ship_fee end;

  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    perform pg_advisory_xact_lock(hashtextextended(upper(trim(p_coupon)) || ':' || v_phone, 0));
    select * into cp from public.coupon_cart_discount(p_coupon, p_items, v_phone);
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

  insert into public.order_items (order_id, product_id, sku, name, price, qty, install, options)
  select v_order.id, (l ->> 'id')::bigint, l ->> 'sku', l ->> 'name', (l ->> 'price')::bigint, (l ->> 'qty')::int, (l ->> 'install')::boolean, l -> 'options'
  from jsonb_array_elements(lines) l;

  -- Trừ tồn kho theo số thực có (hàng đặt trước khi hết kho vẫn nhận đơn), ghi lại số đã trừ để hủy đơn hoàn đúng
  perform public.take_stock(v_order.id);

  return public.order_json(v_order);
end $$;

commit;
