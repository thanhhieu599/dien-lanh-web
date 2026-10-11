// Kết nối Supabase (REST + Auth) bằng fetch, không cần thư viện ngoài.
// - DT.ready: Promise hoàn tất khi đã nạp catalog từ DB (hoặc ngay lập tức ở chế độ demo)
// - DT.onReady(fn): chạy fn khi DOM sẵn sàng VÀ dữ liệu đã nạp
window.DT = window.DT || {};

DT.backend = (() => {
  const cfg = DT.BACKEND || {};
  const enabled = !!(cfg.url && cfg.anonKey);
  const base = (cfg.url || '').replace(/\/+$/, '');
  const SESSION_KEY = 'dt_auth_v1';
  const CACHE_KEY = 'dt_catalog_cache_v3';

  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { /* bỏ qua */ }
  const saveSession = (s) => {
    session = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* bỏ qua */ }
  };

  // Thông báo lỗi dễ hiểu cho khách
  function friendly(data, status) {
    const msg = data && (data.message || data.msg || data.error_description || data.error);
    if (/Invalid login credentials/i.test(msg || '')) return 'Sai số điện thoại hoặc mật khẩu';
    if (/already registered|already been registered|duplicate key.*phone/i.test(msg || '')) return 'Số điện thoại đã được đăng ký';
    if (/Password should be/i.test(msg || '')) return 'Mật khẩu tối thiểu 6 ký tự';
    if (status === 0) return 'Không kết nối được máy chủ, vui lòng kiểm tra mạng';
    return msg || 'Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline';
  }

  async function http(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const h = { apikey: cfg.anonKey, 'Content-Type': 'application/json', ...headers };
    const token = auth ? await accessToken() : null;
    h.Authorization = `Bearer ${token || cfg.anonKey}`;
    let res;
    try {
      res = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new Error(friendly(null, 0));
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      // Token hết hạn/không hợp lệ -> đăng xuất cục bộ rồi thử lại bằng anon
      if (res.status === 401 && token && auth) { saveSession(null); return http(path, { method, body, headers, auth: false }); }
      throw new Error(friendly(data, res.status));
    }
    return data;
  }

  // ---------- Auth (Supabase GoTrue)
  const phoneEmail = (phone) => `${String(phone).replace(/\D/g, '')}@${cfg.phoneEmailDomain || 'sdt.local'}`;
  const toSession = (d) => ({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    user_id: d.user?.id,
  });

  async function accessToken() {
    if (!session) return null;
    if (session.expires_at * 1000 - 60000 > Date.now()) return session.access_token;
    try {
      const d = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false });
      saveSession(toSession(d));
      return session.access_token;
    } catch {
      saveSession(null);
      return null;
    }
  }

  async function signUp({ phone, password, name, email }) {
    const d = await http('/auth/v1/signup', {
      method: 'POST', auth: false,
      body: { email: phoneEmail(phone), password, data: { name, phone, contact_email: email || '' } },
    });
    if (!d.access_token) throw new Error('Tài khoản cần xác nhận email. Quản trị viên vui lòng tắt "Confirm email" trong Supabase (xem supabase/README.md).');
    saveSession(toSession(d));
    return profile();
  }

  async function signIn(phone, password) {
    const d = await http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: phoneEmail(phone), password } });
    saveSession(toSession(d));
    return profile();
  }

  async function signOut() {
    try { await http('/auth/v1/logout', { method: 'POST' }); } catch { /* bỏ qua */ }
    saveSession(null);
  }

  async function profile() {
    if (!session?.user_id) return null;
    const rows = await http(`/rest/v1/profiles?id=eq.${session.user_id}&select=id,name,phone,email,addresses,role`);
    return rows[0] || null;
  }

  // ---------- REST tiện ích
  const select = (table, query = '') => http(`/rest/v1/${table}?${query}`);
  const rpc = (fn, args = {}) => http(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args });
  const insert = (table, row) => http(`/rest/v1/${table}`, { method: 'POST', body: row, headers: { Prefer: 'return=minimal' } });
  const update = (table, filter, patch) => http(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } });

  // ---------- Nạp catalog & nội dung
  const mapProduct = (r) => ({
    id: r.id, sku: r.sku, slug: r.slug, name: r.name, cat: r.cat, sub: r.sub, brand: r.brand,
    price: Number(r.price), oldPrice: r.old_price == null ? null : Number(r.old_price),
    rating: Number(r.rating), reviews: r.reviews, sold: r.sold, stock: r.stock,
    badges: r.badges || [], gift: r.gift, installment: r.installment, freeInstall: r.free_install, flashSale: r.flash_sale,
    attrs: r.attrs || {}, specs: r.specs || {}, highlights: r.highlights || [], short: r.short || '', warranty: r.warranty || '',
    art: r.art || { type: 'generic', color: 'white' }, images: r.images?.length ? r.images : ['art:0'],
    createdAt: String(r.created_at).slice(0, 10),
  });

  function apply(d) {
    const setting = (k) => d.settings?.find((s) => s.key === k)?.value;
    if (setting('store')) Object.assign(DT.config, setting('store'));
    DT.vision = setting('vision') || {}; // ảnh trang Tầm nhìn & Sứ mệnh (quản trị tải lên)
    if (setting('trust')) DT.trust = { logos: [], certs: [], reviews: [], google: {}, ...setting('trust') };
    if (d.projects) {
      DT.projects = d.projects.map((r) => ({
        ...r, beforeImage: r.before_image, afterImage: r.after_image, images: r.images || [],
        testimonialName: r.testimonial_name, testimonialRole: r.testimonial_role,
      }));
    }
    if (d.faqs) DT.faqs = d.faqs;
    DT.categories = d.categories.map((c) => ({ ...c, subs: c.subs || [], filters: c.filters || [] }));
    DT.brands = d.brands;
    // Danh mục bị ẩn -> sản phẩm của danh mục đó cũng ẩn khỏi website
    const cats = new Set(DT.categories.map((c) => c.id));
    DT.products = d.products.map(mapProduct).filter((p) => cats.has(p.cat));
    DT.stores = d.stores;
    DT.posts = d.posts.map((p) => ({ ...p, date: String(p.date).slice(0, 10) }));
    DT.banners = d.banners;
    DT.services = d.services.map((s) => ({ ...s, price: Number(s.price), desc: s.description }));
    DT.policies = Object.fromEntries(d.policies.map((p) => [p.key, { title: p.title, body: p.body }]));
    DT.coupons = d.coupons.map((c) => ({ code: c.code, type: c.type, value: Number(c.value), max: c.max == null ? null : Number(c.max), min: Number(c.min), desc: c.description }));
  }

  async function fetchCatalog() {
    const q = {
      settings: 'key=in.(store,vision,trust)&select=key,value',
      categories: 'select=id,name,short,icon,art,subs,filters&order=sort',
      brands: 'select=id,name,origin,color&order=sort',
      products: 'select=*&order=id',
      stores: 'select=id,name,city,address,phone,hours,map&order=sort',
      posts: 'select=slug,title,cat,date,author,art,excerpt,content&order=date.desc',
      banners: 'select=title,sub,cta,href,theme,art&order=sort',
      services: 'select=id,name,price,unit,icon,description&order=sort',
      policies: 'select=key,title,body&order=sort',
      coupons: 'select=code,type,value,max,min,description',
      projects: 'select=*&published=is.true&order=sort,year.desc',
      faqs: 'select=id,category,question,answer,sort&active=is.true&order=sort,id',
    };
    const keys = Object.keys(q);
    const results = await Promise.all(keys.map((k) => select(k, q[k])));
    return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
  }

  // Bản demo (chưa kết nối database): ảnh sản phẩm tải lên trong trang quản trị demo (cùng trình duyệt)
  function demoImages() {
    try {
      const map = JSON.parse(localStorage.getItem(DT.PRODUCT_IMG_DEMO_KEY) || '{}');
      DT.products.forEach((p) => { const imgs = map[p.id]; if (Array.isArray(imgs) && imgs.length) p.images = imgs.slice(0, 10); });
    } catch { /* bỏ qua */ }
  }

  async function load() {
    if (!enabled) { demoImages(); return; }
    let data = null;
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.t < (cfg.cacheMinutes ?? 5) * 60000) data = c.data;
    } catch { /* bỏ qua */ }
    try {
      if (!data) {
        data = await fetchCatalog();
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* quá dung lượng */ }
      }
      apply(data);
    } catch (e) {
      console.warn('[Website] Không nạp được dữ liệu từ máy chủ, dùng dữ liệu dự phòng:', e.message);
      DT.backend.offline = true;
    }
    // Đồng bộ trạng thái đăng nhập
    const s = DT.store.get();
    if (!session) {
      if (s.user) { s.user = null; DT.store.save(); }
    } else {
      try {
        const p = await profile();
        if (p) { s.user = p; DT.store.save(); } else { saveSession(null); s.user = null; DT.store.save(); }
      } catch { /* giữ thông tin cũ khi mất mạng */ }
    }
  }

  const clearCache = () => { try { sessionStorage.removeItem(CACHE_KEY); } catch { /* bỏ qua */ } };

  return { enabled, offline: false, load, clearCache, select, rpc, insert, update, signUp, signIn, signOut, profile, hasSession: () => !!session };
})();

DT.ready = DT.backend.load();
DT.onReady = (fn) => {
  const run = () => DT.ready.catch(() => {}).then(fn);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
};
