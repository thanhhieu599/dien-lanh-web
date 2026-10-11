-- =====================================================================
-- Ảnh trang Tầm nhìn & Sứ mệnh (quản lý trong trang quản trị)
-- - Link ảnh lưu ở settings key 'vision': { "images": { "hero": "https://...", ... } } (đọc công khai, admin ghi)
-- - File ảnh lưu ở Supabase Storage, bucket công khai 'media' (chỉ admin tải lên / xóa)
-- =====================================================================
insert into public.settings (key, value) values ('vision', '{"images": {}}'::jsonb)
on conflict (key) do nothing;

-- Storage chỉ có trên Supabase (PostgreSQL thường khi kiểm thử cục bộ thì bỏ qua)
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'Bỏ qua cấu hình Storage (không phải Supabase)';
    return;
  end if;
  insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do update set public = true;

  drop policy if exists media_public_read on storage.objects;
  drop policy if exists media_admin_insert on storage.objects;
  drop policy if exists media_admin_update on storage.objects;
  drop policy if exists media_admin_delete on storage.objects;
  create policy media_public_read on storage.objects for select using (bucket_id = 'media');
  create policy media_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
  create policy media_admin_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
  create policy media_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
end $$;
