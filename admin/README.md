# Quản trị React

Giao diện tại `/admin/` dùng React + TypeScript + React Router, giữ màu xanh và Roboto. Backend PHP/MySQL, cấu trúc dữ liệu và URL hash được giữ nguyên. Không dùng Supabase.

## Chạy và đóng gói

- `npm ci`, `npm run dev`: mở http://127.0.0.1:5173/admin/.
- MySQL: chạy PHP theo [hướng dẫn server](../server/README.md). Vite proxy `/server/` đến PHP tại cổng 8080; có thể đặt `PHP_SERVER`.
- Tạo quản trị viên nội bộ: `docker compose exec web php server/cli.php create-admin 09xxxxxxxx "Quản trị viên"`. Nhập mật khẩu ẩn hai lần; không cần đăng ký trên website. Số đã tồn tại sẽ bị từ chối, không bị đổi mật khẩu/quyền.
- Sau khi đăng nhập, admin cấp vai trò cho tài khoản khác tại Khách hàng → chi tiết khách hàng → Vai trò tài khoản. Các admin hiện có quyền ngang nhau.
- `npm run package:hosting`: tạo `dist/`, tải cùng `frontend/`, `admin/`, `server/` lên hosting và cấu hình PHP/MySQL. Các bundle quản trị được dùng chung vị trí `frontend/react-assets/`.
- Demo: chọn mode demo trong cấu hình, bấm “Vào trang quản trị (demo)”. Dữ liệu lưu trong trình duyệt và dùng chung với website cùng tên miền. Demo không xác nhận giao dịch MySQL.

## Mã nguồn

Để chạy thử đầy đủ các danh sách: `npm run db:seed:test`, rồi `docker compose exec web php server/cli.php seed-test`. Bộ này thêm 15 mẫu mỗi bảng nghiệp vụ/nội dung, 20 thông báo (10 lịch bảo trì) và cấu hình đúng cấu trúc; không ghi đè dữ liệu đã có. Xem chi tiết và cách kiểm tra tại [hướng dẫn dữ liệu thử nghiệm](../server/README.md#dữ-liệu-thử-nghiệm-cho-admin).

| Thư mục/file | Trách nhiệm |
|---|---|
| `src/App.tsx` | Đăng nhập, menu, hash routing, phân quyền và thông báo |
| `src/components/` | Bảng, form, ảnh, hộp thoại, trạng thái dữ liệu |
| `src/pages/` | Tổng quan, CRUD, đơn/lead/đánh giá, CRM, cài đặt, nội dung, báo cáo/MISA/thông báo/bảo trì |
| `src/services/runtime.ts` | Khởi tạo dữ liệu dùng chung, adapter, cache, CSV và tải ảnh |
| `src/services/accounting.ts` | Quy tắc chứng từ MISA, phân bổ giảm giá và đối chiếu tổng |
| `src/styles/admin.css` | Token màu xanh, chữ, khoảng cách, responsive và focus |
| `assets/js/db.js` | Adapter PHP/MySQL và demo dùng chung hợp đồng dữ liệu |
| `assets/js/resources.js` | Metadata trường, kiểm tra dữ liệu và quy tắc lưu |
| `assets/js/xlsx.js` | Xuất workbook Excel |

Các file `app.js`, `ui.js`, `charts.js`, `pages-*.js`, `category-products.js` và CSS quản trị cũ được giữ để đối chiếu. Entry React không nạp các trình dựng UI này; chưa xóa khi chưa được duyệt.

## Chức năng và quyền

| Vai trò | Phạm vi |
|---|---|
| admin | Toàn bộ quản trị và cấp vai trò cho tài khoản khác |
| staff | Vận hành cửa hàng; không chỉnh cài đặt, chính sách và nội dung dành riêng admin |
| sales | Lead được giao; cập nhật trạng thái và ghi chú nội bộ |
| accountant | Đơn hàng, tình trạng thanh toán, báo cáo và xuất MISA |

Menu/route hạn chế theo vai trò; API PHP vẫn kiểm tra quyền ở máy chủ. Demo mô phỏng vai trò để kiểm tra giao diện; không dùng demo làm cơ chế bảo mật.

CRUD gồm sản phẩm, danh mục/thương hiệu và thứ tự sản phẩm, mã giảm giá nâng cao, banner, bài viết, dự án, FAQ, cửa hàng, dịch vụ, chính sách. Đơn hàng hỗ trợ trạng thái, thanh toán, ghi chú, in và CSV. CRM hỗ trợ khách hàng, địa chỉ, nhãn, ghi chú và lịch sử mua. Nội dung có trang chủ/catalog, tầm nhìn và uy tín. Báo cáo/MISA giữ quy tắc tính hiện hành.

Thanh toán chỉ có COD và chuyển khoản ngân hàng. Worker gửi email/Zalo/Telegram chưa được triển khai trên PHP. Trang nhật ký/bảo trì hiển thị dữ liệu và thao tác hàng đợi; không tuyên bố thông báo đã được gửi.

## Quy chuẩn giao diện và nghiệm thu

- Component **must** dùng token `--ar-*` cho màu, cỡ chữ và khoảng cách chung; **should** tái dùng bảng, form, panel và toolbar.
- Điều khiển **must** có default, hover, focus-visible, active, disabled, loading và error. Nút đang xử lý **must** bị khóa và có `aria-busy`; lỗi lưu **must** không hiển thị thông báo thành công.
- Bảng **must** có header ngữ nghĩa, vùng cuộn ngang nhận focus, trạng thái rỗng và phân trang. Tên dài **must** xuống dòng, không đẩy toàn trang tràn ngang.
- Form **must** có nhãn, kiểm tra bắt buộc, lỗi liên kết với trường và khóa lưu khi đang tải ảnh. Tags/danh sách **must** giữ dấu phân cách trong lúc nhập. JSON không hợp lệ **must** chặn gửi.
- Mọi thao tác **must** dùng được bằng Tab, Shift+Tab, Enter/Space, chuột và chạm. Dialog/menu di động **must** giữ focus, đóng bằng Escape và trả focus về nút mở; menu đóng **must** không nhận Tab.
- Text thường **must** đạt tương phản 4.5:1; điều khiển và vòng focus **must** đạt 3:1. Focus **must** hiển thị, reduced motion **must** tắt chuyển động không cần thiết.
- Ở 320/390/768/1024/1440px, nội dung **must** không tràn trang; bảng rộng **must** chỉ cuộn trong vùng bảng. Nhãn thao tác **must** cụ thể: “Lưu khách hàng”, “Xuất CSV”, “Tải file Excel”.
- Không dùng `innerHTML` để dựng trang/form từ dữ liệu. HTML giàu định dạng **must** được lọc; URL ảnh **must** kiểm tra giao thức. Bỏ ảnh **must** chỉ gỡ tham chiếu để không xóa file dùng nơi khác.

## QA

- [ ] `npm run typecheck`.
- [ ] `npm run test:admin`: route, CRUD, validation, ảnh, coupon cũ/nâng cao, đơn/lead, CRM, CSV/Excel, phân quyền, lỗi tải, bàn phím, responsive.
- [ ] `npm test`: chạy thêm hồi quy website và đồng bộ dữ liệu giữa hai giao diện.
- [ ] `npm run build -- --demo --limit 3` + `npm run test:build`: SEO và entry quản trị đã biên dịch.
- [ ] `npm run test:api` + `npm run test:hosting` với PHP/MySQL và tài khoản/database thử nghiệm.
- [ ] Kiểm tra thủ công trình đọc màn hình, zoom 200%, font Roboto tải thật và quy trình vận hành thực tế.
