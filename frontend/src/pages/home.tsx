import { useEffect, useRef, useState } from "react";
import { dt, money, safeImage } from "../services/runtime";
import { useShop } from "../hooks/useShop";
import {
  ContentCard,
  Icon,
  Media,
  Picture,
  ProjectCard,
  Rich,
  ShopLink,
  useMeta,
} from "../components/common";
import {
  CategorySection,
  ProductGrid,
  ProductSection,
} from "../components/products";
import { PagedList } from "../components/collections";
import { MegaMenu, uniqueCategories } from "../components/navigation";
import { TrustSection } from "../components/trust";
import type { Row, Product } from "../types";

// Như bản gốc: trang chủ chỉ hiện các nhóm hàng chính; nhóm khác xem ở menu Sản phẩm
const HOME_BLOCKS = [
  "may-lanh",
  "tu-lanh",
  "may-giat",
  "tu-dong-tu-mat",
  "vat-tu-dien-lanh",
];
function homeBlocks(categories: ReturnType<typeof uniqueCategories>) {
  const withProducts = categories.filter((c) =>
    dt.products.some((p) => p.cat === c.id),
  );
  const main = HOME_BLOCKS.map((id) =>
    withProducts.find((c) => c.id === id),
  ).filter(Boolean) as typeof categories;
  return main.length ? main : withProducts.slice(0, 5);
}

export function HomePage() {
  const state = useShop(),
    content = dt.siteContent(),
    categories = uniqueCategories();
  const [slide, setSlide] = useState(0),
    // Người dùng bật "giảm chuyển động" trong hệ điều hành: banner không tự chuyển
    [paused] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false),
    [now, setNow] = useState(Date.now());
  const touch = useRef<number | null>(null);
  const [midnight] = useState(() => {
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    return end.toISOString();
  });
  const seconds = Math.max(
    0,
    Math.floor(
      (new Date(content.flash.endsAt || midnight).getTime() - now) / 1000,
    ),
  );
  useMeta(`${dt.config.name} - Máy lạnh, tủ lạnh, máy giặt chính hãng`);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (dt.banners.length < 2 || paused || hovered || focused) return;
    const timer = setInterval(
      () => setSlide((i) => (i + 1) % dt.banners.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [paused, hovered, focused]);
  function go(offset: number) {
    setSlide((i) => (i + offset + dt.banners.length) % dt.banners.length);
  }
  const rich = (text: string) => (
    <Rich as="span" html={dt.siteText(text, { rich: true })} />
  );
  return (
    <div className="container react-home">
      <h1 className="hidden">
        {dt.config.name} - Máy lạnh, tủ lạnh, máy giặt chính hãng
      </h1>
      <section className="hero">
        <aside className="hero-side">
          <MegaMenu />
        </aside>
        <div
          className="slider"
          id="slider"
          role="region"
          aria-roledescription="trình chiếu"
          aria-label="Ưu đãi nổi bật"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
          }}
          onTouchStart={(e) => {
            touch.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (
              touch.current !== null &&
              Math.abs(e.changedTouches[0].clientX - touch.current) > 40
            )
              go(e.changedTouches[0].clientX < touch.current ? 1 : -1);
            touch.current = null;
          }}
        >
          {dt.banners.map((b, i) => (
            <div
              key={i}
              className={`slide ${slide === i ? "active" : ""}`}
              inert={slide !== i}
              aria-hidden={slide !== i}
            >
              <ShopLink
                href={b.href || "khuyen-mai.html"}
                aria-label={b.title || `Banner ${i + 1}`}
              >
                {b.image ? (
                  <Media src={b.image} alt={b.title || "Ưu đãi nổi bật"} />
                ) : (
                  <span className="slide-ph">
                    <Icon name="image" />
                    <b>{b.title || `Ưu đãi ${i + 1}`}</b>
                    <small>
                      {b.sub || "Thông tin ưu đãi sẽ được cập nhật tại đây."}
                    </small>
                  </span>
                )}
              </ShopLink>
            </div>
          ))}
          {dt.banners.length > 1 && (
            <>
              <button
                className="slider-nav prev"
                aria-label="Banner trước"
                onClick={() => go(-1)}
              >
                <Icon name="left" />
              </button>
              <button
                className="slider-nav next"
                aria-label="Banner sau"
                onClick={() => go(1)}
              >
                <Icon name="right" />
              </button>
              <div className="slider-dots">
                {dt.banners.map((_, i) => (
                  <button
                    key={i}
                    className={slide === i ? "active" : ""}
                    aria-label={`Banner ${i + 1}`}
                    aria-pressed={slide === i}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="hero-right">
          {content.mini
            .slice(0, 2)
            .filter((m: Row) => m.title)
            .map((m: Row, i: number) => (
              <ShopLink
                className={`mini-banner mb-${i + 1}${safeImage(m.image) ? " has-image" : ""}`}
                href={m.href || "#"}
                key={i}
              >
                {safeImage(m.image) ? (
                  <img className="mini-banner-bg" src={safeImage(m.image)} alt="" loading="eager" />
                ) : (
                  <Icon name={i ? "tool" : "zap"} />
                )}
                <b>{rich(m.title)}</b>
                <span>{rich(m.sub)}</span>
                {m.cta && <em>{m.cta}</em>}
              </ShopLink>
            ))}
          <div className="hero-user">
            <b>
              {state.user
                ? `Xin chào, ${state.user.name}!`
                : "Đăng nhập để nhận ưu đãi thành viên"}
            </b>
            <div className="btns">
              {state.user ? (
                <>
                  <ShopLink
                    className="btn btn-sm btn-outline"
                    href="tai-khoan.html#orders"
                  >
                    Đơn hàng
                  </ShopLink>
                  <ShopLink
                    className="btn btn-sm btn-primary"
                    href="yeu-thich.html"
                  >
                    Yêu thích
                  </ShopLink>
                </>
              ) : (
                <>
                  <ShopLink
                    className="btn btn-sm btn-primary"
                    href="tai-khoan.html"
                  >
                    Đăng nhập
                  </ShopLink>
                  <ShopLink
                    className="btn btn-sm btn-outline"
                    href="tai-khoan.html#register"
                  >
                    Đăng ký
                  </ShopLink>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section quick-category-section">
        <PagedList
          items={categories}
          className="quick-cats"
          label="Danh mục nhanh"
          renderItem={(c) => {
            const sample = dt.products.find(
              (p) => p.cat === c.id && dt.hasImage(p),
            );
            return (
              <ShopLink
                className="qcat quick-cat"
                href={dt.api.catUrl(c.id)}
                key={c.id}
              >
                <div
                  className={`qcat-img ${c.image || sample ? "" : "qcat-icon"}`}
                >
                  {c.image ? (
                    <Media src={c.image} alt={c.name} />
                  ) : sample ? (
                    <Picture product={sample} />
                  ) : (
                    <Icon name={c.icon || "box"} />
                  )}
                </div>
                <b>{c.short || c.name}</b>
              </ShopLink>
            );
          }}
        />
      </section>
      {seconds > 0 && (
        <section className="section flash" id="flash">
          <div className="flash-head">
            <h2>
              <Icon name="zap" />
              {rich(content.flash.title || "FLASH SALE")}
            </h2>
            <div
              className="countdown"
              aria-label="Thời gian khuyến mãi còn lại"
            >
              Kết thúc sau{" "}
              <b>{String(Math.floor(seconds / 3600)).padStart(2, "0")}</b>:
              <b>{String(Math.floor(seconds / 60) % 60).padStart(2, "0")}</b>:
              <b>{String(seconds % 60).padStart(2, "0")}</b>
            </div>
            <ShopLink className="link" href="khuyen-mai.html">
              Xem tất cả
              <Icon name="right" />
            </ShopLink>
          </div>
          <ProductGrid
            products={dt.api.list({ flash: true, sort: "discount" }).items}
            flash
          />
        </section>
      )}
      <div id="cat-sections">
        {homeBlocks(categories).map((c) => (
          <div className="react-home-products" key={c.id}>
            <CategorySection category={c} />
          </div>
        ))}
      </div>
      {dt.projects.length > 0 && (
        <section className="section section-box" id="home-projects">
          <div className="section-head">
            <h2>Dự án tiêu biểu</h2>
            <ShopLink className="link" href="du-an.html">
              Xem tất cả
              <Icon name="right" />
            </ShopLink>
          </div>
          <PagedList
            items={[...dt.projects]
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 3)}
            className="pj-grid"
            label="Dự án"
            renderItem={(p) => <ProjectCard project={p} key={p.slug} />}
          />
        </section>
      )}
      <TrustSection />
      <section className="section section-box">
        <div className="section-head">
          <h2>Dịch vụ điện lạnh</h2>
          <ShopLink className="link" href="dich-vu.html">
            Xem tất cả
            <Icon name="right" />
          </ShopLink>
        </div>
        <PagedList
          items={dt.services.slice(0, 3)}
          className="svc-grid"
          label="Dịch vụ"
          renderItem={(s) => (
            <ShopLink className="svc" href={`dich-vu.html#${s.id}`} key={s.id}>
              <span className="svc-ic">
                <Icon name={s.icon || "tool"} />
              </span>
              <div>
                <h3>{s.name}</h3>
                <p>{s.desc || s.description}</p>
                <span className="price">
                  {s.price
                    ? `Chỉ từ ${money(s.price)}`
                    : "Báo giá theo hợp đồng"}
                </span>
              </div>
            </ShopLink>
          )}
        />
      </section>
      {state.viewed.length > 0 && (
        <ProductSection
          title="Sản phẩm đã xem gần đây"
          products={
            state.viewed
              .map((id) => dt.api.productById(id))
              .filter(Boolean) as Product[]
          }
        />
      )}
      <section className="section">
        <div className="section-head">
          <h2>Tin tức - Tư vấn</h2>
          <ShopLink className="link" href="tin-tuc.html">
            Xem tất cả
            <Icon name="right" />
          </ShopLink>
        </div>
        <PagedList
          items={dt.posts.slice(0, 3)}
          className="news-grid"
          label="Tin tức"
          renderItem={(p) => (
            <ContentCard
              key={p.slug}
              href={dt.api.postUrl(p.slug)}
              title={p.title}
              excerpt={p.excerpt}
              image={p.image || p.cover}
              meta={dt.u.date(p.date)}
            />
          )}
        />
      </section>
    </div>
  );
}
