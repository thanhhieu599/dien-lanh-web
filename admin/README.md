# Trang quản trị (Giai đoạn 3)

Ứng dụng một trang (HTML/CSS/JS thuần) tại `/admin/`, dùng chung database Supabase và cấu hình `frontend/assets/js/backend-config.js` với website.

- Online: https://thanhhieu599.github.io/dien-lanh-web/admin/
- Cục bộ: chạy `npx http-server -p 8080` ở **thư mục gốc repo**, mở http://localhost:8080/admin/

## Đăng nhập

- **Đã kết nối Supabase**: đăng nhập bằng số điện thoại (hoặc email) + mật khẩu của tài khoản có `profiles.role` = `staff` hoặc `admin`.
  Tạo quản trị viên đầu tiên: đăng ký trên website rồi chạy `update public.profiles set role = 'admin' where phone = '09xxxxxxxx';` trong SQL Editor.
  Sau đó admin cấp quyền nhân viên cho người khác ngay trong mục **Khách hàng**.
- **Chưa kết nối (demo)**: bấm "Vào trang quản trị (demo)". Dữ liệu lưu trên trình duyệt; đơn hàng, form và đánh giá gửi từ website demo trên cùng trình duyệt hiện ở đây, đổi trạng thái đơn sẽ thấy ngay ở trang tra cứu đơn của website.

## Chức năng

| Mục | Chức năng |
|---|---|
| Tổng quan | Doanh thu hôm nay / 30 ngày, đơn chờ xác nhận, lead mới, đánh giá chờ duyệt, biểu đồ doanh thu, sản phẩm sắp hết |
| Đơn hàng | Lọc theo trạng thái / thanh toán / ngày, tìm mã đơn - SĐT - tên; chi tiết đơn, chuyển trạng thái theo quy trình, hủy (tự hoàn kho), cập nhật thanh toán, ghi chú nội bộ, in phiếu, xuất CSV |
| Khách hàng tiềm năng | Báo giá dự án B2B, đặt lịch dịch vụ, liên hệ, nhận tin; pipeline Mới → Đã liên hệ → Đã báo giá → Chốt/Thất bại, giao người phụ trách, ghi chú chăm sóc, gọi/Zalo/email nhanh, xuất CSV |
| Khách hàng | Tài khoản đăng ký, địa chỉ, lịch sử đơn; admin cấp quyền nhân viên / quản trị |
| Sản phẩm | Thêm / sửa / nhân bản / ẩn, giá, tồn kho, flash sale, thuộc tính bộ lọc theo danh mục, thông số, ảnh, xuất CSV |
| Danh mục, Thương hiệu | Loại con, bộ lọc của danh mục, thứ tự hiển thị |
| Đánh giá | Duyệt / từ chối / xóa |
| Mã giảm giá | %, số tiền, miễn phí ship; đơn tối thiểu, giới hạn lượt, thời hạn, mã riêng (không công khai) |
| Banner, Bài viết | Slider trang chủ; bài viết SEO (HTML), nháp / đăng |
| Báo cáo | Doanh thu theo ngày/tháng, danh mục, thương hiệu, top sản phẩm, phương thức thanh toán, tỷ lệ hủy, chuyển đổi lead |
| Cấu hình | Thông tin doanh nghiệp, hotline, phí ship, phí lắp đặt (áp dụng khi tính tiền đơn), cửa hàng, dịch vụ, chính sách |

## Phân quyền

`staff`: mọi mục trừ Cài đặt cửa hàng, Chính sách, đổi vai trò tài khoản. `admin`: toàn quyền. Quyền được kiểm tra ở database (RLS), không chỉ ở giao diện.
