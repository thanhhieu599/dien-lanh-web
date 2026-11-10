// Kết nối API PHP/MySQL bằng fetch, phiên đăng nhập dùng cookie HttpOnly.
// - DT.ready: Promise hoàn tất khi đã nạp catalog từ DB (hoặc ngay lập tức ở chế độ demo)
// - DT.onReady(fn): chạy fn khi DOM sẵn sàng VÀ dữ liệu đã nạp
window.DT = window.DT || {};

DT.backend = (() => {
  const cfg = DT.BACKEND || {};
  const enabled = cfg.mode === "mysql";
  const SESSION_KEY = "dt_mysql_auth_v1";
  const CACHE_KEY = "dt_mysql_catalog_cache_v1";

  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    /* bỏ qua */
  }
  const saveSession = (s) => {
    session = s;
    try {
      s
        ? localStorage.setItem(SESSION_KEY, JSON.stringify(s))
        : localStorage.removeItem(SESSION_KEY);
    } catch {
      /* bỏ qua */
    }
  };

  // Thông báo lỗi dễ hiểu cho khách
  function friendly(data, status) {
    const msg =
      data &&
      (data.message || data.msg || data.error_description || data.error);
    if (/Invalid login credentials/i.test(msg || ""))
      return "Sai số điện thoại hoặc mật khẩu";
    if (
      /already registered|already been registered|duplicate key.*phone/i.test(
        msg || "",
      )
    )
      return "Số điện thoại đã được đăng ký";
    if (/Password should be/i.test(msg || ""))
      return "Mật khẩu tối thiểu 6 ký tự";
    if (status === 0)
      return "Không kết nối được máy chủ, vui lòng kiểm tra mạng";
    return msg || "Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline";
  }

  async function http(
    path,
    { method = "GET", body, headers = {}, auth = true } = {},
  ) {
    const h = {
      "Content-Type": "application/json",
      "X-DT-Request": "1",
      ...headers,
    };
    const token = auth ? await accessToken() : null;
    // Cookie HttpOnly được máy chủ kiểm tra; marker chỉ phục vụ giao diện.
    let res;
    try {
      res = await fetch(DT.apiEndpoint(path), {
        credentials: "same-origin",
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
      // Token hết hạn/không hợp lệ -> đăng xuất cục bộ rồi thử lại bằng anon
      if (res.status === 401 && token && auth) {
        saveSession(null);
        return http(path, { method, body, headers, auth: false });
      }
      throw new Error(friendly(data, res.status));
    }
    return data;
  }

  // ---------- Auth PHP/MySQL
  const toSession = (d) => ({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at:
      d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    user_id: d.user?.id,
  });

  async function accessToken() {
    if (!session) return null;
    if (session.expires_at * 1000 - 60000 > Date.now())
      return session.access_token;
    try {
      const d = await http("/auth/refresh", {
        method: "POST",
        body: { refresh_token: session.refresh_token },
        auth: false,
      });
      saveSession(toSession(d));
      return session.access_token;
    } catch {
      saveSession(null);
      return null;
    }
  }

  async function signUp({ phone, password, name, email }) {
    const d = await http("/auth/signup", {
      method: "POST",
      auth: false,
      body: {
        phone,
        password,
        data: { name, phone, contact_email: email || "" },
      },
    });
    if (!d.access_token) throw new Error("Không tạo được phiên đăng nhập");
    saveSession(toSession(d));
    return profile();
  }

  async function signIn(phone, password) {
    const d = await http("/auth/login", {
      method: "POST",
      auth: false,
      body: { phone, password },
    });
    saveSession(toSession(d));
    return profile();
  }

  // Đăng xuất: xóa phiên trên máy NGAY (đơn đặt sau đó không bị gắn vào tài khoản cũ, kể cả khi
  // khách chuyển trang liền hoặc mất mạng), rồi mới báo máy chủ hủy phiên bằng token vừa giữ lại
  async function signOut() {
    const token = session?.access_token;
    saveSession(null);
    if (!token) return;
    try {
      await fetch(DT.apiEndpoint("/auth/logout"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-DT-Request": "1" },
      });
    } catch {
      /* bỏ qua: phiên trên máy đã xóa */
    }
  }

  async function profile() {
    if (!session?.user_id) return null;
    const rows = await http(
      `/data/profiles?id=eq.${session.user_id}&select=id,name,phone,email,addresses,role`,
    );
    return rows[0] || null;
  }

  // ---------- REST tiện ích
  const select = (table, query = "") => http(`/data/${table}?${query}`);
  const rpc = (fn, args = {}) =>
    http(`/rpc/${fn}`, { method: "POST", body: args });
  const insert = (table, row) =>
    http(`/data/${table}`, {
      method: "POST",
      body: row,
      headers: { Prefer: "return=minimal" },
    });
  const update = (table, filter, patch) =>
    http(`/data/${table}?${filter}`, {
      method: "PATCH",
      body: patch,
      headers: { Prefer: "return=representation" },
    });

  // ---------- Nạp catalog & nội dung
  const mapProduct = (r) => DT.rows.product.toView(r);

  // Áp dữ liệu vào website. d có thể chỉ chứa một số bảng (bản demo: chỉ các bảng đã sửa trong quản trị)
  function apply(d) {
    const setting = (k) => d.settings?.find((s) => s.key === k)?.value;
    if (d.settings) {
      if (setting("store")) Object.assign(DT.config, setting("store"));
      DT.vision = setting("vision") || {}; // ảnh trang Tầm nhìn & Sứ mệnh (quản trị tải lên)
      if (setting("trust"))
        DT.trust = {
          logos: [],
          certs: [],
          reviews: [],
          google: {},
          ...setting("trust"),
        };
      // Quản trị › Nội dung website: nội dung trang chủ / dải cam kết... và mức lọc giá, phụ kiện mua kèm
      if (setting("home")) DT.homeContent = setting("home");
      const cat = setting("catalog");
      if (cat && Array.isArray(cat.priceRanges) && cat.priceRanges.length)
        DT.priceRanges = cat.priceRanges;
      if (cat && Array.isArray(cat.bundles)) DT.bundleRules = cat.bundles;
    }
    if (d.projects) {
      DT.projects = d.projects.map(DT.rows.project.toView);
    }
    if (d.faqs) DT.faqs = d.faqs;
    if (d.categories)
      DT.categories = d.categories.map((c) => ({
        ...c,
        subs: c.subs || [],
        filters: c.filters || [],
      }));
    if (d.brands) DT.brands = d.brands;
    if (d.products) DT.products = d.products.map(mapProduct);
    // Danh mục bị ẩn -> sản phẩm của danh mục đó cũng ẩn khỏi website
    const cats = new Set(DT.categories.map((c) => c.id));
    DT.products = DT.products.filter((p) => cats.has(p.cat));
    if (d.stores) DT.stores = d.stores;
    if (d.posts)
      DT.posts = d.posts.map((p) => ({
        ...p,
        date: String(p.date).slice(0, 10),
      }));
    if (d.banners) DT.banners = d.banners;
    if (d.services)
      DT.services = d.services.map(DT.rows.service.toView);
    if (d.policies)
      DT.policies = Object.fromEntries(
        d.policies.map((p) => [p.key, { title: p.title, body: p.body }]),
      );
    if (d.coupons) {
      DT.couponCatalog = d.coupons.map(DT.rows.coupon.toView);
      const now = Date.now();
      DT.coupons = DT.couponCatalog.filter(
        (c) =>
          c.is_public !== false &&
          c.active !== false &&
          (!c.starts_at || new Date(c.starts_at).getTime() <= now) &&
          (!c.ends_at || new Date(c.ends_at).getTime() > now) &&
          (c.usage_limit == null || Number(c.used_count || 0) < c.usage_limit),
      );
    }
  }

  async function fetchCatalog() {
    const q = {
      settings: "key=in.(store,vision,trust,home,catalog)&select=key,value",
      categories:
        "select=id,name,short,icon,art,image,product_ids,excluded_product_ids,subs,filters&order=sort",
      brands: "select=id,name,slug,origin,color,logo,product_ids&order=sort",
      products: "select=*&order=id",
      stores: "select=id,name,city,address,phone,hours,map&order=sort",
      posts:
        "select=slug,title,cat,date,author,art,excerpt,content&order=date.desc",
      banners: "select=title,sub,cta,href,theme,art,image&order=sort",
      services: `select=${DT.rows.service.columns}&order=sort`,
      policies: "select=key,title,body&order=sort",
      coupons: "select=*",
      projects: "select=*&published=is.true&order=sort,year.desc",
      faqs: "select=id,category,question,answer,sort&active=is.true&order=sort,id",
    };
    const keys = Object.keys(q);
    const results = await Promise.all(keys.map((k) => select(k, q[k])));
    return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
  }

  // Bản demo (chưa kết nối database): website dùng dữ liệu trang quản trị demo cùng trình duyệt cho các bảng
  // đã sửa trong quản trị (db.touched), lọc giống quyền xem của khách trên database (chỉ mục đang hiển thị)
  function demoAdmin() {
    let db = null;
    try {
      db = JSON.parse(localStorage.getItem(DT.ADMIN_DEMO_KEY) || "null");
    } catch {
      /* bỏ qua */
    }
    if (!db?.touched) return;
    const has = (t) => db.touched[t] && Array.isArray(db[t]);
    const on = (r) => r.active !== false;
    const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
    const now = Date.now();
    const d = {};
    if (has("settings")) d.settings = db.settings;
    if (has("categories")) d.categories = db.categories.filter(on).sort(bySort);
    if (has("brands")) d.brands = db.brands.filter(on).sort(bySort);
    if (has("products"))
      d.products = db.products.filter(on).sort((a, b) => a.id - b.id);
    if (has("stores")) d.stores = db.stores.filter(on).sort(bySort);
    if (has("posts"))
      d.posts = db.posts
        .filter((p) => p.published !== false)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (has("banners")) d.banners = db.banners.filter(on).sort(bySort);
    if (has("services")) d.services = db.services.filter(on).sort(bySort);
    if (has("policies")) d.policies = [...db.policies].sort(bySort);
    if (has("coupons")) d.coupons = db.coupons;
    if (has("projects"))
      d.projects = db.projects
        .filter((p) => p.published)
        .sort((a, b) => bySort(a, b) || (b.year || 0) - (a.year || 0));
    if (has("faqs"))
      d.faqs = db.faqs
        .filter(on)
        .sort((a, b) => bySort(a, b) || (a.id || 0) - (b.id || 0));
    try {
      apply(d);
    } catch (e) {
      console.warn(
        "[Website demo] Bỏ qua dữ liệu quản trị demo lỗi:",
        e.message,
      );
    }
  }

  async function load() {
    if (!enabled) {
      demoAdmin();
      return;
    }
    let data = null;
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (c && Date.now() - c.t < (cfg.cacheMinutes ?? 5) * 60000)
        data = c.data;
    } catch {
      /* bỏ qua */
    }
    try {
      if (!data) {
        data = await fetchCatalog();
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ t: Date.now(), data }),
          );
        } catch {
          /* quá dung lượng */
        }
      }
      apply(data);
    } catch (e) {
      console.warn(
        "[Website] Không nạp được dữ liệu từ máy chủ, dùng dữ liệu dự phòng:",
        e.message,
      );
      DT.backend.offline = true;
    }
    // Đồng bộ trạng thái đăng nhập
    try {
      const current = await http("/auth/session", { auth: false });
      saveSession(current ? toSession(current) : null);
    } catch {
      /* giữ thông tin cũ khi máy chủ tạm thời không truy cập được */
    }
    const s = DT.store.get();
    if (!session) {
      if (s.user) {
        s.user = null;
        DT.store.save();
      }
    } else {
      try {
        const p = await profile();
        if (p) {
          s.user = p;
          DT.store.save();
        } else {
          saveSession(null);
          s.user = null;
          DT.store.save();
        }
      } catch {
        /* giữ thông tin cũ khi mất mạng */
      }
    }
  }

  const clearCache = () => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      /* bỏ qua */
    }
  };

  return {
    enabled,
    offline: false,
    load,
    clearCache,
    select,
    rpc,
    insert,
    update,
    signUp,
    signIn,
    signOut,
    profile,
    hasSession: () => !!session,
  };
})();

DT.ready = DT.backend.load();
DT.onReady = (fn) => {
  const run = () => DT.ready.catch(() => {}).then(fn);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", run);
  else run();
};
