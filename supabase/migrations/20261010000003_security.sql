-- =====================================================================
-- Phân quyền: Row Level Security + quyền thực thi hàm
-- anon          = khách chưa đăng nhập (dùng anon key công khai trên website)
-- authenticated = khách đã đăng nhập
-- staff / admin = profiles.role, dùng cho trang quản trị (giai đoạn 3)
-- =====================================================================

-- ---------------------------------------------------------------- Bật RLS cho mọi bảng
do $$
declare t text;
begin
  foreach t in array array['settings','categories','brands','products','stores','posts','banners','services','policies',
                           'coupons','profiles','orders','order_items','order_status_history','reviews','leads']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- Danh mục, nội dung: đọc công khai, nhân viên ghi
do $$
declare t text;
begin
  foreach t in array array['categories','brands','products','stores','banners','services'] loop
    execute format('create policy "%1$s_public_read" on public.%1$I for select using (active or public.is_staff())', t);
    execute format('create policy "%1$s_staff_write" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
  foreach t in array array['settings','policies'] loop
    execute format('create policy "%1$s_public_read" on public.%1$I for select using (true)', t);
    execute format('create policy "%1$s_admin_write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

create policy posts_public_read on public.posts for select using (published or public.is_staff());
create policy posts_staff_write on public.posts for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Mã giảm giá: chỉ mã công khai còn hiệu lực mới đọc được; mã riêng kiểm tra qua validate_coupon()
create policy coupons_public_read on public.coupons for select
  using ((is_public and active and (ends_at is null or ends_at > now())) or public.is_staff());
create policy coupons_staff_write on public.coupons for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------- Hồ sơ khách hàng
create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_staff()) with check (id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------- Đơn hàng
-- Không cho insert trực tiếp: mọi đơn đi qua place_order() để tính giá phía server.
create policy orders_own_read on public.orders for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy orders_staff_update on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy orders_admin_delete on public.orders for delete to authenticated using (public.is_admin());

create policy order_items_read on public.order_items for select to authenticated
  using (public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy order_items_staff_write on public.order_items for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy osh_read on public.order_status_history for select to authenticated
  using (public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy osh_staff_insert on public.order_status_history for insert to authenticated with check (public.is_staff());

-- ---------------------------------------------------------------- Đánh giá
create policy reviews_public_read on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.is_staff());
create policy reviews_anyone_insert on public.reviews for insert with check (true);  -- trigger ép status = pending
create policy reviews_staff_manage on public.reviews for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy reviews_staff_delete on public.reviews for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------- Lead (form liên hệ, dịch vụ, báo giá B2B)
-- Khách gửi qua submit_lead(); chỉ nhân viên đọc / ghi trực tiếp.
create policy leads_staff_insert on public.leads for insert to authenticated with check (public.is_staff());
create policy leads_staff_read on public.leads for select to authenticated using (public.is_staff());
create policy leads_staff_update on public.leads for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy leads_admin_delete on public.leads for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- Quyền bảng (Supabase đã cấp sẵn, ghi rõ để chạy được trên Postgres thường)
grant usage on schema public to anon, authenticated;
grant select on public.settings, public.categories, public.brands, public.products, public.stores, public.posts,
                public.banners, public.services, public.policies, public.coupons, public.reviews to anon, authenticated;
grant insert (product_id, name, phone, rating, text) on public.reviews to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items, public.order_status_history, public.leads to authenticated;
grant insert, update, delete on public.categories, public.brands, public.products, public.stores, public.posts, public.banners,
                public.services, public.policies, public.settings, public.coupons, public.orders, public.order_items,
                public.order_status_history, public.reviews, public.leads to authenticated;  -- RLS giới hạn lại cho staff/admin

-- ---------------------------------------------------------------- Quyền thực thi hàm
-- Mặc định Postgres cho PUBLIC execute mọi hàm -> thu hồi, chỉ mở các hàm API.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.place_order(jsonb, jsonb, jsonb, text, jsonb, text, text),
  public.track_order(text, text),
  public.cancel_order(text, text),
  public.validate_coupon(text, bigint),
  public.submit_lead(text, jsonb, text)
  to anon, authenticated;
grant execute on function public.my_orders() to authenticated;
-- Dùng trong policy / trigger
grant execute on function public.is_staff(), public.is_admin(), public.current_role_name(),
  public.normalize_phone(text), public.valid_phone(text) to anon, authenticated;
