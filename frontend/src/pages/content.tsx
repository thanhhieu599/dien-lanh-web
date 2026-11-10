import { useState } from "react";
import { dt, safeImage } from "../services/runtime";
import {
  Empty,
  Icon,
  Media,
  ProjectCard,
  Rich,
  ShopLink,
  useJsonLd,
  useMeta,
} from "../components/common";
import { PagedList } from "../components/collections";
import { ProductSection } from "../components/products";
import type { Row } from "../types";
import { TrustSection } from "../components/trust";
export { TrustSection } from "../components/trust";
import { CompanyPage, VisionPage } from "./company";
export { LeadForm } from "../components/lead-form";
export { ContactPage, QuotePage, ServicesPage, StoresPage } from "./info";
export function PolicyPage({ type }: { type: string }) {
  const policy =
    dt.policies[type] ||
    dt.policies["bao-hanh"] ||
    (Object.values(dt.policies)[0] as Row);
  useMeta(policy?.title || "Chính sách");
  return (
    <div className="container">
      <h1>{policy?.title || "Chính sách"}</h1>
      <div className="policy-layout">
        <PagedList
          items={Object.entries(dt.policies)}
          initialIndex={Math.max(0, Object.keys(dt.policies).indexOf(type))}
          className="policy-nav"
          label="Chính sách"
          renderItem={([key, p]: any) => (
            <ShopLink key={key} href={dt.api.policyUrl(key)}>
              {p.title}
            </ShopLink>
          )}
        />
        <article className="article">
          <Rich className="rich" html={policy?.body} />
        </article>
      </div>
    </div>
  );
}
export function AboutPage({ vision = false }: { vision?: boolean }) {
  useMeta(vision ? "Tầm nhìn & Sứ mệnh" : "Giới thiệu công ty");
  return vision ? (
    <VisionPage trust={<TrustSection />} />
  ) : (
    <CompanyPage trust={<TrustSection />} />
  );
}
export function BrandsPage({ id }: { id?: string }) {
  const brand = id
    ? dt.brands.find((b) => b.id === id || b.slug === id)
    : undefined;
  useMeta(brand ? `Thương hiệu ${brand.name}` : "Thương hiệu");
  return (
    <div className="container">
      <h1>{brand ? brand.name : "Thương hiệu"}</h1>
      {!brand ? (
        <div className="brand-wall">
          {dt.brands.map((b) => (
            <ShopLink
              className="brand-card"
              href={dt.api.brandUrl(b.id)}
              key={b.id}
              aria-label={`Sản phẩm thương hiệu ${b.name}`}
            >
              <span className="brand-card-logo">
                {b.logo ? (
                  <img src={safeImage(b.logo)} alt="" loading="lazy" />
                ) : (
                  <b>{b.name}</b>
                )}
              </span>
              <span className="brand-card-name">{b.name}</span>
            </ShopLink>
          ))}
        </div>
      ) : (
        <>
          {brand.logo && (
            <img
              className="react-brand-logo"
              src={safeImage(brand.logo)}
              alt={brand.name}
            />
          )}
          <p>{brand.origin}</p>
          {dt.categories
            .filter((c) =>
              dt.products.some((p) => p.brand === brand.id && p.cat === c.id),
            )
            .map((c) => (
              <ProductSection
                key={c.id}
                title={c.name}
                href={`${dt.api.catUrl(c.id)}${dt.api.catUrl(c.id).includes("?") ? "&" : "?"}brand=${brand.id}`}
                products={dt.products.filter(
                  (p) => p.brand === brand.id && p.cat === c.id,
                )}
              />
            ))}
          {!dt.products.some((p) => p.brand === brand.id) && (
            <Empty title="Thương hiệu chưa có sản phẩm" />
          )}
        </>
      )}
    </div>
  );
}
export function BlogPage({ slug }: { slug?: string }) {
  const [category, setCategory] = useState("");
  const post = slug ? dt.posts.find((p) => p.slug === slug) : undefined;
  useMeta(post?.title || "Tin tức - Tư vấn", post?.excerpt || "");
  useJsonLd(
    post ? "Article" : "ItemList",
    post
      ? {
          headline: post.title,
          datePublished: post.date,
          author: { "@type": "Person", name: post.author || dt.config.name },
        }
      : {
          itemListElement: dt.posts.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: dt.u.abs(dt.api.postUrl(p.slug)),
            name: p.title,
          })),
        },
  );
  if (slug && !post)
    return <Empty heading={1} title="Bài viết không tồn tại" />;
  return (
    <>
      {!post && (
        <section className="page-banner">
          <div className="container">
            <h1>Tin tức - Tư vấn</h1>
            <p>
              Kinh nghiệm chọn mua, sử dụng tiết kiệm điện và bảo dưỡng thiết bị
              điện lạnh từ đội ngũ kỹ thuật của chúng tôi.
            </p>
          </div>
        </section>
      )}
      <div className="container">
        <div className="blog-layout">
          <div>
            {post ? (
              <article className="article">
                <h1>{post.title}</h1>
                <p className="article-meta">
                  {post.author || dt.config.name} • {dt.u.date(post.date)}
                </p>
                <p className="article-lead">{post.excerpt}</p>
                {(post.image || post.cover) && (
                  <div className="article-cover">
                    <Media src={post.image || post.cover} alt={post.title} />
                  </div>
                )}
                <Rich html={post.content} className="rich" />
                <ShopLink className="link" href="tin-tuc.html">
                  ← Tất cả bài viết
                </ShopLink>
              </article>
            ) : (
              <PagedList
                items={dt.posts.filter((p) => !category || p.cat === category)}
                className="blog-list"
                label="Bài viết"
                renderItem={(p) => (
                  <article className="blog-item" key={p.slug}>
                    <ShopLink
                      className="blog-img"
                      href={dt.api.postUrl(p.slug)}
                    >
                      <Media src={p.image || p.cover} alt={p.title} />
                    </ShopLink>
                    <div>
                      <span className="news-meta">
                        {p.cat} • {dt.u.date(p.date)}
                      </span>
                      <h2>
                        <ShopLink href={dt.api.postUrl(p.slug)}>
                          {p.title}
                        </ShopLink>
                      </h2>
                      <p>{p.excerpt}</p>
                      <ShopLink className="link" href={dt.api.postUrl(p.slug)}>
                        Đọc tiếp →
                      </ShopLink>
                    </div>
                  </article>
                )}
              />
            )}
          </div>
          <aside className="blog-aside">
            <section className="aside-box">
              <h3>Chuyên mục</h3>
              <div className="blog-categories">
                <button
                  className={!category ? "active" : ""}
                  onClick={() => setCategory("")}
                >
                  Tất cả bài viết
                </button>
                {[...new Set(dt.posts.map((p) => p.cat))].map((cat) => (
                  <button
                    className={category === cat ? "active" : ""}
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      if (post) location.href = dt.u.abs("tin-tuc.html");
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>
            <section className="aside-box">
              <h3>Cần tư vấn thiết bị?</h3>
              <p>Chúng tôi hỗ trợ chọn sản phẩm phù hợp với nhu cầu của bạn.</p>
              <a
                className="btn btn-primary btn-block"
                href={`tel:${dt.u.tel(dt.config.hotline)}`}
              >
                <Icon name="phone" />
                {dt.config.hotline}
              </a>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
export function FaqPage() {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  useMeta("Hỏi đáp thường gặp");
  const faqs = dt.faqs.filter(
    (f) =>
      (!category || f.category === category) &&
      dt.u
        .norm(`${f.question} ${f.answer.replace(/<[^>]+>/g, "")}`)
        .includes(dt.u.norm(query)),
  );
  useJsonLd("FAQPage", {
    mainEntity: dt.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer.replace(/<[^>]+>/g, ""),
      },
    })),
  });
  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Hỏi đáp về máy lạnh & điện lạnh</h1>
          <p>
            Câu trả lời cho những thắc mắc thường gặp – từ chọn mua, lắp đặt đến
            sử dụng tiết kiệm điện và bảo trì.
          </p>
          <form
            className="faq-search"
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="search"
              aria-label="Tìm câu hỏi"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập câu hỏi, ví dụ: gas R32, 1 HP bao nhiêu m²…"
            />
          </form>
        </div>
      </section>
      <div className="container">
        <div className="faq-layout">
          <nav className="faq-cats" aria-label="Nhóm câu hỏi">
            <button
              className={`faq-cat ${!category ? "active" : ""}`}
              onClick={() => setCategory("")}
            >
              Tất cả <em>{dt.faqs.length}</em>
            </button>
            {[...new Set(dt.faqs.map((f) => f.category))].map((c) => (
              <button
                className={`faq-cat ${category === c ? "active" : ""}`}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
                <em>{dt.faqs.filter((f) => f.category === c).length}</em>
              </button>
            ))}
          </nav>
          <div>
            <section className="faq-group">
              <h2>
                {query
                  ? `Kết quả cho “${query}”`
                  : category || "Câu hỏi thường gặp"}
              </h2>
              <PagedList
                items={faqs}
                initialIndex={Math.max(
                  0,
                  faqs.findIndex((f) => location.hash === "#q-" + f.id),
                )}
                className="faq"
                label="Câu hỏi thường gặp"
                renderItem={(f) => (
                  <details
                    id={`q-${f.id}`}
                    key={f.id}
                    open={location.hash === `#q-${f.id}`}
                  >
                    <summary>{f.question}</summary>
                    <Rich html={f.answer} className="faq-a rich" />
                    <ShopLink className="faq-permalink" href={`#q-${f.id}`}>
                      Liên kết câu hỏi
                    </ShopLink>
                  </details>
                )}
              />
              {!faqs.length && <p>Không tìm thấy câu hỏi phù hợp.</p>}
            </section>
            <section className="section-box faq-ask">
              <div>
                <h2>Chưa tìm thấy câu trả lời?</h2>
                <p className="muted">
                  Chuyên viên kỹ thuật sẽ giải đáp qua điện thoại hoặc Zalo.
                </p>
              </div>
              <div className="faq-ask-btns">
                <ShopLink className="btn btn-primary" href="lien-he.html">
                  Hỏi chuyên viên
                </ShopLink>
                <a
                  className="btn btn-light"
                  href={`tel:${dt.u.tel(dt.config.hotline)}`}
                >
                  Gọi {dt.config.hotline}
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
export function ProjectsPage({ slug }: { slug?: string }) {
  const [industry, setIndustry] = useState(""),
    [position, setPosition] = useState(50);
  const project = slug ? dt.projects.find((p) => p.slug === slug) : undefined;
  useMeta(project?.title || "Dự án tiêu biểu", project?.summary || "");
  useJsonLd(
    project ? "Article" : "ItemList",
    project
      ? { headline: project.title, description: project.summary }
      : {
          itemListElement: dt.projects.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.title,
            url: dt.u.abs(`du-an-chi-tiet.html?slug=${p.slug}`),
          })),
        },
  );
  if (slug && !project)
    return <Empty heading={1} title="Dự án không tồn tại" />;
  return (
    <>
      {!project && (
        <section className="page-banner">
          <div className="container">
            <h1>Dự án tiêu biểu</h1>
            <p>
              Giải pháp điều hòa, điện lạnh cho văn phòng, nhà xưởng và công
              trình dân dụng.
            </p>
          </div>
        </section>
      )}
      <div className="container">
        {project ? (
          <article className="pj-detail">
            <header className="pj-head">
              <p className="pj-ind">
                {project.industry} {project.year && `• ${project.year}`}
              </p>
              <h1>{project.title}</h1>
              <p className="pj-lead">{project.summary}</p>
            </header>
            <div className="pj-layout">
              <div>
                {project.beforeImage && project.afterImage ? (
                  <div className="react-before-after ba">
                    <img
                      src={safeImage(project.afterImage)}
                      alt="Sau thi công"
                    />
                    <img
                      src={safeImage(project.beforeImage)}
                      alt="Trước thi công"
                      style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={position}
                      onChange={(e) => setPosition(Number(e.target.value))}
                      aria-label="So sánh trước và sau"
                    />
                  </div>
                ) : (
                  <div className="pj-cover">
                    <Media
                      src={project.afterImage || project.beforeImage}
                      alt={project.title}
                      placeholder="Ảnh công trình"
                    />
                  </div>
                )}
                <div className="pj-content">
                  <Rich html={project.content} className="rich" />
                </div>
                {project.testimonial && (
                  <figure className="pj-quote">
                    <blockquote>{project.testimonial}</blockquote>
                    <figcaption>
                      <b>{project.testimonialName || project.client}</b>
                      <small>{project.testimonialRole}</small>
                    </figcaption>
                  </figure>
                )}
              </div>
              <aside className="pj-aside">
                <section className="section-box pj-facts-box">
                  <h2>Thông tin dự án</h2>
                  <dl>
                    {[
                      ["Khách hàng", project.client],
                      ["Lĩnh vực", project.industry],
                      ["Địa điểm", project.location],
                      ["Thời gian", project.duration],
                      ["Quy mô", project.units],
                      ["Công suất", project.capacity],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                </section>
                <section className="section-box pj-cta">
                  <h3>Bạn có công trình tương tự?</h3>
                  <p>Nhận tư vấn và báo giá giải pháp phù hợp.</p>
                  <ShopLink
                    className="btn btn-primary"
                    href="bao-gia-du-an.html"
                  >
                    Yêu cầu báo giá dự án
                  </ShopLink>
                </section>
              </aside>
            </div>
          </article>
        ) : (
          <>
            <div className="tabs">
              <button
                className={`tab ${!industry ? "active" : ""}`}
                onClick={() => setIndustry("")}
              >
                Tất cả
              </button>
              {[...new Set(dt.projects.map((p) => p.industry))].map((i) => (
                <button
                  className={`tab ${industry === i ? "active" : ""}`}
                  key={i}
                  onClick={() => setIndustry(i)}
                >
                  {i}
                </button>
              ))}
            </div>
            <PagedList
              items={dt.projects.filter(
                (p) => !industry || p.industry === industry,
              )}
              className="pj-grid"
              label="Dự án"
              renderItem={(p) => <ProjectCard project={p} key={p.slug} />}
            />
          </>
        )}
        <TrustSection />
      </div>
    </>
  );
}
