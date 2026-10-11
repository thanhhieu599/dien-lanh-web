-- =====================================================================
-- Vận hành & quản trị
-- 1. Phân quyền chi tiết: thêm vai trò "sales" (kinh doanh) và "accountant" (kế toán)
--    - sales: chỉ xem / cập nhật khách hàng tiềm năng được giao cho mình (trạng thái, ghi chú)
--    - accountant: xem đơn hàng, giao dịch thanh toán; chỉ được sửa trạng thái thanh toán
-- 2. Nguồn khách (UTM / quảng cáo) gắn vào đơn hàng để tính hiệu quả quảng cáo
-- 3. Lịch bảo trì định kỳ: đơn có máy lạnh + khách đồng ý -> khi đơn hoàn thành, xếp lịch nhắc
--    vệ sinh máy sau 6, 12, 18, 24 tháng (cấu hình trong settings 'store': maintenanceMonths, maintenanceCycles)
-- 4. Nhân viên được tải ảnh sản phẩm / dự án lên kho ảnh (thư mục products/, projects/)
-- =====================================================================

-- ---------------------------------------------------------------- 1. Vai trò
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'staff', 'sales', 'accountant', 'admin'));

create or replace function public.is_sales() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'sales'
$$;
create or replace function public.is_accountant() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'accountant'
$$;

-- Kinh doanh: chỉ lead được giao cho mình
create policy leads_sales_read on public.leads for select to authenticated
  using (public.is_sales() and assigned_to = auth.uid());
create policy leads_sales_update on public.leads for update to authenticated
  using (public.is_sales() and assigned_to = auth.uid())
  with check (public.is_sales() and assigned_to = auth.uid());

-- Kinh doanh chỉ đổi trạng thái & ghi chú chăm sóc (không sửa thông tin khách, không tự giao lead)
create or replace function public.guard_lead_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_sales() and (to_jsonb(new) - array['status', 'staff_note', 'updated_at']) is distinct from (to_jsonb(old) - array['status', 'staff_note', 'updated_at']) then
    raise exception 'Nhân viên kinh doanh chỉ được cập nhật trạng thái và ghi chú' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger leads_guard_update before update on public.leads
  for each row execute function public.guard_lead_update();

-- Kế toán: xem đơn hàng, chi tiết, lịch sử, giao dịch; chỉ sửa trạng thái thanh toán
create policy orders_accountant_read on public.orders for select to authenticated using (public.is_accountant());
create policy orders_accountant_update on public.orders for update to authenticated
  using (public.is_accountant()) with check (public.is_accountant());
create policy order_items_accountant_read on public.order_items for select to authenticated using (public.is_accountant());
create policy osh_accountant_read on public.order_status_history for select to authenticated using (public.is_accountant());
create policy payments_accountant_read on public.payments for select to authenticated using (public.is_accountant());

create or replace function public.guard_order_accountant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_accountant() and (to_jsonb(new) - array['payment_status', 'paid_at', 'updated_at']) is distinct from (to_jsonb(old) - array['payment_status', 'paid_at', 'updated_at']) then
    raise exception 'Kế toán chỉ được cập nhật trạng thái thanh toán' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger orders_guard_accountant before update on public.orders
  for each row execute function public.guard_order_accountant();

-- ---------------------------------------------------------------- 2 & 3. Cột mới của đơn hàng
alter table public.orders add column if not exists maintenance_optin boolean not null default false;
alter table public.orders add column if not exists attribution jsonb;   -- {source, medium, campaign, term, content, referrer, landing, gclid, fbclid}

alter table public.notifications drop constraint if exists notifications_event_check;
alter table public.notifications add constraint notifications_event_check
  check (event in ('order_new', 'order_status', 'order_paid', 'lead_new', 'cart_reminder', 'maintenance_reminder'));
create index if not exists notifications_maint_order_idx on public.notifications (order_id) where event = 'maintenance_reminder';
create index if not exists notifications_maint_phone_idx on public.notifications ((data ->> 'phone')) where event = 'maintenance_reminder';

-- Sau khi đặt hàng, website gửi kèm: khách đồng ý nhắc bảo trì + nguồn truy cập (xác thực bằng mã đơn + SĐT)
create or replace function public.order_extras(p_code text, p_phone text, p_maintenance boolean default null, p_attribution jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  v_attr jsonb;
begin
  select * into o from public.orders where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) for update;
  if not found then raise exception 'Không tìm thấy đơn hàng' using errcode = 'P0001'; end if;
  if p_maintenance is not null and o.status <> 'cancelled' then
    update public.orders set maintenance_optin = p_maintenance where id = o.id and maintenance_optin is distinct from p_maintenance;
  end if;
  -- Nguồn khách chỉ ghi 1 lần, trong ngày đặt hàng
  if p_attribution is not null and jsonb_typeof(p_attribution) = 'object' and o.attribution is null and o.created_at > now() - interval '1 day' then
    select jsonb_object_agg(k, left(p_attribution ->> k, 300)) into v_attr
    from unnest(array['source', 'medium', 'campaign', 'term', 'content', 'referrer', 'landing', 'gclid', 'fbclid']) k
    where coalesce(p_attribution ->> k, '') <> '';
    if v_attr is not null then update public.orders set attribution = v_attr where id = o.id; end if;
  end if;
  select * into o from public.orders where id = o.id;
  return jsonb_build_object('code', o.code, 'maintenance', o.maintenance_optin);
end $$;

-- Xếp / hủy lịch nhắc bảo trì theo trạng thái đơn
create or replace function public.maintenance_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_store jsonb := coalesce((select value from public.settings where key = 'store'), '{}'::jsonb);
  -- Cấu hình sai định dạng không được làm lỗi việc cập nhật đơn -> dùng mặc định
  v_months int := least(greatest(case when v_store ->> 'maintenanceMonths' ~ '^\s*\d{1,3}\s*$' then (v_store ->> 'maintenanceMonths')::int else 6 end, 1), 24);
  v_cycles int := least(greatest(case when v_store ->> 'maintenanceCycles' ~ '^\s*\d{1,3}\s*$' then (v_store ->> 'maintenanceCycles')::int else 4 end, 1), 10);
  v_units int;
  v_items text;
  v_base timestamp := date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh');
begin
  -- Đơn chưa / không còn hoàn thành, hoặc khách không đồng ý -> hủy các lời nhắc chưa gửi
  if new.status <> 'done' or not new.maintenance_optin then
    update public.notifications
    set status = 'done', processed_at = now(),
        results = results || jsonb_build_object('cancelled', jsonb_build_object('ok', true, 'at', now(),
          'reason', case when new.status = 'cancelled' then 'order_cancelled' when not new.maintenance_optin then 'opt_out' else 'order_reopened' end))
    where event = 'maintenance_reminder' and order_id = new.id and status = 'pending';
    return new;
  end if;
  -- Đã từng xếp lịch: bật lại các lần nhắc bị hủy mà chưa đến hạn
  if exists (select 1 from public.notifications where event = 'maintenance_reminder' and order_id = new.id) then
    update public.notifications
    set status = 'pending', processed_at = null, results = results - 'cancelled'
    where event = 'maintenance_reminder' and order_id = new.id and status = 'done' and results ? 'cancelled' and next_at > now();
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

create trigger orders_maintenance after update of status, maintenance_optin on public.orders
  for each row execute function public.maintenance_sync();

-- Khách đặt lịch dịch vụ (cùng SĐT) -> ghi nhận chuyển đổi và bỏ lời nhắc sắp đến hạn (trong 45 ngày)
create or replace function public.maintenance_booked() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_phone text := public.phone_key(new.phone);
begin
  if new.type <> 'service' or coalesce(v_phone, '') = '' then return new; end if;
  update public.notifications
  set status = 'done', processed_at = coalesce(processed_at, now()),
      results = results || jsonb_build_object('booked', jsonb_build_object('ok', true, 'at', now(), 'lead', new.code))
  where event = 'maintenance_reminder' and data ->> 'phone' = v_phone and not results ? 'booked'
    and ((status = 'pending' and next_at < now() + interval '45 days')
      or (status = 'done' and not results ? 'cancelled' and processed_at > now() - interval '45 days'));
  return new;
end $$;

create trigger leads_maintenance_booked after insert on public.leads
  for each row execute function public.maintenance_booked();

-- Nhân viên bỏ / bật lại 1 lần nhắc trong trang Lịch bảo trì (ghi rõ lý do để phân biệt với lời nhắc đã gửi)
create or replace function public.maintenance_skip(p_id bigint, p_skip boolean default true) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Không có quyền' using errcode = '42501'; end if;
  if p_skip then
    update public.notifications
    set status = 'done', processed_at = now(),
        results = results || jsonb_build_object('cancelled', jsonb_build_object('ok', true, 'at', now(), 'reason', 'staff', 'by', auth.uid()))
    where id = p_id and event = 'maintenance_reminder' and status = 'pending';
  else
    update public.notifications
    set status = 'pending', processed_at = null, results = results - 'cancelled'
    where id = p_id and event = 'maintenance_reminder' and status = 'done' and results ? 'cancelled' and next_at > now()
      and exists (select 1 from public.orders o where o.id = order_id and o.status = 'done' and o.maintenance_optin);
  end if;
  return found;
end $$;

-- ---------------------------------------------------------------- 4. Kho ảnh: nhân viên tải ảnh sản phẩm, dự án (thư mục products/, projects/)
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'Bỏ qua cấu hình Storage (không phải Supabase)';
    return;
  end if;
  drop policy if exists media_staff_products_insert on storage.objects;
  drop policy if exists media_staff_products_update on storage.objects;
  drop policy if exists media_staff_products_delete on storage.objects;
  create policy media_staff_products_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'media' and public.is_staff() and (name like 'products/%' or name like 'projects/%'));
  create policy media_staff_products_update on storage.objects for update to authenticated
    using (bucket_id = 'media' and public.is_staff() and (name like 'products/%' or name like 'projects/%'))
    with check (bucket_id = 'media' and public.is_staff() and (name like 'products/%' or name like 'projects/%'));
  create policy media_staff_products_delete on storage.objects for delete to authenticated
    using (bucket_id = 'media' and public.is_staff() and (name like 'products/%' or name like 'projects/%'));
end $$;

-- ---------------------------------------------------------------- Quyền thực thi
revoke execute on function public.guard_lead_update(), public.guard_order_accountant(), public.maintenance_sync(), public.maintenance_booked()
  from public, anon, authenticated;
grant execute on function public.is_sales(), public.is_accountant() to anon, authenticated;
grant execute on function public.order_extras(text, text, boolean, jsonb) to anon, authenticated;
grant execute on function public.maintenance_skip(bigint, boolean) to authenticated;
