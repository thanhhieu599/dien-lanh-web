// Lớp truy xuất dữ liệu. Giai đoạn 1 đọc từ DT.products (catalog.js).
// Giai đoạn 2: thay phần thân các hàm bằng fetch('/api/...') mà không đổi giao diện gọi.
window.DT = window.DT || {};

DT.api = (() => {
  const byId = new Map(DT.products.map((p) => [p.id, p]));
  const bySlug = new Map(DT.products.map((p) => [p.slug, p]));
  const n = (s) => DT.u.norm(s);

  const productById = (id) => byId.get(Number(id));
  const product = (key) => byId.get(Number(key)) || bySlug.get(key);
  const category = (id) => DT.categories.find((c) => c.id === id);
  const brand = (id) => DT.brands.find((b) => b.id === id);
  const url = (p) => `san-pham.html?id=${p.id}&${p.slug}`;

  function matchQuery(p, q) {
    const words = n(q).split(/\s+/).filter(Boolean);
    const hay = n(`${p.name} ${p.sku} ${brand(p.brand)?.name} ${category(p.cat)?.name} ${p.short}`);
    return words.every((w) => hay.includes(w));
  }

  /**
   * Lọc sản phẩm.
   * @param {{cat?, sub?, brands?: string[], price?: string, attrs?: Object<string,string[]>, q?, sort?, flash?, badge?, page?, limit?}} f
   */
  function list(f = {}) {
    let items = DT.products.filter((p) => {
      if (f.cat && p.cat !== f.cat) return false;
      if (f.sub && p.sub !== f.sub) return false;
      if (f.brands?.length && !f.brands.includes(p.brand)) return false;
      if (f.flash && !p.flashSale) return false;
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
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      discount: (a, b) => DT.u.discount(b) - DT.u.discount(a),
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    };
    items = items.slice().sort(sorters[f.sort] || sorters.popular);
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
      .sort((a, b) => (b.sub === p.sub) - (a.sub === p.sub) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
      .slice(0, limit);
  }

  function suggest(q, limit = 6) {
    if (!q || q.trim().length < 2) return [];
    return list({ q, sort: 'popular' }).items.slice(0, limit);
  }

  // Đánh giá mẫu (giai đoạn 2 lấy từ DB)
  function reviews(p) {
    const names = ['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Minh', 'Phạm Thu Hà', 'Công ty TNHH Minh Phát', 'Võ Quốc Bảo'];
    const texts = [
      'Sản phẩm chính hãng, giao nhanh, thợ lắp đặt cẩn thận, dọn dẹp sạch sẽ.',
      'Máy chạy êm, tiết kiệm điện rõ rệt so với máy cũ. Rất hài lòng.',
      'Tư vấn nhiệt tình, giá tốt hơn nhiều nơi khác. Sẽ ủng hộ tiếp.',
      'Đặt hàng buổi sáng, chiều đã có thợ đến lắp. Dịch vụ tuyệt vời.',
      'Mua số lượng cho văn phòng, được báo giá nhanh, xuất VAT đầy đủ.',
      'Đóng gói kỹ, đúng mô tả. Trừ 1 sao vì giao trễ 30 phút.',
    ];
    return [0, 1, 2, 3].map((i) => {
      const k = (p.id + i) % names.length;
      return { name: names[k], rating: k === 5 ? 4 : 5, text: texts[k], date: `2026-0${9 - i}-1${i}`, verified: true };
    });
  }

  return { productById, product, category, brand, url, list, related, suggest, reviews };
})();
