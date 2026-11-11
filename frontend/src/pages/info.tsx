import { useState, type CSSProperties } from "react";
import { dt, money } from "../services/runtime";
import {
  Icon,
  Media,
  ShopLink,
  useMeta,
  useJsonLd,
} from "../components/common";
import { Field } from "../components/forms";
import { PagedList } from "../components/collections";
import { LeadForm } from "../components/lead-form";
import type { Row } from "../types";
export function ContactPage() {
  useMeta("Liên hệ");
  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Liên hệ</h1>
          <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn từ {dt.config.workingHours}.</p>
        </div>
      </section>
      <div className="container">
        <div className="two-col">
          <LeadForm title="Gửi tin nhắn cho chúng tôi" />
          <aside className="section-box">
            <h3>Thông tin liên hệ</h3>
            <p><strong>{dt.config.company}</strong></p>
            <ul className="check-list">
              <li>
                <b>MST:</b>&nbsp;{dt.config.taxCode}
              </li>
              <li>
                <b>Địa chỉ:</b>&nbsp;{dt.config.address}
              </li>
              <li>
                <b>Hotline:</b>&nbsp;
                <a className="link" href={`tel:${dt.u.tel(dt.config.hotline)}`}>
                  {dt.config.hotline}
                </a>
              </li>
              {dt.config.hotlineB2B && (
                <li>
                  <b>Doanh nghiệp:</b>&nbsp;
                  <a
                    className="link"
                    href={`tel:${dt.u.tel(dt.config.hotlineB2B)}`}
                  >
                    {dt.config.hotlineB2B}
                  </a>
                </li>
              )}
              <li>
                <b>Email:</b>&nbsp;
                <a className="link" href={`mailto:${dt.config.email}`}>
                  {dt.config.email}
                </a>
              </li>
              <li>
                <b>Giờ làm việc:</b>&nbsp;{dt.config.workingHours}
              </li>
            </ul>
            <ShopLink
              className="btn btn-outline btn-block"
              href="he-thong-cua-hang.html"
            >
              Xem hệ thống cửa hàng
            </ShopLink>
          </aside>
        </div>
      </div>
    </>
  );
}
export function QuotePage({ productId }: { productId?: string }) {
  useMeta("Báo giá dự án doanh nghiệp");
  const content = dt.siteContent().b2b;
  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Giải pháp điều hòa & điện lạnh cho doanh nghiệp</h1>
          <p>{content.desc}</p>
        </div>
      </section>
      <div className="container">
        <div className="quote-layout">
          <section className="section-box b2b-overview" aria-labelledby="b2b-overview-title">
            <div className="b2b-overview-top">
              <div className="b2b-overview-intro">
                <span className="b2b-eyebrow">Giải pháp cho doanh nghiệp</span>
                <h2 id="b2b-overview-title">Tư vấn giải pháp<br />theo nhu cầu</h2>
                <p>{content.title}</p>
              </div>
              <PagedList
              items={content.points as string[]}
              className="b2b-points"
              label="Giải pháp doanh nghiệp"
              renderItem={(p, i) => (
                <div key={i}>
                  <Icon name="check" />
                  <span>{p}</span>
                </div>
              )}
              />
            </div>
            <div className="b2b-process-heading"><h3>Quy trình triển khai</h3><span>4 bước đồng hành cùng bạn</span></div>
            <ol className="b2b-process">
              {[
                ["Tiếp nhận", "Yêu cầu, bản vẽ và khối lượng"],
                ["Khảo sát", "Tư vấn cấu hình phù hợp"],
                ["Báo giá", "Chi phí và tiến độ rõ ràng"],
                ["Bàn giao", "Nghiệm thu và bảo hành"],
              ].map(([title, sub], index) => (
                <li key={title}>
                  <span className="b2b-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div><h4>{title}</h4><p>{sub}</p></div>
                </li>
              ))}
            </ol>
            <div className="b2b-overview-actions">
              <a
                className="b2b-phone"
                href={`tel:${dt.u.tel(dt.config.hotlineB2B || dt.config.hotline)}`}
              >
                <span className="b2b-phone-icon"><Icon name="phone" /></span>
                <span><small>Hotline doanh nghiệp</small><strong>{dt.config.hotlineB2B || dt.config.hotline}</strong></span>
              </a>
              <ShopLink className="btn btn-outline" href="du-an.html">Xem dự án tiêu biểu <Icon name="right" /></ShopLink>
            </div>
          </section>
          <LeadForm
            type="b2b-quote"
            title="Nhận báo giá dự án"
            productId={productId}
          />
        </div>
      </div>
    </>
  );
}
export function ServicesPage() {
  const [selected, setSelected] = useState(
    () =>
      new URLSearchParams(location.search).get("svc") || location.hash.slice(1),
  );
  useMeta("Dịch vụ điện lạnh");
  const [expanded, setExpanded] = useState<string[]>([]);
  // Chọn dịch vụ rồi cuộn xuống form đặt lịch
  function book(id: string) {
    setSelected(id);
    requestAnimationFrame(() =>
      document
        .getElementById("dat-lich")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  const toggle = (id: string) =>
    setExpanded((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
  const [showAll, setShowAll] = useState(false);
  const cols = Math.min(5, Math.max(3, Math.ceil(dt.services.length / 2))),
    limit = cols * 2;
  const visible =
    showAll || dt.services.findIndex((s) => s.id === selected) >= limit
      ? dt.services
      : dt.services.slice(0, limit);
  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Dịch vụ điện lạnh chuyên nghiệp</h1>
          <p>
            Vệ sinh, lắp đặt, nạp gas, sửa chữa máy lạnh - tủ lạnh - máy giặt
            tại nhà. Báo giá trước khi làm, bảo hành sau thi công.
          </p>
        </div>
      </section>
      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2>Dịch vụ của chúng tôi</h2>
          </div>
          <div
            className="svc-cards"
            style={{ "--cols": cols } as CSSProperties}
          >
            {visible.map((s) => {
              const text = String(s.desc || s.description || "");
              const open = expanded.includes(s.id);
              return (
                <article
                  className={`svc-card ${selected === s.id ? "active" : ""}`}
                  key={s.id}
                  id={s.id}
                >
                  <div className="svc-card-img" onClick={() => book(s.id)}>
                    {s.image ? (
                      <Media src={s.image} alt={s.name} />
                    ) : (
                      <span className="svc-card-ph">
                        <Icon name={s.icon || "tool"} />
                      </span>
                    )}
                  </div>
                  <div className="svc-card-body">
                    <h3>
                      <button
                        type="button"
                        onClick={() => book(s.id)}
                        aria-pressed={selected === s.id}
                      >
                        {s.name}
                      </button>
                    </h3>
                    <p className={open ? "open" : ""}>{text}</p>
                    {text.length > 60 && (
                      <button
                        type="button"
                        className="svc-more"
                        aria-expanded={open}
                        onClick={() => toggle(s.id)}
                      >
                        {open ? "Thu gọn" : "Xem thêm"}
                      </button>
                    )}
                    <div className="svc-card-foot">
                      <span className="price">
                        {s.price
                          ? `Từ ${money(s.price)} / ${s.unit || "lần"}`
                          : "Báo giá theo hợp đồng"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => book(s.id)}
                      >
                        Đặt lịch
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {dt.services.length > limit && (
            <div className="collection-more">
              <button
                type="button"
                className="btn btn-primary"
                aria-expanded={showAll}
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? "Thu gọn"
                  : `Xem thêm ${dt.services.length - limit} dịch vụ`}
                <Icon name={showAll ? "up" : "down"} />
              </button>
            </div>
          )}
        </section>
        <div className="svc-book svc-book-wide" id="dat-lich">
          <LeadForm
            key={selected}
            type="service"
            title="Đặt lịch dịch vụ"
            serviceId={selected}
          />
        </div>
        <section className="section">
          <div className="section-head">
            <h2>Quy trình làm việc</h2>
          </div>
          <div className="process">
            {[
              ["Đặt lịch", "Qua website, hotline hoặc Zalo"],
              ["Xác nhận", "Gọi lại xác nhận lịch hẹn"],
              ["Thực hiện", "Kiểm tra, báo giá, thi công"],
              ["Bàn giao", "Nghiệm thu, thanh toán, bảo hành"],
            ].map(([title, sub]) => (
              <div key={title}>
                <b>{title}</b>
                <span className="muted">{sub}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
export function StoresPage() {
  const [city, setCity] = useState("");
  const [chosen, setChosen] = useState<Row | null>(null);
  const stores = dt.stores.filter((s) => !city || s.city === city);
  const selected =
    chosen && stores.some((s) => s.id === chosen.id) ? chosen : stores[0];
  useMeta("Hệ thống cửa hàng");
  useJsonLd("ItemList", {
    itemListElement: dt.stores.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "HVACBusiness",
        name: s.name,
        telephone: s.phone || dt.config.hotline,
        address: {
          "@type": "PostalAddress",
          streetAddress: s.address,
          addressRegion: s.city,
          addressCountry: "VN",
        },
      },
    })),
  });
  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Hệ thống cửa hàng</h1>
          <p>
            Trải nghiệm sản phẩm và nhận tư vấn trực tiếp tại showroom gần bạn
            nhất.
          </p>
        </div>
      </section>
      <div className="container">
        <div className="two-col stores-layout">
          <div>
            <Field label="Tỉnh / thành phố">
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setChosen(null);
                }}
              >
                <option value="">Tất cả tỉnh thành</option>
                {[...new Set(dt.stores.map((s) => s.city))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <PagedList
              items={stores}
              className="store-list"
              label="Cửa hàng"
              renderItem={(s) => (
                <section
                  className={`store-card ${selected?.id === s.id ? "active" : ""}`}
                  key={s.id}
                >
                  <span className="svc-ic">
                    <Icon name="pin" />
                  </span>
                  <div>
                    <h2>{s.name}</h2>
                    <p>
                      <Icon name="pin" />
                      {s.address}, {s.city}
                    </p>
                    <p>
                      <Icon name="phone" />
                      <a href={`tel:${dt.u.tel(s.phone || dt.config.hotline)}`}>
                        {s.phone || dt.config.hotline}
                      </a>
                    </p>
                    <p>
                      <Icon name="clock" />
                      {s.hours || dt.config.workingHours}
                    </p>
                    <span className="store-links">
                      <button className="link" onClick={() => setChosen(s)}>
                        Xem bản đồ
                      </button>
                      <a
                        className="link"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address + ", " + s.city)}`}
                      >
                        Xem & đánh giá trên Google →
                      </a>
                    </span>
                  </div>
                </section>
              )}
            />
          </div>
          <div className="map-box">
            {selected && (
              <iframe
                key={selected.id}
                loading="lazy"
                title={`Bản đồ ${selected.name}`}
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(selected.address + ", " + selected.city)}&output=embed`}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
