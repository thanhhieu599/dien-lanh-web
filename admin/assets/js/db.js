// Lớp dữ liệu trang quản trị. Hai chế độ cùng một giao diện gọi:
//  - PHP/MySQL: API riêng, phiên cookie HttpOnly, phân quyền tại máy chủ.
//  - Demo: lưu trên trình duyệt; đọc đơn hàng / form từ website demo cùng tên miền
// Dữ liệu dạng hàng (row) theo đúng tên cột database (snake_case).
window.AD = window.AD || {};

AD.PK = {
  products: "id",
  categories: "id",
  brands: "id",
  coupons: "code",
  posts: "slug",
  banners: "id",
  stores: "id",
  services: "id",
  policies: "key",
  settings: "key",
  projects: "slug",
  faqs: "id",
  orders: "id",
  leads: "id",
  reviews: "id",
  profiles: "id",
  payments: "id",
  notifications: "id",
  maintenance_contracts: "id",
  maintenance_visits: "id",
  suppliers: "id",
  purchase_orders: "id",
  stock_adjustments: "id",
  stock_exports: "id",
  stock_moves: "id",
};
// Bảng có cột riêng tư không cấp quyền đọc (số điện thoại người đánh giá): chỉ đọc các cột công khai
AD.COLS = {
  reviews: "id,product_id,user_id,name,rating,text,status,verified,created_at",
};

// ======================================================================= PHP/MySQL
AD.mysql = (cfg) => {
  const KEY = "dt_mysql_admin_auth_v1";
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    /* bỏ qua */
  }
  const save = (s) => {
    session = s;
    try {
      s
        ? localStorage.setItem(KEY, JSON.stringify(s))
        : localStorage.removeItem(KEY);
    } catch {
      /* bỏ qua */
    }
  };

  const UNIQUE = {
    products_sku_key: "Mã SKU đã tồn tại",
    products_slug_key: "Đường dẫn (slug) đã tồn tại",
    profiles_phone_key: "Số điện thoại đã được dùng",
  };
  function friendly(d, status) {
    const m = String(
      (d && (d.message || d.msg || d.error_description || d.error)) || "",
    );
    if (/Invalid login credentials/i.test(m))
      return "Sai số điện thoại / email hoặc mật khẩu";
    if (/row-level security|permission denied/i.test(m))
      return "Tài khoản không có quyền thực hiện thao tác này";
    if (/duplicate key/i.test(m)) {
      const k = m.match(/"([^"]+)"/)?.[1];
      return UNIQUE[k] || "Mã / khóa đã tồn tại, vui lòng chọn mã khác";
    }
    if (/foreign key/i.test(m))
      return /insert|update/.test(m) && !/delete/.test(m)
        ? "Giá trị tham chiếu không tồn tại (danh mục / thương hiệu…)"
        : 'Dữ liệu đang được sử dụng ở nơi khác, không thể xóa (hãy chuyển sang "ẩn")';
    if (/not-null/i.test(m))
      return `Thiếu thông tin bắt buộc${m.match(/column "([^"]+)"/) ? ` (${m.match(/column "([^"]+)"/)[1]})` : ""}`;
    if (/check constraint|invalid input syntax|out of range/i.test(m))
      return "Giá trị nhập không hợp lệ, vui lòng kiểm tra lại";
    if (/JWT expired|invalid JWT/i.test(m))
      return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại";
    if (status === 0) return "Không kết nối được máy chủ";
    return m || `Lỗi máy chủ (${status})`;
  }
  const expired = () =>
    Object.assign(
      new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"),
      { expired: true },
    );

  async function token() {
    if (!session) return null;
    if (session.expires_at * 1000 - 60000 > Date.now())
      return session.access_token;
    try {
      const d = await http("/auth/refresh", {
        method: "POST",
        body: { refresh_token: session.refresh_token },
        auth: false,
      });
      save(toSession(d));
      return session.access_token;
    } catch {
      save(null);
      throw expired();
    }
  }
  const toSession = (d) => ({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at:
      d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    user_id: d.user?.id,
  });

  async function http(
    path,
    { method = "GET", body, headers = {}, auth = true, raw = false } = {},
  ) {
    const t = auth ? await token() : null;
    const h = {
      "X-DT-Request": "1",
      "X-DT-Admin": "1",

      "Content-Type": "application/json",
      ...headers,
    };
    let res;
    try {
      res = await fetch(DT.apiEndpoint(path), { credentials: 'same-origin',
        method,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error(friendly(null, 0));
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      if (res.status === 401 && t) {
        save(null);
        throw expired();
      }
      throw Object.assign(new Error(friendly(data, res.status)), {
        raw: String(data?.message || data?.msg || ""),
        status: res.status,
      });
    }
    return raw ? { data, res } : data;
  }

  // Bộ lọc: [[cột, toán tử, giá trị]] với toán tử eq|neq|gt|gte|lt|lte|in|is|ilike
  function query(
    { select, filters = [], search, order, limit, offset } = {},
    table,
  ) {
    const p = new URLSearchParams();
    p.set("select", select || AD.COLS[table] || "*");
    filters.forEach(([c, op, v]) => {
      if (v === undefined || v === "" || (v === null && op !== "is")) return;
      p.append(
        filters.filter(([column]) => column === c).length > 1 ? `${c}[]` : c,
        op === "in"
          ? `in.(${v.map((x) => `"${x}"`).join(",")})`
          : `${op}.${op === "ilike" ? `*${v}*` : op === "cs" ? JSON.stringify(v) : v}`,
      );
    });
    if (search?.q)
      p.set(
        "or",
        `(${search.cols.map((c) => `${c}.ilike.*${search.q.replace(/[(),*]/g, " ")}*`).join(",")})`,
      );
    if (order) p.set("order", order);
    if (limit) p.set("limit", limit);
    if (offset) p.set("offset", offset);
    return p.toString();
  }

  // Tải ảnh lên hosting PHP, trả về URL đọc ảnh qua API.
  async function upload(path, blob) {
    const t = await token();
    let res;
    try {
      res = await fetch(DT.apiEndpoint(`/media/${path}`), {
        method: "POST",
        body: blob,
        headers: {
          "X-DT-Request": "1",
          "Content-Type": blob.type,
          "x-upsert": "true",
        },
      });
    } catch {
      throw new Error(friendly(null, 0));
    }
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      if (res.status === 401 && t) {
        save(null);
        throw expired();
      }
      throw new Error(friendly(d, res.status));
    }
    return DT.apiEndpoint(`/media/${path}`);
  }
  // Xóa file cũ trong kho ảnh (bỏ qua nếu không phải file của kho)
  async function removeFile(url) {
    const prefix = DT.apiEndpoint('/media/');
    if (!url || !url.startsWith(prefix)) return;
    const t = await token();
    await fetch(DT.apiEndpoint(`/media/${decodeURIComponent(url.slice(prefix.length))}`), {
      method: "DELETE",
      headers: { "X-DT-Request": "1" },
    }).catch(() => {});
  }

  return {
    mode: "mysql",
    upload,
    removeFile,
    async login(id, password) {
      const identifier = id.trim();
      const d = await http("/auth/login", {
        method: "POST",
        auth: false,
        body: { email: identifier, password },
      });
      save(toSession(d));
      return this.me();
    },
    async logout() {
      try {
        await http("/auth/logout", { method: "POST" });
      } catch {
        /* bỏ qua */
      }
      save(null);
    },
    async me() {
      const current = await http('/auth/session', { auth: false });
      save(current ? toSession(current) : null);
      if (!session?.user_id) return null;
      const r = await http(
        `/data/profiles?id=eq.${session.user_id}&select=id,name,phone,email,role`,
      );
      return r[0] || null;
    },
    // PHP/MySQL trả tối đa 1000 dòng / lần: lấy nhiều hơn (báo cáo, xuất CSV) thì đọc theo từng trang
    async list(table, opts = {}) {
      const PAGE = 1000;
      const want = opts.limit || PAGE;
      const start = opts.offset || 0;
      let rows = [];
      let count = null;
      while (rows.length < want) {
        const n = Math.min(PAGE, want - rows.length);
        const { data, res } = await http(
          `/data/${table}?${query({ ...opts, limit: n, offset: start + rows.length }, table)}`,
          { headers: { Prefer: "count=exact" }, raw: true },
        );
        const total = Number(
          (res.headers.get("content-range") || "").split("/")[1],
        );
        if (count === null) count = Number.isFinite(total) ? total : null;
        rows = rows.concat(data);
        if (data.length < n || (count !== null && start + rows.length >= count))
          break;
      }
      return { rows, count: count ?? rows.length };
    },
    async get(table, id, select = AD.COLS[table] || "*") {
      const r = await http(
        `/data/${table}?${AD.PK[table]}=eq.${encodeURIComponent(id)}&select=${select}`,
      );
      return r[0] || null;
    },
    async saveBrand(data, id = null) {
      return http('/rpc/save_brand', { method: 'POST', body: { p_brand: data, p_id: id } });
    },
    async insert(table, row) {
      const r = await http(
        `/data/${table}?select=${AD.COLS[table] || "*"}`,
        {
          method: "POST",
          body: row,
          headers: { Prefer: "return=representation" },
        },
      );
      return r[0];
    },
    async update(table, id, patch) {
      const r = await http(
        `/data/${table}?${AD.PK[table]}=eq.${encodeURIComponent(id)}&select=${AD.COLS[table] || "*"}`,
        {
          method: "PATCH",
          body: patch,
          headers: { Prefer: "return=representation" },
        },
      );
      if (!r.length)
        throw new Error(
          "Không cập nhật được (không có quyền hoặc bản ghi không tồn tại)",
        );
      return r[0];
    },
    async remove(table, id) {
      await http(
        `/data/${table}?${AD.PK[table]}=eq.${encodeURIComponent(id)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      );
    },
    rpc: (fn, args = {}) =>
      http(`/rpc/${fn}`, { method: "POST", body: args }),
  };
};

// ======================================================================= Demo
AD.demo = () => {
  const KEY = DT.ADMIN_DEMO_KEY || "dt_admin_demo_v1";
  const SHOP = "dt_shop_v1";
  const LEADS = "dt_leads_v1";
  const REVIEWS = "dt_reviews_v1";
  const ROLE_KEY = "dt_admin_demo_role";
  const read = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null") ?? d;
    } catch {
      return d;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };
  // Tài khoản nhân viên mẫu để thử phân quyền (đổi vai trò ở thanh demo phía trên trang quản trị)
  const STAFF = [
    { id: "demo", name: "Quản trị (demo)", role: "admin", phone: "0900000001" },
    {
      id: "demo-staff",
      name: "Nhân viên vận hành (demo)",
      role: "staff",
      phone: "0900000002",
    },
    {
      id: "demo-sales-1",
      name: "KD Minh (demo)",
      role: "sales",
      phone: "0900000003",
    },
    {
      id: "demo-sales-2",
      name: "KD Lan (demo)",
      role: "sales",
      phone: "0900000004",
    },
    {
      id: "demo-acc",
      name: "Kế toán Hoa (demo)",
      role: "accountant",
      phone: "0900000005",
    },
  ];
  const me = () => {
    let r = "admin";
    try {
      r = sessionStorage.getItem(ROLE_KEY) || "admin";
    } catch {
      /* bỏ qua */
    }
    return STAFF.find((x) => x.role === r) || STAFF[0];
  };

  function seed() {
    const now = new Date().toISOString();
    return {
      // Chuyển dữ liệu website -> bản ghi database: frontend/assets/js/core/rows.js
      products: DT.products.map((p) => ({ ...DT.rows.product.toRow(p), active: true, updated_at: now })),
      categories: DT.categories.map((c, i) => ({
        ...c,
        sort: i,
        active: true,
      })),
      brands: DT.brands.map((b, i) => ({ ...b, sort: i, active: true })),
      coupons: DT.coupons.map((c) => ({ ...DT.rows.coupon.toRow(c), is_public: true, active: true, starts_at: null, ends_at: null, usage_limit: null, used_count: 0 })),
      posts: DT.posts.map((p) => ({ ...p, published: true })),
      projects: (DT.projects || []).map((p, i) => ({ ...DT.rows.project.toRow(p), published: true, sort: i })),
      faqs: (DT.faqs || []).map((f) => ({ ...f, active: true })),
      banners: DT.banners.map((b, i) => ({
        id: i + 1,
        ...b,
        sort: i,
        active: true,
      })),
      stores: DT.stores.map((s, i) => ({ ...s, sort: i, active: true })),
      services: DT.services.map((s, i) => ({ ...DT.rows.service.toRow(s), sort: i, active: true })),
      policies: Object.entries(DT.policies).map(([key, v], i) => ({
        key,
        title: v.title,
        body: v.body,
        sort: i,
      })),
      settings: [{ key: "store", value: { ...DT.config } }],
      orders: [],
      leads: [],
      reviews: [],
      profiles: [],
      overlay: { orders: {}, leads: {} }, // dữ liệu chỉ admin có (ghi chú, thanh toán...)
    };
  }
  // Bảng nội dung hiển thị trên website. Bảng nào đã sửa trong quản trị demo được ghi vào db.touched:
  // website demo (cùng trình duyệt) dùng dữ liệu quản trị cho các bảng đó (core/backend.js › demoAdmin),
  // bảng chưa sửa luôn lấy theo dữ liệu mới nhất của website (không bị dữ liệu demo cũ ghi đè).
  const CONTENT = [
    "settings",
    "categories",
    "brands",
    "products",
    "coupons",
    "posts",
    "projects",
    "faqs",
    "banners",
    "stores",
    "services",
    "policies",
  ];
  // Dữ liệu bảo trì mẫu cho bản demo (đánh dấu [MẪU]): 6 khách, các lần bảo trì trong 14 tháng gần đây
  function demoMaintenance() {
    const pad = (n) => String(n).padStart(2, "0");
    const day = (monthsAgo, d = 10) => {
      const t = new Date();
      t.setDate(1);
      t.setMonth(t.getMonth() - monthsAgo);
      return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(d)}`;
    };
    const contracts = [
      { id: 1, name: "[MẪU] Công ty TNHH Điện tử Minh Phát", phone: "0912345601", company: "Minh Phát Electronics", address: "KCN Tân Bình, TP.HCM", devices: "12 × máy âm trần 2.5 HP", units: 12, cycle_months: 3, start_date: day(14, 5), fee_per_visit: 3600000, contract_value: 14400000, status: "active", source: "contract", order_code: "", note: "Bảo trì theo hợp đồng năm" },
      { id: 2, name: "[MẪU] Nhà hàng Bếp Việt", phone: "0912345602", company: "Bếp Việt", address: "Q.1, TP.HCM", devices: "4 × máy treo tường 2 HP, 1 × tủ mát", units: 5, cycle_months: 4, start_date: day(12, 12), fee_per_visit: 1500000, contract_value: 0, status: "active", source: "referral", order_code: "", note: "" },
      { id: 3, name: "[MẪU] Anh Trần Văn Nam", phone: "0912345603", company: "", address: "Q.7, TP.HCM", devices: "2 × máy treo tường 1 HP", units: 2, cycle_months: 6, start_date: day(11, 20), fee_per_visit: 300000, contract_value: 0, status: "active", source: "order", order_code: "", note: "" },
      { id: 4, name: "[MẪU] Văn phòng Luật Hòa An", phone: "0912345604", company: "Hòa An Law", address: "Q.3, TP.HCM", devices: "6 × máy treo tường 1.5 HP", units: 6, cycle_months: 6, start_date: day(9, 3), fee_per_visit: 900000, contract_value: 0, status: "active", source: "website", order_code: "", note: "" },
      { id: 5, name: "[MẪU] Chị Lê Thu Hà", phone: "0912345605", company: "", address: "Thủ Đức, TP.HCM", devices: "1 × máy treo tường 1 HP", units: 1, cycle_months: 12, start_date: day(13, 8), fee_per_visit: 180000, contract_value: 0, status: "paused", source: "phone", order_code: "", note: "Khách hẹn gọi lại" },
      { id: 6, name: "[MẪU] Trường Mầm non Hoa Sen", phone: "0912345606", company: "MN Hoa Sen", address: "Bình Tân, TP.HCM", devices: "8 × máy treo tường 1.5 HP", units: 8, cycle_months: 6, start_date: day(1, 15), fee_per_visit: 1200000, contract_value: 0, status: "active", source: "website", order_code: "", note: "Khách mới" },
    ];
    const plan = [[1, [14, 11, 8, 5, 2]], [2, [12, 8, 4]], [3, [11, 5]], [4, [9, 3]], [5, [13]]];
    let id = 0;
    const visits = plan.flatMap(([cid, months]) => months.map((m, i) => {
      const c = contracts.find((x) => x.id === cid);
      return { id: ++id, contract_id: cid, date: day(m, c.start_date.slice(8) * 1), units: c.units, technician: ["Anh Tuấn", "Anh Phúc", "Anh Long"][id % 3], work: "Vệ sinh dàn nóng, dàn lạnh; kiểm tra gas, điện", amount: c.fee_per_visit, payment: id % 2 ? "bank" : "cod", paid: !(cid === 2 && i === months.length - 1), status: "done", note: "", created_at: new Date().toISOString() };
    }));
    return { maintenance_contracts: contracts, maintenance_visits: visits };
  }

  function demoInventory() {
    const at = new Date().toISOString();
    return {
      suppliers: [
        { id: 1, code: "NCC0001", name: "[MẪU] Công ty TNHH Phân phối Điện lạnh Sài Gòn", phone: "02838123456", email: "sales@dienlanhsg.vn", address: "Q.10, TP.HCM", tax_code: "0301234567", contact: "Chị Hoa", note: "", active: true, debt: 0, total_purchased: 0, purchase_count: 0, created_at: at },
        { id: 2, code: "NCC0002", name: "[MẪU] Công ty CP Vật tư Lạnh Miền Nam", phone: "02839876543", email: "", address: "Bình Tân, TP.HCM", tax_code: "0309876543", contact: "Anh Bình", note: "Ống đồng, gas, giá đỡ", active: true, debt: 0, total_purchased: 0, purchase_count: 0, created_at: at },
      ],
      purchase_orders: [], stock_adjustments: [], stock_exports: [], stock_moves: [], counters: {},
    };
  }
  // Lõi kho cho bản demo: PHẢI khớp server/inventory.php
  const EXPORT_REASONS = ["damaged", "sample", "gift", "internal", "return_supplier", "other"];
  const invFail = (m) => { throw new Error(m); };
  const nowIso = () => new Date().toISOString();
  const userName = () => me().name || "Admin";
  function nextCode(prefix, pad = 5) {
    db.counters = db.counters || {};
    db.counters[prefix] = (db.counters[prefix] || 0) + 1;
    return prefix + String(db.counters[prefix]).padStart(pad, "0");
  }
  const nextId = (t) => Math.max(0, ...(db[t] || []).map((x) => Number(x.id) || 0)) + 1;
  function stockMove(p, delta, type, ref = "", note = "", cost = null) {
    if (!delta) return;
    const before = Number(p.stock) || 0, after = before + delta;
    if (after < 0) invFail(`Không đủ tồn kho: ${p.name} (còn ${before})`);
    p.stock = after;
    db.stock_moves.push({ id: nextId("stock_moves"), product_id: p.id, sku: p.sku || "", name: p.name, type, ref, change: delta, before, after, cost: cost ?? (Number(p.cost_price) || 0), note, user_name: userName(), created_at: nowIso() });
    touch("products");
  }
  const intOf = (v, min, max, label) => { const n = Number(v); if (v === "" || v == null || !Number.isInteger(n) || n < min || n > max) invFail(`${label} không hợp lệ`); return n; };
  const moneyOf = (v, label) => { if (v === "" || v == null) return 0; const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 1e12) invFail(`${label} không hợp lệ`); return Math.round(n); };
  const product = (id) => db.products.find((x) => String(x.id) === String(id));
  function invLines(items, kind) {
    if (!items?.length || items.length > 500) invFail("Chứng từ phải có từ 1 đến 500 dòng sản phẩm");
    const seen = new Set();
    return items.map((it) => {
      const p = product(it.product_id) || invFail("Sản phẩm không tồn tại");
      if (seen.has(String(p.id))) invFail("Sản phẩm bị trùng dòng: " + p.name);
      seen.add(String(p.id));
      const l = { product_id: p.id, sku: p.sku || "", name: p.name, unit: p.unit || "Cái", note: String(it.note || "").trim() };
      if (kind === "purchase") {
        l.qty = intOf(it.qty, 1, 1e6, "Số lượng nhập"); l.price = moneyOf(it.price, "Đơn giá"); l.discount = moneyOf(it.discount, "Chiết khấu dòng"); l.tax_rate = intOf(it.tax_rate ?? 0, 0, 100, "Thuế suất");
        if (l.discount > l.qty * l.price) invFail("Chiết khấu vượt thành tiền: " + p.name);
      } else if (kind === "export") l.qty = intOf(it.qty, 1, 1e6, "Số lượng xuất");
      else { l.actual = intOf(it.actual, 0, 1e8, "Tồn thực tế"); l.system = Number(p.stock) || 0; l.diff = l.actual - l.system; l.reason = String(it.reason || "").trim(); }
      return l;
    });
  }
  function purchaseTotals(lines, discount, costs) {
    let goods = 0, tax = 0, qty = 0;
    lines.forEach((l) => { const net = l.qty * l.price - l.discount; goods += net; tax += Math.round((net * l.tax_rate) / 100); qty += l.qty; });
    if (discount > goods) invFail("Chiết khấu đơn vượt tổng tiền hàng");
    const c = costs.reduce((s, x) => s + moneyOf(x.amount, "Chi phí nhập"), 0);
    return { qty, goods, discount, costs_total: c, tax, total: Math.max(0, goods - discount + c + tax) };
  }
  function supplierRecalc(id) {
    const s = db.suppliers.find((x) => String(x.id) === String(id)); if (!s) return;
    const mine = db.purchase_orders.filter((po) => String(po.supplier_id) === String(id) && po.status !== "cancelled" && po.received);
    s.debt = Math.max(0, mine.reduce((t, po) => t + po.total - (po.paid || 0), 0));
    s.total_purchased = mine.reduce((t, po) => t + po.total, 0); s.purchase_count = mine.length;
  }
  const purchaseStatus = (po) => po.status === "cancelled" ? "cancelled" : po.received && (po.paid || 0) >= po.total ? "done" : "ordered";
  function purchaseReceive(po) {
    if (po.received) invFail("Đơn đã nhập kho");
    if (po.status === "cancelled") invFail("Đơn đã hủy");
    const goods = Math.max(1, po.goods), extra = po.costs_total - po.discount;
    po.items.forEach((l) => {
      const p = product(l.product_id) || invFail("Sản phẩm không còn tồn tại: " + l.name);
      const net = l.qty * l.price - l.discount, unitCost = Math.max(0, (net + (extra * net) / goods) / l.qty);
      const oldQty = Math.max(0, Number(p.stock) || 0), oldCost = Number(p.cost_price) || 0;
      p.cost_price = Math.round((oldQty * oldCost + l.qty * unitCost) / (oldQty + l.qty));
      p.import_price = l.price;
      stockMove(p, l.qty, "purchase", po.code, "Nhập hàng từ NCC", unitCost);
    });
    Object.assign(po, { received: true, received_at: nowIso(), received_by: userName() });
    po.status = purchaseStatus(po); supplierRecalc(po.supplier_id);
    return po;
  }
  function purchasePay(po, a) {
    if (po.status === "cancelled") invFail("Đơn đã hủy");
    const amount = moneyOf(a.amount, "Số tiền thanh toán"), left = po.total - (po.paid || 0);
    if (amount <= 0 || amount > left) invFail(`Số tiền thanh toán phải lớn hơn 0 và không vượt ${left.toLocaleString("vi-VN")}₫`);
    po.payments = [...(po.payments || []), { amount, method: a.method === "cash" ? "cash" : "bank", note: String(a.note || "").trim(), at: nowIso(), by: userName() }];
    po.paid = (po.paid || 0) + amount; po.status = purchaseStatus(po); supplierRecalc(po.supplier_id);
    return po;
  }
  function inventoryOp(op, a = {}) {
    const role = me().role;
    if (!["admin", "staff"].includes(role) && !(role === "accountant" && op === "purchase_pay")) deny();
    // Làm trên bản sao: lỗi giữa chừng thì không ghi gì (giống transaction của máy chủ)
    const snapshot = JSON.stringify({ products: db.products, suppliers: db.suppliers, purchase_orders: db.purchase_orders, stock_adjustments: db.stock_adjustments, stock_exports: db.stock_exports, stock_moves: db.stock_moves, counters: db.counters, touched: db.touched });
    try {
      const result = runOp(op, a);
      persist();
      return JSON.parse(JSON.stringify(result));
    } catch (err) {
      Object.assign(db, JSON.parse(snapshot));
      throw err;
    }
  }
  function runOp(op, a) {
    const find = (t, id) => db[t].find((x) => String(x.id) === String(id));
    let id = a.p_id;
    if (op === "purchase_save") {
      let po = id ? find("purchase_orders", id) || invFail("Không tìm thấy đơn nhập") : null;
      if (po && (po.received || po.status === "cancelled")) invFail("Đơn đã nhập kho hoặc đã hủy, không sửa được");
      const sup = find("suppliers", a.supplier_id) || invFail("Vui lòng chọn nhà cung cấp");
      const lines = invLines(a.items, "purchase");
      const costs = (a.costs || []).map((c) => ({ name: String(c.name || "Chi phí").trim(), amount: moneyOf(c.amount, "Chi phí nhập") })).filter((c) => c.amount > 0);
      const totals = purchaseTotals(lines, moneyOf(a.discount, "Chiết khấu đơn"), costs);
      if (!po) { po = { id: nextId("purchase_orders"), code: nextCode("PON"), status: "ordered", received: false, paid: 0, payments: [], created_by: userName(), created_at: nowIso() }; db.purchase_orders.push(po); }
      Object.assign(po, totals, { supplier_id: sup.id, supplier_name: sup.name, items: lines, costs, expected_date: /^\d{4}-\d{2}-\d{2}$/.test(a.expected_date || "") ? a.expected_date : null, note: String(a.note || "").trim(), tags: (a.tags || []).map((t) => String(t).trim()).filter(Boolean), updated_at: nowIso() });
      if ((po.paid || 0) > po.total) invFail("Tổng đơn nhỏ hơn số tiền đã thanh toán");
      if (a.receive) purchaseReceive(po);
      if (a.payment?.amount) purchasePay(po, a.payment);
      return po;
    }
    if (op === "purchase_receive") return purchaseReceive(find("purchase_orders", id) || invFail("Không tìm thấy đơn nhập"));
    if (op === "purchase_pay") return purchasePay(find("purchase_orders", id) || invFail("Không tìm thấy đơn nhập"), a);
    if (op === "purchase_cancel") {
      const po = find("purchase_orders", id) || invFail("Không tìm thấy đơn nhập");
      if (po.received) invFail('Đơn đã nhập kho: hãy lập phiếu xuất kho "Trả nhà cung cấp"');
      if ((po.paid || 0) > 0) invFail("Đơn đã thanh toán một phần, không hủy được");
      return Object.assign(po, { status: "cancelled", cancelled_at: nowIso() });
    }
    if (op === "adjustment_save" || op === "adjustment_balance") {
      let doc = id ? find("stock_adjustments", id) || invFail("Không tìm thấy phiếu kiểm") : null;
      if (doc?.status === "balanced") invFail("Phiếu đã cân bằng");
      if (op === "adjustment_save") {
        if (!doc) { doc = { id: nextId("stock_adjustments"), code: nextCode("IAN"), status: "draft", created_by: userName(), created_at: nowIso() }; db.stock_adjustments.push(doc); }
        Object.assign(doc, { items: invLines(a.items, "adjust"), note: String(a.note || "").trim(), checker: String(a.checker || userName()).trim(), updated_at: nowIso() });
        if (!a.balance) return doc;
      }
      doc.items = doc.items.map((l) => {
        const p = product(l.product_id) || invFail("Sản phẩm không còn tồn tại: " + l.name);
        const next = { ...l, system: Number(p.stock) || 0 }; next.diff = next.actual - next.system;
        stockMove(p, next.diff, "adjust", doc.code, next.reason || "Kiểm hàng");
        return next;
      });
      return Object.assign(doc, { status: "balanced", balanced_at: nowIso(), balanced_by: userName() });
    }
    if (op === "export_save" || op === "export_confirm") {
      let doc = id ? find("stock_exports", id) || invFail("Không tìm thấy phiếu xuất") : null;
      if (doc?.status === "done") invFail("Phiếu đã xuất kho");
      if (op === "export_save") {
        if (!EXPORT_REASONS.includes(a.reason)) invFail("Vui lòng chọn lý do xuất");
        if (!doc) { doc = { id: nextId("stock_exports"), code: nextCode("PXK"), status: "draft", created_by: userName(), created_at: nowIso() }; db.stock_exports.push(doc); }
        Object.assign(doc, { reason: a.reason, items: invLines(a.items, "export"), note: String(a.note || "").trim(), receiver: String(a.receiver || "").trim(), updated_at: nowIso() });
        if (!a.confirm) return doc;
      }
      let value = 0;
      doc.items = doc.items.map((l) => {
        const p = product(l.product_id) || invFail("Sản phẩm không còn tồn tại: " + l.name);
        const cost = Number(p.cost_price) || 0; value += l.qty * cost;
        stockMove(p, -l.qty, "export", doc.code, l.note || "Xuất kho");
        return { ...l, cost };
      });
      return Object.assign(doc, { value, status: "done", done_at: nowIso(), done_by: userName() });
    }
    if (op === "delete_draft") {
      const t = { adjustment: "stock_adjustments", export: "stock_exports" }[a.p_kind] || invFail("Loại phiếu không hợp lệ");
      const doc = find(t, id) || invFail("Không tìm thấy phiếu");
      if (doc.status !== "draft") invFail("Chỉ xóa được phiếu nháp");
      db[t] = db[t].filter((x) => x !== doc);
      return { deleted: true };
    }
    invFail("Thao tác kho không hợp lệ");
  }
  let db = read(KEY, null);
  if (!db) db = seed();
  db.touched = db.touched || {};
  db.crm_customers = db.crm_customers || [];
  db.crm_order_links = db.crm_order_links || {};
  // Bảo trì: bản demo có sẵn vài khách mẫu để xem thống kê; dữ liệu thật nằm trên MySQL
  if (!db.maintenance_contracts) Object.assign(db, demoMaintenance());
  // Kho hàng (bản demo): nhà cung cấp mẫu, chứng từ và lịch sử kho lưu trên trình duyệt
  if (!db.suppliers) Object.assign(db, demoInventory());
  const fresh = seed();
  CONTENT.forEach((t) => {
    if (!db.touched[t] || !db[t]) db[t] = fresh[t];
  });
  write(KEY, db);
  const touch = (t) => {
    if (CONTENT.includes(t) && !db.touched[t]) {
      db.touched[t] = true;
      persist();
    }
  };
  const persist = () => {
    if (!write(KEY, db))
      throw new Error(
        "Bộ nhớ trình duyệt (bản demo) đã đầy: hãy bớt ảnh hoặc dùng ảnh nhỏ hơn. Bản chính thức (kết nối PHP/MySQL) lưu ảnh trên máy chủ, không giới hạn như vậy.",
      );
  };
  // Mã đánh giá không phụ thuộc vị trí trong danh sách (đánh giá mới thêm vào đầu danh sách)
  const reviewId = (pid, r) =>
    `${pid}-${r.date}-${[...`${r.name}|${r.text}`].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) >>> 0, 7).toString(36)}`;

  // Đồng bộ dữ liệu khách tạo trên website demo (cùng tên miền -> cùng localStorage)
  function syncFromShop() {
    const shop = read(SHOP, { orders: [], users: [] });
    db.orders = (shop.orders || []).map((o) => {
      const ov = db.overlay.orders[o.code] || {};
      return {
        id: o.code,
        code: o.code,
        created_at: o.createdAt,
        updated_at: ov.updated_at || o.createdAt,
        status: o.status,
        phone: o.customer?.phone,
        customer: o.customer,
        shipping: o.shipping,
        payment: o.payment,
        payment_status: ov.payment_status || o.paymentStatus || "unpaid",
        invoice: o.invoice,
        note: o.note,
        staff_note: ov.staff_note || null,
        invoice_no: ov.invoice_no || null,
        invoiced_at: ov.invoiced_at || null,
        subtotal: o.subtotal,
        install_fee: o.install || 0,
        shipping_fee: o.shippingFee || 0,
        discount: o.discount || 0,
        coupon: o.coupon,
        total: o.total,
        user_id: o.userId || null,
        maintenance_optin: ov.maintenance_optin ?? !!o.maintenance,
        attribution: o.attribution || null,
        order_items: (o.items || []).map((it, i) => ({
          id: i + 1,
          product_id: it.id,
          sku: DT.api.productById(it.id)?.sku,
          name: it.name,
          price: it.price,
          qty: it.qty,
          install: !!it.install,
          options: it.options || {},
        })),
        order_status_history: ov.history || [
          { status: "pending", created_at: o.createdAt },
        ],
      };
    });
    db.leads = read(LEADS, []).map((l) => {
      const ov = db.overlay.leads[l.id] || {};
      return {
        id: l.id,
        code: l.id,
        type: l.type,
        name: l.data?.name || null,
        phone: l.data?.phone || null,
        email: l.data?.email || null,
        company: l.data?.company || null,
        data: l.data || {},
        status: l.status || "new",
        staff_note: ov.staff_note || null,
        assigned_to: ov.assigned_to || null,
        notes: ov.notes || l.notes || [],
        source_url: null,
        created_at: l.createdAt,
        updated_at: ov.updated_at || l.createdAt,
      };
    });
    db.profiles = [
      ...STAFF.map((x) => ({
        ...x,
        email: `${x.id}@demo.local`,
        addresses: [],
        created_at: "2026-01-01T00:00:00.000Z",
      })),
      ...(shop.users || []).map((u) => ({
        id: String(u.id),
        name: u.name,
        phone: u.phone,
        email: u.email,
        addresses: u.addresses || [],
        role: "customer",
        created_at: u.createdAt,
      })),
    ];
    const rv = read(REVIEWS, {});
    const st = db.overlay.reviews || {};
    db.reviews = Object.entries(rv)
      .flatMap(([pid, list]) =>
        list.map((r, i) => {
          // Mã không phụ thuộc vị trí trong danh sách (đánh giá mới thêm vào đầu danh sách)
          const id = reviewId(pid, r);
          return {
            id,
            product_id: Number(pid),
            name: r.name,
            rating: r.rating,
            text: r.text,
            status: st[id] || "approved",
            verified: !!r.verified,
            created_at: r.date,
          };
        }),
      )
      .filter((r) => r.status !== "deleted");
  }
  const crmPhone = (phone) =>
    String(phone || "")
      .replace(/[^0-9+]/g, "")
      .replace(/^\+?84/, "0");

  function syncCustomers() {
    let changed = false;

    const resolve = (profile, order) => {
      const profileId = profile
        ? String(profile.id)
        : order?.user_id
          ? String(order.user_id)
          : null;

      const phone = crmPhone(profile?.phone || order?.phone);

      let customer = db.crm_customers.find((c) =>
        profileId
          ? String(c.profile_id) === profileId
          : c.profile_id == null && phone && crmPhone(c.phone) === phone,
      );

      if (!customer) {
        const recipient = order?.customer || profile || {};
        const shipping = order?.shipping;

        customer = {
          id: profileId ? `profile:${profileId}` : `guest:${phone || order.id}`,

          profile_id: profileId,

          name: order?.invoice?.company || recipient.name || "Khách hàng",

          phone,
          email: recipient.email || "",

          addresses: profile?.addresses?.length
            ? profile.addresses
            : shipping?.method === "delivery"
              ? [
                  {
                    ...shipping,
                    name: recipient.name,
                    phone,
                    default: true,
                  },
                ]
              : [],

          note: "",
          tags: [],
          marketing_opt_in: null,

          created_at:
            profile?.created_at ||
            order?.created_at ||
            new Date().toISOString(),
        };

        db.crm_customers.push(customer);
        changed = true;
      }

      return customer;
    };

    // Khách có tài khoản nhưng chưa đặt đơn vẫn xuất hiện.
    db.profiles.forEach((p) => resolve(p));

    // Liên kết đơn với hồ sơ ổn định.
    // Sửa tên/điện thoại không làm mất lịch sử đơn cũ.
    db.orders.forEach((order) => {
      const linked = db.crm_order_links[order.id];

      let customer = db.crm_customers.find((c) => c.id === linked);

      if (!customer) {
        const profile = db.profiles.find(
          (p) => String(p.id) === String(order.user_id),
        );

        customer = resolve(profile, order);

        db.crm_order_links[order.id] = customer.id;
        changed = true;
      }

      order.customer_id = customer.id;
    });

    if (changed) persist();
  }

  function customerSummary() {
    return db.crm_customers.map((customer) => {
      const orders = db.orders
        .filter(
          (o) => o.customer_id === customer.id && o.status !== "cancelled",
        )
        .sort(
          (a, b) =>
            String(b.created_at).localeCompare(String(a.created_at)) ||
            String(b.id).localeCompare(String(a.id)),
        );

      const paid = orders.filter((o) => o.payment_status === "paid");

      const spent = paid.reduce(
        (total, order) => total + Number(order.total || 0),
        0,
      );

      return {
        ...customer,
        role: db.profiles.find((p) => String(p.id) === String(customer.profile_id))?.role || "customer",

        order_count: orders.length,
        paid_count: paid.length,
        total_spent: spent,

        average_spent: paid.length ? Math.floor(spent / paid.length) : 0,

        last_order_id: orders[0]?.id || null,
        last_order_code: orders[0]?.code || null,

        is_vip: (customer.tags || []).includes("VIP"),
      };
    });
  }

  function customerProducts() {
    const products = new Map();

    db.orders
      .filter(
        (order) => order.status === "done" && order.payment_status === "paid",
      )
      .forEach((order) => {
        order.order_items.forEach((item) => {
          const key = JSON.stringify([
            order.customer_id,
            item.product_id,
            item.sku,
            item.name,
          ]);

          const row = products.get(key) || {
            customer_id: order.customer_id,
            product_id: item.product_id,
            sku: item.sku,
            name: item.name,
            quantity: 0,
            last_bought_at: order.created_at,
          };

          row.quantity += Number(item.qty);

          if (order.created_at > row.last_bought_at) {
            row.last_bought_at = order.created_at;
          }

          products.set(key, row);
        });
      });

    return [...products.values()];
  }
  // Ghi ngược trạng thái đơn / lead về website demo để khách tra cứu thấy
  function writeBack(table, id, patch) {
    const now = new Date().toISOString();
    if (table === "orders") {
      const shop = read(SHOP, {});
      const o = (shop.orders || []).find((x) => x.code === id);
      const ov = (db.overlay.orders[id] = db.overlay.orders[id] || {});
      if (o && patch.status && patch.status !== o.status) {
        o.status = patch.status;
        // COD: giao xong = đã thu tiền (giống máy chủ PHP updateOrder)
        let note = "";
        const pay = patch.payment_status ?? ov.payment_status ?? o.paymentStatus ?? "unpaid";
        if (patch.status === "done" && o.payment === "cod" && ["unpaid", "partial"].includes(pay)) {
          patch = { ...patch, payment_status: "paid" };
          note = "Đã thu tiền COD khi giao";
        }
        ov.history = [
          ...(ov.history || [{ status: "pending", created_at: o.createdAt }]),
          { status: patch.status, created_at: now, note },
        ];
        write(SHOP, shop);
      }
      ["payment_status", "staff_note", "maintenance_optin"].forEach((k) => {
        if (k in patch) ov[k] = patch[k];
      });
      // Trạng thái thanh toán hiện cho khách ở trang tra cứu đơn (website demo)
      if (
        o &&
        "payment_status" in patch &&
        patch.payment_status !== o.paymentStatus
      ) {
        o.paymentStatus = patch.payment_status;
        write(SHOP, shop);
      }
      ov.updated_at = now;
    }
    if (table === "leads") {
      const leads = read(LEADS, []);
      const l = leads.find((x) => x.id === id);
      if (l && patch.status) {
        l.status = patch.status;
        write(LEADS, leads);
      }
      const ov = (db.overlay.leads[id] = db.overlay.leads[id] || {});
      if ("staff_note" in patch) ov.staff_note = patch.staff_note;
      if ("assigned_to" in patch) ov.assigned_to = patch.assigned_to;
      if ("notes" in patch) ov.notes = patch.notes;
      ov.updated_at = now;
    }
    if (table === "reviews") {
      db.overlay.reviews = db.overlay.reviews || {};
      db.overlay.reviews[id] = patch.status;
      // Ghi trạng thái duyệt vào đánh giá trên website demo: chỉ đánh giá "approved" được hiển thị
      const rv = read(REVIEWS, {});
      Object.entries(rv).forEach(([pid, list]) =>
        list.forEach((r) => {
          if (reviewId(pid, r) === id) r.status = patch.status;
        }),
      );
      write(REVIEWS, rv);
    }
    persist();
  }

  const val = (row, c) =>
    c
      .replace("->>", ".")
      .split(".")
      .reduce((o, k) => (o == null ? o : o[k]), row);
  function match(row, [c, op, v]) {
    if (v === undefined || v === "" || (v === null && op !== "is")) return true;
    const x = val(row, c);
    switch (op) {
      case "eq":
        return String(x) === String(v);
      case "neq":
        return String(x) !== String(v);
      case "gt":
        return x > v;
      case "gte":
        return x >= v;
      case "lt":
        return x < v;
      case "lte":
        return x <= v;
      case "in":
        return v.map(String).includes(String(x));
      case "cs":
        return Array.isArray(x) && Array.isArray(v) && v.every((item) => x.includes(item));
      case "is":
        return v === null ? x == null : x === v;
      case "ilike":
        return DT.u.norm(x ?? "").includes(DT.u.norm(v));
      default:
        return true;
    }
  }
  // Giả lập phân quyền như RLS trên database: kinh doanh chỉ thấy lead được giao; kế toán không thấy lead
  const visible = (t, rows) => {
    const u = me();
    if (t.startsWith("crm_") && !["admin", "staff"].includes(u.role)) {
      return [];
    }
    if (u.role === "sales") {
      if (t === "leads") return rows.filter((l) => l.assigned_to === u.id);
      if (["orders", "payments", "notifications", "profiles"].includes(t))
        return t === "profiles" ? rows.filter((p) => p.id === u.id) : [];
    }
    if (u.role === "accountant") {
      if (["leads", "notifications"].includes(t)) return [];
      if (t === "profiles") return rows.filter((p) => p.id === u.id);
    }
    return rows;
  };
  const live = (t) => {
    const needsSync =
      ["orders", "leads", "profiles", "reviews"].includes(t) ||
      t.startsWith("crm_");

    if (needsSync) {
      syncFromShop();
      syncCustomers();
    }

    const rows =
      t === "crm_customer_summary"
        ? customerSummary()
        : t === "crm_customer_products"
          ? customerProducts()
          : db[t] || [];

    return visible(t, rows);
  };
  const deny = () => {
    throw new Error("Tài khoản không có quyền thực hiện thao tác này");
  };
  function guard(table, id, patch) {
    const u = me();
    if (
      u.role === "sales" &&
      (table !== "leads" ||
        Object.keys(patch).some((k) => !["status", "staff_note"].includes(k)) ||
        !live("leads").some((l) => String(l.id) === String(id)))
    )
      deny();
    if (
      u.role === "accountant" &&
      (table !== "orders" ||
        Object.keys(patch).some((k) => k !== "payment_status"))
    )
      deny();
  }
  const writer = () => ["admin", "staff"].includes(me().role);

  return {
    mode: "demo",
    async inventory(op, args = {}) {
      return inventoryOp(op, args);
    },
    async issueInvoice(id) {
      if (!["admin", "staff", "accountant"].includes(me().role)) deny();
      syncFromShop();
      const o = db.orders.find((x) => String(x.id) === String(id)) || invFail("Không tìm thấy đơn hàng");
      if (o.status === "cancelled") invFail("Đơn đã hủy, không xuất hóa đơn");
      const ov = (db.overlay.orders[o.code] = db.overlay.orders[o.code] || {});
      if (!ov.invoice_no) { ov.invoice_no = nextCode("HD", 7).slice(2); ov.invoiced_at = nowIso(); ov.invoiced_by = userName(); persist(); }
      return this.get("orders", id);
    },
    staff: STAFF,
    async login() {
      return me();
    },
    async logout() {},
    async me() {
      return { ...me() };
    },
    setRole(role) {
      try {
        sessionStorage.setItem(ROLE_KEY, role);
      } catch {
        /* bỏ qua */
      }
    },
    async list(table, { filters = [], search, order, limit, offset = 0 } = {}) {
      let rows = live(table).filter((r) => filters.every((f) => match(r, f)));
      if (search?.q)
        rows = rows.filter((r) =>
          search.cols.some((c) =>
            DT.u.norm(val(r, c) ?? "").includes(DT.u.norm(search.q)),
          ),
        );
      if (order) {
        const [c, dir] = order.split(",")[0].split(".");
        rows = rows.slice().sort((a, b) => {
          const x = val(a, c);
          const y = val(b, c);
          const r =
            x == null
              ? 1
              : y == null
                ? -1
                : typeof x === "number"
                  ? x - y
                  : String(x).localeCompare(String(y), "vi");
          return dir === "desc" ? -r : r;
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
    async saveBrand(data, id = null) {
      if (!writer()) deny();
      const nextId = id || data.slug;
      const existing = db.brands.find((b) => b.id === nextId);
      if ((id && !existing) || (!id && existing)) throw new Error('Mã thương hiệu không hợp lệ hoặc đã tồn tại');
      if (db.brands.some((b) => b.id !== id && ((b.slug || b.id) === data.slug || b.id === data.slug))) throw new Error('Đường dẫn thương hiệu đã tồn tại');
      const ids = [...new Set(data.product_ids || [])];
      if (ids.some((pid) => !db.products.some((p) => p.id === pid))) throw new Error('Sản phẩm không còn tồn tại, vui lòng tải lại');
      const saved = { color: '#0b5ed7', sort: db.brands.length, ...existing, ...data, id: nextId, product_ids: ids, updated_at: new Date().toISOString() };
      if (existing) Object.assign(existing, saved); else db.brands.push(saved);
      db.products.filter((p) => ids.includes(p.id)).forEach((p) => { p.brand = nextId; p.updated_at = saved.updated_at; });
      persist();
      touch('brands');
      touch('products');
      return JSON.parse(JSON.stringify(saved));
    },
    async insert(table, row) {
      if (!writer()) deny();

      if (table === "crm_customers") {
        live(table);

        row = {
          profile_id: null,
          note: "",
          tags: [],
          addresses: [],
          marketing_opt_in: null,
          ...row,
          phone: crmPhone(row.phone),
        };

        const duplicate = db.crm_customers.some(
          (c) => c.profile_id == null && crmPhone(c.phone) === row.phone,
        );

        if (duplicate) {
          throw new Error("Số điện thoại khách hàng đã tồn tại");
        }

        row.id = crypto.randomUUID();
      }

      const pk = AD.PK[table];

      if (row[pk] == null || row[pk] === "") {
        row[pk] = Math.max(0, ...db[table].map((x) => Number(x[pk]) || 0)) + 1;

        if (table === "products") {
          row[pk] = Math.max(5000, row[pk]);
        }
      }

      if (db[table].some((x) => String(x[pk]) === String(row[pk]))) {
        throw new Error("Mã / khóa đã tồn tại");
      }

      row.created_at = row.created_at || new Date().toISOString();
      if (table === "suppliers") {
        row = { active: true, ...row, debt: 0, total_purchased: 0, purchase_count: 0 };
        if (!String(row.code || "").trim()) row.code = "NCC" + String(db.suppliers.length + 1).padStart(4, "0");
      }
      // Sản phẩm mới có tồn ban đầu: ghi lịch sử kho
      const initial = table === "products" ? Number(row.stock) || 0 : 0;
      if (initial > 0) row.stock = 0;

      db[table].push(row);
      if (initial > 0) stockMove(row, initial, "initial", "", "Khởi tạo kho");
      persist();
      touch(table);

      return row;
    },
    async update(table, id, patch) {
      guard(table, id, patch);
      if (["purchase_orders", "stock_adjustments", "stock_exports", "stock_moves"].includes(table))
        throw new Error("Không được sửa trực tiếp dữ liệu giao dịch");

      if (table === "crm_customers" && patch.phone !== undefined) {
        patch = {
          ...patch,
          phone: crmPhone(patch.phone),
        };

        const current = db.crm_customers.find((c) => c.id === id);

        const duplicate =
          current?.profile_id == null &&
          db.crm_customers.some(
            (c) =>
              c.id !== id &&
              c.profile_id == null &&
              crmPhone(c.phone) === patch.phone,
          );

        if (duplicate) {
          throw new Error("Số điện thoại khách hàng đã tồn tại");
        }
      }

      if (["orders", "leads", "reviews"].includes(table)) {
        writeBack(table, id, patch);
        return this.get(table, id);
      }

      if (table === "profiles") {
        throw new Error("Bản demo không sửa tài khoản");
      }

      const row = db[table].find((x) => String(x[AD.PK[table]]) === String(id));

      if (!row) {
        throw new Error("Bản ghi không tồn tại");
      }

      if (table === "suppliers") {
        patch = { ...patch };
        delete patch.debt; delete patch.total_purchased; delete patch.purchase_count;
      }
      // Sửa tồn kho tay ở trang sản phẩm: vẫn ghi lịch sử kho
      if (table === "products" && patch.stock != null && Number(patch.stock) !== Number(row.stock)) {
        const { stock, ...rest } = patch;
        stockMove(row, Number(stock) - (Number(row.stock) || 0), "manual", "", "Sửa tồn kho ở trang sản phẩm");
        patch = rest;
      }
      Object.assign(row, patch, {
        updated_at: new Date().toISOString(),
      });

      persist();
      touch(table);

      return row;
    },
    async remove(table, id) {
      if (!writer()) deny();
      if (table === "reviews") {
        writeBack("reviews", id, { status: "deleted" });
        return;
      }
      if (["orders", "leads", "profiles"].includes(table))
        throw new Error("Chế độ demo không xóa dữ liệu khách hàng");
      if (["purchase_orders", "stock_adjustments", "stock_exports", "stock_moves"].includes(table))
        throw new Error("Không được xóa dữ liệu giao dịch");
      if (table === "suppliers" && db.purchase_orders.some((po) => String(po.supplier_id) === String(id)))
        throw new Error("Nhà cung cấp đã có đơn nhập, hãy chuyển sang ngừng giao dịch");
      db[table] = db[table].filter(
        (x) => String(x[AD.PK[table]]) !== String(id),
      );
      persist();
      touch(table);
    },
    // Khôi phục dữ liệu mẫu: website dùng lại dữ liệu mặc định (chưa bảng nào được sửa)
    reset() {
      const customers = db.crm_customers;
      const links = db.crm_order_links;

      db = seed();
      db.touched = {};

      db.crm_customers = customers;
      db.crm_order_links = links;
      Object.assign(db, demoMaintenance(), demoInventory());

      persist();
    },
  };
};

AD.db =
  DT.BACKEND?.mode === "mysql" ? AD.mysql(DT.BACKEND) : AD.demo();
