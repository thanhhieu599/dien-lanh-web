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

## Giai đoạn 3 – Quản trị (đã triển khai: `admin/`)

Ứng dụng một trang, hash routing (`#/orders/123`), dùng lại `backend-config.js`, `utils.js`, `icons.js`, `art.js` của website.
- `db.js`: hai adapter cùng giao diện `list/get/insert/update/remove` – Supabase (PostgREST, đếm bằng `Prefer: count=exact`) và Demo (localStorage, đồng bộ đơn/lead/đánh giá từ website demo cùng tên miền).
- `resources.js`: cấu hình khai báo cho các mục CRUD (cột, bộ lọc, trường form); `pages-crud.js` dựng danh sách + form từ cấu hình.
- `pages-sales.js`: tổng quan, đơn hàng, CRM lead, báo cáo; `pages-other.js`: đánh giá, khách hàng, cài đặt; `charts.js`: biểu đồ SVG.
- Quyền thật nằm ở RLS (migrations); giao diện chỉ ẩn mục không có quyền. Migration `20261011000001_admin.sql` thêm trigger hoàn/trừ kho khi đơn vào/ra trạng thái hủy.

Việc tiếp theo đề xuất: thanh toán online (VNPay/MoMo qua Supabase Edge Functions), thông báo đơn mới qua email/Zalo OA (Database Webhooks), upload ảnh sản phẩm lên Supabase Storage ngay trong form, nhập/xuất Excel sản phẩm, pre-render trang sản phẩm cho SEO.
