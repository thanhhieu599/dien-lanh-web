-- =====================================================================
-- Lịch chạy gửi thông báo (chạy 1 lần trong SQL Editor của Supabase, SAU khi deploy function "notify").
-- Thay 2 giá trị trước khi chạy:
--   <PROJECT_REF>    : mã project (phần đầu của https://<PROJECT_REF>.supabase.co)
--   <NOTIFY_SECRET>  : chuỗi bí mật đã đặt bằng: supabase secrets set NOTIFY_SECRET=...
-- File này KHÔNG nằm trong migrations vì chứa khóa bí mật - không commit giá trị thật lên GitHub.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Mỗi phút: nếu có thông báo đang chờ thì gọi Edge Function "notify" (không có việc thì không gọi)
select cron.schedule('dt-notify', '* * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', '<NOTIFY_SECRET>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (select 1 from public.notifications where status in ('pending', 'processing') and next_at <= now())
$$);

-- Hằng tháng: dọn nhật ký thông báo đã gửi quá 90 ngày
select cron.schedule('dt-notify-cleanup', '15 3 1 * *', $$
  delete from public.notifications where status = 'done' and created_at < now() - interval '90 days'
$$);

-- Kiểm tra:   select * from cron.job;
--             select * from cron.job_run_details order by start_time desc limit 20;
-- Gỡ lịch:    select cron.unschedule('dt-notify');
