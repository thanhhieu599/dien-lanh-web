# Backend PHP / MySQL cho hosting

Runtime mới không gọi Supabase. API dùng PDO với prepared statements; session HttpOnly, SameSite=Lax; thao tác ghi yêu cầu header `X-DT-Request: 1` và cùng origin.

Website hiện dùng React: phát triển bằng `npm run dev` tại cổng 5173 (proxy PHP ở cổng 8080). Khi upload hosting, dùng bản đã build từ `npm run package:hosting`; các file HTML trong mã nguồn cần Vite xử lý trước khi trình duyệt chạy được.

## Hosting Apache/cPanel

1. Chọn PHP 8.5 (tối thiểu 8.3), bật `pdo_mysql`, `fileinfo`, `session`. MySQL 8.4+ hoặc 9.7 LTS; charset `utf8mb4`.
2. Chạy `npm run package:hosting` và upload **nội dung** `dist/` vào `public_html` hoặc thư mục con. Gồm `frontend/`, `admin/`, `server/`, `index.html`, `404.html`; upload cả `.htaccess`.
3. Tạo database và user riêng trong cPanel; gán quyền trên database đó. Import `server/schema.sql` qua phpMyAdmin (không cần quyền tạo database).
4. Sao chép `server/config.example.php` thành `server/config.local.php`, điền host/port/database/username/password. Giữ `secure_cookies = true`, bật HTTPS. Không đưa mật khẩu vào JavaScript.
5. Trên máy phát triển chạy `npm run db:seed`, upload tạm `server/seed.json`, chạy Terminal: `php server/cli.php seed`. Seed chỉ thêm bản ghi chưa có. Xóa `seed.json` khỏi hosting sau khi hoàn tất.
6. Tạo tài khoản admin nội bộ qua Terminal Linux: `php server/cli.php create-admin 09xxxxxxxx "Quản trị viên"`. Nhập mật khẩu ẩn hai lần (8–72 byte). Lệnh tạo user và profile admin trong cùng transaction, không tạo hồ sơ khách hàng CRM, không ghi đè tài khoản đã tồn tại. Đăng nhập tại `/admin/`. Nếu hosting không có Terminal, nhờ nhà cung cấp chạy lệnh CLI qua terminal tương tác. Lệnh cũ `admin <phone>` vẫn dùng để cấp quyền cho tài khoản có sẵn khi bảo trì.

7. Cho PHP quyền ghi `server/uploads/` (thường 0755 với user sở hữu đúng). Ảnh được đọc qua API; `.htaccess` chặn truy cập file cấu hình, CLI và schema. Với Nginx, chỉ cho `/server/api.php` chạy PHP, chặn các đường dẫn khác dưới `/server/`; không phục vụ file trong `uploads/` trực tiếp.

Hosting không có Terminal có thể import seed bằng SQL: `node tools/build-mysql-seed.mjs --sql`, import `server/seed.sql` qua phpMyAdmin. Xóa các file seed sau khi dùng.

## Chạy local

```sh
npm run db:seed
docker compose up -d --build --wait
docker compose exec web php server/cli.php seed
```

Thông tin `local-development-only` trong compose chỉ dùng trong máy phát triển. MySQL không mở cổng ra máy host. Dữ liệu giữ trong volume `mysql-data`; `docker compose down` giữ nguyên dữ liệu.

Nếu đã cài PHP/MySQL riêng: điền `config.local.php`, đặt `secure_cookies = false` khi dùng HTTP local, chạy `php server/cli.php migrate`, `php server/cli.php seed`, rồi `php -S 127.0.0.1:8080 -t . server/router.php` từ gốc dự án.

## API và kiểm tra

### Dữ liệu thử nghiệm cho admin

```sh
npm run db:seed:test
docker compose exec web php server/cli.php seed-test
```

Tạo và nạp 325 bản ghi: 15 mẫu mỗi bảng sản phẩm, danh mục, thương hiệu, mã giảm giá, bài viết, dự án, FAQ, banner, cửa hàng, dịch vụ, chính sách, hồ sơ, CRM, đơn hàng, chi tiết đơn, lịch sử trạng thái, thanh toán, lead, đánh giá và giỏ hàng; 20 thông báo gồm 10 lịch bảo trì. Cài đặt có 5 khóa đúng cấu trúc (`store`, `home`, `catalog`, `vision`, `trust`), trong đó uy tín có 15 đối tác/chứng nhận/đánh giá giả lập. Trang Tầm nhìn giữ số ô ảnh cố định, không tạo khóa không được giao diện hỗ trợ.

Mẫu có dấu `[TEST]` hoặc khóa `test-*`/`TEST*`, các trạng thái đơn/lead/đánh giá đa dạng, đơn hoàn tất đã thanh toán để thử báo cáo/MISA. Hồ sơ khách mẫu không có mật khẩu và không đăng nhập được; dùng admin nội bộ của bạn để xem. Thông báo chỉ là hàng đợi mô phỏng. Nạp lại không ghi đè bản ghi và cấu hình đã có. Bộ này dành cho database chạy thử vì số liệu sẽ xuất hiện trong báo cáo.

Kiểm tra fixture: `npm run test:seed`. Sau khi nạp, kiểm tra quan hệ dữ liệu trên MySQL: `docker compose exec -T web php tests/server/seed-check.php`.

- `server/api.php?route=/health`: kiểm tra kết nối database.
- `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/refresh`: POST, phiên 8 giờ; `/auth/session`: GET để đồng bộ đăng nhập giữa website và quản trị.
- `/data/<resource>`: GET/POST/PATCH/DELETE với kiểm tra quyền tại máy chủ. Bộ lọc có định dạng `id=eq.1003`, `order=created_at.desc`, `limit`, `offset`, `select` để tương thích lớp dữ liệu hiện có.
- `/rpc/place_order`, `/rpc/track_order`, `/rpc/cancel_order`, `/rpc/my_orders`, `/rpc/validate_coupon_cart`, `/rpc/submit_lead`: luồng nghiệp vụ.
- `/media/<folder/file.webp>`: đọc ảnh công khai, tải/xóa ảnh cần quyền nội bộ, tối đa 8 MB.

Chạy `npm run test:api` với database thử nghiệm riêng: bộ test tạo tài khoản và đơn hàng, sau đó hủy đơn để hoàn kho. Đổi endpoint bằng biến môi trường `API_BASE`. Không chạy trên dữ liệu bán hàng thật.

## Vận hành và giới hạn

Backup database MySQL và thư mục uploads cùng nhau. Thêm cron `php /path/to/server/cli.php cleanup` hàng ngày để dọn bộ đếm giới hạn truy cập. Các màn hình nhật ký thông báo/bảo trì được giữ để bảo toàn cấu trúc giao diện; chưa có worker gửi thông báo PHP.

Schema dùng bảng `records(resource, record_id, data JSON)`, unique index SKU/slug, index phone/status; bảng `users` giữ thông tin xác thực. API hiện lọc và phân trang các resource trong PHP, phù hợp catalog nhỏ; cần chuyển lọc/aggregate xuống SQL khi dữ liệu tăng lớn. Dữ liệu PostgreSQL, tài khoản và mật khẩu Supabase cũ không tự di chuyển; cần kế hoạch import/reset mật khẩu riêng nếu đã vận hành.

COD và chuyển khoản VietQR là các phương thức đang hoạt động. Các cổng online và thông báo cũ trong `supabase/functions/` chỉ được giữ để tham khảo, chưa chạy trên PHP hosting.
