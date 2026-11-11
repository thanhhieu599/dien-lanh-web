# Kiến trúc & kế hoạch giai đoạn 2–3

> **Cập nhật:** Runtime hiện hành đã chuyển sang PHP/PDO + MySQL. Xem [server/README.md](../server/README.md) và [README](../README.md). Phần bên dưới là tài liệu lịch sử của bản Supabase, không phải hướng dẫn triển khai hiện tại.

## Kiến trúc hiện hành

- Website: React/TypeScript trong `frontend/src/`, Router giữ URL HTML và SEO.
- Quản trị: React/TypeScript trong `admin/src/`, HashRouter giữ URL `/admin/#/products/1001`.
- Vite build cả hai entry; đóng gói hosting và SEO ghép bundle quản trị vào `dist/admin/`.
- Backend: PHP/PDO + MySQL trong `server/`; quyền truy cập được kiểm tra tại API.
- Quản trị dùng lại adapter `db.js`, metadata `resources.js` và trình xuất `xlsx.js`; không nạp các trình dựng giao diện JS cũ.
- Hướng dẫn hiện hành: [quản trị](../admin/README.md), [chuyển đổi React](REACT-MIGRATION.md).

## Giai đoạn 1 (lịch sử)

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

Việc còn lại cho giai đoạn sau: email/Zalo thông báo đơn mới (Database Webhooks), OTP xác minh số điện thoại, SSR/pre-render cho SEO.

## Giai đoạn 3 – Quản trị (đã triển khai: `admin/`)

Ứng dụng một trang, hash routing (`#/orders/123`), dùng lại `backend-config.js`, `utils.js`, `icons.js`, `art.js` của website.
- `db.js`: hai adapter cùng giao diện `list/get/insert/update/remove` – Supabase (PostgREST, đếm bằng `Prefer: count=exact`) và Demo (localStorage, đồng bộ đơn/lead/đánh giá từ website demo cùng tên miền).
- `resources.js`: cấu hình khai báo cho các mục CRUD (cột, bộ lọc, trường form); `pages-crud.js` dựng danh sách + form từ cấu hình.
- `pages-sales.js`: tổng quan, đơn hàng, CRM lead, báo cáo; `pages-other.js`: đánh giá, khách hàng, cài đặt; `charts.js`: biểu đồ SVG.
- `pages-content.js`: **Nội dung website** (chỉ quản trị viên): chữ / số liệu trang chủ, Flash Sale, dải cam kết, chính sách bán hàng, ô nhận tin, mức lọc giá, phụ kiện mua kèm. Lưu ở `settings` khóa `home` và `catalog`; mặc định nằm trong `DT.siteContentDefaults` (`data/content.js`), website đọc qua `DT.siteContent()` / `DT.siteText()`.
- Quyền thật nằm ở RLS (migrations); giao diện chỉ ẩn mục không có quyền. Migration `20261011000001_admin.sql` thêm trigger hoàn/trừ kho khi đơn vào/ra trạng thái hủy.

## Giai đoạn 4 – Thanh toán, thông báo, SEO (đã triển khai, hướng dẫn: `docs/PHASE4.md`)

- **Thanh toán** *(bản Supabase cũ, đã bỏ; hiện chỉ COD + chuyển khoản)*: Edge Function `payments` (Deno, chỉ dùng Web API) tạo link VNPay 2.1.0 / MoMo v2 sau khi `payment_start()` kiểm tra mã đơn + SĐT; nhận IPN, kiểm chữ ký HMAC, `payment_confirm()` so số tiền và chống ghi trùng. Chuyển khoản: VietQR trên website/email, webhook SePay → `payment_bank_transfer()` tìm mã đơn trong nội dung, cộng dồn.
- **Thông báo**: trigger trên `orders` / `leads` ghi sự kiện vào bảng `notifications` (outbox). pg_cron gọi Edge Function `notify` mỗi phút; mỗi sự kiện gửi tới các kênh đã cấu hình, lưu kết quả từng kênh, kênh lỗi thử lại với độ trễ tăng dần, kênh đã gửi không gửi lại.
- **SEO**: `tools/prerender.mjs` dùng Chromium chụp HTML sau khi JavaScript vẽ xong → trang tĩnh link đẹp. Trang con có `<base href="../">` và `<body data-q-*>` để script chạy lại như trang gốc (`DT.u.param` đọc từ đó). Link chưa build → `404.html` chuyển về trang động.
- Logic Edge Function nằm ở `handler.ts` (thuần Web API) nên kiểm thử được bằng Node 22 với database PostgreSQL thật (`supabase/functions/tests/`).

Việc tiếp theo đề xuất: upload ảnh sản phẩm lên Supabase Storage ngay trong form (ảnh thật tăng tỉ lệ chuyển đổi & SEO hình ảnh), nhập/xuất Excel sản phẩm, OTP xác minh số điện thoại, báo giá PDF tự động cho lead B2B.
