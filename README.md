# D&T Điện Lạnh

Website khách hàng dùng **React 19 + TypeScript + Vite + React Router**, backend **PHP 8.5 + MySQL**. Trang quản trị cũng dùng React/TypeScript với hash routing tại `/admin/`. Giữ các URL `.html` và đường dẫn SEO hiện có.

## Cấu trúc

```text
frontend/src/   Component, layout, trang, hook và service React/TypeScript
frontend/assets/ CSS, ảnh và lớp dữ liệu dùng chung với quản trị
frontend/*.html Các entry React giữ nguyên URL cũ
admin/src/      Component, trang, service và CSS quản trị React/TypeScript
admin/assets/   Adapter dữ liệu, metadata, Excel và các file UI cũ giữ để đối chiếu
server/         API PHP/PDO, schema MySQL, công cụ cài đặt và cấp quyền
tests/          Kiểm thử trình duyệt và API MySQL
tools/          Sinh dữ liệu mẫu, pre-render SEO, đóng gói hosting
docs/           Tài liệu nghiệp vụ và kiến trúc
supabase/       Mã tích hợp cũ được giữ lại để tham khảo, không dùng trong runtime mới
```

## Chạy với MySQL

Cần Docker Desktop đang chạy. Node.js 26 LTS dùng cho công cụ phát triển; Node.js 22.18+ và 24 vẫn được hỗ trợ.

```sh
npm ci
npm run db:seed
docker compose up -d --build --wait
docker compose exec web php server/cli.php seed
npm run dev
```

Mở http://127.0.0.1:5173/frontend/ và http://127.0.0.1:5173/admin/. Vite chuyển `/server/` tới PHP tại cổng 8080; đặt biến `PHP_SERVER` nếu dùng cổng khác. Tạo tài khoản quản trị nội bộ trực tiếp bằng CLI, không cần đăng ký trên website:

```sh
docker compose exec web php server/cli.php create-admin 09xxxxxxxx "Quản trị viên"
```

Thay số điện thoại bằng số của bạn. Lệnh yêu cầu nhập mật khẩu ẩn hai lần (8–72 byte), không ghi đè tài khoản đã tồn tại. Đăng nhập tại `/admin/` bằng tài khoản vừa tạo. Admin có thể cấp vai trò cho tài khoản khác tại Khách hàng → chi tiết khách hàng → Vai trò tài khoản. Hiện các admin có quyền ngang nhau, chưa có vai trò superadmin riêng.

Trên PowerShell có chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`.

Để có dữ liệu chạy thử đầy đủ trong admin (15 mẫu mỗi danh sách nghiệp vụ/nội dung, 20 thông báo gồm 10 lịch bảo trì): chạy `npm.cmd run db:seed:test`, rồi `docker compose exec web php server/cli.php seed-test`. Mẫu được đánh dấu TEST, nạp lại không ghi đè dữ liệu đã có. Xem [chi tiết bộ dữ liệu thử nghiệm](server/README.md#dữ-liệu-thử-nghiệm-cho-admin).

## Đưa lên hosting

Hosting cần PHP 8.3+ với PDO MySQL và fileinfo; khuyến nghị PHP 8.5 cùng MySQL 9.7 LTS hoặc 8.4 LTS. Không cần Node.js chạy trên hosting.

```sh
npm run package:hosting
```

Upload nội dung `dist/`, tạo database rồi cấu hình `server/config.local.php` trên hosting. Import `server/schema.sql`; thêm dữ liệu mẫu và tài khoản quản trị theo [hướng dẫn server](server/README.md). API dùng query string nên không cần rewrite URL. GitHub Pages chỉ phục vụ được bản demo tĩnh.

## Dữ liệu và tính năng

- Website và quản trị kết nối API PHP/MySQL mặc định; thông tin database chỉ nằm phía máy chủ.
- Phiên đăng nhập dùng cookie HttpOnly; mật khẩu dùng `password_hash`, quyền kiểm tra ở mỗi yêu cầu.
- Máy chủ tính lại giá, phí và mã giảm giá; đặt/hủy đơn dùng transaction, khóa hàng để cập nhật tồn kho.
- Hỗ trợ COD, VietQR, quản trị nội dung và ảnh trên hosting. VNPay/MoMo, webhook, gửi email/Zalo và cron nhắc bảo trì của bản Supabase cũ **chưa được chuyển sang PHP**; không được bật như tính năng đã hoạt động.
- MySQL lưu bản ghi theo resource/key và JSON để giữ tương thích mô hình dữ liệu hiện có; SKU/slug sản phẩm có unique index. Chưa có bộ nhập dữ liệu từ project Supabase đang chạy.

## Kiểm thử và SEO

```sh
npx playwright install chromium
npm test
npm run test:api
npm run build -- --backend http://127.0.0.1:8080/server/api.php
npm run test:build
```

`npm test` kiểm tra TypeScript và giao diện website và quản trị React trên bản build; bộ demo phục vụ riêng, không xác nhận backend thật. `test:api` cần MySQL đã seed và PHP đang chạy. `test:hosting` chạy Vite cùng bộ kiểm tra website + quản trị React trên MySQL thật, cần tài khoản admin thử nghiệm qua `TEST_ADMIN_PHONE` và `TEST_ADMIN_PASSWORD`.

Để dựng demo SEO: `npm run build -- --demo --limit 3`. Muốn xem demo khi phát triển, đổi `mode: 'mysql'` thành `mode: 'demo'` trong `frontend/assets/js/backend-config.js`, rồi chạy `npm run dev`.

Chi tiết cấu trúc và 20 file giao diện cũ đã xóa sau khi được đồng ý: [chuyển đổi React](docs/REACT-MIGRATION.md). Các bộ kiểm thử HTML cũ vẫn được giữ tại `tests/browser/`; `test:legacy:browser` chỉ dành để tham khảo/chuyển đổi selector, không phải tiêu chí xác nhận giao diện React.

CI chạy MySQL/PHP, API integration, các bộ test demo và build SEO. Workflow đóng gói hosting chạy thủ công và không tự xuất bản.

Các tài liệu cũ trong `docs/` và `supabase/` mô tả kiến trúc trước chuyển đổi; hướng dẫn PHP/MySQL hiện hành nằm ở `server/README.md`.
