# Chịu tải khi nhiều khách truy cập cùng lúc

## Đã tối ưu trong code
- **Bộ đệm dữ liệu công khai** (danh mục, sản phẩm, bài viết, banner…): nhiều khách cùng xem thì chỉ đọc MySQL 1 lần,
  lưu file tạm (thư mục tạm của PHP). Admin sửa bất kỳ dữ liệu công khai nào → bộ đệm đổi ngay; tối đa 60 giây với dữ liệu sửa thẳng trong DB.
- **Gộp request:** lượt vào đầu tiên tải toàn bộ dữ liệu trang bằng 1 request `/catalog` (trước đây 12 request), nén gzip (~200KB → ~25KB), có ETag (khách quay lại nhận 304).
- `/version` (kiểm tra dữ liệu mới, gọi mỗi trang) không mở MySQL; khách chưa đăng nhập xem trang không tạo phiên.
- `.htaccess`: nén văn bản; file JS/CSS có mã băm giữ ở trình duyệt 1 năm; ảnh 7 ngày.
- Khách / website không còn thấy giá vốn, giá sỉ, tồn tối thiểu, tên nhân viên sửa.

## Kết quả đo (máy thử Docker 4 CPU, Apache + PHP 8.5 + MySQL; máy phát tải chạy chung máy)
| Kịch bản | Trước tối ưu | Sau tối ưu (Apache chỉnh) |
|---|---|---|
| 1000 khách vào trong 10 giây (mỗi khách 5 trang) | ~1,4% lỗi kết nối | 0 lỗi, 95% < 15 ms |
| 2000 khách trong 10 giây | ~1,9% lỗi | 0 lỗi, 95% < 0,2 giây |
| 1000 khách ập vào trong 2 giây | lỗi + chờ lâu | 0 lỗi, chờ tối đa ~11 giây |
| 1300 đơn đặt đồng thời (200–300 cùng lúc) | – | 0 lỗi, không trùng mã đơn, tồn kho trừ đúng |

## Cấu hình hosting nên yêu cầu nhà cung cấp
- **MySQL `max_connections` / giới hạn kết nối mỗi tài khoản ≥ số tiến trình PHP** (nhiều gói hosting chỉ cho 15–30 → lỗi "Too many connections" khi đông).
- **Số tiến trình PHP (PHP-FPM / LSAPI / Apache workers) ≥ 300–400** cho 1000 khách đồng thời; keep-alive ngắn (2–5 giây).
- Ưu tiên hosting **LiteSpeed** hoặc **Nginx + PHP-FPM**; bật **OPcache**.
- Nên đặt **Cloudflare (gói miễn phí)** trước website: lưu ảnh/JS/CSS ở CDN, chặn bot, giảm tải máy chủ.
- Gói 1–2 CPU dùng chung khó giữ 1000 khách cùng lúc; nên VPS ≥ 4 CPU / 4GB RAM nếu chạy quảng cáo lớn.

## Đo lại
Build `node tools/package-hosting.mjs`, chạy bản `dist/` trên Docker (cổng 8090) rồi
`BASE=http://127.0.0.1:8090 node tools/load-test.mjs 1000 10`. Không chạy vào hosting thật.
