// Khối uy tín dùng lại: thẻ dự án, logo khách hàng / đối tác, chứng nhận, đánh giá Google.
// Chế độ demo (chưa kết nối database) chưa có dữ liệu thật -> hiện khung chờ có ghi chú rõ ràng;
// đã kết nối database mà chưa nhập -> ẩn khối (khách không thấy nội dung giả).
window.DT = window.DT || {};

DT.projectUrl = (slug) => (DT.SEO?.prettyUrls ? `du-an/${slug}.html` : `du-an-chi-tiet.html?slug=${encodeURIComponent(slug)}`);

DT.trustUI = (() => {
  const { esc } = DT.u;
  const demo = () => !DT.backend?.enabled;
  const isImg = (s) => !!s && /^(https?:|data:image\/|assets\/)/.test(String(s));
  const pic = (src, alt, text = 'Hình ảnh') => (isImg(src) ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : DT.art().replace('>Hình ảnh<', `>${esc(text)}<`));
  const stars = (n) => `<span class="tr-stars" aria-label="${n} trên 5 sao">${'★'.repeat(Math.round(n))}${'☆'.repeat(5 - Math.round(n))}</span>`;
  const fmt = (n) => Number(n).toLocaleString('vi-VN');

  function projectCard(p) {
    const facts = [p.units ? `${fmt(p.units)} máy` : '', p.capacity, p.duration ? `${p.duration} thi công` : ''].filter(Boolean);
    return `<article class="pj-card">
      <a class="pj-img" href="${DT.projectUrl(p.slug)}" aria-label="${esc(p.title)}">${pic(p.afterImage || p.beforeImage, p.title, 'Ảnh công trình')}
        ${p.sample ? '<span class="pj-sample">Dự án mẫu</span>' : ''}${p.beforeImage && p.afterImage ? '<span class="pj-ba">Trước / Sau</span>' : ''}</a>
      <div class="pj-body"><span class="pj-ind">${esc(p.industry || 'Dự án')}${p.year ? ` • ${esc(p.year)}` : ''}</span>
        <h3><a href="${DT.projectUrl(p.slug)}">${esc(p.title)}</a></h3>
        ${p.location ? `<p class="pj-loc">${DT.icon('pin')}${esc(p.location)}</p>` : ''}
        ${facts.length ? `<ul class="pj-facts">${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      </div></article>`;
  }

  function logos() {
    const t = DT.trustData();
    const list = t.logos || [];
    if (!list.length && !demo()) return '';
    const items = list.length ? list.map((l) => {
      const inner = isImg(l.image) ? `<img src="${esc(l.image)}" alt="${esc(l.name)}" loading="lazy">` : `<b>${esc(l.name)}</b>`;
      return l.url ? `<a class="tr-logo" href="${esc(DT.u.safeUrl(l.url))}" target="_blank" rel="noopener nofollow" title="${esc(l.name)}">${inner}</a>` : `<span class="tr-logo" title="${esc(l.name)}">${inner}</span>`;
    }) : Array.from({ length: 6 }, () => '<span class="tr-logo tr-ph">LOGO KHÁCH HÀNG</span>');
    return `<div class="tr-block"><h3>Khách hàng &amp; đối tác tin tưởng</h3>${list.length ? '' : '<p class="tr-note">Khung chờ – thêm logo thật tại Quản trị › Uy tín &amp; đánh giá</p>'}<div class="tr-logos">${items.join('')}</div></div>`;
  }

  function certs() {
    const list = (DT.trustData().certs || []).filter((c) => c.title);
    if (!list.length) return '';
    if (!demo() && !list.some((c) => isImg(c.image))) return ''; // chỉ hiện khi đã có ảnh chứng nhận thật
    return `<div class="tr-block"><h3>Chứng nhận &amp; năng lực</h3><div class="tr-certs">${list.map((c) => `<figure class="tr-cert">
      <span class="tr-cert-img">${pic(c.image, c.title, 'Ảnh giấy chứng nhận')}</span>
      <figcaption><b>${esc(c.title)}</b>${[c.issuer, c.year].filter(Boolean).length ? `<small>${esc([c.issuer, c.year].filter(Boolean).join(' • '))}</small>` : ''}</figcaption></figure>`).join('')}</div></div>`;
  }

  // Huy hiệu điểm Google + link xem / viết đánh giá
  function googleBadge({ compact = false } = {}) {
    const g = DT.trustData().google || {};
    const has = g.rating != null && g.rating !== '';
    if (!has && !demo()) return '';
    const write = g.placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(g.placeId)}` : '';
    return `<div class="g-badge ${compact ? 'compact' : ''}">
      <span class="g-logo" aria-hidden="true"><b style="color:#4285f4">G</b></span>
      <span class="g-main">${has ? `<b>${Number(g.rating).toFixed(1).replace('.', ',')}</b>${stars(Number(g.rating))}<small>${g.count ? `${fmt(g.count)} đánh giá trên Google` : 'trên Google'}</small>`
        : '<b>–,–</b>' + stars(0) + '<small>Điểm Google Maps (chưa cập nhật)</small>'}</span>
      ${g.url || write ? `<span class="g-links">${g.url ? `<a href="${esc(DT.u.safeUrl(g.url))}" target="_blank" rel="noopener">Xem trên Google Maps</a>` : ''}${write ? `<a href="${esc(write)}" target="_blank" rel="noopener">Viết đánh giá</a>` : ''}</span>` : ''}
    </div>`;
  }

  function reviews(limit = 6) {
    const list = (DT.trustData().reviews || []).filter((r) => r.text && r.name).slice(0, limit);
    if (!list.length && !demo()) return '';
    const items = list.length ? list.map((r) => `<figure class="rv-card"><div class="rv-top">${stars(Number(r.rating) || 5)}<span class="rv-src">${esc(r.source || 'Google')}</span></div>
        <blockquote>${esc(r.text)}</blockquote><figcaption><b>${esc(r.name)}</b>${r.date ? `<small>${DT.u.date(r.date)}</small>` : ''}</figcaption></figure>`)
      : Array.from({ length: 3 }, () => `<figure class="rv-card rv-ph"><div class="rv-top">${stars(5)}<span class="rv-src">Google</span></div>
        <blockquote>Nội dung đánh giá thật của khách hàng trên Google Maps sẽ hiển thị tại đây.</blockquote><figcaption><b>Tên khách hàng</b></figcaption></figure>`);
    return `<div class="tr-block"><div class="tr-head"><h3>Khách hàng nói gì về chúng tôi</h3>${googleBadge({ compact: true })}</div>
      ${list.length ? '' : '<p class="tr-note">Khung chờ – chép đánh giá thật từ Google Maps tại Quản trị › Uy tín &amp; đánh giá</p>'}
      <div class="rv-list">${items.join('')}</div></div>`;
  }

  // Khối tổng hợp đặt ở trang chủ / giới thiệu / dự án
  function section({ withReviews = true } = {}) {
    const html = [logos(), certs(), withReviews ? reviews() : ''].filter(Boolean).join('');
    return html ? `<section class="section section-box trust-section">${html}</section>` : '';
  }

  return { projectCard, logos, certs, reviews, googleBadge, section, stars, isImg, pic };
})();

// Tự gắn khối uy tín vào các vị trí có data-trust="section" | "reviews" (trang Giới thiệu, Tầm nhìn, Cửa hàng)
DT.onReady(() => {
  document.querySelectorAll('[data-trust]').forEach((el) => {
    const html = el.dataset.trust === 'reviews' ? DT.trustUI.reviews() : DT.trustUI.section();
    if (el.classList.contains('section-box')) { el.innerHTML = html; el.hidden = !html; } else el.innerHTML = html;
  });
});
