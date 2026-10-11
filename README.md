# dien-lanh-web

**D&T Điện Lạnh – Website bán hàng điện lạnh**

Website thương mại điện tử ngành điện lạnh (máy lạnh, tủ lạnh, tủ đông, máy giặt, vật tư…), bố cục theo chuẩn các chuỗi điện máy bán lẻ tại Việt Nam, bổ sung thêm phần dịch vụ và khách hàng doanh nghiệp (B2B).

## Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Frontend đầy đủ trang và chức năng (dữ liệu mẫu, lưu ở trình duyệt) | ✅ Xong |
| 2 | Cơ sở dữ liệu Supabase/PostgreSQL: sản phẩm, đơn hàng, khách hàng, lead, đánh giá (xem `supabase/README.md`) | ✅ Xong – cần tạo project & dán khóa |
| 3 | Trang quản trị `/admin/`: đơn hàng, CRM lead, sản phẩm, khuyến mãi, bài viết, đánh giá, báo cáo, phân quyền (xem `admin/README.md`) | ✅ Xong |
| 4 | Thanh toán online (VNPay, MoMo, chuyển khoản VietQR tự đối soát qua SePay), SEO pre-render (link đẹp, sitemap, dữ liệu có cấu trúc, ảnh chia sẻ, llms.txt), thông báo tự động Zalo/Email/ZNS (xem `docs/PHASE4.md`) | ✅ Xong – cần khai báo khóa cổng thanh toán & kênh gửi |

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
├── admin/                     # Giai đoạn 3 – trang quản trị (SPA, dùng chung database)
├── supabase/                  # Database: migrations, seed, kiểm thử
│   ├── functions/payments/    # Giai đoạn 4 – Edge Function thanh toán: VNPay, MoMo, webhook SePay
│   ├── functions/notify/      # Giai đoạn 4 – Edge Function gửi thông báo Zalo Bot / Telegram / Email / ZNS
│   └── setup/cron.sql         # Lịch gửi thông báo mỗi phút (pg_cron)
├── tools/generate-catalog.mjs # Sinh dữ liệu sản phẩm mẫu
├── tools/build-seed.mjs       # Sinh supabase/seed.sql từ dữ liệu frontend
├── tools/prerender.mjs        # Giai đoạn 4 – build website chuẩn SEO (trang HTML đầy đủ cho từng sản phẩm)
├── tests/browser/             # Kiểm thử trên trình duyệt thật (thanh toán, bản build SEO)
├── .github/workflows/         # Tự build & đăng GitHub Pages (6 giờ/lần), chạy kiểm thử
└── docs/                      # Tài liệu kiến trúc, hướng dẫn giai đoạn 4 (PHASE4.md)
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
| Thanh toán | `thanh-toan.html` | Giao tận nơi / nhận tại cửa hàng, COD, chuyển khoản VietQR, thẻ qua VNPay, ví MoMo, trả góp; xuất hóa đơn VAT công ty |
| Đặt hàng thành công | `dat-hang-thanh-cong.html` | Thông tin đơn, mã QR chuyển khoản có sẵn số tiền, nút thanh toán lại |
| Kết quả thanh toán | `ket-qua-thanh-toan.html` | VNPay / MoMo trả khách về; kiểm chữ ký trên máy chủ, báo thành công / lý do lỗi |
| Tra cứu đơn | `tra-cuu-don-hang.html` | Theo mã đơn + SĐT, timeline trạng thái, hủy đơn |
| Tài khoản | `tai-khoan.html` | Đăng ký/đăng nhập, tổng quan, đơn hàng, sổ địa chỉ, hồ sơ, yêu thích |
| Yêu thích / So sánh | `yeu-thich.html`, `so-sanh.html` | So sánh tối đa 4 SP, bảng thông số |
| Dịch vụ | `dich-vu.html` | Bảng giá, quy trình, form đặt lịch |
| Báo giá dự án (B2B) | `bao-gia-du-an.html` | Form RFQ doanh nghiệp |
| Tin tức | `tin-tuc.html`, `bai-viet.html?slug=…` | Danh sách theo chuyên mục, bài viết, JSON-LD Article |
| Khác | `gioi-thieu`, `lien-he`, `he-thong-cua-hang` (bản đồ), `chinh-sach?type=…`, `404` | |

Mã giảm giá demo: `DTCOOL10`, `GIAM300K`, `FREESHIP`.

## SEO

- Chạy trực tiếp mã nguồn: link dạng `san-pham.html?id=…` (nội dung vẽ bằng JavaScript).
- Bản đăng chính thức được build bằng `npm run build` (`tools/prerender.mjs`): mỗi sản phẩm / danh mục / bài viết / chính sách thành một trang HTML đầy đủ nội dung với link thân thiện (`sp/<slug>.html`, `danh-muc/<loai>.html`, `tin-tuc/<slug>.html`), có canonical, Open Graph + ảnh chia sẻ, JSON-LD (Product, Article, BreadcrumbList, Store), `sitemap.xml`, `robots.txt`, `llms.txt`.
- GitHub Actions tự build & đăng mỗi lần push và 6 giờ/lần (cập nhật dữ liệu từ Supabase). Địa chỉ website chính thức: `frontend/assets/js/seo-config.js`.

## Xem online

- Website: https://thanhhieu599.github.io/dien-lanh-web/ (tự chuyển vào `frontend/`)
- Quản trị: https://thanhhieu599.github.io/dien-lanh-web/admin/

## Chạy thử

```bash
cd frontend
npx http-server -p 8080     # hoặc: python3 -m http.server 8080
# mở http://localhost:8080
```

Có thể deploy ngay lên GitHub Pages / Netlify / Vercel (static) hoặc hosting thường.

## Kết nối cơ sở dữ liệu

Mặc định website chạy **chế độ demo** (dữ liệu lưu trên trình duyệt). Làm theo `supabase/README.md` để tạo database Supabase, rồi dán URL + anon key vào `frontend/assets/js/backend-config.js` – đơn hàng, tài khoản, form báo giá, đánh giá sẽ được lưu tập trung.

Bật thanh toán online và thông báo tự động: xem **`docs/PHASE4.md`** (từng bước, kèm danh sách khóa cần khai báo).

## Tùy chỉnh nhanh

- Thông tin doanh nghiệp, hotline, phí ship, phí lắp đặt, mã giảm giá, bài viết, cửa hàng: `frontend/assets/js/data/content.js`
- Sản phẩm mẫu: sửa `tools/generate-catalog.mjs` rồi chạy `node tools/generate-catalog.mjs`
- Màu thương hiệu: biến `--primary`, `--accent` trong `assets/css/main.css`

Xem thêm `docs/ARCHITECTURE.md`.
