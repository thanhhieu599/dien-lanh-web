# Đo lường quảng cáo: Google Analytics 4 + Meta Pixel + ROAS

Mục tiêu: biết **khách đến từ đâu** (Google, Facebook, Zalo, tìm kiếm tự nhiên…), **ra bao nhiêu lead, bao nhiêu đơn, doanh thu bao nhiêu**, từ đó tính **ROAS = doanh thu ÷ chi phí quảng cáo** cho từng kênh.

Website đo ở 2 nơi bổ sung cho nhau:

| Nơi xem | Đo gì | Ưu điểm |
|---|---|---|
| **Quản trị › Báo cáo › Hiệu quả theo nguồn** | Lead, đơn, doanh thu theo nguồn (lấy từ database) + ô nhập chi phí để tính ROAS, chi phí/lead | Số đơn, doanh thu **thật 100%** (kể cả đơn đã hủy được loại ra), không phụ thuộc cookie |
| **Google Analytics 4 / Meta Ads Manager** | Lượt truy cập, hành trình (xem sản phẩm → giỏ hàng → thanh toán → mua), chuyển đổi theo từng chiến dịch, nhóm quảng cáo | Tối ưu quảng cáo tự động (Google/Meta học từ sự kiện mua hàng) |

## 1. Lấy mã và nhập vào website (10 phút)

### Google Analytics 4
1. Vào https://analytics.google.com → **Quản trị** → **Tạo thuộc tính**: múi giờ *Việt Nam*, đơn vị tiền *VND*.
2. **Luồng dữ liệu** → **Web** → nhập tên miền website → sao chép **Mã đo lường** dạng `G-XXXXXXXXXX`.
3. Quản trị website › **Cài đặt cửa hàng** › *Đo lường quảng cáo* › dán vào ô **GA4 Measurement ID** → Lưu.

### Meta (Facebook) Pixel
1. Vào https://business.facebook.com/events_manager → **Kết nối nguồn dữ liệu** → **Web** → tạo Pixel → sao chép **ID Pixel** (dãy số).
2. Dán vào ô **Meta Pixel ID** → Lưu.
3. Trong Business Manager › Cài đặt doanh nghiệp › **Tên miền**: xác minh tên miền website (để Meta tin tưởng dữ liệu chuyển đổi).

> Bản tĩnh chưa kết nối database: đặt `ga4Id`, `metaPixelId` trong `frontend/assets/js/seo-config.js`.
> Trong vòng 5 phút sau khi lưu (thời gian website giữ bộ nhớ đệm), mã mới có hiệu lực.

## 2. Hộp đồng ý cookie (Nghị định 13/2023/NĐ-CP)

- Mặc định **bật**: khách vào lần đầu thấy hộp *"Chúng tôi dùng cookie để đo lường…"* với 2 nút **Đồng ý / Từ chối** (không chọn sẵn).
- Chưa đồng ý: GA4 chạy chế độ **Consent Mode v2** (không ghi cookie, Google ước tính bù số liệu); **Meta Pixel không tải**.
- Đồng ý: GA4 ghi đủ dữ liệu, Pixel bắt đầu chạy. Từ chối: không hỏi lại, khách vẫn mua hàng bình thường.
- Có thể tắt hộp này trong Cài đặt (*Hộp xin đồng ý cookie › Không hiện*) nếu doanh nghiệp đã có cơ chế đồng ý khác — **khuyến nghị giữ bật**.

## 3. Sự kiện website tự gửi

| Hành động của khách | GA4 | Meta Pixel |
|---|---|---|
| Xem trang sản phẩm | `view_item` | `ViewContent` |
| Thêm vào giỏ (kể cả combo, mua kèm) | `add_to_cart` | `AddToCart` |
| Vào trang thanh toán | `begin_checkout` | `InitiateCheckout` |
| **Đặt hàng thành công** (giá trị = tổng đơn, mã giao dịch = mã đơn) | `purchase` | `Purchase` |
| Gửi form: báo giá doanh nghiệp, đặt lịch dịch vụ, liên hệ, gọi lại, tính công suất | `generate_lead` | `Lead` |
| Tìm kiếm | `search` | `Search` |
| Bấm gọi hotline / Zalo / Messenger | `contact` | `Contact` |

- Mỗi đơn chỉ tính **1 lần** (tải lại trang "Đặt hàng thành công" không đếm trùng).
- Không gửi thông tin cá nhân (tên, SĐT, email) cho Google/Meta.

### Việc cần làm trong GA4 sau 24 giờ
1. **Quản trị › Sự kiện**: bật **Đánh dấu là sự kiện chính** cho `purchase`, `generate_lead`, `contact`.
2. Liên kết **Google Ads** (Quản trị › Liên kết sản phẩm) → trong Google Ads › Mục tiêu › Chuyển đổi › **Nhập** từ GA4 các sự kiện chính → Google Ads tự tối ưu theo đơn hàng / lead thật.

## 4. Gắn nguồn cho link quảng cáo (UTM) – BẮT BUỘC để tính ROAS đúng

Website tự nhận nguồn khi link có tham số UTM, `gclid` (Google Ads tự gắn) hoặc `fbclid`. Nguồn được giữ **30 ngày** trên trình duyệt khách, gắn vào **lead** và **đơn hàng** (xem trong chi tiết đơn / lead).

| Kênh | Cách gắn |
|---|---|
| Google Ads | Bật **Tự động gắn thẻ** (auto-tagging) trong tài khoản Google Ads → website ghi nhận `google / cpc` |
| Facebook / Instagram Ads | Ở cấp quảng cáo › **Tham số URL**: `utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}` |
| Zalo Ads | Link đích: `...?utm_source=zalo&utm_medium=cpc&utm_campaign=ten-chien-dich` |
| Bài đăng Fanpage / nhóm Zalo (không trả tiền) | `?utm_source=facebook&utm_medium=social&utm_campaign=bai-dang-thang-10` |
| Email gửi khách doanh nghiệp | `?utm_source=email&utm_medium=email&utm_campaign=bao-gia-q4` |
| Lời nhắc bảo trì (hệ thống tự gắn) | `nhac-bao-tri / email` hoặc `nhac-bao-tri / zns` |

Quy ước: chữ thường, không dấu, dùng dấu gạch ngang. Tên chiến dịch thống nhất giữa các kênh để so sánh.

## 5. Tính ROAS hằng tháng (5 phút)

1. Quản trị › **Báo cáo** → chọn kỳ (*Tháng trước*).
2. Bảng **Hiệu quả theo nguồn khách**: nhập **chi phí quảng cáo** của từng kênh (lấy trong Google Ads / Meta Ads Manager, đã gồm VAT nếu có).
3. Website tự tính:
   - **ROAS** = doanh thu ÷ chi phí. Xanh: ≥ 3 (lãi tốt với biên lợi nhuận ~20 – 30%); đỏ: < 1 (lỗ trên doanh thu).
   - **Chi phí / lead**: so sánh với giá trị trung bình một hợp đồng B2B để quyết định tăng / giảm ngân sách.
4. Gợi ý ra quyết định: kênh ROAS < 2 trong 2 tháng liên tiếp → giảm ngân sách 30 – 50%, chuyển sang kênh ROAS cao; kênh B2B (lead báo giá dự án) đánh giá theo **chi phí / lead chốt được** thay vì ROAS tháng (chu kỳ chốt dài).

> Lưu ý: ROAS trong báo cáo website tính trên **đơn đặt online**. Đơn chốt qua điện thoại / Zalo từ lead quảng cáo: nhân viên cập nhật trạng thái lead **Chốt đơn** để theo dõi tỷ lệ chuyển đổi lead.

## 6. Giới hạn & bước nâng cấp (khi ngân sách quảng cáo lớn)

- Trình chặn quảng cáo, iOS và khách từ chối cookie làm Pixel mất một phần dữ liệu (thường 10 – 30%). Số đơn / doanh thu trong **Quản trị › Báo cáo** vẫn đầy đủ vì lấy từ database.
- Nâng cấp tiếp theo (chưa làm): **Meta Conversions API** và **Google Ads Enhanced Conversions** gửi đơn hàng từ máy chủ. Website đã gửi `eventID` = mã đơn để khi bổ sung sẽ không đếm trùng.
