-- =====================================================================
-- Đồng bộ website ↔ quản trị
-- - Mã giảm giá công khai chỉ hiện cho khách khi đã tới ngày bắt đầu (trước đây chỉ kiểm tra ngày kết thúc;
--   validate_coupon() vốn đã chặn mã chưa bắt đầu, nhưng mã vẫn hiện ở giỏ hàng / trang sản phẩm)
-- =====================================================================
drop policy if exists coupons_public_read on public.coupons;
create policy coupons_public_read on public.coupons for select
  using ((is_public and active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_staff());
