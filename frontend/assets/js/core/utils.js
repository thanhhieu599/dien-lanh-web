// Tiện ích dùng chung
window.DT = window.DT || {};

DT.u = {
  $: (sel, root = document) => root.querySelector(sel),
  $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),

  money(n) {
    if (n == null || isNaN(n)) return 'Liên hệ';
    return Math.round(n).toLocaleString('vi-VN') + '₫';
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  param(name) {
    return new URLSearchParams(location.search).get(name);
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
    el.innerHTML = `${DT.icon(type === 'error' ? 'alert' : 'check')}<span>${msg}</span>`;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
  },

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

  setMeta({ title, description }) {
    if (title) document.title = `${title} | ${DT.config.name}`;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = description;
    }
  },

  jsonLd(obj) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  },
};
