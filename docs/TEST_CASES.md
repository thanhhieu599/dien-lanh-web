# Danh sách test case – Website & Admin Kỹ nghệ lạnh Khánh Lê

Mọi test case dưới đây **chạy tự động** mỗi lần cập nhật code (GitHub Actions "Tests (PHP + MySQL)").
Chạy trên máy: `npm test` (website + admin bản demo) và các lệnh trong mục "Máy chủ thật" ở cuối.

Ký hiệu nơi chạy: **[Web]** `tests/react/*.mjs` · **[Admin]** `tests/react/admin.test.mjs` ·
**[Máy chủ]** `tests/server/*.php|mjs` trên PHP + MySQL thật · **[Unit]** `tests/unit/*`.

## 1. Mua hàng & đặt hàng – chống sai sót và thất thoát doanh thu

| Mã | Tình huống | Kết quả đúng | Nơi chạy |
|---|---|---|---|
| A1 | Khách sửa giá / tổng tiền / chiết khấu / phí ship gửi lên máy chủ | Bỏ qua, tính lại theo giá trong database | [Máy chủ] commerce.test.php |
| A2 | Đặt hàng bất kỳ | Phí giao hàng = 0 | commerce.test.php, mysql-api.test.mjs |
| A3 | Đặt 1 cái | Tồn kho giảm đúng 1 | commerce.test.php |
| A4 | Số lượng 0, âm, lẻ (1.5), dạng chữ, > 99, trống | Bị chặn | commerce.test.php |
| A5–A6 | Sản phẩm không tồn tại / giỏ rỗng / sản phẩm ngừng bán | Bị chặn | commerce.test.php |
| A7–A9 | Đặt vượt tồn kho, tách 2 dòng cùng sản phẩm để vượt tồn | Bị chặn, tồn kho không đổi | commerce.test.php |
| A10–A11 | Lắp đặt cho máy lạnh và phụ kiện | Chỉ tính phí lắp cho máy lạnh × số lượng; tạm tính = Σ dòng hàng | commerce.test.php |
| A12 | Nhận tại cửa hàng | Phí 0, cửa hàng phải có thật | commerce.test.php |
| A13 | Thanh toán MoMo/thẻ, sai địa chỉ, sai số điện thoại, thiếu tên | Bị chặn (chỉ COD + chuyển khoản) | commerce.test.php |
| B1–B2 | Mã giảm % có trần, nhập chữ thường / có khoảng trắng | Giảm đúng, tăng 1 lượt dùng | commerce.test.php |
| B3 | Mã chưa đủ giá trị tối thiểu | Bị chặn, không trừ kho, không tăng lượt | commerce.test.php |
| B4 | Mã giảm cố định lớn hơn tiền hàng | Chỉ giảm tối đa bằng tiền hàng, không âm | commerce.test.php |
| B5–B6 | Mã giới hạn 1 lượt dùng 2 lần | Lần 2 bị chặn | commerce.test.php |
| B7–B9 | Mã mỗi khách 1 lần (kể cả đổi cách viết số +84) | Cùng khách bị chặn, khách khác dùng được | commerce.test.php |
| B10 | Mã hết hạn / đã tắt / không tồn tại | Bị chặn | commerce.test.php |
| C1–C4 | Khách hủy đơn có mã giảm giá, hủy lần 2 | Hoàn đủ kho + lượt mã; không hoàn 2 lần | commerce.test.php |
| C2 | Tra cứu đơn bằng số điện thoại khác | Không xem được đơn người khác | commerce.test.php |
| C5 | Mã mỗi khách 1 lần khi đơn cũ còn hiệu lực | Vẫn bị chặn | commerce.test.php |
| D2b | Khách tự hủy đơn đã thanh toán / đã giao | Bị chặn – phải liên hệ cửa hàng | commerce.test.php |
| D1 | Nhảy cóc Chờ xác nhận → Hoàn thành | Bị chặn | commerce.test.php |
| D2 | Đơn COD hoàn thành | Tự ghi "Đã thanh toán" + thời điểm thu | commerce.test.php, sync.test.mjs |
| D3 | Hủy đơn đã hoàn thành | Bị chặn | commerce.test.php |
| D4–D5 | Nhân viên hủy đơn, mở lại đơn đã hủy | Hoàn kho + lượt mã; không mở lại được | commerce.test.php |
| D6–D8 | Trạng thái thanh toán lạ; người lạ sửa / đọc đơn, khách hàng | Bị chặn | commerce.test.php |
| E1 | Đối soát mọi đơn trong database | Tạm tính = Σ dòng; Tổng = tạm tính + lắp đặt + ship − giảm giá; không âm | commerce.test.php |
| E2–E4 | Đối soát kho | Không tồn âm; tồn = lần ghi cuối của lịch sử kho; bán − hủy khớp đơn còn hiệu lực | commerce.test.php |
| R1 | 6 khách cùng mua món hàng cuối cùng | Đúng 1 đơn thành công, tồn 0 | [Máy chủ] race.test.mjs |
| R2 | Mã 1 lượt bị 4 khách dùng cùng lúc | Đúng 1 đơn được giảm | race.test.mjs |
| R3 | Khách bấm "Đặt hàng" 2 lần / trình duyệt gửi lại | Chỉ 1 đơn, kho trừ 1 lần | race.test.mjs |
| R4 | Admin đổi giá khi khách đang ở trang thanh toán | Website tải giá mới; nếu tổng tiền khác, khách được báo | sync.test.mjs |
| P1 | Luật giá / mã giảm giá trên website và máy chủ | Giống hệt nhau (25 ca dùng chung) | [Unit] pricing.test.mjs + pricing.test.php |
| M1 | Đối soát tiền: đã thu / chưa thu / cần hoàn tiền / chuyển khoản quá hạn | Tính đúng, đơn hủy không tính doanh số | [Unit] revenue.test.mjs, [Admin] |

## 2. Website (khách hàng)

| Mã | Chức năng | Nơi chạy |
|---|---|---|
| W1 | Trang chủ: banner, danh mục nhanh, Flash Sale, dải danh mục, ảnh quảng cáo, chân trang | [Web] visual-restore, home-media |
| W2 | Danh mục: lọc giá / thương hiệu / thông số / còn hàng / ưu đãi / xuất xứ / đánh giá, sắp xếp, 20 sản phẩm mỗi trang | [Web] website, product-layout |
| W3 | Tìm kiếm, thương hiệu, khuyến mãi, so sánh, yêu thích | [Web] website |
| W4 | Trang sản phẩm: chọn thuộc tính, số lượng, thêm giỏ, mua ngay, tên chung khung ảnh | [Web] website, visual-restore |
| W5 | Nhãn sản phẩm: chỉ "Bán chạy" khi bán từ 300 lượt | [Web] home-media |
| W6 | Giỏ hàng → thanh toán COD / chuyển khoản (VietQR), miễn phí giao hàng, mã giảm giá | [Web] website, home-media |
| W7 | Đặt hàng thành công, tra cứu, khách tự hủy | [Web] website, [Máy chủ] sync |
| W8 | Tài khoản: đăng ký, đăng nhập, đơn của tôi | [Web] website, [Máy chủ] hosting-browser |
| W9 | Form liên hệ, báo giá dự án, đặt lịch dịch vụ, nhận tin | [Web] website |
| W10 | Hỏi đáp, tin tức (phân trang), dự án, giới thiệu, chính sách | [Web] website, product-layout |
| W11 | Giao diện 320 → 1440px không tràn ngang; không lỗi JavaScript | [Web] tất cả |
| W12 | Bản SEO dựng sẵn (prerender) cho Google | CI: SEO build using MySQL |

## 3. Admin

| Mã | Chức năng | Nơi chạy |
|---|---|---|
| AD1 | Đăng nhập, hết phiên, phân quyền 4 vai trò (quản trị, vận hành, kinh doanh, kế toán) | [Admin], admin.test.php |
| AD2 | Sản phẩm / danh mục / thương hiệu / mã giảm giá / banner / bài viết / dự án / FAQ / cửa hàng / dịch vụ / chính sách: thêm, sửa, xóa, kiểm tra dữ liệu | [Admin], admin.test.php |
| AD3 | Trình soạn thảo nội dung (định dạng, bảng, ảnh, liên kết, mã HTML) | [Admin] |
| AD4 | Đơn hàng: chuyển trạng thái, thanh toán, ghi chú, in, hủy | [Admin], commerce.test.php |
| AD5 | Khách hàng (CRM), khách tiềm năng, đánh giá | [Admin], admin.test.php |
| AD6 | Bảo trì: khách đăng ký, lần bảo trì, thống kê | [Admin], [Unit] maintenance |
| AD7 | Kho: nhập hàng (giá vốn bình quân, công nợ NCC), kiểm hàng, xuất kho, nhà cung cấp, lịch sử kho | [Admin], admin.test.php |
| AD8 | Hóa đơn bán hàng (số tự tăng, cấp 1 lần, bằng chữ), Phiếu nhập kho 01-VT, Phiếu xuất kho 02-VT | [Admin], admin.test.php |
| AD9 | Dashboard & Báo cáo: doanh số, đã thu, chưa thu, đối soát tiền | [Admin] |
| AD10 | Xuất Excel MISA, CSV | [Admin] |
| AD11 | Cài đặt cửa hàng, nội dung website, trang tầm nhìn, uy tín | [Admin] |

## 4. Admin ↔ Website (đồng bộ, PHP + MySQL thật – `tests/server/sync.test.mjs`)

| Mã | Tình huống | Kết quả đúng |
|---|---|---|
| S1 | Admin nhập hàng | Website thấy tồn mới |
| S2 | Admin đổi giá | Trang sản phẩm hiện giá mới ngay |
| S3–S4 | Khách đặt COD | Admin thấy đơn đúng tiền, kho trừ, lịch sử kho, khách vào CRM |
| S5 | Quản lý kho | Tồn kho / Có thể bán / Đang giao dịch khớp đơn đang mở |
| S6 | Admin hoàn thành đơn | Khách tra cứu thấy "Đã thanh toán", CRM cộng chi tiêu |
| S7 | Chứng từ | Hóa đơn, phiếu xuất bán hàng, phiếu nhập kho in được từ dữ liệu thật |
| S8 | Khách hủy đơn chuyển khoản | Admin thấy "Đã hủy", kho hoàn lại |
| S9 | Kiểm hàng về 0 | Website hết hàng, máy chủ chặn đặt |
| S10 | Đổi hotline trong Cài đặt | Website hiện ngay |
| S11 | Các trang Kho trên MySQL | Mở được, không lỗi |

## 5. Bảo mật – chống tấn công, không sập (`tests/server/security.test.mjs`, `tests/server/xss-browser.test.mjs`)

Chỉ chạy trên máy chủ thử nghiệm (docker), không tấn công thử lên hosting thật.

| Mã | Kiểu tấn công | Cách thử | Kết quả mong đợi |
|---|---|---|---|
| S1 | Đọc trộm dữ liệu | Người lạ đọc 18 bảng nội bộ (khách hàng, đơn, thanh toán, CRM, kho, NCC…), cài đặt nội bộ, SĐT người đánh giá | Bị chặn / trả rỗng |
| S2 | Sửa dữ liệu trái phép | Người lạ và khách đã đăng nhập thêm/sửa/xóa sản phẩm, giá, đơn, cài đặt, kho; tự nâng quyền admin; gọi chức năng kho, xuất hóa đơn | Bị chặn 401/403, vai trò giữ nguyên |
| S3 | Giả mạo yêu cầu (CSRF) | Gửi thiếu header bảo vệ, gửi từ trang web lạ | 403 |
| S4 | Tấn công đăng nhập | Dò tài khoản qua thông báo lỗi, cố định phiên, dùng lại phiên sau đăng xuất, mật khẩu yếu, đăng ký trùng | Thông báo giống nhau, đổi mã phiên, phiên cũ mất hiệu lực, cookie HttpOnly + SameSite |
| S5 | Dữ liệu rác / chèn SQL | ~1.500 yêu cầu sai kiểu dữ liệu vào mọi chức năng công khai; chèn SQL vào bộ lọc, sắp xếp; JSON hỏng, lồng 80 tầng; gửi 2 MB; tên khách dạng object | Từ chối 400/413, không lỗi 500, không lộ mã nguồn / câu SQL, "OR 1=1" không trả thêm dữ liệu |
| S6 | Tải tệp nhạy cảm | Tải mã nguồn PHP, cấu hình, schema, `.git`, `.env`, `package.json`; đường dẫn ảnh `../`; tải tệp `.php` lên | 403/404, không tải lên được |
| S7 | Clickjacking, đoán loại tệp | Kiểm tra header trang web và API | Có nosniff, X-Frame-Options, Referrer-Policy; không lộ phiên bản PHP/Apache |
| S8 | Spam / quá tải | 40 yêu cầu đồng thời; gửi form liên hệ liên tục | Vẫn trả lời bình thường; spam bị chặn 429; máy chủ vẫn sống |
| X1 | Chèn mã độc (XSS) | Tên, địa chỉ, ghi chú, hóa đơn VAT, nguồn khách, form liên hệ, link `javascript:` chứa `<script>`, `<img onerror>`, `<svg onload>`; tham số lạ trên ô tìm kiếm / sản phẩm / danh mục | Mở 5 trang web + 10 trang admin (đơn, hóa đơn, phiếu xuất, liên hệ, khách hàng…): mã không chạy, trang không lỗi, hiện dạng chữ |

Lỗi đã phát hiện và sửa khi viết bộ test này:
- Gửi dữ liệu sai kiểu (mảng thay vì chữ) làm máy chủ báo lỗi 500 → nay từ chối 400.
- Tên khách / địa chỉ / tên liên hệ dạng object được lưu và có thể làm trắng trang quản trị → máy chủ chỉ nhận chữ, cắt độ dài.
- Lộ phiên bản PHP/Apache, thiếu header chống nhúng trang → đã thêm header, ẩn phiên bản.
- Nếu đưa nguyên mã nguồn lên hosting, `.git`, `package.json` tải được → thêm `.htaccess` gốc chặn tệp ẩn và tệp phát triển.

## 6. Tạo đơn hàng tại quản trị (`tests/server/commerce.test.php` mục F, `tests/react/admin.test.mjs`)

| Mã | Tình huống | Kết quả mong đợi |
|---|---|---|
| F1–F2 | Người lạ / khách hàng gọi chức năng tạo đơn quản trị | 401 / 403 |
| F3 | Sửa giá tay + dòng tự nhập + phí lắp, phí giao, chiết khấu, VAT 8% cộng thêm | Tổng đúng đến từng đồng |
| F4–F5, F8 | Sản phẩm trong hệ thống / dòng tự nhập | Trừ kho đúng số lượng, ghi lịch sử kho theo mã đơn; dòng tự nhập không trừ kho |
| F6–F7 | Trạng thái, đã thanh toán, thông tin hóa đơn; khách mới | Lưu đủ, có thời điểm thu tiền; khách tự vào CRM |
| F9–F10 | Giá đã gồm VAT / không chịu thuế | Tổng giữ nguyên, tách thuế đúng; không cộng thuế |
| F11–F17 | Vượt tồn, chiết khấu vượt tổng, giá âm, SL 0, thuế suất lạ, thiếu tên, SĐT sai, 1 dòng lỗi | Chặn, cả đơn không tạo, kho không đổi |
| F18 | Hủy đơn tạo tay | Hoàn kho đúng (bỏ qua dòng tự nhập) |
| Giao diện | Chọn khách có sẵn, chọn sản phẩm, sửa giá, thêm dòng tự nhập, VAT 10% cộng thêm, tạo đơn | Chuyển tới đơn mới, đúng tổng 2.310.000; hóa đơn tách 2.100.000 + 210.000 |

## 7. Form nhập liệu website → lưu & xem được trong admin (`tests/server/forms.test.mjs`, MySQL thật)

| Nơi nhập trên website | Xem trong admin |
|---|---|
| Đăng ký tài khoản, đăng nhập, sửa thông tin, sổ địa chỉ | Khách hàng (hồ sơ, địa chỉ) |
| Liên hệ (trang Liên hệ) | Yêu cầu khách hàng – loại "Liên hệ" |
| Báo giá dự án (trang Doanh nghiệp) | Yêu cầu khách hàng – "Báo giá dự án" (doanh nghiệp, MST, số lượng, nhu cầu) |
| Đặt lịch dịch vụ, khảo sát công suất | Yêu cầu khách hàng – "Đặt lịch dịch vụ" |
| Đăng ký nhận tin (chân trang) | Yêu cầu khách hàng – "Đăng ký nhận tin" |
| Khung chat "Yêu cầu gọi lại" | Yêu cầu khách hàng – "Liên hệ" |
| Đánh giá sản phẩm | Đánh giá (chờ duyệt) |
| Đặt hàng | Đơn hàng |

## 8. Tài khoản & phân quyền (`tests/server/users.test.php`)

| Mã | Tình huống | Kết quả mong đợi |
|---|---|---|
| U1–U3 | Người lạ / nhân viên vận hành / quản trị viên mở danh sách tài khoản | 401 / 403 / xem được |
| U4–U8 | Tạo tài khoản nhân viên; mật khẩu mã hóa; trùng SĐT; mật khẩu yếu; vai trò lạ | Tạo đúng, ghi người tạo; chặn các trường hợp sai |
| U9–U12 | Đổi vai trò, tự hạ quyền, tự khóa, đặt lại mật khẩu | Đổi được cho người khác; không tự hạ quyền / tự khóa |
| U13–U15 | Khóa / mở khóa | Khóa: mất quyền ngay kể cả phiên đang mở, không đăng nhập được; mở khóa dùng lại được |
| U16–U19 | Cấp quyền cho tài khoản khách có sẵn; luôn còn ≥ 1 quản trị viên; không tự mở khóa qua sửa hồ sơ | Đúng |

## Máy chủ thật – cách chạy trên máy

```bash
docker compose up -d --build --wait
node tools/build-mysql-seed.mjs && docker compose exec -T web php server/cli.php seed
TEST_ADMIN_PHONE=0912345698 npm run test:api
docker compose exec -T web php tests/server/admin.test.php
docker compose exec -T web php tests/server/commerce.test.php
docker compose exec -T web php server/cli.php admin 0912345698
TEST_ADMIN_PHONE=0912345698 TEST_ADMIN_PASSWORD='MysqlTest!2026' npm run test:hosting
```
