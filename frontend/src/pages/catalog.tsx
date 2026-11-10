import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dt, formValues, money, toast } from "../services/runtime";
import { useShop } from "../hooks/useShop";
import {
  Breadcrumb,
  Empty,
  Icon,
  Media,
  Picture,
  Rich,
  ShopLink,
  Stars,
  useJsonLd,
  useMeta,
} from "../components/common";
import {
  AddToCart,
  ProductGrid,
  ProductSection,
  PRODUCTS_PER_PAGE,
} from "../components/products";
import { PagedList, MoreButton } from "../components/collections";
import type { Product, Row } from "../types";

export { HomePage } from "./home";

export function ListingPage({
  mode,
  categoryId,
  subId,
}: {
  mode: "category" | "search" | "sale";
  categoryId?: string;
  subId?: string;
}) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const catId = params.get("cat") ?? categoryId ?? "";
  const cat = dt.api.category(catId);
  const title =
    mode === "sale"
      ? "Khuyến mãi"
      : mode === "search"
        ? `Tìm kiếm: ${params.get("q") || ""}`
        : cat?.name || "Tất cả sản phẩm";
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const attrs: Row = {};
  for (const filter of cat?.filters || [])
    if (params.get(filter.key))
      attrs[filter.key] = params.get(filter.key)!.split(",");
  const filters = {
    cat: catId,
    sub: params.get("sub") ?? (params.has("cat") ? "" : subId || ""),
    sub2: params.get("sub2") || "",
    q: params.get("q") || "",
    brands: (params.get("brand") || "").split(",").filter(Boolean),
    price: params.get("price") || "",
    sort: params.get("sort") || "popular",
    flash: mode === "sale",
    attrs,
    page,
    limit: PRODUCTS_PER_PAGE,
  };
  const { items, total } = dt.api.list(filters);
  useEffect(() => {
    const last = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
    if (page > last) {
      const next = new URLSearchParams(params);
      next.set("page", String(last));
      setParams(next, { replace: true });
    }
  }, [page, total, params, setParams]);
  useMeta(title);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value || key === "cat" || key === "sub") next.set(key, value);
    else next.delete(key);
    if (key === "cat") next.delete("sub");
    if (key === "cat" || key === "sub") next.delete("sub2");
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  function multiple(key: string, value: string) {
    const current = (params.get(key) || "").split(",").filter(Boolean);
    change(
      key,
      current.includes(value)
        ? current.filter((v) => v !== value).join(",")
        : [...current, value].join(","),
    );
  }
  if (mode === "category" && catId && !cat)
    return <Empty heading={1} title="Danh mục không tồn tại" />;
  return (
    <>
      <Breadcrumb items={[{ label: title }]} />
      <div className="container">
        <div className="cat-hero">
          {cat?.image && <Media src={cat.image} alt={cat.name} />}
          <div>
            <h1 id="cat-title">{title}</h1>
            {mode !== "category" && (
              <p>
                {mode === "sale"
                  ? "Tổng hợp ưu đãi điện lạnh chính hãng."
                  : "Tìm thiết bị phù hợp với nhu cầu của bạn."}
              </p>
            )}
          </div>
        </div>
        <div className="listing listing-layout">
          <button
            className="btn btn-outline react-filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Icon name="filter" />
            {filtersOpen ? "Ẩn bộ lọc" : "Bộ lọc sản phẩm"}
          </button>
          <aside
            className={`filters ${filtersOpen ? "react-filters-open" : ""}`}
            id="filters"
          >
            <h2>Bộ lọc sản phẩm</h2>
            <label>
              Danh mục
              <select
                value={catId}
                onChange={(e) => change("cat", e.target.value)}
              >
                <option value="">Tất cả</option>
                {dt.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Thương hiệu</legend>
              {dt.brands.map((b) => (
                <label className="fopt" key={b.id}>
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(b.id)}
                    onChange={() => multiple("brand", b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </fieldset>
            <label>
              Khoảng giá
              <select
                value={filters.price}
                onChange={(e) => change("price", e.target.value)}
              >
                <option value="">Tất cả mức giá</option>
                {dt.priceRanges.map((r: any) => (
                  <option value={r.v} key={r.v}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            {cat?.filters.map((f: any) => (
              <fieldset key={f.key}>
                <legend>{f.label}</legend>
                {f.options.map((option: string) => (
                  <label className="fopt" key={option}>
                    <input
                      type="checkbox"
                      checked={(attrs[f.key] || []).includes(option)}
                      onChange={() => multiple(f.key, option)}
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              className="btn btn-light"
              onClick={() =>
                setParams(mode === "category" ? { cat: catId } : {})
              }
            >
              Xóa bộ lọc
            </button>
          </aside>
          <section className="listing-main">
            <div className="toolbar list-toolbar">
              <span>{total} sản phẩm</span>
              <label>
                Sắp xếp{" "}
                <select
                  value={filters.sort}
                  onChange={(e) => change("sort", e.target.value)}
                >
                  {[
                    ["popular", "Bán chạy"],
                    ["price-asc", "Giá tăng dần"],
                    ["price-desc", "Giá giảm dần"],
                    ["discount", "Giảm giá nhiều"],
                    ["newest", "Mới nhất"],
                    ["rating", "Đánh giá cao"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {cat?.subs.length > 0 && (
              <div className="tabs">
                {(() => {
                  const group = cat?.subs.find(
                    (s: any) => s.id === filters.sub,
                  );
                  return (
                    group?.items?.length > 0 && (
                      <div
                        className="tabs tabs-sub2"
                        aria-label={`Mục trong ${group.name}`}
                      >
                        {group.items.map((it: any) => (
                          <button
                            type="button"
                            key={it.id}
                            aria-pressed={filters.sub2 === it.id}
                            className={`tab ${filters.sub2 === it.id ? "active" : ""}`}
                            onClick={() =>
                              change(
                                "sub2",
                                filters.sub2 === it.id ? "" : it.id,
                              )
                            }
                          >
                            {it.name}
                          </button>
                        ))}
                      </div>
                    )
                  );
                })()}
              </div>
            )}
            <ProductGrid products={items} />
            {total > PRODUCTS_PER_PAGE && (
              <MoreButton
                onClick={() =>
                  change(
                    "page",
                    String(page * PRODUCTS_PER_PAGE >= total ? 1 : page + 1),
                  )
                }
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
export function ProductPage({ id, slug }: { id?: string; slug?: string }) {
  const p: Product | undefined = slug
    ? dt.products.find((p) => p.slug === slug)
    : dt.api.productById(Number(id));
  const [image, setImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const state = useShop();
  const navigate = useNavigate();
  useMeta(
    p?.name || "Không tìm thấy sản phẩm",
    p?.short || "",
    p ? dt.api.url(p) : undefined,
  );
  useEffect(() => {
    let active = true;
    if (p) {
      dt.store.addViewed(p.id);
      dt.api
        .fetchReviews(p)
        .then((rows: Row[]) => {
          if (!active) return;
          let local: Row[] = [];
          if (!dt.backend.enabled) {
            try {
              local = (
                JSON.parse(localStorage.getItem("dt_reviews_v1") || "{}")[
                  p.id
                ] || []
              ).filter((r: Row) => !r.status || r.status === "approved");
            } catch {
              /* Dữ liệu demo bị lỗi không ngăn trang sản phẩm hoạt động. */
            }
          }
          setReviews([...local, ...rows]);
        })
        .catch(() => {
          if (active) setMessage("Chưa tải được đánh giá. Vui lòng thử lại.");
        });
      dt.analytics?.viewItem?.(p);
    }
    return () => {
      active = false;
    };
  }, [p?.id]);
  useJsonLd(
    "Product",
    p
      ? {
          name: p.name,
          sku: p.sku,
          description: p.short,
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "VND",
            availability: p.stock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: dt.u.abs(dt.api.url(p)),
          },
        }
      : { name: "Không tìm thấy sản phẩm" },
  );
  if (!p)
    return (
      <Empty
        heading={1}
        title="Sản phẩm không tồn tại hoặc đã ngừng kinh doanh"
      />
    );
  const product = p;
  const groups = dt.api.optionGroups(p);
  const sizeKeys = [
    "Công suất",
    "Dung tích tổng",
    "Dung tích",
    "Khối lượng",
    "Diện tích sử dụng",
    "Dung tích bình nước",
  ];
  const variantLabel = (value: Product) => {
    const key = sizeKeys.find((k) => value.specs?.[k]);
    return key
      ? value.specs[key]
      : value.attrs.capacity || value.attrs.volume || value.attrs.weight || "";
  };
  const variants = [
    p,
    ...dt.products.filter(
      (value) =>
        value.id !== p.id &&
        value.cat === p.cat &&
        value.sub === p.sub &&
        value.brand === p.brand,
    ),
  ]
    .filter((value) => variantLabel(value))
    .filter(
      (value, index, all) =>
        all.findIndex(
          (other) => variantLabel(other) === variantLabel(value),
        ) === index,
    )
    .sort(
      (a, b) =>
        (parseFloat(variantLabel(a).replace(",", ".")) || 0) -
          (parseFloat(variantLabel(b).replace(",", ".")) || 0) ||
        a.price - b.price,
    );
  // Thông số nhanh dưới giá; dòng nào chưa có dữ liệu thì ẩn
  const facts: [string, React.ReactNode][] = (
    [
      ["Mã sản phẩm", p.sku],
      [
        "Thương hiệu",
        <ShopLink href={dt.api.brandUrl(p.brand)}>
          {dt.api.brand(p.brand).name}
        </ShopLink>,
      ],
      ["Công nghệ", p.technology || p.attrs.tech || p.specs["Công nghệ"]],
      ["Xuất xứ", p.origin || p.specs["Xuất xứ"]],
      ["Bảo hành", p.warranty || p.specs["Bảo hành"]],
    ] as [string, React.ReactNode][]
  ).filter(([, value]) => value);
  function buy() {
    if (groups.some((g: any) => !g.values.includes(options[g.name]))) {
      toast("Vui lòng chọn đầy đủ thuộc tính sản phẩm", true);
      return;
    }
    if (dt.store.addToCart(product.id, qty, { options }))
      navigate("/gio-hang.html");
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formValues(form);
    if (!dt.u.validPhone(data.phone)) {
      toast("Số điện thoại không hợp lệ", true);
      return;
    }
    setSaving(true);
    try {
      const entry = {
        name: data.name.trim(),
        phone: data.phone,
        rating: Number(data.rating),
        text: data.text.trim(),
      };
      if (dt.backend.enabled) {
        await dt.backend.insert("reviews", {
          ...entry,
          product_id: product.id,
        });
        toast("Đã gửi đánh giá, chờ cửa hàng duyệt");
      } else {
        const stored = JSON.parse(
          localStorage.getItem("dt_reviews_v1") || "{}",
        );
        const added = {
          ...entry,
          date: new Date().toISOString(),
          verified: false,
        };
        stored[product.id] = [added, ...(stored[product.id] || [])];
        localStorage.setItem("dt_reviews_v1", JSON.stringify(stored));
        setReviews([added, ...reviews]);
        toast("Đã gửi đánh giá");
      }
      form.reset();
    } catch (e) {
      toast(String(e), true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Breadcrumb
        items={[
          {
            label: dt.api.category(p.cat)?.name || "Sản phẩm",
            href: dt.api.catUrl(p.cat),
          },
          { label: p.name },
        ]}
      />
      <div className="container">
        <div className="pd" id="pd">
          <div className="pd-title">
            <h1>{p.name}</h1>
            <div className="pd-sub">
              <div className="actions">
                <button
                  aria-pressed={state.wishlist.includes(p.id)}
                  className={state.wishlist.includes(p.id) ? "active" : ""}
                  onClick={() => dt.store.toggleWishlist(p.id)}
                >
                  <Icon name="heart" />
                  Yêu thích
                </button>
                <button
                  aria-pressed={state.compare.includes(p.id)}
                  onClick={() => dt.store.toggleCompare(p.id)}
                >
                  <Icon name="compare" />
                  So sánh
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (navigator.share)
                        await navigator.share({
                          title: p.name,
                          url: location.href,
                        });
                      else {
                        await navigator.clipboard.writeText(location.href);
                        toast("Đã sao chép liên kết sản phẩm");
                      }
                    } catch {}
                  }}
                >
                  <Icon name="share" />
                  Chia sẻ
                </button>
              </div>
            </div>
          </div>
          <div className="gallery pd-gallery">
            <div className="gallery-main" id="g-main">
              <div className="g-pic">
                <Picture product={p} index={image} />
              </div>
              {p.images.length > 1 && (
                <>
                  <button
                    className="g-nav prev"
                    aria-label="Ảnh trước"
                    onClick={() =>
                      setImage((image - 1 + p.images.length) % p.images.length)
                    }
                  >
                    <Icon name="left" />
                  </button>
                  <button
                    className="g-nav next"
                    aria-label="Ảnh sau"
                    onClick={() => setImage((image + 1) % p.images.length)}
                  >
                    <Icon name="right" />
                  </button>
                </>
              )}
            </div>
            <div className="gallery-thumbs g-thumbs">
              {(p.images.length ? p.images : ["art:0"]).map((_, i) => (
                <button
                  key={i}
                  className={image === i ? "active" : ""}
                  onClick={() => setImage(i)}
                  aria-label={`Ảnh ${i + 1}`}
                >
                  <Picture product={p} index={i} />
                </button>
              ))}
              {Array.from(
                { length: Math.max(0, 5 - p.images.length) },
                (_, i) => (
                  <span className="g-empty" key={`empty-${i}`}>
                    <Icon name="image" />
                  </span>
                ),
              )}
            </div>
            <div className="gallery-feats">
              <div>
                <Icon name="shield" />
                Chính hãng
                <br />
                {dt.api.brand(p.brand).name}
              </div>
              <div>
                <Icon name="refresh" />1 đổi 1<br />
                30 ngày
              </div>
              <div>
                <Icon name="tool" />
                Bảo hành
                <br />
                {p.warranty}
              </div>
            </div>
          </div>
          <section className="pd-info">
            <p className="pd-status">
              <b>Đã bán:</b> {p.sold.toLocaleString("vi-VN")}
              <span className="sep" aria-hidden="true">
                |
              </span>
              <b>Tình trạng:</b>{" "}
              <span className={p.stock > 0 ? "in-stock" : "out-stock"}>
                {p.stock > 0 ? "Còn hàng" : "Hết hàng"}
              </span>
            </p>
            <div className="pd-price">
              <strong>{money(p.price)}</strong>
              {!!p.oldPrice && <del>{money(p.oldPrice)}</del>}
              {dt.u.discount(p) > 0 && (
                <span className="lbl lbl-sale">-{dt.u.discount(p)}%</span>
              )}
            </div>
            <dl className="pd-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}:</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {variants.length > 1 && (
              <div className="pd-variants">
                <h2>Chọn theo nhu cầu</h2>
                <div className="variant-list">
                  {variants.map((value) => (
                    <ShopLink
                      key={value.id}
                      href={dt.api.url(value)}
                      className={`variant ${value.id === p.id ? "active" : ""}`}
                      aria-current={value.id === p.id ? "true" : undefined}
                    >
                      <b>{variantLabel(value)}</b>

                      <small>{money(value.price)}</small>
                    </ShopLink>
                  ))}
                </div>
              </div>
            )}
            {p.cat === "may-lanh" && (
              <ShopLink
                className="calc-hint react-capacity-link"
                href="tinh-cong-suat-may-lanh.html"
              >
                <Icon name="snow" />
                <span>
                  Chưa chắc công suất phù hợp?{" "}
                  <b>Tính công suất theo diện tích phòng</b>
                </span>
                <Icon name="right" />
              </ShopLink>
            )}
            <div className="promo-box">
              <h4>
                <Icon name="gift" />
                Khuyến mãi & ưu đãi
              </h4>
              <ul>
                {p.gift && (
                  <li>
                    <i>1</i>
                    <span>{p.gift}</span>
                  </li>
                )}
                {dt.coupons.slice(0, 1).map((coupon: Row) => (
                  <li key={coupon.code}>
                    <i>
                      <Icon name="check" />
                    </i>
                    <span>
                      Nhập mã <b>{coupon.code}</b>{" "}
                      {coupon.desc || coupon.description}
                    </span>
                  </li>
                ))}
                <li>
                  <i>
                    <Icon name="check" />
                  </i>
                  <span>
                    Doanh nghiệp mua số lượng:{" "}
                    <ShopLink
                      className="link"
                      href={`bao-gia-du-an.html?product=${p.id}`}
                    >
                      nhận báo giá riêng
                    </ShopLink>
                  </span>
                </li>
              </ul>
            </div>
            {groups.length > 0 && (
              <div className="pd-options">
                {groups.map((group: any) => (
                  <fieldset key={group.name} className="pd-option-group">
                    <legend>{group.name}</legend>
                    <div className="pd-option-values">
                      {group.values.map((value: string) => (
                        <button
                          type="button"
                          key={value}
                          className={`pd-option ${options[group.name] === value ? "active" : ""}`}
                          onClick={() =>
                            setOptions({ ...options, [group.name]: value })
                          }
                          aria-pressed={options[group.name] === value}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
            <div className="buy-row">
              <span>Số lượng:</span>
              <div className="qty">
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  disabled={qty <= 1}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >
                  <Icon name="minus" />
                </button>
                <input
                  aria-label="Số lượng"
                  type="number"
                  min={1}
                  max={Math.max(1, Math.min(99, p.stock))}
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.max(
                        1,
                        Math.min(99, p.stock || 1, Number(e.target.value) || 1),
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  disabled={qty >= Math.min(99, p.stock)}
                  onClick={() => setQty(Math.min(99, p.stock, qty + 1))}
                >
                  <Icon name="plus" />
                </button>
              </div>
              {p.stock <= 0 && <span className="muted">Hết hàng</span>}
            </div>
            <div className="buy-btns">
              <button
                className="btn btn-accent btn-buy"
                aria-label="Mua ngay"
                disabled={!p.stock}
                onClick={buy}
              >
                MUA NGAY<small>Giao nhanh 2h</small>
              </button>
              <AddToCart
                product={p}
                qty={qty}
                options={options}
                className="btn btn-outline btn-lg"
              />
            </div>
            <div className="pd-hotline">
              Gọi đặt mua{" "}
              <a href={`tel:${dt.u.tel(dt.config.hotline)}`}>
                {dt.config.hotline}
              </a>{" "}
              ({dt.config.workingHours})
            </div>
          </section>
          <aside className="pd-aside">
            <section className="aside-box">
              <h4>Chính sách bán hàng</h4>
              <ul className="aside-policy">
                {dt
                  .siteContent()
                  .salesPolicy.filter((x: Row) => x.title)
                  .map((x: Row, i: number) => (
                    <li key={i}>
                      <Icon name={x.icon || "check"} />
                      <div>
                        <b>
                          <Rich as="span" html={dt.siteText(x.title)} />
                        </b>
                        <small>
                          <Rich as="span" html={dt.siteText(x.sub)} />
                        </small>
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
            <section className="aside-box">
              <h4>Còn hàng tại cửa hàng</h4>
              <PagedList
                items={dt.stores}
                label="Cửa hàng có sản phẩm"
                renderItem={(s) => (
                  <div className="pd-store" key={s.id}>
                    <span className="stock">
                      {p.stock > 0 ? "Còn hàng" : "Liên hệ"}
                    </span>
                    {s.name.replace(/^.* - /, "")}
                    <small>{s.address}</small>
                  </div>
                )}
              />
            </section>
          </aside>
        </div>
        <div className="pd-tabs-wrap pd-content-layout">
          <div>
            <section className="pd-section" id="pd-content">
              <h2>Mô tả sản phẩm</h2>
              <Rich html={p.description || p.short} className="rich" />
            </section>
            <section className="pd-section" id="reviews">
              <h2>Đánh giá sản phẩm</h2>
              <div className="rating-summary">
                <div className="rating-big">
                  <b>{p.rating}</b>
                  <div>
                    <Stars rating={p.rating} />
                  </div>
                  <small>{reviews.length || p.reviews} đánh giá</small>
                </div>
                <p>Chia sẻ trải nghiệm sử dụng sản phẩm của bạn.</p>
              </div>
              {message && <p role="status">{message}</p>}
              <PagedList
                items={reviews}
                label="Đánh giá sản phẩm"
                renderItem={(r, i) => (
                  <article key={i} className="review react-review">
                    <div className="review-head">
                      <span className="avatar">
                        {r.name?.trim().split(" ").at(-1)?.[0] || "?"}
                      </span>
                      <div>
                        <b>{r.name}</b>
                        {r.verified && (
                          <small>
                            <Icon name="check" />
                            Đã mua hàng
                          </small>
                        )}
                      </div>
                    </div>
                    <span className="stars">
                      {"★".repeat(
                        Math.max(0, Math.min(5, Math.round(r.rating))),
                      )}
                    </span>
                    <p>{r.text}</p>
                    <small>{dt.u.date(r.date || r.created_at)}</small>
                  </article>
                )}
              />
              <form className="react-form" onSubmit={review}>
                <h3>Viết đánh giá</h3>
                <div className="form-row">
                  <label>
                    Họ tên
                    <input name="name" required />
                  </label>
                  <label>
                    Số điện thoại
                    <input name="phone" type="tel" required />
                  </label>
                </div>
                <label>
                  Đánh giá
                  <select name="rating" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} sao
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nội dung
                  <textarea name="text" required minLength={5} />
                </label>
                <button
                  className="btn btn-primary"
                  aria-busy={saving}
                  disabled={saving}
                >
                  Gửi đánh giá
                </button>
              </form>
            </section>
          </div>
          <aside>
            <section className="pd-section">
              <h2>Thông số kỹ thuật</h2>
              <table className="specs spec-table">
                <tbody>
                  {Object.entries(p.specs).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="pd-section pd-b2b">
              <h2>Nhận báo giá doanh nghiệp</h2>
              <p>
                Tư vấn số lượng lớn, giải pháp lắp đặt và hóa đơn cho doanh
                nghiệp.
              </p>
              <ShopLink
                href={`bao-gia-du-an.html?product=${p.id}`}
                className="btn btn-outline btn-block"
              >
                Yêu cầu báo giá {p.sku}
              </ShopLink>
            </section>
          </aside>
        </div>
        <ProductSection
          title="Sản phẩm tương tự"
          products={dt.api.related(p, dt.products.length)}
        />
      </div>
    </>
  );
}
