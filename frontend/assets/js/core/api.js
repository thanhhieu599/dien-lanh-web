// Lớp truy xuất dữ liệu. Giai đoạn 1 đọc từ DT.products (catalog.js).
// Giai đoạn 2: thay phần thân các hàm bằng fetch('/api/...') mà không đổi giao diện gọi.
window.DT = window.DT || {};

DT.api = (() => {
  // Chỉ mục dựng lại khi DT.products được thay (sau khi nạp từ database)
  let indexed = null;
  let byId;
  let bySlug;
  function idx() {
    if (indexed !== DT.products) {
      byId = new Map(DT.products.map((p) => [p.id, p]));
      bySlug = new Map(DT.products.map((p) => [p.slug, p]));
      indexed = DT.products;
    }
  }
  const n = (s) => DT.u.norm(s);

  const productById = (id) => {
    idx();
    return byId.get(Number(id));
  };
  const product = (key) => {
    idx();
    return byId.get(Number(key)) || bySlug.get(key);
  };
  const category = (id) => DT.categories.find((c) => c.id === id);
  const optionGroups = (p) =>
    Object.entries(p.options || {})
      .map(([name, values]) => ({
        name: name.trim(),
        values: [
          ...new Set(
            (Array.isArray(values)
              ? values
              : String(values || "").split(/[,;\n|]/)
            )
              .map((value) => String(value).trim())
              .filter(Boolean),
          ),
        ],
      }))
      .filter((group) => group.name && group.values.length);
  const optionText = (options) =>
    Object.entries(options || {})
      .map(([name, value]) => `${name}: ${value}`)
      .join(" · ");
  // Danh mục trùng tên (vd bản sao "[TEST 02] Tủ lạnh" của "Tủ lạnh") chỉ hiện 1 lần trên menu website:
  // sản phẩm của các bản trùng tên được gộp vào danh mục đang hiện, để sửa trong admin là thấy trên web
  const catKey = (c) => DT.u.norm(c.short || String(c.name || "").replace(/\[TEST[^\]]*\]\s*/gi, ""));
  const sameName = (id) => {
    const c = category(id);
    if (!c) return [];
    const key = catKey(c);
    return key ? DT.categories.filter((x) => x.id === id || catKey(x) === key) : [c];
  };
  const inOne = (p, c) =>
    !(c.excluded_product_ids || []).some((value) => String(value) === String(p.id)) &&
    (p.cat === c.id || (c.product_ids || []).some((value) => String(value) === String(p.id)));
  // Đúng 1 danh mục (dùng cho mã giảm giá: phải khớp cách tính trên máy chủ)
  const inCategory = (p, id) => { const c = category(id); return !!c && inOne(p, c); };
  // Hiển thị danh sách trên website: gộp các danh mục trùng tên
  const inShownCategory = (p, id) => sameName(id).some((c) => inOne(p, c));
  // Thương hiệu bị ẩn / xóa trong quản trị: vẫn hiển thị được sản phẩm (dùng mã thương hiệu làm tên)
  const brand = (id) =>
    DT.brands.find((b) => b.id === id) || {
      id,
      name: String(id || "").replace(
        /(^|-)(\w)/g,
        (m, s, c) => (s ? " " : "") + c.toUpperCase(),
      ),
      origin: "",
      color: "#344054",
    };
  // Loại con của danh mục; sản phẩm chưa chọn loại thì dùng chính danh mục
  const sub = (p) => category(p.cat)?.subs.find((s) => s.id === p.sub) || null;
  // URL thân thiện SEO (sp/<slug>.html...) khi site được build bằng tools/prerender.mjs (DT.SEO.prettyUrls = true)
  const pretty = () => !!DT.SEO?.prettyUrls;
  const url = (p) =>
    pretty() ? `sp/${p.slug}.html` : `san-pham.html?id=${p.id}&${p.slug}`;
  const catUrl = (cat, sub, sub2) =>
    sub2
      ? `danh-muc.html?cat=${cat}&sub=${sub}&sub2=${sub2}`
      : pretty()
        ? `danh-muc/${cat}${sub ? `/${sub}` : ""}.html`
        : `danh-muc.html?cat=${cat}${sub ? `&sub=${sub}` : ""}`;
  const postUrl = (slug) =>
    pretty() ? `tin-tuc/${slug}.html` : `bai-viet.html?slug=${slug}`;
  const policyUrl = (type) =>
    pretty() ? `chinh-sach/${type}.html` : `chinh-sach.html?type=${type}`;
  const brandUrl = (id) => {
    const slug =
      DT.brands.find((b) => b.id === id || b.slug === id)?.slug || id;
    return id
      ? pretty()
        ? `thuong-hieu/${encodeURIComponent(slug)}.html`
        : `thuong-hieu.html?id=${encodeURIComponent(slug)}`
      : "thuong-hieu.html";
  };

  function matchQuery(p, q) {
    const words = n(q).split(/\s+/).filter(Boolean);
    const hay = n(
      `${p.name} ${p.sku} ${brand(p.brand)?.name} ${category(p.cat)?.name} ${p.short}`,
    );
    return words.every((w) => hay.includes(w));
  }

  /**
   * Lọc sản phẩm.
   * @param {{cat?, sub?, brands?: string[], price?: string, attrs?: Object<string,string[]>, q?, sort?, flash?, badge?, page?, limit?}} f
   */
  // Xuất xứ: trường riêng của sản phẩm, nếu trống lấy từ bảng thông số kỹ thuật
  const originOf = (p) => String(p.origin || p.specs?.['Xuất xứ'] || '').trim();
  function list(f = {}) {
    let items = DT.products.filter((p) => {
      if (f.cat && !inShownCategory(p, f.cat)) return false;
      if (f.sub && p.sub !== f.sub) return false;
      if (f.sub2 && p.sub2 !== f.sub2) return false;
      if (f.brands?.length && !f.brands.includes(p.brand)) return false;
      if (f.flash && !p.flashSale) return false;
      // Bộ lọc chuyên môn: còn hàng, ưu đãi & dịch vụ, xuất xứ, đánh giá tối thiểu
      if (f.inStock && !(p.stock > 0)) return false;
      if (f.deals?.length) {
        const has = { sale: p.oldPrice > p.price, flash: !!p.flashSale, install: !!p.freeInstall, gift: !!p.gift };
        if (!f.deals.every((d) => has[d])) return false;
      }
      if (f.origins?.length && !f.origins.includes(originOf(p))) return false;
      if (f.rating && !(Number(p.rating) >= f.rating)) return false;
      if (f.badge && !p.badges.includes(f.badge)) return false;
      if (f.ids && !f.ids.includes(p.id)) return false;
      if (f.price) {
        const r = DT.priceRanges.find((x) => x.v === f.price);
        if (r && (p.price < r.min || (r.max && p.price >= r.max))) return false;
      }
      if (f.attrs) {
        for (const [k, vals] of Object.entries(f.attrs)) {
          if (vals.length && !vals.includes(p.attrs[k])) return false;
        }
      }
      if (f.q && !matchQuery(p, f.q)) return false;
      return true;
    });
    const sorters = {
      popular: (a, b) => b.sold - a.sold,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      discount: (a, b) => DT.u.discount(b) - DT.u.discount(a),
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    };
    const categoryOrder = new Map(
      (category(f.cat)?.product_ids || []).map((id, index) => [
        String(id),
        index,
      ]),
    );
    const ordered = (a, b) =>
      (categoryOrder.get(String(a.id)) ?? Infinity) -
        (categoryOrder.get(String(b.id)) ?? Infinity) || sorters.popular(a, b);
    items = items
      .slice()
      .sort(
        f.sort === "category" || (!f.sort && categoryOrder.size)
          ? ordered
          : sorters[f.sort] || sorters.popular,
      );
    const total = items.length;
    if (f.limit) {
      const page = Math.max(1, f.page || 1);
      items = items.slice((page - 1) * f.limit, page * f.limit);
    }
    return { items, total };
  }

  function related(p, limit = 10) {
    return DT.products
      .filter((x) => x.id !== p.id && x.cat === p.cat)
      .sort(
        (a, b) =>
          (b.sub === p.sub) - (a.sub === p.sub) ||
          Math.abs(a.price - p.price) - Math.abs(b.price - p.price),
      )
      .slice(0, limit);
  }

  function suggest(q, limit = 6) {
    if (!q || q.trim().length < 2) return [];
    return list({ q, sort: "popular" }).items.slice(0, limit);
  }

  // Đánh giá đã duyệt từ DB (Promise). Chế độ demo trả về đánh giá mẫu.
  async function fetchReviews(p) {
    if (!DT.backend.enabled) return reviews(p);
    const rows = await DT.backend.select(
      "reviews",
      `product_id=eq.${p.id}&status=eq.approved&select=name,rating,text,verified,created_at&order=created_at.desc&limit=30`,
    );
    return rows.map((r) => ({
      name: r.name,
      rating: r.rating,
      text: r.text,
      verified: r.verified,
      date: String(r.created_at).slice(0, 10),
    }));
  }

  // Đánh giá mẫu cho chế độ demo
  function reviews(p) {
    const names = [
      "Nguyễn Văn An",
      "Trần Thị Bích",
      "Lê Hoàng Minh",
      "Phạm Thu Hà",
      "Công ty TNHH Minh Phát",
      "Võ Quốc Bảo",
    ];
    const texts = [
      "Sản phẩm chính hãng, giao nhanh, thợ lắp đặt cẩn thận, dọn dẹp sạch sẽ.",
      "Máy chạy êm, tiết kiệm điện rõ rệt so với máy cũ. Rất hài lòng.",
      "Tư vấn nhiệt tình, giá tốt hơn nhiều nơi khác. Sẽ ủng hộ tiếp.",
      "Đặt hàng buổi sáng, chiều đã có thợ đến lắp. Dịch vụ tuyệt vời.",
      "Mua số lượng cho văn phòng, được báo giá nhanh, xuất VAT đầy đủ.",
      "Đóng gói kỹ, đúng mô tả. Trừ 1 sao vì giao trễ 30 phút.",
    ];
    return [0, 1, 2, 3].map((i) => {
      const k = (p.id + i) % names.length;
      return {
        name: names[k],
        rating: k === 5 ? 4 : 5,
        text: texts[k],
        date: `2026-0${9 - i}-1${i}`,
        verified: true,
      };
    });
  }

  return {
    productById,
    product,
    category,
    optionGroups,
    optionText,
    inCategory,
    brand,
    sub,
    url,
    catUrl,
    postUrl,
    policyUrl,
    brandUrl,
    originOf,
    list,
    related,
    suggest,
    reviews,
    fetchReviews,
  };
})();
