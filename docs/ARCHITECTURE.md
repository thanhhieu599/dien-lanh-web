# Kiến trúc & kế hoạch giai đoạn 2–3

## Giai đoạn 1 (hiện tại)

- Frontend tĩnh, không phụ thuộc framework → tải nhanh, deploy ở bất kỳ đâu.
- Tất cả truy xuất dữ liệu đi qua `DT.api` (`assets/js/core/api.js`); trạng thái người dùng qua `DT.store` (`core/store.js`, lưu localStorage).
- Form liên hệ / đặt lịch dịch vụ / báo giá B2B được lưu thành **lead** (`localStorage: dt_leads_v1`) – sẵn cấu trúc để đẩy về CRM.
- Ảnh sản phẩm: `product.images` chứa `art:N` → vẽ SVG minh họa. Khi có URL ảnh thật, tự hiển thị `<img>`.

## Giai đoạn 2 – Cơ sở dữ liệu (đã triển khai: `supabase/`)

Chọn **Supabase (PostgreSQL + Auth + REST)** vì website là trang tĩnh: trình duyệt gọi thẳng API bằng anon key, quyền truy cập do RLS trong database quyết định – không cần tự vận hành server.

Frontend (`assets/js/core/backend.js`) tự nhận chế độ:
- Có `DT.BACKEND.url/anonKey` → nạp catalog từ DB (cache sessionStorage), đơn hàng / tài khoản / lead / đánh giá ghi vào DB.
- Không có → chế độ demo như giai đoạn 1.

| Chức năng frontend | Gọi tới |
|---|---|
| Catalog, nội dung | `GET /rest/v1/{products,categories,brands,posts,stores,banners,services,policies,coupons,settings}` |
| Đặt hàng | `rpc/place_order` (tính giá phía server) |
| Tra cứu / hủy đơn | `rpc/track_order`, `rpc/cancel_order` (mã đơn + SĐT) |
| Đơn của tôi | `rpc/my_orders` |
| Mã giảm giá riêng | `rpc/validate_coupon` |
| Form liên hệ / dịch vụ / B2B / nhận tin | `rpc/submit_lead` |
| Đánh giá | `POST /rest/v1/reviews` (chờ duyệt), `GET` đánh giá đã duyệt |
| Đăng ký / đăng nhập | Supabase Auth (SĐT ánh xạ thành email nội bộ), bảng `profiles` |

Việc còn lại cho giai đoạn sau: thanh toán online (VNPay/MoMo cần server ký IPN → Supabase Edge Functions), email/Zalo thông báo đơn mới (Database Webhooks), OTP xác minh số điện thoại, SSR/pre-render cho SEO.

## Giai đoạn 3 – Quản trị (`admin/`)

- Dashboard: doanh thu, đơn mới, lead mới, top sản phẩm.
- Sản phẩm: CRUD, biến thể, thông số, upload ảnh, tồn kho theo cửa hàng, nhập/xuất Excel.
- Đơn hàng: duyệt, đổi trạng thái (chờ xác nhận → giao → lắp đặt → hoàn thành), in phiếu, xuất hóa đơn (kết nối MISA).
- CRM lead: báo giá dự án B2B, đặt lịch dịch vụ, phân công nhân viên, nhắc lịch bảo trì.
- Marketing: banner, mã giảm giá, flash sale, bài viết SEO.
- Phân quyền: Admin / Sales / Kỹ thuật / Biên tập.
