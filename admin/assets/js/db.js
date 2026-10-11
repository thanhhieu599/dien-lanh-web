// Lớp dữ liệu trang quản trị. Hai chế độ cùng một giao diện gọi:
//  - Supabase: REST (PostgREST) + Auth, quyền do RLS (role staff/admin) quyết định
//  - Demo: lưu trên trình duyệt; đọc đơn hàng / form từ website demo cùng tên miền
// Dữ liệu dạng hàng (row) theo đúng tên cột database (snake_case).
window.AD = window.AD || {};

AD.PK = {
  products: 'id', categories: 'id', brands: 'id', coupons: 'code', posts: 'slug', banners: 'id', stores: 'id',
  services: 'id', policies: 'key', settings: 'key', orders: 'id', leads: 'id', reviews: 'id', profiles: 'id',
  payments: 'id', notifications: 'id',
};

// ======================================================================= Supabase
AD.supabase = (cfg) => {
  const base = cfg.url.replace(/\/+$/, '');
  const KEY = 'dt_admin_auth_v1';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* bỏ qua */ }
  const save = (s) => { session = s; try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* bỏ qua */ } };

  const UNIQUE = { products_sku_key: 'Mã SKU đã tồn tại', products_slug_key: 'Đường dẫn (slug) đã tồn tại', profiles_phone_key: 'Số điện thoại đã được dùng' };
  function friendly(d, status) {
    const m = String((d && (d.message || d.msg || d.error_description || d.error)) || '');
    if (/Invalid login credentials/i.test(m)) return 'Sai số điện thoại / email hoặc mật khẩu';
    if (/row-level security|permission denied/i.test(m)) return 'Tài khoản không có quyền thực hiện thao tác này';
    if (/duplicate key/i.test(m)) { const k = m.match(/"([^"]+)"/)?.[1]; return UNIQUE[k] || 'Mã / khóa đã tồn tại, vui lòng chọn mã khác'; }
    if (/foreign key/i.test(m)) return /insert|update/.test(m) && !/delete/.test(m) ? 'Giá trị tham chiếu không tồn tại (danh mục / thương hiệu…)' : 'Dữ liệu đang được sử dụng ở nơi khác, không thể xóa (hãy chuyển sang "ẩn")';
    if (/not-null/i.test(m)) return `Thiếu thông tin bắt buộc${m.match(/column "([^"]+)"/) ? ` (${m.match(/column "([^"]+)"/)[1]})` : ''}`;
    if (/check constraint|invalid input syntax|out of range/i.test(m)) return 'Giá trị nhập không hợp lệ, vui lòng kiểm tra lại';
    if (/JWT expired|invalid JWT/i.test(m)) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
    if (status === 0) return 'Không kết nối được máy chủ';
    return m || `Lỗi máy chủ (${status})`;
  }
  const expired = () => Object.assign(new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'), { expired: true });

  async function token() {
    if (!session) return null;
    if (session.expires_at * 1000 - 60000 > Date.now()) return session.access_token;
    try {
      const d = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false });
      save(toSession(d));
      return session.access_token;
    } catch { save(null); throw expired(); }
  }
  const toSession = (d) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user_id: d.user?.id });

  async function http(path, { method = 'GET', body, headers = {}, auth = true, raw = false } = {}) {
    const t = auth ? await token() : null;
    const h = { apikey: cfg.anonKey, Authorization: `Bearer ${t || cfg.anonKey}`, 'Content-Type': 'application/json', ...headers };
    let res;
    try { res = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); } catch { throw new Error(friendly(null, 0)); }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      if (res.status === 401 && t) { save(null); throw expired(); }
      throw Object.assign(new Error(friendly(data, res.status)), { raw: String(data?.message || data?.msg || ''), status: res.status });
    }
    return raw ? { data, res } : data;
  }

  // Bộ lọc: [[cột, toán tử, giá trị]] với toán tử eq|neq|gt|gte|lt|lte|in|is|ilike
  function query({ select = '*', filters = [], search, order, limit, offset } = {}) {
    const p = new URLSearchParams();
    p.set('select', select);
    filters.forEach(([c, op, v]) => {
      if (v === undefined || v === '' || v === null && op !== 'is') return;
      p.append(c, op === 'in' ? `in.(${v.map((x) => `"${x}"`).join(',')})` : `${op}.${op === 'ilike' ? `*${v}*` : v}`);
    });
    if (search?.q) p.set('or', `(${search.cols.map((c) => `${c}.ilike.*${search.q.replace(/[(),*]/g, ' ')}*`).join(',')})`);
    if (order) p.set('order', order);
    if (limit) p.set('limit', limit);
    if (offset) p.set('offset', offset);
    return p.toString();
  }

  // Tải file lên Supabase Storage (bucket công khai 'media'), trả về link công khai
  async function upload(path, blob) {
    const t = await token();
    let res;
    try {
      res = await fetch(`${base}/storage/v1/object/media/${path}`, {
        method: 'POST', body: blob, headers: { apikey: cfg.anonKey, Authorization: `Bearer ${t || cfg.anonKey}`, 'Content-Type': blob.type, 'x-upsert': 'true' },
      });
    } catch { throw new Error(friendly(null, 0)); }
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      if (res.status === 401 && t) { save(null); throw expired(); }
      throw new Error(/bucket not found/i.test(d?.message || '') ? 'Chưa tạo kho ảnh "media" trên Supabase (chạy migration mới nhất)' : friendly(d, res.status));
    }
    return `${base}/storage/v1/object/public/media/${path}`;
  }
  // Xóa file cũ trong kho ảnh (bỏ qua nếu không phải file của kho)
  async function removeFile(url) {
    const prefix = `${base}/storage/v1/object/public/media/`;
    if (!url || !url.startsWith(prefix)) return;
    const t = await token();
    await fetch(`${base}/storage/v1/object/media/${url.slice(prefix.length)}`, { method: 'DELETE', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${t}` } }).catch(() => {});
  }

  return {
    mode: 'supabase',
    upload,
    removeFile,
    async login(id, password) {
      const email = id.includes('@') ? id.trim() : `${id.replace(/\D/g, '')}@${cfg.phoneEmailDomain || 'sdt.local'}`;
      const d = await http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } });
      save(toSession(d));
      return this.me();
    },
    async logout() { try { await http('/auth/v1/logout', { method: 'POST' }); } catch { /* bỏ qua */ } save(null); },
    async me() {
      if (!session?.user_id) return null;
      const r = await http(`/rest/v1/profiles?id=eq.${session.user_id}&select=id,name,phone,email,role`);
      return r[0] || null;
    },
    // Supabase trả tối đa 1000 dòng / lần: lấy nhiều hơn (báo cáo, xuất CSV) thì đọc theo từng trang
    async list(table, opts = {}) {
      const PAGE = 1000;
      const want = opts.limit || PAGE;
      const start = opts.offset || 0;
      let rows = []; let count = null;
      while (rows.length < want) {
        const n = Math.min(PAGE, want - rows.length);
        const { data, res } = await http(`/rest/v1/${table}?${query({ ...opts, limit: n, offset: start + rows.length })}`, { headers: { Prefer: 'count=exact' }, raw: true });
        const total = Number((res.headers.get('content-range') || '').split('/')[1]);
        if (count === null) count = Number.isFinite(total) ? total : null;
        rows = rows.concat(data);
        if (data.length < n || (count !== null && start + rows.length >= count)) break;
      }
      return { rows, count: count ?? rows.length };
    },
    async get(table, id, select = '*') {
      const r = await http(`/rest/v1/${table}?${AD.PK[table]}=eq.${encodeURIComponent(id)}&select=${select}`);
      return r[0] || null;
    },
    async insert(table, row) {
      const r = await http(`/rest/v1/${table}`, { method: 'POST', body: row, headers: { Prefer: 'return=representation' } });
      return r[0];
    },
    async update(table, id, patch) {
      const r = await http(`/rest/v1/${table}?${AD.PK[table]}=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } });
      if (!r.length) throw new Error('Không cập nhật được (không có quyền hoặc bản ghi không tồn tại)');
      return r[0];
    },
    async remove(table, id) {
      await http(`/rest/v1/${table}?${AD.PK[table]}=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    },
  };
};

// ======================================================================= Demo
AD.demo = () => {
  const KEY = 'dt_admin_demo_v1';
  const SHOP = 'dt_shop_v1';
  const LEADS = 'dt_leads_v1';
  const REVIEWS = 'dt_reviews_v1';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };

  function seed() {
    const now = new Date().toISOString();
    return {
      products: DT.products.map((p) => ({
        id: p.id, sku: p.sku, slug: p.slug, name: p.name, cat: p.cat, sub: p.sub, brand: p.brand, price: p.price, old_price: p.oldPrice,
        rating: p.rating, reviews: p.reviews, sold: p.sold, stock: p.stock, badges: p.badges, gift: p.gift, installment: p.installment,
        free_install: p.freeInstall, flash_sale: p.flashSale, attrs: p.attrs, specs: p.specs, highlights: p.highlights, short: p.short,
        warranty: p.warranty, art: p.art, images: p.images, active: true, created_at: p.createdAt, updated_at: now,
      })),
      categories: DT.categories.map((c, i) => ({ ...c, sort: i, active: true })),
      brands: DT.brands.map((b, i) => ({ ...b, sort: i, active: true })),
      coupons: DT.coupons.map((c) => ({ code: c.code, type: c.type, value: c.value, max: c.max ?? null, min: c.min, description: c.desc, is_public: true, active: true, starts_at: null, ends_at: null, usage_limit: null, used_count: 0 })),
      posts: DT.posts.map((p) => ({ ...p, published: true })),
      banners: DT.banners.map((b, i) => ({ id: i + 1, ...b, sort: i, active: true })),
      stores: DT.stores.map((s, i) => ({ ...s, sort: i, active: true })),
      services: DT.services.map((s, i) => ({ id: s.id, name: s.name, price: s.price, unit: s.unit, icon: s.icon, description: s.desc, sort: i, active: true })),
      policies: Object.entries(DT.policies).map(([key, v], i) => ({ key, title: v.title, body: v.body, sort: i })),
      settings: [{ key: 'store', value: { ...DT.config } }],
      orders: [], leads: [], reviews: [], profiles: [],
      overlay: { orders: {}, leads: {} }, // dữ liệu chỉ admin có (ghi chú, thanh toán...)
    };
  }
  let db = read(KEY, null);
  if (!db) { db = seed(); write(KEY, db); }
  const persist = () => write(KEY, db);

  // Đồng bộ dữ liệu khách tạo trên website demo (cùng tên miền -> cùng localStorage)
  function syncFromShop() {
    const shop = read(SHOP, { orders: [], users: [] });
    db.orders = (shop.orders || []).map((o) => {
      const ov = db.overlay.orders[o.code] || {};
      return {
        id: o.code, code: o.code, created_at: o.createdAt, updated_at: ov.updated_at || o.createdAt, status: o.status,
        phone: o.customer?.phone, customer: o.customer, shipping: o.shipping, payment: o.payment,
        payment_status: ov.payment_status || o.paymentStatus || 'unpaid', invoice: o.invoice, note: o.note, staff_note: ov.staff_note || null,
        subtotal: o.subtotal, install_fee: o.install || 0, shipping_fee: o.shippingFee || 0, discount: o.discount || 0, coupon: o.coupon, total: o.total,
        user_id: o.userId || null,
        order_items: (o.items || []).map((it, i) => ({ id: i + 1, product_id: it.id, sku: DT.api.productById(it.id)?.sku, name: it.name, price: it.price, qty: it.qty, install: !!it.install })),
        order_status_history: ov.history || [{ status: 'pending', created_at: o.createdAt }],
      };
    });
    db.leads = read(LEADS, []).map((l) => {
      const ov = db.overlay.leads[l.id] || {};
      return {
        id: l.id, code: l.id, type: l.type, name: l.data?.name || null, phone: l.data?.phone || null, email: l.data?.email || null,
        company: l.data?.company || null, data: l.data || {}, status: l.status || 'new', staff_note: ov.staff_note || null,
        assigned_to: null, created_at: l.createdAt, updated_at: ov.updated_at || l.createdAt,
      };
    });
    db.profiles = (shop.users || []).map((u) => ({ id: String(u.id), name: u.name, phone: u.phone, email: u.email, addresses: u.addresses || [], role: 'customer', created_at: u.createdAt }));
    const rv = read(REVIEWS, {});
    const st = db.overlay.reviews || {};
    db.reviews = Object.entries(rv).flatMap(([pid, list]) => list.map((r, i) => {
      const id = `${pid}-${i}-${r.date}`;
      return { id, product_id: Number(pid), name: r.name, rating: r.rating, text: r.text, status: st[id] || 'approved', verified: !!r.verified, created_at: r.date };
    })).filter((r) => r.status !== 'deleted');
  }

  // Ghi ngược trạng thái đơn / lead về website demo để khách tra cứu thấy
  function writeBack(table, id, patch) {
    const now = new Date().toISOString();
    if (table === 'orders') {
      const shop = read(SHOP, {});
      const o = (shop.orders || []).find((x) => x.code === id);
      const ov = (db.overlay.orders[id] = db.overlay.orders[id] || {});
      if (o && patch.status && patch.status !== o.status) {
        o.status = patch.status;
        ov.history = [...(ov.history || [{ status: 'pending', created_at: o.createdAt }]), { status: patch.status, created_at: now }];
        write(SHOP, shop);
      }
      ['payment_status', 'staff_note'].forEach((k) => { if (k in patch) ov[k] = patch[k]; });
      // Trạng thái thanh toán hiện cho khách ở trang tra cứu đơn (website demo)
      if (o && 'payment_status' in patch && patch.payment_status !== o.paymentStatus) { o.paymentStatus = patch.payment_status; write(SHOP, shop); }
      ov.updated_at = now;
    }
    if (table === 'leads') {
      const leads = read(LEADS, []);
      const l = leads.find((x) => x.id === id);
      if (l && patch.status) { l.status = patch.status; write(LEADS, leads); }
      const ov = (db.overlay.leads[id] = db.overlay.leads[id] || {});
      if ('staff_note' in patch) ov.staff_note = patch.staff_note;
      ov.updated_at = now;
    }
    if (table === 'reviews') {
      db.overlay.reviews = db.overlay.reviews || {};
      db.overlay.reviews[id] = patch.status;
    }
    persist();
  }

  const val = (row, c) => c.replace('->>', '.').split('.').reduce((o, k) => (o == null ? o : o[k]), row);
  function match(row, [c, op, v]) {
    if (v === undefined || v === '' || (v === null && op !== 'is')) return true;
    const x = val(row, c);
    switch (op) {
      case 'eq': return String(x) === String(v);
      case 'neq': return String(x) !== String(v);
      case 'gt': return x > v;
      case 'gte': return x >= v;
      case 'lt': return x < v;
      case 'lte': return x <= v;
      case 'in': return v.map(String).includes(String(x));
      case 'is': return v === null ? x == null : x === v;
      case 'ilike': return DT.u.norm(x ?? '').includes(DT.u.norm(v));
      default: return true;
    }
  }
  const live = (t) => { if (['orders', 'leads', 'profiles', 'reviews'].includes(t)) syncFromShop(); return db[t] || []; };

  return {
    mode: 'demo',
    async login() { return { id: 'demo', name: 'Quản trị (demo)', role: 'admin', phone: '' }; },
    async logout() {},
    async me() { return { id: 'demo', name: 'Quản trị (demo)', role: 'admin', phone: '' }; },
    async list(table, { filters = [], search, order, limit, offset = 0 } = {}) {
      let rows = live(table).filter((r) => filters.every((f) => match(r, f)));
      if (search?.q) rows = rows.filter((r) => search.cols.some((c) => DT.u.norm(val(r, c) ?? '').includes(DT.u.norm(search.q))));
      if (order) {
        const [c, dir] = order.split(',')[0].split('.');
        rows = rows.slice().sort((a, b) => {
          const x = val(a, c); const y = val(b, c);
          const r = x == null ? 1 : y == null ? -1 : typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'vi');
          return dir === 'desc' ? -r : r;
        });
      }
      const count = rows.length;
      if (limit) rows = rows.slice(offset, offset + limit);
      return { rows: JSON.parse(JSON.stringify(rows)), count };
    },
    async get(table, id) {
      const r = live(table).find((x) => String(x[AD.PK[table]]) === String(id));
      return r ? JSON.parse(JSON.stringify(r)) : null;
    },
    async insert(table, row) {
      const pk = AD.PK[table];
      if (row[pk] == null || row[pk] === '') {
        row[pk] = Math.max(0, ...db[table].map((x) => Number(x[pk]) || 0)) + 1;
        if (table === 'products') row[pk] = Math.max(5000, row[pk]);
      }
      if (db[table].some((x) => String(x[pk]) === String(row[pk]))) throw new Error('Mã / khóa đã tồn tại');
      row.created_at = row.created_at || new Date().toISOString();
      db[table].push(row); persist();
      return row;
    },
    async update(table, id, patch) {
      if (['orders', 'leads', 'reviews'].includes(table)) { writeBack(table, id, patch); return this.get(table, id); }
      const r = db[table].find((x) => String(x[AD.PK[table]]) === String(id));
      if (!r) throw new Error('Bản ghi không tồn tại');
      Object.assign(r, patch, { updated_at: new Date().toISOString() }); persist();
      return r;
    },
    async remove(table, id) {
      if (table === 'reviews') { writeBack('reviews', id, { status: 'deleted' }); return; }
      if (['orders', 'leads', 'profiles'].includes(table)) throw new Error('Chế độ demo không xóa dữ liệu khách hàng');
      db[table] = db[table].filter((x) => String(x[AD.PK[table]]) !== String(id)); persist();
    },
    reset() { db = seed(); persist(); },
  };
};

AD.db = DT.BACKEND?.url && DT.BACKEND?.anonKey ? AD.supabase(DT.BACKEND) : AD.demo();
