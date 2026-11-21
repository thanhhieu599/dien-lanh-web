import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { dt, safeImage } from "../services/runtime";
import { ShopLink, Icon } from "../components/common";
import "../../assets/css/vision.css";
function VisionImage({
  name,
  alt,
  hint,
  size,
}: {
  name: string;
  alt: string;
  hint: string;
  size: string;
}) {
  const images = dt.visionImages();
  const local = (dt.visionFiles || []).find(
    (file: string) => file.replace(/\.\w+$/, "") === name,
  );
  const source =
    images[name] || (local ? "assets/images/cong-ty/" + local : "");
  const [failed, setFailed] = useState("");
  return source && failed !== source ? (
    <img
      style={{ opacity: 1 }}
      src={safeImage(source)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(source)}
    />
  ) : (
    <div className="vm-ph">
      <Icon name="image" />
      <b>{hint}</b>
      <span>{size}</span>
    </div>
  );
}
export function CompanyPage({ trust }: { trust: ReactNode }) {
  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Giới thiệu {dt.config.name}</h1>
          <p>
            Mát lạnh chính hãng - Lắp đặt tận tâm. Đồng hành cùng hàng nghìn gia
            đình và doanh nghiệp trong giải pháp điện lạnh tiết kiệm, bền bỉ.
          </p>
          <p style={{ marginTop: "16px" } as CSSProperties}>
            <ShopLink className="btn btn-light" href="tam-nhin-su-menh.html">
              Tầm nhìn &amp; Sứ mệnh →
            </ShopLink>
          </p>
        </div>
      </section>
      <div className="container">
        <div className="about-grid">
          <div className="about-stat">
            <b>10+</b>Năm kinh nghiệm
          </div>
          <div className="about-stat">
            <b>50.000+</b>Khách hàng
          </div>
          <div className="about-stat">
            <b>500+</b>Dự án doanh nghiệp
          </div>
          <div className="about-stat">
            <b>5</b>Showroom
          </div>
        </div>
        <section className="section-box rich">
          <h2>Câu chuyện của chúng tôi</h2>
          <p>
            {dt.config.name} là thương hiệu bán lẻ và dự án thuộc {dt.config.company},
            chuyên cung cấp máy lạnh, tủ lạnh, máy giặt, tủ đông, thiết bị và
            vật tư điện lạnh chính hãng.
          </p>
          <p>
            Chúng tôi tin rằng một thiết bị điện lạnh tốt chỉ phát huy hiệu quả
            khi được <strong>chọn đúng công suất</strong> và{" "}
            <strong>lắp đặt đúng kỹ thuật</strong>. Vì vậy, mỗi đơn hàng tại Tên
            thương hiệu đều được tư vấn bởi kỹ thuật viên và lắp đặt theo tiêu
            chuẩn của hãng.
          </p>
        </section>
        <section className="section">
          <div className="section-head">
            <h2>Giá trị cốt lõi</h2>
          </div>
          <div className="value-grid">
            <div className="value">
              <b>Chính hãng</b>
              <p className="muted">
                100% sản phẩm có nguồn gốc rõ ràng, hóa đơn VAT, bảo hành chính
                hãng.
              </p>
            </div>
            <div className="value">
              <b>Tận tâm</b>
              <p className="muted">
                Tư vấn đúng nhu cầu, không bán thừa công suất, hỗ trợ trọn vòng
                đời sản phẩm.
              </p>
            </div>
            <div className="value">
              <b>Chuyên nghiệp</b>
              <p className="muted">
                Đội ngũ kỹ thuật được đào tạo bài bản, quy trình thi công an
                toàn, sạch sẽ.
              </p>
            </div>
          </div>
        </section>
        {trust}
        <section className="section section-box about-links">
          <ShopLink className="btn btn-light" href="du-an.html">
            Xem dự án tiêu biểu →
          </ShopLink>{" "}
          <ShopLink className="btn btn-light" href="hoi-dap.html">
            Hỏi đáp thường gặp →
          </ShopLink>
        </section>
        <section
          className="section section-box"
          style={{ textAlign: "center" } as CSSProperties}
        >
          <h2>Bạn cần tư vấn giải pháp điện lạnh?</h2>
          <p className="muted">
            Liên hệ ngay để được kỹ thuật viên tư vấn miễn phí.
          </p>
          <ShopLink className="btn btn-primary btn-lg" href="lien-he.html">
            Liên hệ với chúng tôi
          </ShopLink>
        </section>
      </div>
    </div>
  );
}
// Hiệu ứng trang Tầm nhìn (như bản gốc): hiện dần khi cuộn, đếm số, ánh sáng theo chuột, ảnh hero nghiêng nhẹ
function useVisionMotion() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = [...page.querySelectorAll<HTMLElement>(".reveal")];
    const counters = [...page.querySelectorAll<HTMLElement>("[data-count]")];
    const frames: number[] = [];
    const cleanups: (() => void)[] = [];
    const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");
    const count = (el: HTMLElement) => {
      const to = Number(el.dataset.count),
        suffix = el.dataset.suffix || "";
      if (reduce) {
        el.textContent = fmt(to) + suffix;
        return;
      }
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600);
        el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))) + suffix;
        if (k < 1) frames.push(requestAnimationFrame(step));
      };
      frames.push(requestAnimationFrame(step));
    };
    if (reduce || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("in"));
      counters.forEach(count);
    } else {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          }),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      reveals.forEach((el, i) => {
        el.style.setProperty("--d", `${(i % 4) * 90}ms`);
        io.observe(el);
      });
      const co = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              count(e.target as HTMLElement);
              co.unobserve(e.target);
            }
          }),
        { threshold: 0.6 },
      );
      counters.forEach((el) => co.observe(el));
      cleanups.push(() => {
        io.disconnect();
        co.disconnect();
      });
    }
    if (!reduce && matchMedia("(hover: hover)").matches) {
      const glow = (e: PointerEvent) => {
        const card = e.currentTarget as HTMLElement;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      };
      page
        .querySelectorAll<HTMLElement>(".vm-card,.vm-tile")
        .forEach((card) => {
          card.addEventListener("pointermove", glow);
          cleanups.push(() => card.removeEventListener("pointermove", glow));
        });
      const hero = page.querySelector<HTMLElement>(".vm-hero"),
        media = page.querySelector<HTMLElement>(".vm-hero-media");
      if (hero && media) {
        const tilt = (e: PointerEvent) => {
          const r = hero.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5,
            y = (e.clientY - r.top) / r.height - 0.5;
          media.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
        };
        const reset = () => {
          media.style.transform = "";
        };
        hero.addEventListener("pointermove", tilt);
        hero.addEventListener("pointerleave", reset);
        cleanups.push(() => {
          hero.removeEventListener("pointermove", tilt);
          hero.removeEventListener("pointerleave", reset);
        });
      }
    }
    // Thanh tiến trình hành trình cho trình duyệt chưa hỗ trợ scroll-driven animations
    const timeline = page.querySelector<HTMLElement>(".vm-timeline");
    if (timeline && !CSS.supports("animation-timeline: view()")) {
      const update = () => {
        const r = timeline.getBoundingClientRect();
        timeline.style.setProperty(
          "--p",
          Math.min(
            1,
            Math.max(0, (innerHeight * 0.7 - r.top) / r.height),
          ).toFixed(3),
        );
      };
      addEventListener("scroll", update, { passive: true });
      update();
      cleanups.push(() => removeEventListener("scroll", update));
    }
    return () => {
      frames.forEach(cancelAnimationFrame);
      cleanups.forEach((f) => f());
    };
  }, []);
  return root;
}
// Chữ thường từ quản trị (thay {ten}, {cong_ty}, bỏ dấu *): React tự chống mã độc nên giải mã lại ký tự HTML
const ENT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const t = (s: unknown) => String(dt.siteText(String(s ?? ""))).replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENT[m]);
// Chữ có định dạng từ quản trị: *chữ* = tô màu (tiêu đề) hoặc in đậm (đoạn văn); {ten}, {cong_ty} = tên cửa hàng / công ty
function vtext(s: unknown, mark: "grad" | "bold" = "grad") {
  const html = dt
    .siteText(String(s ?? ""), { rich: true })
    .replace(/<span>/g, mark === "grad" ? '<span class="vm-grad">' : "<b>")
    .replace(/<\/span>/g, mark === "grad" ? "</span>" : "</b>");
  return { __html: DOMPurify.sanitize(html) };
}
// Số liệu "50.000+" / "98%": đếm số khi cuộn tới (phần số + phần đuôi); chữ không phải số thì hiện nguyên
function Count({ value }: { value: unknown }) {
  const text = String(value ?? "").trim();
  const m = text.match(/^(\d[\d.,]*)(.*)$/);
  const n = m ? Number(m[1].replace(/[.,]/g, "")) : NaN;
  if (!m || !Number.isFinite(n)) return <b>{text}</b>;
  return (
    <b data-count={n} data-suffix={m[2]}>
      {n.toLocaleString("vi-VN")}
      {m[2]}
    </b>
  );
}
const MISSION_ICONS = [
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>,
  <svg width="18" height="18" viewBox="0 0 24 24">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
  </svg>,
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>,
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
  </svg>,
];
// Ô giá trị cốt lõi: ô 1 lớn có ảnh, các ô sau xen kẽ màu như bản gốc
const TILE_CLASS = ["vm-tile vm-tile-big", "vm-tile", "vm-tile vm-tile-accent", "vm-tile vm-tile-accent2", "vm-tile"];
const two = (i: number) => String(i + 1).padStart(2, "0");
export function VisionPage({ trust }: { trust: ReactNode }) {
  const root = useVisionMotion();
  const c = dt.visionContent();
  const { hero, vision, mission, values, journey, gallery, leader, final } = c;
  const marquee: string[] = (c.marquee || []).map(String).filter(Boolean);
  return (
    <div className="vm" ref={root}>
      <section className="vm-hero">
        <div className="vm-aurora" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div className="vm-grid-bg" aria-hidden="true"></div>
        <div className="container vm-hero-in">
          <div className="vm-hero-text">
            <span className="vm-eyebrow">
              <span className="dot"></span>
              {t(hero.kicker)}
            </span>
            <h1 dangerouslySetInnerHTML={vtext(hero.title)} />
            <p className="vm-lead" dangerouslySetInnerHTML={vtext(hero.lead, "bold")} />
            <div className="vm-cta">
              {hero.btn && (
                <ShopLink className="vm-btn vm-btn-primary" href="#tam-nhin">
                  {t(hero.btn)}{" "}
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </ShopLink>
              )}
              {hero.btn2 && (
                <ShopLink className="vm-btn vm-btn-ghost" href={hero.btn2Href || "bao-gia-du-an.html"}>
                  {t(hero.btn2)}
                </ShopLink>
              )}
            </div>
          </div>
          <div className="vm-hero-media">
            <figure className="vm-media vm-media-hero" style={{ "--ratio": "4 / 5" } as CSSProperties}>
              <VisionImage name="hero" alt="Toàn cảnh trụ sở công ty" hint="Ảnh trụ sở / toàn cảnh công ty" size="1200 × 1500 px (dọc)" />
            </figure>
            {(hero.floats || []).slice(0, 2).map((f: any, i: number) => (
              <div className={`vm-float ${i ? "vm-float-b" : "vm-float-a"}`} key={i}>
                <Count value={f.value} />
                <span>{t(f.label)}</span>
              </div>
            ))}
          </div>
        </div>
        <ShopLink className="vm-scroll" href="#tam-nhin" aria-label="Cuộn xuống">
          <span></span>
        </ShopLink>
      </section>

      {marquee.length > 0 && (
        <div className="vm-marquee" aria-hidden="true">
          <div className="vm-marquee-track">
            {[...marquee, ...marquee].map((m, i) => (
              <span key={i}>{t(m)}</span>
            ))}
          </div>
        </div>
      )}

      <section className="vm-sec" id="tam-nhin">
        <div className="container vm-split">
          <div className="vm-split-media reveal">
            <figure className="vm-media" style={{ "--ratio": "4 / 5" } as CSSProperties}>
              <VisionImage name="tam-nhin" alt="Công trình tiêu biểu" hint="Ảnh công trình / dự án tiêu biểu" size="1200 × 1500 px (dọc)" />
            </figure>
            <figure className="vm-media vm-media-inset" style={{ "--ratio": "1 / 1" } as CSSProperties}>
              <VisionImage name="doi-ngu" alt="Đội ngũ kỹ thuật" hint="Ảnh đội ngũ kỹ thuật" size="800 × 800 px" />
            </figure>
          </div>
          <div className="vm-split-text">
            <span className="vm-kicker reveal">{t(vision.kicker)}</span>
            <h2 className="vm-h2 reveal" dangerouslySetInnerHTML={vtext(vision.title)} />
            {vision.quote && <blockquote className="vm-quote reveal">“{t(vision.quote)}”</blockquote>}
            <ul className="vm-goals">
              {(vision.goals || []).map((g: any, i: number) => (
                <li className="reveal" key={i}>
                  <b>{two(i)}</b>
                  <div>
                    <h3>{t(g.title)}</h3>
                    <p>{t(g.text)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="vm-sec vm-sec-dark" id="su-menh">
        <div className="vm-aurora vm-aurora-soft" aria-hidden="true">
          <i></i>
          <i></i>
        </div>
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">{t(mission.kicker)}</span>
            <h2 className="vm-h2" dangerouslySetInnerHTML={vtext(mission.title)} />
          </div>
          <div className="vm-missions">
            {(mission.cards || []).map((m: any, i: number) => (
              <article className="vm-card reveal" key={i}>
                <div className="vm-card-ic">{MISSION_ICONS[i % MISSION_ICONS.length]}</div>
                {m.tag && <span className="vm-card-tag">{t(m.tag)}</span>}
                <h3>{t(m.title)}</h3>
                <p>{t(m.text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {(c.stats || []).length > 0 && (
        <section className="vm-stats">
          <div className="container vm-stats-in">
            {c.stats.map((st: any, i: number) => (
              <div className="vm-stat reveal" key={i}>
                <Count value={st.value} />
                <span>{t(st.label)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="vm-sec" id="gia-tri">
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">{t(values.kicker)}</span>
            <h2 className="vm-h2" dangerouslySetInnerHTML={vtext(values.title)} />
          </div>
          <div className="vm-bento">
            {(values.core || []).map((v: any, i: number) =>
              i === 0 ? (
                <div className="vm-tile vm-tile-big reveal" key={i}>
                  <figure className="vm-media vm-media-fill">
                    <VisionImage name="gia-tri" alt="Hoạt động của công ty" hint="Ảnh hoạt động / văn hóa công ty" size="1600 × 1000 px (ngang)" />
                  </figure>
                  <div className="vm-tile-over">
                    <span className="vm-num">{two(i)}</span>
                    <h3>{t(v.title)}</h3>
                    <p>{t(v.text)}</p>
                  </div>
                </div>
              ) : (
                <div className={`${TILE_CLASS[i % TILE_CLASS.length] || "vm-tile"} reveal`} key={i}>
                  <span className="vm-num">{two(i)}</span>
                  <h3>{t(v.title)}</h3>
                  <p>{t(v.text)}</p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="vm-sec vm-sec-soft" id="hanh-trinh">
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">{t(journey.kicker)}</span>
            <h2 className="vm-h2" dangerouslySetInnerHTML={vtext(journey.title)} />
          </div>
          <ol className="vm-timeline">
            {(journey.milestones || []).map((m: any, i: number) => (
              <li className={`reveal${m.goal ? " is-goal" : ""}`} key={i}>
                <span className="vm-year">{t(m.year)}</span>
                <div>
                  <h3>{t(m.title)}</h3>
                  <p>{t(m.text)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="vm-sec" id="hinh-anh">
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">{t(gallery.kicker)}</span>
            <h2 className="vm-h2" dangerouslySetInnerHTML={vtext(gallery.title)} />
          </div>
          <div className="vm-gallery">
            <figure className="vm-media g1 reveal">
              <VisionImage name="anh-1" alt="Showroom" hint="Ảnh showroom" size="1600 × 1000 px" />
            </figure>
            <figure className="vm-media g2 reveal">
              <VisionImage name="anh-2" alt="Thi công công trình" hint="Ảnh thi công công trình" size="800 × 1000 px" />
            </figure>
            <figure className="vm-media g3 reveal">
              <VisionImage name="anh-3" alt="Đào tạo kỹ thuật" hint="Ảnh đào tạo kỹ thuật" size="800 × 800 px" />
            </figure>
            <figure className="vm-media g4 reveal">
              <VisionImage name="anh-4" alt="Ký kết hợp tác" hint="Ảnh ký kết hợp tác" size="800 × 800 px" />
            </figure>
            <figure className="vm-media g5 reveal">
              <VisionImage name="anh-5" alt="Hoạt động cộng đồng" hint="Ảnh hoạt động cộng đồng" size="1600 × 800 px" />
            </figure>
          </div>
        </div>
      </section>

      <section className="vm-sec vm-sec-dark vm-leader">
        <div className="vm-aurora vm-aurora-soft" aria-hidden="true">
          <i></i>
          <i></i>
        </div>
        <div className="container vm-leader-in">
          <figure className="vm-media vm-media-portrait reveal" style={{ "--ratio": "3 / 4" } as CSSProperties}>
            <VisionImage
              name="lanh-dao"
              alt={leader.director ? `Chân dung ${leader.director}` : "Chân dung lãnh đạo"}
              hint="Ảnh chân dung Giám đốc"
              size="900 × 1200 px (dọc)"
            />
          </figure>
          <div className="reveal">
            <span className="vm-kicker">{t(leader.kicker)}</span>
            <p className="vm-letter">“{t(leader.message)}”</p>
            <div className="vm-sign">
              <b>{t(leader.director) || "Họ và tên lãnh đạo"}</b>
              <span>{t(leader.position)}</span>
            </div>
          </div>
        </div>
      </section>

      {trust}

      <section className="vm-sec">
        <div className="container">
          <div className="vm-final reveal">
            <h2 dangerouslySetInnerHTML={vtext(final.title)} />
            <p>{t(final.text)}</p>
            <div className="vm-cta">
              {final.btn && (
                <ShopLink className="vm-btn vm-btn-primary" href={final.btnHref || "bao-gia-du-an.html"}>
                  {t(final.btn)}
                </ShopLink>
              )}
              {final.btn2 && (
                <ShopLink className="vm-btn vm-btn-ghost-dark" href={final.btn2Href || "lien-he.html"}>
                  {t(final.btn2)}
                </ShopLink>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
