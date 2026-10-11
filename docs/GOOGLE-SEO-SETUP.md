# Thiết lập Google Search Console & Google Business Profile

Hai việc này **cần chủ doanh nghiệp tự đăng ký** bằng tài khoản Google của công ty (Google yêu cầu xác minh quyền sở hữu). Website đã chuẩn bị sẵn mọi phần kỹ thuật.

## Website đã có sẵn

| Hạng mục | Vị trí |
|---|---|
| Sơ đồ trang (sitemap) tự cập nhật mỗi lần build | `frontend/sitemap.xml` |
| robots.txt | `frontend/robots.txt` |
| Nội dung tóm tắt cho trợ lý AI (sản phẩm, dự án, hỏi đáp) | `frontend/llms.txt` |
| Dữ liệu có cấu trúc: Sản phẩm, Bài viết, Hỏi đáp (FAQPage), Cửa hàng (HVACBusiness), Dự án | Tự sinh trên từng trang |
| Thẻ xác minh Search Console | Quản trị › Cài đặt cửa hàng › *Mã xác minh Google Search Console* |
| Link "Xem & đánh giá trên Google" cho từng cửa hàng | Trang Hệ thống cửa hàng |
| Điểm & đánh giá Google, logo đối tác, chứng nhận | Quản trị › Uy tín & đánh giá |

## 1. Google Search Console (10 phút)

1. Vào https://search.google.com/search-console → **Thêm thuộc tính** → chọn **Tiền tố URL**, nhập địa chỉ website, ví dụ `https://ten-mien.vn/frontend/` (hoặc `https://thanhhieu599.github.io/dien-lanh-web/frontend/` khi còn dùng bản demo).
2. Chọn phương thức **Thẻ HTML** → sao chép phần `content="..."` (chuỗi ký tự dài).
3. Vào **Quản trị › Cài đặt cửa hàng › Mã xác minh Google Search Console**, dán chuỗi đó → Lưu.
4. Chạy lại bản build website (GitHub › Actions › *Deploy website* › **Run workflow**) để thẻ xác minh có trong trang tĩnh, đợi ~5 phút.
5. Quay lại Search Console bấm **Xác minh**.
6. Vào **Sơ đồ trang web** → nhập `sitemap.xml` → **Gửi**.
7. Sau 3 – 7 ngày: xem **Trang** (bao nhiêu trang được lập chỉ mục) và **Hiệu suất** (từ khóa, lượt nhấp).

> Khi dùng tên miền riêng, nên xác minh thêm thuộc tính **Miền** (bản ghi DNS TXT) để gom số liệu mọi tên miền con.

## 2. Google Business Profile – cho TỪNG cửa hàng (15 phút / cửa hàng + thời gian xác minh)

1. Vào https://business.google.com → **Thêm doanh nghiệp** (mỗi showroom là 1 hồ sơ riêng).
2. Tên doanh nghiệp: **đúng tên thật trên biển hiệu** (ví dụ "Tên thương hiệu – Quận 7"), không nhồi từ khóa.
3. Danh mục chính: **Nhà thầu điều hòa không khí** (Air conditioning contractor); danh mục phụ: *Cửa hàng thiết bị điện gia dụng*, *Dịch vụ sửa chữa điều hòa không khí*.
4. Địa chỉ, số điện thoại, giờ mở cửa: **trùng khớp 100%** với trang *Hệ thống cửa hàng* trên website (Quản trị › Cửa hàng). Thông tin thống nhất (NAP) giúp Google tin cậy và xếp hạng tốt hơn.
5. Website: link trang *Hệ thống cửa hàng* hoặc trang chủ.
6. Xác minh theo cách Google đưa ra (video quay cửa hàng, cuộc gọi, hoặc thư bưu điện).
7. Sau khi xác minh:
   - Tải ≥ 10 ảnh thật: mặt tiền, bên trong, đội kỹ thuật, công trình đã làm.
   - Thêm **Dịch vụ** (lắp đặt, vệ sinh, sửa chữa, báo giá dự án) và **Sản phẩm** chính.
   - Bật **Nhắn tin** và câu trả lời tự động ngoài giờ.
   - Đăng bài cập nhật 1 lần/tuần (khuyến mãi, dự án mới, mẹo sử dụng).
8. Lấy **link viết đánh giá**: trong hồ sơ → *Yêu cầu đánh giá* → sao chép link. Gửi link này cho khách sau khi lắp đặt xong (qua Zalo / tin nhắn cảm ơn).

## 3. Đưa đánh giá Google lên website

Vào **Quản trị › Uy tín & đánh giá**:

- **Link Google Maps** và **Place ID** (tra tại https://developers.google.com/maps/documentation/places/web-service/place-id) → website hiện nút *Xem trên Google Maps* và *Viết đánh giá*.
- **Điểm** và **Số lượt đánh giá**: nhập đúng số đang hiện trên Google, cập nhật hằng tháng.
- **Đánh giá chọn lọc**: chép nguyên văn đánh giá thật (tên, số sao, ngày). Không chỉnh sửa, không tự viết đánh giá.

> Tự động lấy đánh giá trực tiếp từ Google (Places API) cần tạo dự án Google Cloud, bật thanh toán và tạo API key; điều khoản của Google giới hạn việc lưu trữ, hiển thị lại đánh giá. Cách nhập tay ở trên miễn phí và đúng điều khoản; khi cần tự động hóa có thể bổ sung sau.

## 4. Lịch duy trì

| Tần suất | Việc |
|---|---|
| Hằng tuần | Đăng 2 – 3 bài theo `docs/KE-HOACH-NOI-DUNG.md`; 1 bài cập nhật trên Google Business Profile; trả lời mọi đánh giá mới trong 24 giờ |
| Hằng tháng | Xem Search Console (lỗi lập chỉ mục, từ khóa); cập nhật điểm & đánh giá Google trên website; thêm 1 dự án tiêu biểu mới |
| Hằng quý | Rà lại thông tin cửa hàng (giờ mở cửa, SĐT) trên website và Google Business Profile cho khớp |
