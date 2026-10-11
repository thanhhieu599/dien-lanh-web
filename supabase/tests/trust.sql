-- Kiểm thử Dự án tiêu biểu & Hỏi đáp (migration 20261016000001_trust_seo.sql). Chạy sau sales.sql.
select set_config('role', 'postgres', false);
select set_config('request.jwt.claims', '', false);
update public.projects set published = true where slug = 'dieu-hoa-van-phong-6-tang';
update public.faqs set active = false where id = (select min(id) from public.faqs);

-- 24. Khách (anon): chỉ thấy dự án đã đăng & câu hỏi đang hiện; không được ghi; đọc được settings 'trust'
select set_config('role', 'anon', false);
do $$ begin
  assert (select count(*) from public.projects) = 1, 'anon chỉ thấy dự án đã đăng';
  assert (select count(*) from public.faqs) = 23, 'anon chỉ thấy câu hỏi đang hiện';
  assert exists (select 1 from public.settings where key = 'trust'), 'anon đọc được trust';
  begin insert into public.projects (slug, title) values ('x', 'Dự án giả'); raise exception 'anon KHÔNG được thêm dự án';
  exception when insufficient_privilege then null; end;
  begin update public.settings set value = '{}' where key = 'trust'; if found then raise exception 'anon KHÔNG được sửa trust'; end if;
  exception when insufficient_privilege then null; end;
  raise notice 'OK 24 - khách chỉ đọc dự án đã đăng, FAQ đang hiện';
end $$;
select set_config('role', 'postgres', false);
