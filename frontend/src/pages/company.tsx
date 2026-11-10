import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
export function VisionPage({ trust }: { trust: ReactNode }) {
  const root = useVisionMotion();
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
              <span className="dot"></span>Tầm nhìn &amp; Sứ mệnh
            </span>
            <h1>
              Kiến tạo <span className="vm-grad">không gian mát lành</span>, bền
              vững cho mọi công trình Việt
            </h1>
            <p className="vm-lead">
              {dt.config.name} không chỉ bán thiết bị điện lạnh. Chúng tôi mang
              đến giải pháp làm mát{" "}
              <b>đúng công suất – tiết kiệm năng lượng – vận hành bền bỉ</b> cho
              gia đình, nhà xưởng và doanh nghiệp.
            </p>
            <div className="vm-cta">
              <ShopLink className="vm-btn vm-btn-primary" href="#tam-nhin">
                Khám phá tầm nhìn{" "}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </ShopLink>
              <ShopLink
                className="vm-btn vm-btn-ghost"
                href="bao-gia-du-an.html"
              >
                Hợp tác cùng chúng tôi
              </ShopLink>
            </div>
          </div>
          <div className="vm-hero-media">
            <figure
              className="vm-media vm-media-hero"
              style={{ "--ratio": "4 / 5" } as CSSProperties}
            >
              <VisionImage
                name="hero"
                alt="Toàn cảnh trụ sở công ty"
                hint="Ảnh trụ sở / toàn cảnh công ty"
                size="1200 × 1500 px (dọc)"
              />
            </figure>
            <div className="vm-float vm-float-a">
              <b data-count="10" data-suffix="+">
                {(10).toLocaleString("vi-VN")}+
              </b>
              <span>Năm kinh nghiệm</span>
            </div>
            <div className="vm-float vm-float-b">
              <b data-count="500" data-suffix="+">
                {(500).toLocaleString("vi-VN")}+
              </b>
              <span>Dự án doanh nghiệp</span>
            </div>
          </div>
        </div>
        <ShopLink
          className="vm-scroll"
          href="#tam-nhin"
          aria-label="Cuộn xuống"
        >
          <span></span>
        </ShopLink>
      </section>

      <div className="vm-marquee" aria-hidden="true">
        <div className="vm-marquee-track">
          <span>Chính hãng</span>
          <span>Tiết kiệm năng lượng</span>
          <span>Lắp đặt chuẩn kỹ thuật</span>
          <span>Giải pháp doanh nghiệp</span>
          <span>Bảo trì trọn vòng đời</span>
          <span>Phát triển bền vững</span>
          <span>Chính hãng</span>
          <span>Tiết kiệm năng lượng</span>
          <span>Lắp đặt chuẩn kỹ thuật</span>
          <span>Giải pháp doanh nghiệp</span>
          <span>Bảo trì trọn vòng đời</span>
          <span>Phát triển bền vững</span>
        </div>
      </div>

      <section className="vm-sec" id="tam-nhin">
        <div className="container vm-split">
          <div className="vm-split-media reveal">
            <figure
              className="vm-media"
              style={{ "--ratio": "4 / 5" } as CSSProperties}
            >
              <VisionImage
                name="tam-nhin"
                alt="Công trình tiêu biểu"
                hint="Ảnh công trình / dự án tiêu biểu"
                size="1200 × 1500 px (dọc)"
              />
            </figure>
            <figure
              className="vm-media vm-media-inset"
              style={{ "--ratio": "1 / 1" } as CSSProperties}
            >
              <VisionImage
                name="doi-ngu"
                alt="Đội ngũ kỹ thuật"
                hint="Ảnh đội ngũ kỹ thuật"
                size="800 × 800 px"
              />
            </figure>
          </div>
          <div className="vm-split-text">
            <span className="vm-kicker reveal">01 — Tầm nhìn</span>
            <h2 className="vm-h2 reveal">
              Đến năm 2030, trở thành{" "}
              <span className="vm-grad">đối tác giải pháp điện lạnh</span> được
              tin cậy hàng đầu khu vực phía Nam
            </h2>
            <blockquote className="vm-quote reveal">
              “Mỗi hệ thống chúng tôi lắp đặt phải chạy êm hơn, tiết kiệm điện
              hơn và bền lâu hơn so với kỳ vọng của khách hàng.”
            </blockquote>
            <ul className="vm-goals">
              <li className="reveal">
                <b>01</b>
                <div>
                  <h3>Dẫn đầu chất lượng dịch vụ</h3>
                  <p>
                    Chuẩn hóa quy trình khảo sát – thi công – bảo trì, cam kết
                    thời gian phản hồi trong 2 giờ.
                  </p>
                </div>
              </li>
              <li className="reveal">
                <b>02</b>
                <div>
                  <h3>Đối tác chiến lược của doanh nghiệp</h3>
                  <p>
                    Đồng hành cùng nhà máy, văn phòng, chuỗi bán lẻ với giải
                    pháp tổng thể và hợp đồng bảo trì dài hạn.
                  </p>
                </div>
              </li>
              <li className="reveal">
                <b>03</b>
                <div>
                  <h3>Tiên phong làm mát xanh</h3>
                  <p>
                    Ưu tiên công nghệ Inverter, môi chất lạnh thân thiện môi
                    trường, giúp khách hàng giảm chi phí điện năng.
                  </p>
                </div>
              </li>
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
            <span className="vm-kicker">02 — Sứ mệnh</span>
            <h2 className="vm-h2">
              Mang lại sự <span className="vm-grad">dễ chịu</span> –{" "}
              <span className="vm-grad">an tâm</span> –{" "}
              <span className="vm-grad">hiệu quả</span> cho từng không gian sống
              và làm việc
            </h2>
          </div>
          <div className="vm-missions">
            <article className="vm-card reveal">
              <div className="vm-card-ic">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="vm-card-tag">Với khách hàng</span>
              <h3>Đúng nhu cầu, đúng công suất</h3>
              <p>
                Tư vấn trung thực, không bán thừa. Sản phẩm chính hãng, lắp đặt
                chuẩn kỹ thuật và hậu mãi tận nơi suốt vòng đời thiết bị.
              </p>
            </article>
            <article className="vm-card reveal">
              <div className="vm-card-ic">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
                </svg>
              </div>
              <span className="vm-card-tag">Với doanh nghiệp</span>
              <h3>Vận hành liên tục, chi phí tối ưu</h3>
              <p>
                Giải pháp tổng thể cho nhà xưởng, văn phòng: khảo sát miễn phí,
                báo giá minh bạch, bảo trì định kỳ, giảm rủi ro dừng máy.
              </p>
            </article>
            <article className="vm-card reveal">
              <div className="vm-card-ic">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <span className="vm-card-tag">Với cộng đồng</span>
              <h3>Làm mát xanh, sống bền vững</h3>
              <p>
                Thu hồi – xử lý môi chất lạnh đúng quy định, khuyến khích thiết
                bị tiết kiệm điện, góp phần giảm phát thải cho thành phố.
              </p>
            </article>
            <article className="vm-card reveal">
              <div className="vm-card-ic">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
                </svg>
              </div>
              <span className="vm-card-tag">Với đội ngũ</span>
              <h3>Nơi người thợ giỏi phát triển</h3>
              <p>
                Đào tạo bài bản, chứng chỉ kỹ thuật, môi trường làm việc an toàn
                và lộ trình thăng tiến rõ ràng cho từng kỹ thuật viên.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="vm-stats">
        <div className="container vm-stats-in">
          <div className="vm-stat reveal">
            <b data-count="10" data-suffix="+">
              {(10).toLocaleString("vi-VN")}+
            </b>
            <span>Năm kinh nghiệm</span>
          </div>
          <div className="vm-stat reveal">
            <b data-count="50000" data-suffix="+">
              {(50000).toLocaleString("vi-VN")}+
            </b>
            <span>Khách hàng tin dùng</span>
          </div>
          <div className="vm-stat reveal">
            <b data-count="500" data-suffix="+">
              {(500).toLocaleString("vi-VN")}+
            </b>
            <span>Dự án doanh nghiệp</span>
          </div>
          <div className="vm-stat reveal">
            <b data-count="98" data-suffix="%">
              {(98).toLocaleString("vi-VN")}%
            </b>
            <span>Khách hàng hài lòng</span>
          </div>
        </div>
      </section>

      <section className="vm-sec" id="gia-tri">
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">03 — Giá trị cốt lõi</span>
            <h2 className="vm-h2">
              5 giá trị định hình{" "}
              <span className="vm-grad">mọi quyết định</span> của chúng tôi
            </h2>
          </div>
          <div className="vm-bento">
            <div className="vm-tile vm-tile-big reveal">
              <figure className="vm-media vm-media-fill">
                <VisionImage
                  name="gia-tri"
                  alt="Hoạt động của công ty"
                  hint="Ảnh hoạt động / văn hóa công ty"
                  size="1600 × 1000 px (ngang)"
                />
              </figure>
              <div className="vm-tile-over">
                <span className="vm-num">01</span>
                <h3>Chính trực</h3>
                <p>
                  Nói đúng, làm đúng. Báo giá minh bạch, hàng chính hãng, hóa
                  đơn đầy đủ.
                </p>
              </div>
            </div>
            <div className="vm-tile reveal">
              <span className="vm-num">02</span>
              <h3>Tận tâm</h3>
              <p>
                Lắng nghe đúng nhu cầu, hỗ trợ khách hàng trọn vòng đời sản
                phẩm.
              </p>
            </div>
            <div className="vm-tile vm-tile-accent reveal">
              <span className="vm-num">03</span>
              <h3>Chuyên nghiệp</h3>
              <p>
                Quy trình chuẩn, an toàn lao động, công trình sạch sẽ và đúng
                tiến độ.
              </p>
            </div>
            <div className="vm-tile vm-tile-accent2 reveal">
              <span className="vm-num">04</span>
              <h3>Đổi mới</h3>
              <p>
                Ứng dụng công nghệ mới, số hóa quản lý bảo trì và chăm sóc khách
                hàng.
              </p>
            </div>
            <div className="vm-tile reveal">
              <span className="vm-num">05</span>
              <h3>Bền vững</h3>
              <p>
                Ưu tiên giải pháp tiết kiệm năng lượng, thân thiện môi trường.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="vm-sec vm-sec-soft" id="hanh-trinh">
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">04 — Hành trình</span>
            <h2 className="vm-h2">
              Từng bước <span className="vm-grad">vững chắc</span> hướng tới tầm
              nhìn 2030
            </h2>
          </div>
          <ol className="vm-timeline">
            <li className="reveal">
              <span className="vm-year">2015</span>
              <div>
                <h3>Khởi đầu</h3>
                <p>
                  Thành lập với đội ngũ kỹ thuật lắp đặt và bảo trì máy lạnh dân
                  dụng.
                </p>
              </div>
            </li>
            <li className="reveal">
              <span className="vm-year">2018</span>
              <div>
                <h3>Mở rộng doanh nghiệp</h3>
                <p>
                  Triển khai các dự án điều hòa trung tâm cho văn phòng, nhà
                  xưởng.
                </p>
              </div>
            </li>
            <li className="reveal">
              <span className="vm-year">2022</span>
              <div>
                <h3>Hệ thống showroom</h3>
                <p>
                  Mở chuỗi cửa hàng, chuẩn hóa quy trình bán hàng và hậu mãi.
                </p>
              </div>
            </li>
            <li className="reveal">
              <span className="vm-year">2026</span>
              <div>
                <h3>Chuyển đổi số</h3>
                <p>
                  Ra mắt nền tảng mua sắm trực tuyến, đặt lịch dịch vụ và quản
                  lý bảo trì.
                </p>
              </div>
            </li>
            <li className="reveal is-goal">
              <span className="vm-year">2030</span>
              <div>
                <h3>Mục tiêu</h3>
                <p>
                  Đối tác giải pháp điện lạnh được tin cậy hàng đầu khu vực phía
                  Nam.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="vm-sec" id="hinh-anh">
        <div className="container">
          <div className="vm-head reveal">
            <span className="vm-kicker">05 — Hình ảnh</span>
            <h2 className="vm-h2">
              Con người &amp; <span className="vm-grad">công trình</span> của
              chúng tôi
            </h2>
          </div>
          <div className="vm-gallery">
            <figure className="vm-media g1 reveal">
              <VisionImage
                name="anh-1"
                alt="Showroom"
                hint="Ảnh showroom"
                size="1600 × 1000 px"
              />
            </figure>
            <figure className="vm-media g2 reveal">
              <VisionImage
                name="anh-2"
                alt="Thi công công trình"
                hint="Ảnh thi công công trình"
                size="800 × 1000 px"
              />
            </figure>
            <figure className="vm-media g3 reveal">
              <VisionImage
                name="anh-3"
                alt="Đào tạo kỹ thuật"
                hint="Ảnh đào tạo kỹ thuật"
                size="800 × 800 px"
              />
            </figure>
            <figure className="vm-media g4 reveal">
              <VisionImage
                name="anh-4"
                alt="Ký kết hợp tác"
                hint="Ảnh ký kết hợp tác"
                size="800 × 800 px"
              />
            </figure>
            <figure className="vm-media g5 reveal">
              <VisionImage
                name="anh-5"
                alt="Hoạt động cộng đồng"
                hint="Ảnh hoạt động cộng đồng"
                size="1600 × 800 px"
              />
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
          <figure
            className="vm-media vm-media-portrait reveal"
            style={{ "--ratio": "3 / 4" } as CSSProperties}
          >
            <VisionImage
              name="lanh-dao"
              alt="Chân dung lãnh đạo"
              hint="Ảnh chân dung Giám đốc"
              size="900 × 1200 px (dọc)"
            />
          </figure>
          <div className="reveal">
            <span className="vm-kicker">Thông điệp lãnh đạo</span>
            <p className="vm-letter">
              “Chúng tôi xây dựng {dt.config.name} với một niềm tin giản dị:
              khách hàng xứng đáng được tư vấn trung thực và phục vụ tận tâm.
              Mỗi công trình hoàn thành là một lời cam kết về chất lượng – và
              cũng là động lực để chúng tôi tiếp tục đổi mới mỗi ngày.”
            </p>
            <div className="vm-sign">
              <b>Họ và tên lãnh đạo</b>
              <span>Giám đốc – {dt.config.company}</span>
            </div>
          </div>
        </div>
      </section>

      {trust}

      <section className="vm-sec">
        <div className="container">
          <div className="vm-final reveal">
            <h2>
              Cùng kiến tạo không gian{" "}
              <span className="vm-grad">mát lành &amp; bền vững</span>
            </h2>
            <p>
              Khảo sát miễn phí – báo giá trong 24h – xuất hóa đơn VAT cho doanh
              nghiệp.
            </p>
            <div className="vm-cta">
              <ShopLink
                className="vm-btn vm-btn-primary"
                href="bao-gia-du-an.html"
              >
                Nhận báo giá dự án
              </ShopLink>
              <ShopLink
                className="vm-btn vm-btn-ghost-dark"
                href="lien-he.html"
              >
                Liên hệ tư vấn
              </ShopLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
