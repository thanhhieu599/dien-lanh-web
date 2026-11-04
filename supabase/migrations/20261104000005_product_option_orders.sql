begin;

alter table public.order_items
  add column options jsonb not null default '{}'::jsonb
  check (jsonb_typeof(options) = 'object');

create function public.validate_product_options(config jsonb, selections jsonb)
returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  option_name text;
  option_values jsonb;
  allowed text[];
  chosen jsonb := '{}'::jsonb;
  value text;
begin
  if jsonb_typeof(selections) is distinct from 'object' then
    raise exception 'Lựa chọn sản phẩm không hợp lệ' using errcode = 'P0001';
  end if;
  for option_name, option_values in select * from jsonb_each(coalesce(config, '{}'::jsonb)) loop
    if trim(option_name) = '' then continue; end if;
    if jsonb_typeof(option_values) = 'array' then
      select array_agg(distinct trim(v)) into allowed
      from jsonb_array_elements_text(option_values) v where trim(v) <> '';
    else
      select array_agg(distinct trim(v)) into allowed
      from regexp_split_to_table(coalesce(option_values #>> '{}', ''), E'[,;\n|]') v where trim(v) <> '';
    end if;
    if coalesce(cardinality(allowed), 0) = 0 then continue; end if;
    value := selections ->> trim(option_name);
    if value is null or not (value = any(allowed)) then
      raise exception 'Vui lòng chọn % hợp lệ', trim(option_name) using errcode = 'P0001';
    end if;
    chosen := chosen || jsonb_build_object(trim(option_name), value);
  end loop;
  return chosen;
end $$;

revoke all on function public.validate_product_options(jsonb, jsonb) from public, anon, authenticated;

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

  insert into public.order_items (order_id, product_id, sku, name, price, qty, install, options)
  select v_order.id, (l ->> 'id')::bigint, l ->> 'sku', l ->> 'name', (l ->> 'price')::bigint, (l ->> 'qty')::int, (l ->> 'install')::boolean, l -> 'options'
  from jsonb_array_elements(lines) l;

  -- Trừ tồn kho theo số thực có (hàng đặt trước khi hết kho vẫn nhận đơn), ghi lại số đã trừ để hủy đơn hoàn đúng
  perform public.take_stock(v_order.id);

  return public.order_json(v_order);
end $$;

create or replace function public.order_json(o public.orders) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', o.code,
    'createdAt', o.created_at,
    'status', o.status,
    'paymentStatus', o.payment_status,
    'paidAt', o.paid_at,
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
      select jsonb_agg(jsonb_build_object('id', i.product_id, 'sku', i.sku, 'name', i.name, 'price', i.price, 'qty', i.qty, 'install', i.install, 'options', i.options) order by i.id)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at) order by h.created_at)
      from public.order_status_history h where h.order_id = o.id), '[]'::jsonb)
  )
$$;

commit;
