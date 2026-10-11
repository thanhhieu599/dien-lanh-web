-- =====================================================================
-- Sửa lỗi sau rà soát
-- 1. Nhân viên đánh dấu "Đã thanh toán" thủ công trong quản trị -> ghi thời điểm thanh toán (paid_at)
-- 2. Mã yêu cầu (lead) dùng số thứ tự thay cho số ngẫu nhiên: không bao giờ trùng (trước đây có thể lỗi khi gửi form)
--    và theo ngày giờ Việt Nam
-- =====================================================================

create or replace function public.track_paid_at() returns trigger
language plpgsql as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' and new.paid_at is null then
    new.paid_at := now();
  elsif new.payment_status in ('unpaid', 'partial') and old.payment_status = 'paid' then
    new.paid_at := null;
  end if;
  return new;
end $$;

create trigger orders_paid_at before update of payment_status on public.orders
  for each row execute function public.track_paid_at();

create sequence if not exists public.leads_code_seq;
select setval('public.leads_code_seq', greatest(1, (select count(*) from public.leads)));
alter table public.leads alter column code
  set default ('L' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || lpad(nextval('public.leads_code_seq')::text, 5, '0'));
grant usage on sequence public.leads_code_seq to authenticated, service_role;

revoke execute on function public.track_paid_at() from public, anon, authenticated;

-- 3. Hủy đơn -> trả lại lượt dùng mã giảm giá; khôi phục đơn đã hủy -> tính lại lượt
create or replace function public.restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products pr set stock = pr.stock + i.qty, sold = greatest(pr.sold - i.qty, 0)
    from public.order_items i where i.order_id = new.id and pr.id = i.product_id;
    if new.coupon is not null then
      update public.coupons set used_count = greatest(used_count - 1, 0) where code = new.coupon;
    end if;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.products pr set stock = greatest(pr.stock - i.qty, 0), sold = pr.sold + i.qty
    from public.order_items i where i.order_id = new.id and pr.id = i.product_id;
    if new.coupon is not null then
      update public.coupons set used_count = used_count + 1 where code = new.coupon;
    end if;
  end if;
  return new;
end $$;

-- 4. Chống spam: tối đa 3 đánh giá / số điện thoại / 10 phút và 30 đánh giá chờ duyệt / sản phẩm;
--    đăng ký nhận tin tối đa 3 lần / email / 10 phút
create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    new.status := 'pending';
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where i.product_id = new.product_id and o.status = 'done'
        and auth.uid() is not null and o.user_id = auth.uid()
    );
    new.user_id := auth.uid();
    new.phone := nullif(public.normalize_phone(new.phone), '');
    if new.phone is not null and (select count(*) from public.reviews where phone = new.phone and created_at > now() - interval '10 minutes') >= 3 then
      raise exception 'Bạn đã gửi nhiều đánh giá, vui lòng thử lại sau ít phút' using errcode = 'P0001';
    end if;
    if (select count(*) from public.reviews where product_id = new.product_id and status = 'pending') >= 30 then
      raise exception 'Sản phẩm đang có nhiều đánh giá chờ duyệt, vui lòng thử lại sau' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    new.status := 'new';
    new.assigned_to := null;
    new.staff_note := null;
    if new.phone is not null and new.phone <> '' then
      new.phone := public.normalize_phone(new.phone);
      if (select count(*) from public.leads where phone = new.phone and created_at > now() - interval '10 minutes') >= 5 then
        raise exception 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút' using errcode = 'P0001';
      end if;
    end if;
    if new.type = 'newsletter' then
      if coalesce(new.email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Email không hợp lệ' using errcode = 'P0001';
      end if;
      if (select count(*) from public.leads where type = 'newsletter' and lower(email) = lower(new.email) and created_at > now() - interval '10 minutes') >= 1 then
        raise exception 'Email này vừa đăng ký nhận tin' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end $$;
