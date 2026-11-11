# Chuyển website và quản trị sang React

Phạm vi đã duyệt: website khách hàng trước; sau đó chuyển toàn bộ giao diện quản trị sang React với `admin/src/` và `tests/react/admin.test.mjs`. Backend PHP/MySQL và cấu trúc dữ liệu giữ nguyên. Không xóa file nguồn cũ khi chưa được người dùng đồng ý.

## Kiến trúc

### Giao diện gốc được khôi phục theo yêu cầu người dùng

Mốc đối chiếu là commit `408d998` (trước chuyển đổi). Trang chủ được dựng lại bằng JSX theo cấu trúc cũ: mega menu, banner ảnh, ưu đãi và tài khoản, dải thương hiệu, danh mục ảnh, tab sản phẩm, khối doanh nghiệp, thẻ dự án/dịch vụ và khối uy tín. Header, chi tiết sản phẩm ba cột, liên hệ, đặt dịch vụ, cửa hàng, blog, FAQ và tài khoản sử dụng cấu trúc/class cũ trên React.

Giữ nguyên `frontend/assets/css/main.css` từ mốc đối chiếu, khôi phục Be Vietnam Pro, nền chữ 14px, khung 1240px và bo góc 8px. Loại bỏ lớp tái thiết kế CSS lớn sau chuyển đổi. `src/styles/react.css` chỉ còn phần tương thích JSX, trạng thái truy cập và responsive; biểu tượng được React render trực tiếp thành SVG để tránh selector cũ áp nhầm vào span bọc. HTML nội dung tiếp tục lọc bằng DOMPurify.

Các quy chuẩn diện mạo Roboto/16px và phần thiết kế lại ở các mục lịch sử bên dưới được thay thế bằng yêu cầu khôi phục giao diện gốc này. Quy tắc mới hơn về giới hạn 5 mục và nút Xem thêm được giữ. Stack React/TypeScript/Vite/React Router, API PHP/MySQL, dữ liệu và admin không bị rollback. Kiểm thử hồi quy giao diện gốc nằm tại `tests/react/visual-restore.test.mjs`; kiểm tra cấu trúc và responsive, không coi là chứng nhận mọi pixel giống nhau hoặc thay thế nghiệm thu bằng mắt.

28 HTML entry giữ tên cũ và metadata; `frontend/src/main.tsx` khởi tạo dữ liệu rồi mount ứng dụng. React Router xử lý URL HTML và URL SEO; component React dựng layout, catalog, bộ lọc, sản phẩm, options, giỏ hàng, thanh toán, đơn hàng, tài khoản, yêu thích, so sánh, form lead, nội dung, dự án, FAQ và công cụ tính công suất. Trang công ty/tầm nhìn được chuyển từ nội dung và bố cục cũ sang JSX.

CSS cũ tiếp tục dùng cho nhận diện thương hiệu; `src/styles/react.css` bổ sung layout và tương tác React. HTML của bài viết/chính sách được lọc bằng DOMPurify. Các component dùng effect có cleanup cho timer, sự kiện và dữ liệu tải bất đồng bộ.

`services/runtime.ts` nạp lớp dữ liệu cũ theo đúng thứ tự để website React và quản trị hiện có dùng cùng `DT.store`, API, khóa localStorage, cấu hình MySQL và quy tắc khuyến mãi. Đây là phần chuyển tiếp có chủ đích; chưa chuyển toàn bộ lớp nghiệp vụ sang TypeScript. Không nạp trình dựng trang JS cũ vào website React.

Vite tạo bundle có hash trong `.cache/react/`. Công cụ đóng gói ghép bản React với admin và PHP vào `dist/`; không đưa `src/`, file cấu hình bí mật, uploads hay seed vào gói upload. Build SEO dùng Chromium để chụp HTML sau khi React render, loại các script runtime được chèn động khỏi snapshot để tránh chạy hai lần khi tải lại. React render lại nội dung từ dữ liệu hiện tại khi khách truy cập.

## Kiểm tra

- `npm run typecheck`: TypeScript.
- `npm run test:admin`: build và kiểm thử quản trị React; `npm test` chạy cả website và quản trị.
- `npm run test:browser`: build và kiểm tra các trang React, SPA, lọc/sort, giỏ hàng, checkout, tra cứu/hủy, đăng ký, yêu thích/so sánh, options, lead, đồng bộ dữ liệu với quản trị React và mobile.
- `npm run test:hosting`: tích hợp React/adapter admin với PHP/MySQL thật, dùng database thử nghiệm.
- `npm run build -- --demo --limit 3` rồi `npm run test:build`: kiểm tra HTML SEO không cần JavaScript, URL đẹp và thao tác sau khi React chạy lại.

## Căn chỉnh giao diện React

### Chuyển quản trị sang React

`admin/src/` chứa entry, layout, component, trang, service và CSS React/TypeScript. HashRouter giữ URL `/admin/#/...`; Vite build chung với website, hai công cụ đóng gói hosting/SEO đều chép entry quản trị đã biên dịch. Không đổi schema PHP/MySQL.

Các nhóm trang đã chuyển: tổng quan, đơn/lead/đánh giá, CRM, CRUD catalog/marketing/cấu hình, nội dung website/tầm nhìn/uy tín, báo cáo, Excel MISA, thông báo và bảo trì. Giao diện giữ màu xanh, dùng Roboto và token `--ar-*`, bảng cuộn độc lập, menu điện thoại có inert/focus/Escape, form có validation và trạng thái xử lý.

Giữ `admin/assets/js/db.js`, metadata `resources.js` và trình xuất `xlsx.js` làm lớp chuyển tiếp. Không nạp `app.js`, `ui.js`, `charts.js`, `pages-*.js`, `category-products.js` hoặc CSS UI cũ vào entry React; các file này vẫn còn nguyên để đối chiếu, chưa được duyệt xóa. Adapter demo được bổ sung lưu/đọc nhật ký chăm sóc lead để khớp thao tác React.

Xác nhận ngày 2026-11-05: `npm test` đạt TypeScript, build hosting, hồi quy website và quản trị. Kiểm thử quản trị bao gồm route, CRUD, giá không hợp lệ, tags/options, nén ảnh, coupon cũ/nâng cao, trạng thái đơn, phân công/nhật ký lead, CRM, CSV/Excel, bốn vai trò, lỗi tải/retry, bàn phím và responsive 320–1440px. Kiểm thử HTTP giả lập xác nhận đăng nhập sai/đúng và hết phiên khi ghi qua adapter MySQL; đây không phải kiểm thử PHP/MySQL thật.

Build SEO demo riêng tại `.cache/admin-seo/` dựng 64 trang; kiểm thử HTML không JavaScript, khởi tạo React, URL SEO, giỏ hàng và entry quản trị biên dịch đã đạt. Bản hosting hiện hành ở `dist/` giữ cấu hình MySQL. PHP/MySQL thật chưa xác nhận lại trong lần chuyển quản trị vì Docker Hub/CloudFront lỗi EOF khi tải image; không có thay đổi database thật từ kiểm thử này. Các bước `test:api`/`test:hosting` và kiểm tra thủ công trình đọc màn hình vẫn cần môi trường phù hợp.

Hướng dẫn vận hành, phân quyền và checklist: [admin/README.md](../admin/README.md).

- Bộ lọc có nút mở/ẩn trên tablet và điện thoại; không còn bị CSS drawer cũ đẩy ra ngoài màn hình hoặc làm hẹp lưới sản phẩm.
- Tin tức và dự án dùng thẻ chung với vùng ảnh có tỷ lệ cố định, nội dung nằm bên dưới ảnh; ảnh trống/lỗi có khung thay thế, không tạo thẻ ảnh hỏng.
- Căn lại biểu mẫu, bảng thông số, khuyến mãi, logo footer, biểu tượng tài khoản/giỏ hàng trên mobile và thanh so sánh. Giỏ hàng dùng grid để tên sản phẩm không bị ép thành từng ký tự; thẻ cửa hàng xếp nội dung theo chiều dọc.
- Menu mobile có chỉ báo mở mục con, giữ focus trong menu và đóng bằng Escape; nút lên đầu trang xuất hiện sau khi cuộn.

Đã kiểm tra ảnh chụp desktop/mobile và bổ sung kiểm thử bố cục ở 320, 768, 900, 1024 và 1440px vào `tests/react/website.test.mjs`: độ rộng thẻ, ảnh/nội dung không chồng nhau, bộ lọc hoạt động, thông tin giỏ hàng/cửa hàng đọc được và biểu tượng mobile hiển thị. `npm test`, TypeScript và đóng gói hosting đã đạt. Kiểm thử dùng dữ liệu demo; không thay đổi backend hoặc giao diện quản trị trong lần căn chỉnh này. Các khung ảnh chờ vẫn được giữ khi dữ liệu chưa có ảnh thật.

## Các file cũ đã xóa

Đã kiểm tra tham chiếu và xóa đúng 20 file dưới đây theo sự đồng ý của người dùng. Website React, admin hiện tại và công cụ build không còn sử dụng các file này.

Sau khi xóa, `npm test` đã đạt: TypeScript, build gói hosting và kiểm thử trình duyệt React (các trang, điều hướng SPA, bộ lọc, giỏ hàng, đặt/tra cứu đơn, tài khoản, lead, tương thích admin hiện tại và mobile). Đã xác nhận cả mã nguồn và gói `dist/` không còn 20 file này, các module dùng chung vẫn đầy đủ. Kiểm thử trình duyệt dùng dữ liệu demo; lần dọn dẹp này không chạy lại tích hợp PHP/MySQL thật.

```text
frontend/assets/js/pages/account.js
frontend/assets/js/pages/blog.js
frontend/assets/js/pages/brands.js
frontend/assets/js/pages/calculator.js
frontend/assets/js/pages/cart.js
frontend/assets/js/pages/checkout.js
frontend/assets/js/pages/collections.js
frontend/assets/js/pages/faq.js
frontend/assets/js/pages/home.js
frontend/assets/js/pages/info.js
frontend/assets/js/pages/listing.js
frontend/assets/js/pages/order.js
frontend/assets/js/pages/payment-result.js
frontend/assets/js/pages/product.js
frontend/assets/js/pages/projects.js
frontend/assets/js/pages/vision.js
frontend/assets/js/components/layout.js
frontend/assets/js/components/ui.js
frontend/assets/js/components/sales.js
frontend/assets/js/components/trust.js
```

Giữ lại `assets/js/core/`, `data/`, cấu hình, `components/icons.js`, `art.js`, `analytics.js`, CSS và ảnh vì React hoặc admin đang sử dụng. Giữ các bộ test cũ để đối chiếu hành vi; quản trị hiện hành đã dùng React. Một số test trong `tests/browser/` còn tham chiếu API giao diện cũ như `DT.ui` và `DT.sales`; cần chuyển đổi chúng trước khi chạy với React. Bộ kiểm tra giao diện hiện hành nằm trong `tests/react/`.

Thanh toán chỉ dùng COD và chuyển khoản (đã bỏ VNPay/MoMo/trả góp, 11/2026). Worker thông báo PHP vẫn là phần chưa triển khai từ giai đoạn MySQL; chuyển giao diện sang React không tự bật các tích hợp này.

## Quy chuẩn thiết kế storefront

### Bối cảnh và mục tiêu

Thiết kế website điện lạnh theo hướng ưu tiên nội dung, dễ mua hàng và đồng bộ trên mọi màn hình; học cách tổ chức storefront Deli và giữ màu xanh theo lựa chọn của người dùng.

Tham khảo: [danh mục Deli](https://delivietnam.com.vn/danh-muc-san-pham/van-phong-pham), [giới thiệu Deli](https://delivietnam.com.vn/gioi-thieu), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Đây là quy chuẩn và tiêu chí nghiệm thu; không phải chứng nhận toàn bộ website đã tuân thủ WCAG.

Mật độ tham khảo do người dùng cung cấp: trang chủ 101 liên kết/25 nút/14 danh sách/9 input/1 navigation; giới thiệu 79/19/11/9/2; danh mục 214/51/43/9/2. Đây là dữ liệu để dự trù mật độ, không phải số lượng phải sao chép. Nhóm sản phẩm, điều hướng và bộ lọc **must** có tiêu đề và nhãn rõ ràng; nhóm triển khai **should** ưu tiên sự thống nhất của hệ thống.

### Design tokens và nền tảng

Nguồn token nằm đầu `frontend/src/styles/react.css`; tên cũ như `--primary` là alias chuyển tiếp. Các component mới **must** dùng semantic token, không hard-code màu và khoảng cách. Admin tiếp tục dùng stylesheet riêng.

| Nhóm | Token chuẩn | Cách dùng |
| --- | --- | --- |
| Chữ | `--font-family-primary` | Roboto, Arial, sans-serif; Google Fonts dùng `display=swap`, fallback hoạt động khi mạng lỗi |
| Nội dung | `--font-size-base`, `--line-height-body` | 16px và 1.6; nhãn/metadata dùng `--font-size-sm`/`--font-size-xs` |
| Phân cấp | `--font-size-lg` đến `--font-size-4xl` | 18/20/24/32/40px; heading dùng `--line-height-heading` |
| Khoảng cách | `--space-1/2/3/4/5/6/8/10/12/16` | 4/8/12/16/20/24/32/40/48/64px |
| Bề mặt | `--color-surface-page/base/muted/strong` | Nền trang, nội dung, nhóm phụ, footer |
| Chữ | `--color-text-primary/secondary/inverse` | Nội dung, metadata, chữ trên nền đậm |
| Hành động | `--color-brand/brand-hover/brand-active/brand-soft` | CTA, điều hướng, bộ lọc đang chọn |
| Giá và ưu đãi | `--color-accent/accent-hover/accent-soft` | Giá bán, nhãn giảm giá; không dùng thay màu lỗi |
| Phản hồi | `--color-error/success/warning` và nền tương ứng | Lỗi, hoàn tất, cảnh báo có nhãn bằng chữ |
| Viền/focus | `--color-border`, `--color-border-control`, `--color-focus` | Viền trang trí, viền control có tương phản, focus ring |
| Hình dạng | `--radius-control/card/pill` | Control, thẻ nội dung, badge tròn; không bo tròn toàn bộ card thành pill |
| Chuyển động | `--motion-fast/normal/slow` | 200/300/600ms; `prefers-reduced-motion` tắt animation/transition |
| Kích thước | `--size-control`, `--layout-content`, `--layout-reading` | Control 44px, nội dung 1280px, bài đọc 760px |

Các số đo sát nhau như 15.52/15.64px và khoảng cách 1–5px trong tài liệu tham khảo **must** được quy về thang chung; không tạo ngoại lệ cho từng trang. CSS breakpoint **must** khớp layout hiện tại: 1200/992/768/380px. Kích thước 32/36px của control phụ là biến thể compact, vẫn **must** vượt ngưỡng 24px; touch control chính **should** đạt 44px.

### Quy tắc component

Mỗi hàng dưới đây **must** áp dụng đầy đủ ma trận trạng thái ở phần tiếp theo. Anatomy và thứ tự DOM **must** khớp thứ tự đọc; không đổi thứ tự bằng CSS để tạo thứ tự tab khác mắt nhìn.

| Component | Anatomy / variants | Tương tác và responsive | Nội dung dài / rỗng |
| --- | --- | --- | --- |
| Button / link | Nhãn, icon tùy chọn, busy; primary/outline/light/compact | Button: Enter/Space; link: Enter. Pointer/touch kích hoạt một lần. `--size-control`, chữ `--font-size-sm`, padding `--space-2/5` | Nhãn **must** nêu hành động; variant trong vùng hẹp **must** xuống dòng, không cắt mất nghĩa |
| Header / navigation | Logo, tìm kiếm, tài khoản, giỏ, menu; desktop/mobile | Tab qua từng mục; desktop submenu mở bằng hover hoặc focus-within. Mobile dùng nút mở, Escape đóng và trả focus. Nhóm cùng padding `--space-4/6` | Tên tài khoản **should** ellipsis; tên truy cập **must** còn đầy đủ. Logo/nhãn hỏng **must** có fallback |
| Search | Label truy cập, input, nút gửi, vùng link gợi ý, empty text | Enter gửi; Tab chuyển qua nút/link; Escape đóng gợi ý. Blur chỉ đóng khi focus rời toàn bộ form. Touch chọn link trực tiếp | Query **must** trim; không kết quả **must** có hướng dẫn cụ thể. Kết quả dài **must** wrap; danh sách có max-height và cuộn |
| Banner | Eyebrow, heading, mô tả, CTA, dots, pause/resume; có/không ảnh | Inactive slide **must** inert; chuyển tự động **must** dừng khi hover/focus, có nút tạm dừng. Reduced motion **must** mặc định tạm dừng. Mobile ưu tiên copy, ẩn ảnh phụ | Thiếu ảnh **must** vẫn có tiêu đề, mô tả, CTA; thiếu banner **must** không tạo phép chia cho 0. Tiêu đề dài **must** kiểm tra ở 320px |
| Product / content card | Media riêng, chips, tên, giá, metadata, CTA; ảnh/nội dung không chung chiều cao | Link tên/ảnh mở chi tiết; button yêu thích/so sánh có `aria-pressed`; quick view desktop mở dialog. Grid 5/4/3/2 theo layout, card padding `--space-3/4` | Tên card **should** giới hạn hai dòng, tên đầy đủ vẫn trong link/chi tiết. Ảnh lỗi **must** có placeholder. Giá dài **must** không bị cắt. Lưới rỗng **must** hướng dẫn thay bộ lọc |
| Filter / tabs / pagination | Legend, checkbox/select, nhãn kết quả, reset; inline desktop/disclosure mobile | Checkbox Space, select phím mũi tên theo native, tab/pagination là button Enter/Space. Disclosure có `aria-expanded/controls`. Đổi bộ lọc **must** giữ focus control | Nhãn dài **must** wrap; không kết quả **must** giữ bộ lọc để sửa; reset **must** giữ ngữ cảnh danh mục |
| Product purchase / cart | Giá, variants, ưu đãi, số lượng, mua, yêu thích/so sánh, công cụ công suất | Variants/options có trạng thái chọn; thao tác mua **must** kiểm tra thuộc tính và tồn kho. Cart dưới 768px dùng ảnh + nội dung + tổng hàng ở dòng kế; không ép tên thành từng ký tự | Không dựng lại danh sách highlights đã bỏ theo yêu cầu. Máy lạnh **must** giữ link công suất; danh mục khác không tạo link này. Tên, options và giá dài **must** kiểm tra riêng |
| Form / input / feedback | Label luôn hiển thị, control, helper/error, consent, submit | Tab/Shift+Tab, native submit và validation; dùng `--font-size-base`, control 44px. Loading **must** có `aria-busy`; lỗi **must** có chữ và gắn control bằng `aria-describedby` khi dùng inline error | Không dùng placeholder thay label. Error **must** giữ dữ liệu nhập; success **must** có thông báo được trình đọc màn hình nhận. Form rỗng vẫn có nhãn và ví dụ rõ nghĩa |
| Dialog / chat | Tên, nội dung, close, hành động | Quick view dùng native dialog, focus giữ trong modal; Escape/close trả focus. Chat là panel không modal, Tab có thể rời; touch close đạt 44px | Viewport thấp **must** cho cuộn; nội dung dài không đẩy close khỏi vùng tiếp cận; ảnh lỗi có fallback |
| Article / list / table / footer | Heading, nội dung, nhóm link, thead/th, metadata | Nội dung đọc dùng `--layout-reading`; bảng so sánh có wrapper cuộn. Link bàn phím/pointer/touch theo quy tắc link | Bảng rộng **must** cuộn trong wrapper, không cuộn toàn trang. Không dùng danh sách rỗng làm khoảng trắng. Footer nhóm link có heading mô tả |

### Ma trận trạng thái bắt buộc

| Trạng thái | Quy tắc dùng chung **must** | Áp dụng vào từng nhóm |
| --- | --- | --- |
| Default | Nhãn rõ, control đọc được, token semantic | Button/link/nav/search/filter/form/dialog có control native; card/media/article/footer giữ thứ tự DOM |
| Hover | Không nhảy layout; đổi nền/viền dùng brand token | Card/link/menu/CTA làm nổi điểm tương tác; input dùng viền. Nội dung thuần đọc: N/A, không giả hover clickable |
| Focus-visible | Ring 3px `--color-focus`, offset 3px; không bị che/cắt | Mọi link, button, input, select, summary và control dialog; card thuần bố cục: focus ở control con. Nội dung tĩnh: N/A |
| Active | Có trạng thái nhấn hoặc đang chọn, không chỉ khác màu | Button primary dùng brand-active; nav dùng `aria-current`; toggle dùng `aria-pressed`; radio/checkbox native checked. Nội dung tĩnh: N/A |
| Disabled | Dùng native disabled hoặc aria-disabled kèm chặn hành động; không chỉ giảm opacity | Submit/loading/hết hàng; variant không khả dụng có nhãn. Link không khả dụng **must** bỏ href và có giải thích; card/banner/article/footer tĩnh: N/A |
| Loading | Có chữ mô tả/busy, ngăn submit lặp, không mất kích thước | Form có aria-busy; trang tải có role=status; ảnh giữ tỷ lệ. Nhóm đọc/nav/footer đã đồng bộ: N/A, không hiển thị spinner giả |
| Error | Error token + mô tả có thể hiểu, nêu cách sửa | Search rỗng có hướng dẫn; form lỗi có chữ; ảnh lỗi fallback; page lỗi có hành động thử lại; liên kết/nhóm tĩnh không có tác vụ bất đồng bộ: N/A |

Quy tắc inline error/aria-describedby là yêu cầu khi chuyển sang validation tùy chỉnh; hiện các form còn dùng native validation và toast. Nhóm triển khai **must** không tuyên bố đã hoàn thành inline error cho tất cả form.

### Accessibility và tiêu chí pass/fail

| Kiểm tra | Pass **must** | Fail |
| --- | --- | --- |
| Tương phản chữ | Chữ thường ≥4.5:1; chữ lớn ≥3:1; kiểm tra computed color/background cho default/hover/focus/active/error | Chữ xám nhạt trên trắng, chữ trắng trên nền nhạt, đo chỉ một trạng thái |
| Viền/focus/icon | Thành phần cần thiết để nhận diện control và focus ≥3:1 với màu kề | Viền control quá nhạt hoặc focus bị `outline:none` |
| Bàn phím | Tab từ skip link đến main/menu/search/mua; Enter/Space đúng semantics; Escape đóng dialog/drawer; không kẹt focus ngoài modal | Chỉ hover, div onClick, tabindex dương, thứ tự tab khác thứ tự đọc |
| Target | Hit area ≥24×24px hoặc đáp ứng ngoại lệ spacing của WCAG 2.2; control chính **should** đạt 44×44px | Icon nhỏ không có vùng bấm hoặc hai target sát nhau không đủ khoảng cách |
| Focus không che | Focused control **must** không bị nav cố định, footer bar hoặc clipping che hoàn toàn; thử Tab khi đã cuộn | Tab tới control không nhìn thấy vị trí focus |
| Zoom/reflow | 200% text và 400% zoom/viewport tương đương 320px **must** không mất tác vụ hoặc cuộn ngang toàn trang; bảng được cuộn riêng | Giá, button, input hoặc lỗi bị cắt |
| Tên/vai trò/trạng thái | Control có accessible name; selected/busy/expanded chính xác; dialog có tên; live region thông báo tác vụ | Nút chỉ có icon không nhãn, selection chỉ đổi màu |
| Motion | Reduced motion **must** tắt animation; banner pause/focus/hover dừng và slide ẩn không nhận Tab | Banner tiếp tục chuyển khi nhập bằng bàn phím hoặc focus vào slide ẩn |
| Nội dung dài | Tên 120 ký tự, giá nhiều chữ số, options dài, query rỗng/không kết quả, ảnh 404 **must** vẫn đọc và thao tác được | Dùng overflow:hidden để che lỗi bố cục |

### Nội dung và giọng điệu

- Nhãn **must** ngắn, xác định hành động: “Thêm vào giỏ”, “Tra cứu đơn hàng”, “Tính công suất máy lạnh phù hợp”. Không dùng “Bấm đây” hoặc “OK” cho tác vụ mua hàng.
- Lỗi **must** chỉ cách sửa: “Số điện thoại không hợp lệ. Nhập 10 chữ số bắt đầu bằng 0.”; loading: “Đang gửi yêu cầu…”; success: “Đã nhận yêu cầu. Chuyên viên sẽ liên hệ với bạn.”
- Giá/ưu đãi/tồn kho **must** lấy từ dữ liệu hiện hành; không viết phần trăm tiết kiệm, chứng nhận hay cam kết không có căn cứ. Nội dung **should** ưu tiên lợi ích và bước tiếp theo.

### Anti-patterns, migration và edge cases

- Component mới **must** không dùng raw hex, khoảng cách lẻ tùy ý, size chữ ngoại lệ hoặc margin âm để giấu lỗi. Các đoạn legacy còn tồn tại **should** được chuyển dần về token khi sửa đúng component đó.
- Thiết kế **must** không sao chép nhận diện/nội dung Deli thành thương hiệu website điện lạnh; giữ xanh, dùng đỏ như accent giá. Không đổi schema/MySQL/admin để phục vụ thay đổi trình bày.
- Component **must** không dùng opacity thấp cho chữ, bỏ focus, ép pill cho mọi card hoặc tạo click target bằng div. Selector mới **should** thay thế rule tương ứng thay vì nối thêm nhiều lớp override.
- Ảnh sản phẩm thật chưa có **must** dùng placeholder ổn định; không dựng ảnh giả như ảnh chụp sản phẩm. Ảnh hero vắng **must** vẫn hiển thị nội dung và CTA.
- Google Fonts bị chặn **must** dùng font fallback; QA **must** kiểm tra cả font thật lẫn fallback vì độ rộng chữ khác nhau. Không coi kiểm thử fallback là chứng minh font Roboto đã tải.
- Mọi thay đổi **must** giữ hành vi đã duyệt: highlights dưới yêu thích đã bỏ; link công suất vẫn có; URL HTML/SEO cũ hoạt động.

Kiểm tra đã chạy cho bản thiết kế này: TypeScript, đóng gói hosting, bộ browser regression, 10 cặp tương phản semantic token, skip link/focus tìm kiếm, Tab qua gợi ý, pause banner và reduced motion. Build SEO demo đã dựng 62 trang; kiểm thử HTML không JavaScript, khởi tạo React, URL đẹp và giỏ hàng đã đạt. Kiểm thử browser dùng dữ liệu demo và font fallback khi chặn tài nguyên ngoài; các bước thủ công như trình đọc màn hình, zoom và font Roboto tải thật vẫn là mục nghiệm thu riêng.

### QA checklist

- [ ] Token, typography, khoảng cách và mọi trạng thái được review theo từng component.
- [ ] Keyboard-only: skip link, menu, search suggestions, mua hàng, form, dialog, focus restore.
- [ ] Contrast ở default/hover/focus/selected/error đo đủ các cặp màu.
- [ ] Reduced motion, pause banner, inactive slide không nhận focus.
- [ ] 320/390/768/900/1024/1440px, zoom 200%/400%, safe area và nội dung dài.
- [ ] Ảnh trống/404, mất mạng, API lỗi, hết hàng, thuộc tính thiếu, kết quả rỗng, loading lâu.
- [ ] Font Roboto thực và fallback; tên truy cập, live region và lỗi bằng trình đọc màn hình.
- [ ] TypeScript, browser regression, checkout và gói hosting; rà thủ công trước khi tuyên bố WCAG 2.2 AA.
