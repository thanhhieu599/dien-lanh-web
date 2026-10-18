-- =====================================================================
-- Trang Thương hiệu: logo cho từng thương hiệu
-- - brands.logo: link ảnh logo (tải lên kho ảnh 'media', thư mục brands/)
-- - Nhân viên (quản lý thương hiệu) được tải / thay / xóa ảnh trong brands/
-- =====================================================================

alter table public.brands add column if not exists logo text;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'Bỏ qua cấu hình Storage (không phải Supabase)';
    return;
  end if;
  drop policy if exists media_staff_brands_insert on storage.objects;
  drop policy if exists media_staff_brands_update on storage.objects;
  drop policy if exists media_staff_brands_delete on storage.objects;
  create policy media_staff_brands_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'media' and public.is_staff() and name like 'brands/%');
  create policy media_staff_brands_update on storage.objects for update to authenticated
    using (bucket_id = 'media' and public.is_staff() and name like 'brands/%')
    with check (bucket_id = 'media' and public.is_staff() and name like 'brands/%');
  create policy media_staff_brands_delete on storage.objects for delete to authenticated
    using (bucket_id = 'media' and public.is_staff() and name like 'brands/%');
end $$;
