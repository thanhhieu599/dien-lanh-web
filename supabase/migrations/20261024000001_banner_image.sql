-- =====================================================================
-- Banner trang chủ chỉ hiển thị hình: thêm cột ảnh banner
-- - banners.image: link ảnh (tải lên kho ảnh 'media', thư mục banners/)
-- - Nhân viên được tải / thay / xóa ảnh trong banners/
-- =====================================================================
alter table public.banners add column if not exists image text;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'Bỏ qua cấu hình Storage (không phải Supabase)';
    return;
  end if;
  drop policy if exists media_staff_banners_insert on storage.objects;
  drop policy if exists media_staff_banners_update on storage.objects;
  drop policy if exists media_staff_banners_delete on storage.objects;
  create policy media_staff_banners_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'media' and public.is_staff() and name like 'banners/%');
  create policy media_staff_banners_update on storage.objects for update to authenticated
    using (bucket_id = 'media' and public.is_staff() and name like 'banners/%')
    with check (bucket_id = 'media' and public.is_staff() and name like 'banners/%');
  create policy media_staff_banners_delete on storage.objects for delete to authenticated
    using (bucket_id = 'media' and public.is_staff() and name like 'banners/%');
end $$;
