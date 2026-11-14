import { useState } from "react";
import { dt, money, safeImage, toast } from "../services/runtime";
import { useShop } from "../hooks/useShop";
import { Empty, Icon, Modal, Picture, ShopLink, Stars } from "./common";
import type { Product } from "../types";
import { ITEMS_PER_PAGE, PagedList } from "./collections";

export function AddToCart({
  product,
  qty = 1,
  options = {},
  children = "Thêm vào giỏ",
  className = "btn btn-primary",
}: {
  product: Product;
  qty?: number;
  options?: Record<string, string>;
  children?: React.ReactNode;
  className?: string;
}) {
  const groups = dt.api.optionGroups(product);
  if (groups.some((g: any) => !g.values.includes(options[g.name])))
    return (
      <ShopLink className={className} href={dt.api.url(product)}>
        Chọn thuộc tính
      </ShopLink>
    );
  return (
    <button
      type="button"
      className={className}
      data-action="add-cart"
      disabled={product.stock <= 0}
      onClick={() => {
        if (dt.store.addToCart(product.id, qty, { options }))
          toast("Đã thêm vào giỏ hàng");
      }}
    >
      <Icon name="cart" />
      {product.stock <= 0 ? "Hết hàng" : children}
    </button>
  );
}
export function ProductCard({
  product: p,
  flash = false,
}: {
  product: Product;
  flash?: boolean;
}) {
  const state = useShop();
  const [quick, setQuick] = useState(false);
  const pct = dt.u.discount(p);

  // Chỉ hiện nhãn "Bán chạy" khi sản phẩm bán nhiều (mặc định từ 300 lượt, sửa ở cấu hình bestsellerMin)
  const badge: [string, string] | null =
    Number(p.sold) >= Number(dt.config?.bestsellerMin ?? 300) ? ["Bán chạy", "hot"] : null;
  return (
    <article className="pcard" data-id={p.id}>
      <div className="pcard-media">
        <ShopLink href={dt.api.url(p)} className="pcard-img">
          <Picture product={p} />
        </ShopLink>
        <div className="pcard-labels">
          {!!pct && <span className="lbl lbl-sale">-{pct}%</span>}
        </div>
        {badge && (
          <span className={`lbl lbl-${badge[1]} pcard-badge`}>{badge[0]}</span>
        )}
        <div className="pcard-actions">
          <button
            className={`icon-btn ${state.wishlist.includes(p.id) ? "active" : ""}`}
            aria-label="Yêu thích"
            aria-pressed={state.wishlist.includes(p.id)}
            onClick={() => dt.store.toggleWishlist(p.id)}
          >
            <Icon name="heart" />
          </button>
          <button
            className={`icon-btn ${state.compare.includes(p.id) ? "active" : ""}`}
            aria-label="So sánh"
            aria-pressed={state.compare.includes(p.id)}
            onClick={() => {
              dt.store.toggleCompare(p.id);
            }}
          >
            <Icon name="compare" />
          </button>
          <button
            className="icon-btn"
            aria-label="Xem nhanh"
            onClick={() => setQuick(true)}
          >
            <Icon name="eye" />
          </button>
        </div>
      </div>
      <div className="pcard-body">
        <h3 className="pcard-name">
          <ShopLink href={dt.api.url(p)}>{p.name}</ShopLink>
        </h3>
        <div className="pcard-price">
          <strong>{money(p.price)}</strong>
          {!!p.oldPrice && <del>{money(p.oldPrice)}</del>}
        </div>
        <div className="pcard-meta">
          <Stars rating={p.rating} />
          <span>{p.rating}</span>
          <span className="dot">•</span>
          <span>
            Đã bán {p.sold >= 1000 ? (p.sold / 1000).toFixed(1) + "k" : p.sold}
          </span>
        </div>
        {flash && (
          <div className="flash-bar">
            <span
              style={{
                width: `${Math.max(12, Math.min(95, Math.round((20 / (p.stock + 20)) * 100)))}%`,
              }}
            />
            <em>
              {p.stock < 10 ? `Chỉ còn ${p.stock} sản phẩm` : "Đã bán 20"}
            </em>
          </div>
        )}
        <AddToCart
          product={p}
          className="btn btn-outline btn-block btn-sm pcard-buy"
        />
      </div>
      {quick && (
        <Modal title={p.name} close={() => setQuick(false)}>
          <Picture product={p} />
          <p className="price">{money(p.price)}</p>
          <p>{p.short}</p>
          <ShopLink href={dt.api.url(p)} className="btn btn-primary">
            Xem chi tiết
          </ShopLink>
        </Modal>
      )}
    </article>
  );
}
export function ProductGrid({
  products,
  flash = false,
  paginated = true,
  pageSize,
}: {
  products: Product[];
  flash?: boolean;
  paginated?: boolean;
  pageSize?: number;
}) {
  return products.length ? (
    paginated ? (
      <ProductResults
        key={products.map((p) => p.id).join(",")}
        products={products}
        flash={flash}
        pageSize={pageSize}
      />
    ) : (
      <div className="product-results">
        <div className="pgrid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} flash={flash} />
          ))}
        </div>
      </div>
    )
  ) : (
    <Empty title="Không tìm thấy sản phẩm phù hợp">
      <p>Thử thay đổi bộ lọc hoặc tìm kiếm khác.</p>
    </Empty>
  );
}
export const PRODUCTS_PER_PAGE = ITEMS_PER_PAGE;
// Trang danh mục / tìm kiếm: hiện đủ 20 sản phẩm mỗi trang, chọn trang ở cuối danh sách
export const LISTING_PER_PAGE = 20;
function ProductResults({
  products,
  flash,
  pageSize,
}: {
  products: Product[];
  flash: boolean;
  pageSize?: number;
}) {
  return (
    <div className="product-results">
      <PagedList
        items={products}
        className="pgrid"
        label="Sản phẩm"
        variant="arrow"
        pageSize={pageSize}
        renderItem={(p) => <ProductCard key={p.id} product={p} flash={flash} />}
      />
    </div>
  );
}
export function CategorySection({
  category: c,
}: {
  category: import("../types").Category;
}) {
  // Tab danh mục con (chọn trong Admin › Danh mục › Nhóm & mục menu); "" = tất cả sản phẩm của danh mục
  const tabs: { id: string; name: string }[] = dt.homeSubs ? dt.homeSubs(c) : [];
  const [tab, setTab] = useState("");
  const products = dt.api.list({ cat: c.id, sub: tab || undefined, sort: "category" }).items;
  // Ảnh quảng cáo cột đầu: chọn trong Admin › Danh mục › Ảnh quảng cáo trang chủ
  const promo = safeImage(c.promo_image);
  return (
    <section className="section section-box" data-block={c.id}>
      <div className="section-head">
        <h2>{c.name}</h2>
        {tabs.length > 0 && (
          <div className="sub-tabs" role="tablist" aria-label={`Nhóm sản phẩm ${c.name}`}>
            <button type="button" role="tab" aria-selected={tab === ""} className={tab === "" ? "active" : ""} onClick={() => setTab("")}>Nổi bật</button>
            {tabs.map((s) => (
              <button type="button" role="tab" key={s.id} aria-selected={tab === s.id} className={tab === s.id ? "active" : ""} onClick={() => setTab(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <ShopLink className="link" href={dt.api.catUrl(c.id, tab || undefined)}>
          Xem tất cả
          <Icon name="right" />
        </ShopLink>
      </div>
      {promo ? (
        <div className="block-body cat-promo-layout">
          <ShopLink
            className="cat-promo"
            href={c.promo_href || dt.api.catUrl(c.id)}
            aria-label={`${c.promo_title || c.name} - Xem ngay`}
          >
            <img src={promo} alt="" loading="lazy" />
            <span className="cat-promo-text">
              <b>{c.promo_title || c.name}</b>
              <em>Xem ngay</em>
            </span>
          </ShopLink>
          <ProductGrid key={tab} products={products} pageSize={4} />
        </div>
      ) : (
        <div className="block-body">
          <ProductGrid key={tab} products={products} />
        </div>
      )}
    </section>
  );
}
export function ProductSection({
  title,
  products,
  href,
}: {
  title: string;
  products: Product[];
  href?: string;
}) {
  return (
    <section className="section section-box">
      <div className="section-head">
        <h2>{title}</h2>
        {href && (
          <ShopLink className="link" href={href}>
            Xem tất cả
            <Icon name="right" />
          </ShopLink>
        )}
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
