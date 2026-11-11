# Kiểm tra admin — 11/11/2026

Đã kiểm tra trên bản build React và backend PHP 8.5/MySQL chạy bằng Docker với project/database riêng `dien-lanh-admin-qa`. Không thay đổi giao diện.

## Các lỗi đã sửa

| Chức năng | Lỗi và cách sửa |
| --- | --- |
| Thanh toán | Backend từ chối trạng thái `partial` dù admin cho phép chọn. Đã đồng bộ trạng thái thanh toán một phần. |
| Lọc khoảng ngày | Hai điều kiện `created_at` trùng tên bị PHP giữ lại một điều kiện. Adapter gửi bộ lọc lặp dưới dạng mảng; backend kiểm tra đủ hai mốc ngày. Áp dụng cho danh sách đơn/lead, báo cáo, CSV và MISA. |
| Lọc khách VIP | Demo bỏ qua toán tử `cs`; MySQL chưa xử lý toán tử này. Hai adapter đã lọc đúng các nhãn khách hàng. |
| Tìm đơn theo tên khách | Backend chưa đọc đường dẫn `customer->>name`. Đã bổ sung đọc trường lồng nhau khi lọc/tìm kiếm. |
| Hồ sơ CRM | Hồ sơ chỉ có tài khoản (CLI/seed) xuất hiện trong danh sách nhưng không lưu được ghi chú/thông tin. Đã tạo bản ghi CRM khi lưu lần đầu, bảo toàn liên kết tài khoản sau khi đổi điện thoại và giới hạn các trường được sửa. |

## Kết quả

- TypeScript: đạt.
- Unit JavaScript: 59/59 đạt, gồm các ca hồi quy adapter admin mới.
- Kiểm thử tích hợp admin/MySQL: 50/50 đạt. Bao gồm CRUD 12 resource, metadata CRM, bộ lọc, thanh toán một phần, phân công lead, duyệt/xóa đánh giá, thao tác bảo trì và phân quyền.
- Kiểm thử giá PHP: 25/25 đạt.
- API đặt/hủy đơn, hoàn tồn kho và chặn sửa giá/quyền: đạt.
- Trình duyệt với PHP/MySQL: 24 route admin, lưu thanh toán một phần, lọc khoảng ngày, upload/xóa ảnh, đồng bộ website và đặt/hủy đơn: đạt.
- Trình duyệt admin trên bản build: 28 route, CRUD, validation, ảnh, coupon, đơn/lead, CRM, lọc VIP, CSV/Excel, phân quyền, hết phiên, thử lại khi mất kết nối, bàn phím và responsive: đạt.
- Các bộ kiểm thử website, bố cục sản phẩm và giao diện hiện có: đạt.
- Build SEO bằng dữ liệu MySQL và kiểm thử bản build: đạt. Hai selector cũ trong test SEO được cập nhật theo markup hiện tại; không sửa giao diện.
- Kiểm tra cú pháp PHP/JavaScript và `git diff --check`: đạt.

## Chạy lại

```sh
npm run typecheck
npm run test:unit
npm run test:admin
docker compose exec -T web php tests/server/admin.test.php
docker compose exec -T web php tests/unit/pricing.test.php
```

Kiểm thử PHP cần database thử nghiệm đã seed; file `tests/server/admin.test.php` chỉ chạy qua CLI, tự tạo và dọn fixture. CI đã bổ sung chạy bộ này sau khi seed. Với project Docker riêng, thêm `-p dien-lanh-admin-qa` ngay sau `docker compose`.

`npm run test:hosting` cần `TEST_ADMIN_PHONE` và `TEST_ADMIN_PASSWORD` của tài khoản admin thử nghiệm. Chạy build và test dùng `dist/` tuần tự vì build tạo lại thư mục này.

## Giới hạn

Chưa kiểm tra trên hosting production. VNPay/MoMo và worker gửi email/Zalo/Telegram vẫn chưa được triển khai trong backend PHP hiện tại; kiểm thử hàng đợi/bảo trì chỉ xác nhận thao tác dữ liệu, không xác nhận gửi thông báo thực tế.
