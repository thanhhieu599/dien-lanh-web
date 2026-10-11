# Vận hành & quản trị

Gồm 4 phần: phân quyền nhân viên, xuất Excel sang MISA, lịch bảo trì định kỳ và quản lý ảnh sản phẩm. Đo lường quảng cáo (GA4, Meta Pixel, ROAS) có tài liệu riêng: `docs/DO-LUONG-QUANG-CAO.md`.

Cập nhật database: chạy migration `supabase/migrations/20261017000001_ops.sql` (Supabase › SQL Editor, hoặc `supabase db push`).

## 1. Phân quyền nhân viên

| Vai trò | Thấy gì | Làm được gì |
|---|---|---|
| **Quản trị** | Toàn bộ | Mọi việc, kể cả Cài đặt, phân quyền |
| **Nhân viên vận hành** | Đơn hàng, khách hàng tiềm năng, sản phẩm, nội dung, lịch bảo trì | Xử lý đơn, giao lead cho kinh doanh, sửa sản phẩm, tải ảnh. Không sửa Cài đặt |
| **Kinh doanh** | **Chỉ khách hàng tiềm năng được giao cho mình** | Đổi trạng thái (đã liên hệ, đã báo giá, chốt, mất), ghi chú chăm sóc. Không thấy đơn hàng, doanh thu, lead của người khác, không tự chuyển lead |
| **Kế toán** | Đơn hàng, giao dịch thanh toán, báo cáo doanh thu, Xuất MISA | **Chỉ** cập nhật trạng thái thanh toán (đã thu / thu một phần / hoàn tiền). Không sửa đơn, không thấy lead |

Quyền được chặn ở **2 lớp**: giao diện (ẩn menu, chặn trang) và **database (RLS)**. Dù nhân viên có biết link hay gọi thẳng API cũng không đọc được dữ liệu ngoài quyền.

**Cấp quyền:**
1. Nhân viên tự đăng ký tài khoản trên website bằng số điện thoại.
2. Quản trị › **Khách hàng** → tìm số điện thoại → cột **Vai trò** chọn *Kinh doanh* / *Kế toán* / *Nhân viên vận hành*.
3. Giao lead: mở lead › **Phụ trách** → chọn nhân viên kinh doanh. Danh sách lead có bộ lọc *Phụ trách* (kể cả *Chưa giao*) để trưởng phòng kiểm soát lead tồn.

Bản demo: thanh màu vàng phía trên trang quản trị có ô **"Xem với vai trò"** để thử nhanh từng vai trò.

## 2. Xuất Excel sang MISA

Quản trị › **Xuất Excel MISA** (hoặc nút *Xuất Excel MISA* ở trang Đơn hàng).

1. Chọn khoảng ngày, phạm vi đơn (*Đơn đã hoàn thành* – khuyến nghị, ghi nhận doanh thu khi đã giao & lắp đặt xong), ngày chứng từ, thuế suất.
2. Xem trước: số chứng từ, doanh thu chưa thuế, thuế GTGT, tổng thanh toán; dòng **"✓ Khớp tổng tiền đơn hàng"** xác nhận số liệu không lệch đồng nào.
3. Bấm **Tải file Excel (.xlsx)**. File gồm 4 sheet:

| Sheet | Nội dung | Nhập vào MISA |
|---|---|---|
| Khach hang | Mã KH (công ty: `KH` + MST; cá nhân: `KL` + SĐT), tên, địa chỉ, MST, điện thoại, email | Danh mục › Khách hàng › Nhập khẩu từ Excel |
| Vat tu hang hoa | Mã hàng = SKU, tên, ĐVT, thuế suất, TK doanh thu; phí lắp đặt `DV-LAPDAT`, vận chuyển `DV-VANCHUYEN` là *Dịch vụ* | Danh mục › Vật tư hàng hóa › Nhập khẩu |
| Chung tu ban hang | Mỗi đơn = 1 chứng từ (số chứng từ = mã đơn), mỗi sản phẩm / phí = 1 dòng | Bán hàng › Nhập khẩu từ Excel |
| Huong dan | Các bước trên + tổng số liệu để đối chiếu | – |

**Quy tắc hạch toán mặc định** (đổi trong Cài đặt cửa hàng › *Kế toán – xuất Excel MISA*):

| Trường hợp | TK Nợ | TK Có |
|---|---|---|
| Đơn chưa thu tiền / thu một phần | 131 | 5111 (hàng), 5113 (lắp đặt, vận chuyển) |
| Đã thu – COD (tiền mặt) | 1111 | như trên |
| Đã thu – chuyển khoản, thẻ, ví, trả góp | 1121 | như trên |
| Thuế GTGT đầu ra | | 33311 |
| Mã giảm giá (chiết khấu thương mại) | 5211 (TT200) – TT133 để trống | |

- Giá website **đã gồm VAT** → Đơn giá = giá ÷ (1 + thuế suất), làm tròn đồng; tiền thuế lấy phần còn lại để **tổng chứng từ = tổng tiền khách trả**.
- Mã giảm giá phân bổ vào các dòng hàng theo tỷ lệ giá trị.

> ⚠️ **Kế toán cần làm 1 lần**: MISA SME (2019 – 2024) và MISA AMIS có mẫu nhập khẩu khác nhau. Lần đầu nhập, ở bước **Ghép cột** chọn cột tương ứng và **lưu cách ghép**; các tháng sau dùng lại. Kiểm tra thuế suất thực tế của từng nhóm hàng (10% hoặc 8% theo chính sách giảm thuế đang hiệu lực) trước khi ghi sổ.

## 3. Lịch bảo trì định kỳ – doanh thu dịch vụ lặp lại

**Luồng tự động:**
1. Trang thanh toán (giỏ có máy lạnh) có ô **"Nhắc tôi lịch vệ sinh máy lạnh định kỳ"** – không tick sẵn (Nghị định 13/2023). Khách đồng ý qua điện thoại: nhân viên tick trong chi tiết đơn.
2. Đơn chuyển sang **Hoàn thành** → hệ thống xếp lịch nhắc sau **6, 12, 18, 24 tháng** (Cài đặt › *Nhắc bảo trì định kỳ*: đổi chu kỳ, ví dụ 3 tháng cho nhà hàng, xưởng).
3. Đúng ngày, 9h sáng: gửi **email** có nút *Đặt lịch vệ sinh* (link có nguồn `nhac-bao-tri` để đo hiệu quả), **Zalo ZNS** (nếu đăng ký mẫu) và **báo nhân viên** qua Zalo / Telegram / email để gọi chăm sóc.
4. Khách đặt lịch dịch vụ (cùng số điện thoại) → ghi nhận **"Khách đã đặt lịch"**, bỏ lời nhắc sắp đến hạn. Hủy đơn / khách không muốn nhận → tự hủy nhắc.

**Quản trị › Lịch bảo trì:** lời nhắc đến hạn trong 30 ngày, số khách đang theo dõi, số lần đã nhắc, **tỷ lệ khách quay lại đặt lịch**. Nút *Gửi ngay*, *Bỏ nhắc*, *Bật lại*, xuất CSV để telesale gọi trước.

**Mẫu Zalo ZNS (tùy chọn):** đăng ký mẫu "Nhắc bảo dưỡng định kỳ" trên Zalo Cloud Account, nút bấm trỏ tới
`https://<website>/dich-vu.html?svc=ve-sinh&utm_source=nhac-bao-tri&utm_medium=zns&utm_campaign=bao-tri-dinh-ky#book-form`,
sau đó khai báo secret `ZNS_TEMPLATE_MAINT` (ID mẫu) và `ZNS_PARAMS_MAINT` (vd `customer_name,months,order_code`).

**Gợi ý khai thác doanh thu:** mỗi máy vệ sinh 150.000 – 250.000₫/lần, 2 lần/năm. 500 khách × 1,5 máy × 2 lần × 180.000₫ ≈ **270 triệu/năm** doanh thu dịch vụ gần như không tốn chi phí tìm khách. Kèm gói *Hợp đồng bảo trì năm* cho khách doanh nghiệp.

## 4. Ảnh sản phẩm

Quản trị › Sản phẩm › mở sản phẩm › mục **Hình ảnh**:
- **Tải ảnh lên**: chọn hoặc **kéo thả nhiều ảnh** cùng lúc (tối đa 10). Ảnh tự **nén** trên trình duyệt (WebP, cạnh dài ≤ 1600px) trước khi lưu lên kho ảnh Supabase Storage – trang tải nhanh, tiết kiệm dung lượng.
- Mũi tên ←/→ đổi thứ tự; **ảnh đầu tiên là ảnh chính** (danh sách, giỏ hàng, chia sẻ Zalo/Facebook). Biểu tượng thùng rác để xóa.
- Vẫn có thể dán link ảnh có sẵn (Cloudinary, website hãng…).
- Nhân viên vận hành được tải ảnh sản phẩm và ảnh dự án; ảnh trang Tầm nhìn, logo, chứng nhận chỉ quản trị viên.
- Khuyến nghị: ảnh thật, nền trắng, vuông, ≥ 800px; có ít nhất 3 ảnh (chính diện, cận cảnh, lắp đặt thực tế) – tăng tỷ lệ chuyển đổi và được Google Hình ảnh lập chỉ mục.
