# dien-lanh-web

**D&T Điện Lạnh – Website bán hàng điện lạnh**

Website thương mại điện tử ngành điện lạnh (máy lạnh, tủ lạnh, tủ đông, máy giặt, vật tư…), bố cục theo chuẩn các chuỗi điện máy bán lẻ tại Việt Nam, bổ sung thêm phần dịch vụ và khách hàng doanh nghiệp (B2B).

## Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Frontend đầy đủ trang và chức năng (dữ liệu mẫu, lưu ở trình duyệt) | ✅ Xong |
| 2 | Cơ sở dữ liệu Supabase/PostgreSQL: sản phẩm, đơn hàng, khách hàng, lead, đánh giá (xem `supabase/README.md`) | ✅ Xong – cần tạo project & dán khóa |
| 3 | Trang quản trị (admin): sản phẩm, đơn hàng, CRM lead, khuyến mãi, bài viết, báo cáo | ⏳ |
| 4 | Thanh toán online (VNPay/MoMo), SEO SSR, email/Zalo tự động | ⏳ |

## Cấu trúc thư mục

```
dien-lanh-web/
├── frontend/                  # Website khách hàng (HTML/CSS/JS thuần, không cần build)
│   ├── *.html                 # 21 trang (xem danh sách bên dưới)
│   └── assets/
│       ├── css/main.css       # Toàn bộ giao diện + responsive
│       ├── images/            # favicon, ảnh (giai đoạn 2: ảnh sản phẩm thật)
│       └── js/
│           ├── data/          # catalog.js (tự sinh), content.js (cấu hình, bài viết, cửa hàng, chính sách)
│           ├── core/          # utils.js, api.js (lớp dữ liệu), store.js (giỏ hàng, tài khoản, đơn hàng)
│           ├── components/    # layout (header/footer/mega menu), ui (thẻ SP, modal), icons, art (ảnh minh họa SVG)
│           └── pages/         # script riêng từng trang
├── admin/                     # Giai đoạn 3 – trang quản trị
├── supabase/                  # Giai đoạn 2 – database: migrations, seed, kiểm thử
├── server/                    # (dự phòng) dịch vụ server riêng nếu cần: thanh toán, email
├── tools/generate-catalog.mjs # Sinh dữ liệu sản phẩm mẫu
├── tools/build-seed.mjs       # Sinh supabase/seed.sql từ dữ liệu frontend
└── docs/                      # Tài liệu kiến trúc, lộ trình
```

## Các trang & chức năng

| Trang | File | Chức năng |
|---|---|---|
| Trang chủ | `index.html` | Mega menu, slider, flash sale đếm ngược, danh mục nhanh, khối SP theo danh mục có tab, B2B, dịch vụ, thương hiệu, đã xem, tin tức |
| Danh mục | `danh-muc.html?cat=…&sub=…` | Lọc theo thương hiệu, giá, công suất/dung tích/công nghệ…; sắp xếp; phân trang; URL chia sẻ được; nội dung SEO |
| Tìm kiếm | `tim-kiem.html?q=…` | Tìm không dấu, gợi ý tức thì trên header |
| Khuyến mãi | `khuyen-mai.html` | Sản phẩm đang giảm giá |
| Chi tiết SP | `san-pham.html?id=…` | Gallery, biến thể công suất, khuyến mãi, tùy chọn lắp đặt, thông số, đánh giá (viết được), FAQ, tồn kho cửa hàng, SP tương tự, JSON-LD |
| Giỏ hàng | `gio-hang.html` | Sửa số lượng, lắp đặt, mã giảm giá, tiến độ freeship |
| Thanh toán | `thanh-toan.html` | Giao tận nơi / nhận tại cửa hàng, 5 phương thức thanh toán, xuất hóa đơn VAT công ty |
| Đặt hàng thành công | `dat-hang-thanh-cong.html` | Thông tin đơn, hướng dẫn chuyển khoản |
| Tra cứu đơn | `tra-cuu-don-hang.html` | Theo mã đơn + SĐT, timeline trạng thái, hủy đơn |
| Tài khoản | `tai-khoan.html` | Đăng ký/đăng nhập, tổng quan, đơn hàng, sổ địa chỉ, hồ sơ, yêu thích |
| Yêu thích / So sánh | `yeu-thich.html`, `so-sanh.html` | So sánh tối đa 4 SP, bảng thông số |
| Dịch vụ | `dich-vu.html` | Bảng giá, quy trình, form đặt lịch |
| Báo giá dự án (B2B) | `bao-gia-du-an.html` | Form RFQ doanh nghiệp |
| Tin tức | `tin-tuc.html`, `bai-viet.html?slug=…` | Danh sách theo chuyên mục, bài viết, JSON-LD Article |
| Khác | `gioi-thieu`, `lien-he`, `he-thong-cua-hang` (bản đồ), `chinh-sach?type=…`, `404` | |

Mã giảm giá demo: `DTCOOL10`, `GIAM300K`, `FREESHIP`.

## Xem online

GitHub Pages: https://thanhhieu599.github.io/dien-lanh-web/ (tự chuyển vào `frontend/`).

## Chạy thử

```bash
cd frontend
npx http-server -p 8080     # hoặc: python3 -m http.server 8080
# mở http://localhost:8080
```

Có thể deploy ngay lên GitHub Pages / Netlify / Vercel (static) hoặc hosting thường.

## Kết nối cơ sở dữ liệu

Mặc định website chạy **chế độ demo** (dữ liệu lưu trên trình duyệt). Làm theo `supabase/README.md` để tạo database Supabase, rồi dán URL + anon key vào `frontend/assets/js/backend-config.js` – đơn hàng, tài khoản, form báo giá, đánh giá sẽ được lưu tập trung.

## Tùy chỉnh nhanh

- Thông tin doanh nghiệp, hotline, phí ship, phí lắp đặt, mã giảm giá, bài viết, cửa hàng: `frontend/assets/js/data/content.js`
- Sản phẩm mẫu: sửa `tools/generate-catalog.mjs` rồi chạy `node tools/generate-catalog.mjs`
- Màu thương hiệu: biến `--primary`, `--accent` trong `assets/css/main.css`

Xem thêm `docs/ARCHITECTURE.md`.
