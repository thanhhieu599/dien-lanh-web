# Website React

Giao diện khách hàng trong `src/` dùng React, TypeScript và React Router. Mỗi file HTML ở `frontend/` là entry của cùng một ứng dụng; Vite tạo bundle chung và tách các nhóm trang thành chunk tải theo nhu cầu. URL `.html` cũ vẫn hoạt động, các liên kết nội bộ chuyển trang qua React Router.

Giao diện được khôi phục theo bản trước chuyển đổi React tại commit `408d998`: font Be Vietnam Pro, cỡ chữ nền 14px, khung nội dung 1240px và cấu trúc header, hero, trang sản phẩm ba cột, dịch vụ, nội dung, FAQ, cửa hàng và tài khoản. `assets/css/main.css` gốc điều khiển thiết kế; `src/styles/react.css` chỉ nối các component React với CSS gốc và xử lý responsive, focus, modal. Không nạp lại các script dựng giao diện cũ; backend PHP/MySQL và admin React được giữ nguyên.

```text
src/
  components/   Thẻ sản phẩm, ảnh, form, breadcrumb, modal
  layouts/      Header, menu, footer, chat, thanh điều hướng mobile
  pages/        Catalog, sản phẩm, thương mại, tài khoản, nội dung, công suất
  hooks/        Đăng ký thay đổi giỏ hàng và tài khoản
  services/     Khởi tạo dữ liệu chung, API, tính công suất
  styles/       CSS bổ sung cho component React
  types.ts      Kiểu dữ liệu sản phẩm, danh mục và runtime
  App.tsx       Chọn trang theo URL thường và URL SEO
  main.tsx      Bootstrap và React root
```

Chạy từ gốc dự án: `npm run dev`, mở `http://127.0.0.1:5173/frontend/`. Backend PHP chạy riêng ở cổng 8080; Vite proxy `/server/`. Với cổng khác, đặt biến môi trường `PHP_SERVER`. Để dùng demo, đổi `DT.BACKEND.mode` trong `assets/js/backend-config.js` thành `demo`.

Các danh sách nội dung (sản phẩm, danh mục nhanh, dịch vụ, cửa hàng, đối tác/chứng nhận, bài viết, dự án, thương hiệu, FAQ, chính sách và đánh giá) hiện tối đa 5 mục mỗi lượt. Nếu có nhiều hơn 5 mục, chỉ hiện một nút “Xem thêm” cuối danh sách để chuyển tiếp, quay vòng về đầu sau lượt cuối. Không hiện dòng đếm hoặc nút quay lại. Danh mục nhanh gộp các tên trùng khi hiển thị, giữ nguyên dữ liệu quản trị. Trang danh mục sản phẩm lưu lượt trong URL và đặt lại khi đổi bộ lọc. Ảnh sản phẩm vuông 1:1, lưới tự đổi số cột theo màn hình và không cuộn ngang. Kiểm thử bố cục nằm trong `tests/react/product-layout.test.mjs` và được chạy cùng `npm test`; đặt `STOREFRONT_BASE=http://127.0.0.1:5173/frontend/` để kiểm tra trên MySQL thật.

`npm run package:hosting` build React và đóng gói cùng admin/PHP vào `dist/`. Hosting không cần chạy Node.js. Không upload trực tiếp các file HTML mã nguồn: trình duyệt không thực thi TypeScript/JSX.

`npm run build -- --backend http://127.0.0.1:8080/server/api.php` build React và prerender SEO. Các trang sản phẩm, danh mục, bài viết, dự án có HTML nội dung trước khi JavaScript chạy; React khởi tạo lại giao diện và các chức năng tương tác trên máy khách.

Các module `assets/js/data/`, `core/`, cấu hình, icon và analytics đang dùng chung với admin nên vẫn được giữ. Đã kiểm tra và xóa 20 script giao diện cũ trong `assets/js/pages/` và `components/layout.js`, `ui.js`, `sales.js`, `trust.js` theo sự đồng ý của người dùng; giao diện React đã thay thế các file này.
