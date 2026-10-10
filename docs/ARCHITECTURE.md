# Kiến trúc & kế hoạch giai đoạn 2–3

## Giai đoạn 1 (hiện tại)

- Frontend tĩnh, không phụ thuộc framework → tải nhanh, deploy ở bất kỳ đâu.
- Tất cả truy xuất dữ liệu đi qua `DT.api` (`assets/js/core/api.js`); trạng thái người dùng qua `DT.store` (`core/store.js`, lưu localStorage).
- Form liên hệ / đặt lịch dịch vụ / báo giá B2B được lưu thành **lead** (`localStorage: dt_leads_v1`) – sẵn cấu trúc để đẩy về CRM.
- Ảnh sản phẩm: `product.images` chứa `art:N` → vẽ SVG minh họa. Khi có URL ảnh thật, tự hiển thị `<img>`.

## Giai đoạn 2 – Backend (`server/`)

Đề xuất: **Node.js (NestJS hoặc Express) + PostgreSQL + Prisma**, lưu ảnh trên S3/Cloudinary.

API dự kiến (khớp với các hàm `DT.api` / `DT.store` hiện có):

| Method | Endpoint | Thay cho |
|---|---|---|
| GET | `/api/categories`, `/api/brands` | `DT.categories`, `DT.brands` |
| GET | `/api/products?cat&sub&brand&price&attrs&q&sort&page` | `DT.api.list` |
| GET | `/api/products/:idOrSlug`, `/api/products/:id/related` | `DT.api.product`, `related` |
| GET/POST | `/api/products/:id/reviews` | `DT.api.reviews` |
| POST | `/api/auth/register`, `/api/auth/login` (JWT, bcrypt) | `DT.store.register/login` |
| GET/PUT | `/api/me`, `/api/me/addresses`, `/api/me/orders` | `DT.store.*` |
| POST | `/api/coupons/validate` | `DT.store.applyCoupon` |
| POST | `/api/orders`, GET `/api/orders/track?code&phone` | `placeOrder`, `findOrder` |
| POST | `/api/leads` (contact, service, b2b-quote) | `DT.saveLead` |
| POST | `/api/payments/vnpay/create`, `/api/payments/vnpay/ipn` | – |

Bảng chính: `categories, brands, products, product_images, product_attrs, users, addresses, orders, order_items, coupons, reviews, leads, posts, stores, banners, settings`.

SEO: chuyển trang danh mục / sản phẩm / bài viết sang render phía server (hoặc pre-render khi build) + sinh `sitemap.xml`, giữ nguyên HTML/CSS hiện tại.

## Giai đoạn 3 – Quản trị (`admin/`)

- Dashboard: doanh thu, đơn mới, lead mới, top sản phẩm.
- Sản phẩm: CRUD, biến thể, thông số, upload ảnh, tồn kho theo cửa hàng, nhập/xuất Excel.
- Đơn hàng: duyệt, đổi trạng thái (chờ xác nhận → giao → lắp đặt → hoàn thành), in phiếu, xuất hóa đơn (kết nối MISA).
- CRM lead: báo giá dự án B2B, đặt lịch dịch vụ, phân công nhân viên, nhắc lịch bảo trì.
- Marketing: banner, mã giảm giá, flash sale, bài viết SEO.
- Phân quyền: Admin / Sales / Kỹ thuật / Biên tập.
