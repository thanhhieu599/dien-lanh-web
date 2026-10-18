// Tiện ích dùng chung
window.DT = window.DT || {};

DT.u = {
  $: (sel, root = document) => root.querySelector(sel),
  $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),

  // Số tiền dạng ngắn cho câu quảng cáo: 150000 -> "150K", 2000000 -> "2 triệu", 1500000 -> "1,5 triệu"
  shortMoney(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return `${(Math.round(n / 1e5) / 10).toLocaleString('vi-VN')} triệu`;
    if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
    return `${n}₫`;
  },

  money(n) {
    if (n == null || isNaN(n)) return 'Liên hệ';
    return Math.round(n).toLocaleString('vi-VN') + '₫';
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // Ngày hôm nay theo giờ máy khách (YYYY-MM-DD). toISOString() là giờ UTC: 0h-7h sáng ở VN bị lùi 1 ngày
  today() { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; },

  // Link do quản trị nhập: chỉ cho http(s), tel, mailto, zalo hoặc đường dẫn nội bộ (chặn javascript:)
  safeUrl(u) {
    const s = String(u ?? '').trim();
    if (!s) return '';
    if (/^(https?:|tel:|mailto:|zalo:)/i.test(s)) return s;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//')) return '';
    return s;
  },

  // Trang pre-render (sp/<slug>.html...) không có query string: đọc từ <body data-q-id="..." data-q-cat="...">
  param(name) {
    return new URLSearchParams(location.search).get(name) ?? document.body?.dataset['q' + name[0].toUpperCase() + name.slice(1)] ?? null;
  },

  // URL tuyệt đối theo địa chỉ website chính thức (canonical, og:url, JSON-LD)
  abs(rel) {
    try { return new URL(rel, DT.SEO?.siteUrl || document.baseURI).href; } catch { return rel; }
  },

  slugify(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  },

  // So khớp tìm kiếm không dấu
  norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  },

  debounce(fn, ms = 250) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  discount(p) {
    return p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  },

  stars(r) {
    let h = '';
    for (let i = 1; i <= 5; i++) h += `<span class="star ${r >= i - 0.25 ? 'on' : r >= i - 0.75 ? 'half' : ''}">★</span>`;
    return `<span class="stars" aria-label="${r} trên 5 sao">${h}</span>`;
  },

  date(iso) {
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString('vi-VN');
  },

  toast(msg, type = 'success') {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    // Nội dung hiển thị dạng chữ (thông báo có thể chứa dữ liệu từ máy chủ / quản trị)
    el.innerHTML = `${DT.icon(type === 'error' ? 'alert' : 'check')}<span></span>`;
    el.querySelector('span').textContent = String(msg ?? '');
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
  },

  // Link gọi điện: bỏ khoảng trắng / dấu chấm; trả '' nếu không có số
  tel: (s) => String(s || '').replace(/[^\d+]/g, ''),

  validPhone: (s) => /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(String(s).replace(/[\s.]/g, '')),
  validEmail: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s)),

  // Đọc dữ liệu form thành object và báo lỗi các trường required
  formData(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    DT.u.$$('[required]', form).forEach((f) => {
      const empty = f.type === 'checkbox' ? !f.checked : !String(f.value).trim();
      let bad = empty;
      if (!empty && f.dataset.validate === 'phone') bad = !DT.u.validPhone(f.value);
      if (!empty && f.type === 'email') bad = !DT.u.validEmail(f.value);
      f.closest('.field')?.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    return ok ? data : null;
  },

  setMeta({ title, description, canonical, image, type }) {
    const head = document.head;
    const meta = (attr, key, val) => {
      if (!val) return;
      let m = head.querySelector(`meta[${attr}="${key}"]`);
      if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); head.appendChild(m); }
      m.content = val;
    };
    if (title) document.title = `${title} | ${DT.config.name}`;
    meta('name', 'description', description);
    meta('property', 'og:title', title && document.title);
    meta('property', 'og:description', description);
    meta('property', 'og:type', type);
    if (canonical) {
      const href = DT.u.abs(canonical);
      let l = head.querySelector('link[rel="canonical"]');
      if (!l) { l = document.createElement('link'); l.rel = 'canonical'; head.appendChild(l); }
      l.href = href;
      meta('property', 'og:url', href);
    }
    if (image) meta('property', 'og:image', DT.u.abs(image));
  },

  // Mỗi loại dữ liệu có cấu trúc chỉ 1 thẻ (trang pre-render chạy lại script không bị nhân đôi)
  jsonLd(obj) {
    const key = String(obj['@type'] || 'x');
    document.head.querySelector(`script[type="application/ld+json"][data-ld="${key}"]`)?.remove();
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.dataset.ld = key;
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  },
};
