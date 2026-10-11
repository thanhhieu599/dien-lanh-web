// Ảnh sản phẩm / banner / bài viết.
// Bản demo: chưa có ảnh thật -> hiển thị khung "Hình ảnh" mặc định (không tự vẽ hình).
// Khi admin upload ảnh thật, product.images chứa URL và hàm này trả về <img>.
window.DT = window.DT || {};

(() => {
  // Khung ảnh mặc định (giữ chỗ), dùng chung cho mọi vị trí chưa có ảnh
  const placeholder = (text = 'Hình ảnh sản phẩm') => `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${text}">
      <rect width="400" height="400" rx="24" fill="#f2f4f7"/>
      <rect x="16" y="16" width="368" height="368" rx="18" fill="#f9fafb" stroke="#d0d5dd" stroke-width="2" stroke-dasharray="10 8"/>
      <g fill="none" stroke="#98a2b3" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="130" y="120" width="140" height="110" rx="14"/>
        <circle cx="168" cy="155" r="12"/>
        <path d="M138 222l42-42 30 30 22-22 34 34"/>
      </g>
      <text x="200" y="285" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="#667085">${text}</text>
    </svg>`;

  // Có ảnh thật (URL) hay chưa
  const realImage = (src) => !!src && !String(src).startsWith('art:');
  DT.hasImage = (p) => realImage(p?.images?.[0]);

  // Ảnh của sản phẩm theo chỉ số trong gallery
  DT.productImage = (p, i = 0) => {
    const src = p.images?.[i] ?? p.images?.[0];
    if (realImage(src)) return `<img src="${DT.u.esc(src)}" alt="${DT.u.esc(p.name)}" loading="lazy">`;
    return placeholder('Hình ảnh sản phẩm');
  };

  // Ảnh chung (banner, bài viết): cũng dùng khung mặc định
  DT.art = () => placeholder('Hình ảnh');
})();
