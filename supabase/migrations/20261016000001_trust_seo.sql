-- =====================================================================
-- Uy tín & SEO
-- - projects : Dự án tiêu biểu (ảnh trước / sau, quy mô, thời gian thi công, cảm nhận khách hàng)
-- - faqs     : Hỏi đáp (trang hoi-dap.html, dữ liệu có cấu trúc FAQPage cho Google & trợ lý AI)
-- - settings 'trust': logo khách hàng / đối tác, chứng nhận, đánh giá Google (quản trị nhập)
-- Đọc công khai (chỉ mục đã đăng); nhân viên ghi (giống bài viết)
-- =====================================================================

create table public.projects (
  slug             text primary key,
  title            text not null,
  client           text,                       -- tên khách hàng (để trống nếu khách không muốn công khai)
  industry         text,                       -- lĩnh vực: Nhà máy, Văn phòng, Nhà hàng...
  location         text,
  year             int check (year between 1990 and 2100),
  units            int check (units >= 0),     -- số máy / số dàn lạnh
  capacity         text,                       -- tổng công suất, vd "120 HP"
  duration         text,                       -- thời gian thi công, vd "12 ngày"
  summary          text,
  content          text,                       -- HTML: yêu cầu, giải pháp, kết quả
  before_image     text,
  after_image      text,
  images           text[] not null default '{}',
  testimonial      text,
  testimonial_name text,
  testimonial_role text,
  featured         boolean not null default false,
  published        boolean not null default false,
  sort             int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index projects_sort_idx on public.projects (sort, year desc);

create table public.faqs (
  id         bigint generated always as identity primary key,
  category   text not null default 'Chung',
  question   text not null check (length(question) between 5 and 300),
  answer     text not null,                   -- cho phép HTML đơn giản (<b>, <ul>, <a>)
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_sort_idx on public.faqs (category, sort);

create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger faqs_touch before update on public.faqs for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;
alter table public.faqs enable row level security;
create policy projects_public_read on public.projects for select using (published or public.is_staff());
create policy projects_staff_write on public.projects for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy faqs_public_read on public.faqs for select using (active or public.is_staff());
create policy faqs_staff_write on public.faqs for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.projects, public.faqs to anon, authenticated;
grant insert, update, delete on public.projects, public.faqs to authenticated;
grant select, insert, update, delete on public.projects, public.faqs to service_role;

insert into public.settings (key, value) values ('trust', '{"logos": [], "certs": [], "reviews": [], "google": {}}'::jsonb)
on conflict (key) do nothing;
