// Cấu hình SEO.
// siteUrl: địa chỉ chính thức của website (dùng cho canonical, sitemap, chia sẻ Zalo/Facebook). Đổi khi có tên miền riêng.
// prettyUrls: true khi site được build bằng `node tools/prerender.mjs` (tạo sẵn trang sp/<slug>.html, danh-muc/...)
//   - để false khi chạy trực tiếp mã nguồn (link dạng san-pham.html?id=...).
window.DT = window.DT || {};
DT.SEO = {
  siteUrl: 'https://thanhhieu599.github.io/dien-lanh-web/frontend/',
  prettyUrls: false,
  // Đo lường quảng cáo khi chạy bản tĩnh (chưa kết nối database). Có database thì nhập trong Quản trị › Cài đặt cửa hàng.
  ga4Id: '',          // Google Analytics 4: Measurement ID dạng G-XXXXXXXXXX
  metaPixelId: '',    // Meta (Facebook) Pixel ID: dãy số
  cookieConsent: true, // hiện hộp xin đồng ý cookie (Nghị định 13/2023)
};
