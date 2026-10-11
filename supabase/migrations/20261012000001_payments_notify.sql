-- =====================================================================
-- Giai đoạn 4: thanh toán online & thông báo tự động
-- - payments: mỗi lần khách bấm thanh toán (VNPay/MoMo) hoặc mỗi giao dịch chuyển khoản (SePay)
-- - notifications: hàng đợi sự kiện (đơn mới, đổi trạng thái, đã thanh toán, lead mới)
--   Edge Function "notify" lấy ra gửi email / Zalo / Telegram / ZNS, có thử lại khi lỗi.
-- Các hàm thanh toán & hàng đợi chỉ dành cho service_role (Edge Functions), website không gọi trực tiếp.
-- =====================================================================

-- ---------------------------------------------------------------- Đơn hàng: trạng thái thanh toán
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'partial', 'paid', 'refunded'));
alter table public.orders add column if not exists paid_at timestamptz;

-- ---------------------------------------------------------------- Giao dịch thanh toán
create table public.payments (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders(id) on delete cascade,
  provider     text not null check (provider in ('vnpay', 'momo', 'bank')),
  txn_ref      text not null unique,          -- mã giao dịch gửi sang cổng (VNPay vnp_TxnRef / MoMo orderId)
  amount       bigint not null check (amount >= 0),
  status       text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  provider_txn text,                          -- mã giao dịch phía cổng / ngân hàng
  message      text,
  raw          jsonb,                         -- dữ liệu IPN / webhook gốc để đối soát
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index payments_order_idx on public.payments (order_id, created_at desc);
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- Bắt đầu một lần thanh toán online. Xác thực bằng mã đơn + SĐT (giống tra cứu đơn).
create or replace function public.payment_start(p_code text, p_phone text, p_provider text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  n int;
  v_ref text;
begin
  if p_provider not in ('vnpay', 'momo') then raise exception 'Cổng thanh toán không hợp lệ' using errcode = 'P0001'; end if;
  select * into o from public.orders
  where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) for update;
  if not found then raise exception 'Không tìm thấy đơn hàng' using errcode = 'P0001'; end if;
  if o.status = 'cancelled' then raise exception 'Đơn hàng đã hủy, không thể thanh toán' using errcode = 'P0001'; end if;
  if o.payment_status = 'paid' then raise exception 'Đơn hàng đã được thanh toán' using errcode = 'P0001'; end if;
  if o.total <= 0 then raise exception 'Đơn hàng không cần thanh toán' using errcode = 'P0001'; end if;
  select count(*) into n from public.payments where order_id = o.id and provider <> 'bank';
  if n >= 10 then raise exception 'Bạn đã thử thanh toán quá nhiều lần, vui lòng gọi hotline' using errcode = 'P0001'; end if;
  -- Link thanh toán cũ hết hiệu lực (nếu khách vẫn trả bằng link cũ, IPN vẫn được ghi nhận)
  update public.payments set status = 'expired' where order_id = o.id and status = 'pending' and provider <> 'bank';
  v_ref := o.code || 'P' || lpad((n + 1)::text, 2, '0');
  insert into public.payments (order_id, provider, txn_ref, amount) values (o.id, p_provider, v_ref, o.total);
  update public.orders set payment = case p_provider when 'vnpay' then 'card' else 'wallet' end
  where id = o.id and payment <> case p_provider when 'vnpay' then 'card' else 'wallet' end;
  return jsonb_build_object('txnRef', v_ref, 'amount', o.total, 'code', o.code);
end $$;

-- Ghi nhận kết quả từ IPN của VNPay / MoMo (đã kiểm tra chữ ký ở Edge Function).
-- Trả về: ok | already | failed | not_found | amount_mismatch
create or replace function public.payment_confirm(
  p_txn_ref text, p_amount bigint, p_success boolean,
  p_provider_txn text default null, p_message text default null, p_raw jsonb default null
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare pay public.payments;
begin
  select * into pay from public.payments where txn_ref = p_txn_ref for update;
  if not found then return 'not_found'; end if;
  if pay.amount <> p_amount then return 'amount_mismatch'; end if;
  if pay.status in ('paid', 'failed') then return 'already'; end if;
  if not p_success then
    update public.payments set status = 'failed', provider_txn = p_provider_txn, message = p_message, raw = p_raw where id = pay.id;
    return 'failed';
  end if;
  update public.payments set status = 'paid', paid_at = now(), provider_txn = p_provider_txn, message = p_message, raw = p_raw where id = pay.id;
  update public.orders set payment_status = 'paid', paid_at = now() where id = pay.order_id and payment_status <> 'paid';
  return 'ok';
end $$;

-- Tiền vào tài khoản ngân hàng (webhook SePay). Nội dung chuyển khoản phải chứa mã đơn DTyymmddxxxx.
-- Cộng dồn nhiều lần chuyển; đủ tổng tiền -> đã thanh toán, thiếu -> thanh toán một phần.
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
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id and status = 'paid';
  update public.orders
  set payment_status = case when v_paid >= o.total then 'paid' else 'partial' end,
      paid_at = case when v_paid >= o.total then now() else paid_at end
  where id = o.id and payment_status <> 'paid';
  return jsonb_build_object('result', 'ok', 'code', v_code, 'paid', v_paid, 'total', o.total);
end $$;

-- Trang tra cứu / kết quả thanh toán cần biết thời điểm thanh toán
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
      select jsonb_agg(jsonb_build_object('id', i.product_id, 'sku', i.sku, 'name', i.name, 'price', i.price, 'qty', i.qty, 'install', i.install) order by i.id)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at) order by h.created_at)
      from public.order_status_history h where h.order_id = o.id), '[]'::jsonb)
  )
$$;

-- Trang kết quả thanh toán: tra theo mã giao dịch (không lộ thông tin cá nhân)
create or replace function public.payment_lookup(p_txn_ref text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', o.code, 'status', o.status, 'paymentStatus', o.payment_status, 'total', o.total,
                            'payment', p.status, 'provider', p.provider)
  from public.payments p join public.orders o on o.id = p.order_id
  where p.txn_ref = p_txn_ref
$$;

-- ---------------------------------------------------------------- Hàng đợi thông báo
create table public.notifications (
  id           bigint generated always as identity primary key,
  event        text not null check (event in ('order_new', 'order_status', 'order_paid', 'lead_new')),
  order_id     bigint references public.orders(id) on delete cascade,
  lead_id      bigint references public.leads(id) on delete cascade,
  data         jsonb not null default '{}'::jsonb,
  status       text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts     int not null default 0,
  results      jsonb not null default '{}'::jsonb,   -- {kênh: {ok, at, error}}
  next_at      timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index notifications_queue_idx on public.notifications (next_at) where status in ('pending', 'processing');
create index notifications_created_idx on public.notifications (created_at desc);

create or replace function public.enqueue_order_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (event, order_id) values ('order_new', new.id);
    return new;
  end if;
  if new.status is distinct from old.status and new.status <> 'pending' then
    insert into public.notifications (event, order_id, data)
    values ('order_status', new.id, jsonb_build_object('status', new.status, 'from', old.status));
  end if;
  if new.payment_status is distinct from old.payment_status and new.payment_status in ('paid', 'partial') then
    insert into public.notifications (event, order_id, data)
    values ('order_paid', new.id, jsonb_build_object('paymentStatus', new.payment_status));
  end if;
  return new;
end $$;

create trigger orders_notify after insert or update of status, payment_status on public.orders
  for each row execute function public.enqueue_order_events();

create or replace function public.enqueue_lead_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'spam' then
    insert into public.notifications (event, lead_id) values ('lead_new', new.id);
  end if;
  return new;
end $$;

create trigger leads_notify after insert on public.leads
  for each row execute function public.enqueue_lead_event();

-- Lấy một lô sự kiện cần gửi (khóa 5 phút; worker chết giữa chừng thì lô được lấy lại)
create or replace function public.notifications_claim(p_limit int default 20) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v jsonb;
begin
  with picked as (
    select id from public.notifications
    where status in ('pending', 'processing') and next_at <= now()
    order by id
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  ), upd as (
    update public.notifications n
    set status = 'processing', attempts = n.attempts + 1, next_at = now() + interval '5 minutes'
    from picked where n.id = picked.id
    returning n.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id, 'event', u.event, 'data', u.data, 'attempts', u.attempts, 'results', u.results, 'createdAt', u.created_at,
    'order', (select public.order_json(o) || jsonb_build_object('id', o.id, 'staffNote', o.staff_note) from public.orders o where o.id = u.order_id),
    'lead', (select to_jsonb(l) - 'staff_note' from public.leads l where l.id = u.lead_id)
  ) order by u.id), '[]'::jsonb) into v
  from upd u;
  return v;
end $$;

-- Lưu kết quả gửi. Chưa xong -> thử lại sau 2, 4, 8, 16, 32 phút; quá 6 lần -> failed.
create or replace function public.notification_finish(p_id bigint, p_results jsonb, p_done boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update public.notifications
  set results = results || coalesce(p_results, '{}'::jsonb),
      status = case when p_done then 'done' when attempts >= 6 then 'failed' else 'pending' end,
      next_at = case when p_done then next_at else now() + make_interval(mins => power(2, least(attempts, 6))::int) end,
      processed_at = case when p_done or attempts >= 6 then now() else processed_at end
  where id = p_id;
end $$;

-- Token Zalo OA (access token sống 25 giờ, refresh token đổi mới mỗi lần làm mới) - chỉ service_role
create table public.integration_tokens (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.integration_token_get(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.integration_tokens where key = p_key
$$;

create or replace function public.integration_token_set(p_key text, p_value jsonb) returns void
language sql volatile security definer set search_path = public as $$
  insert into public.integration_tokens (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
$$;

-- ---------------------------------------------------------------- Phân quyền
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.integration_tokens enable row level security;  -- không có policy: chỉ service_role

create policy payments_staff_read on public.payments for select to authenticated using (public.is_staff());
create policy notifications_staff_read on public.notifications for select to authenticated using (public.is_staff());
-- Nhân viên được bấm "Gửi lại" (đặt lại status = pending)
create policy notifications_staff_retry on public.notifications for update to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.payments, public.notifications to authenticated;
grant update (status, next_at) on public.notifications to authenticated;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.payments, public.notifications, public.integration_tokens to service_role;

revoke execute on function
  public.payment_start(text, text, text),
  public.payment_confirm(text, bigint, boolean, text, text, jsonb),
  public.payment_bank_transfer(text, text, bigint, jsonb),
  public.payment_lookup(text),
  public.notifications_claim(int),
  public.notification_finish(bigint, jsonb, boolean),
  public.integration_token_get(text),
  public.integration_token_set(text, jsonb),
  public.enqueue_order_events(),
  public.enqueue_lead_event()
  from public, anon, authenticated;
grant execute on function
  public.payment_start(text, text, text),
  public.payment_confirm(text, bigint, boolean, text, text, jsonb),
  public.payment_bank_transfer(text, text, bigint, jsonb),
  public.payment_lookup(text),
  public.notifications_claim(int),
  public.notification_finish(bigint, jsonb, boolean),
  public.integration_token_get(text),
  public.integration_token_set(text, jsonb),
  public.order_json(public.orders)
  to service_role;
-- order_json được tạo lại ở trên -> giữ nguyên không cấp cho anon/authenticated
revoke execute on function public.order_json(public.orders) from public, anon, authenticated;

-- ---------------------------------------------------------------- Khách không tự hủy đơn đã thanh toán (cần hoàn tiền -> gọi hotline)
create or replace function public.cancel_order(p_code text, p_phone text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set status = 'cancelled'
  where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) and status = 'pending' and payment_status in ('unpaid')
  returning * into o;
  if not found then
    if exists (select 1 from public.orders where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) and status = 'pending') then
      raise exception 'Đơn hàng đã thanh toán, vui lòng gọi hotline để được hủy và hoàn tiền' using errcode = 'P0001';
    end if;
    raise exception 'Không thể hủy đơn hàng này' using errcode = 'P0001';
  end if;
  return public.order_json(o);
end $$;
