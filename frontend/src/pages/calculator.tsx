import { useState } from "react";
import { dt, money, toast } from "../services/runtime";
import {
  compute,
  ROOMS,
  SUN,
  DEFAULT_PRICE,
  BTU_PER_M3,
} from "../services/calculator";
import { Field } from "../components/forms";
import { Icon, ShopLink, useMeta } from "../components/common";
import { ProductSection } from "../components/products";
import { LeadForm } from "./content";

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
// Link cũ dùng hệ số trần (1 / 1.15 / 1.3) – đổi sang mét
const legacyHeight = (v: number) =>
  v > 0 && v < 2
    ? ({ 1: 3, 1.15: 3.5, 1.3: 4 } as Record<number, number>)[v] || 3
    : v;
const legacySun = (v: string | null) =>
  v === "1"
    ? "vua"
    : v === "1.2" || v === "1.35"
      ? "nhieu"
      : v && SUN[v]
        ? v
        : "vua";

export function CalculatorPage() {
  const q = new URLSearchParams(location.search);
  const [area, setArea] = useState(Number(q.get("dt")) || 18);
  const [height, setHeight] = useState(
    legacyHeight(Number(q.get("tran"))) || 3,
  );
  const [sun, setSun] = useState(legacySun(q.get("nang")));
  const [people, setPeople] = useState(Number(q.get("nguoi")) || 2);
  const [room, setRoom] = useState(
    ROOMS[q.get("phong") || ""] ? (q.get("phong") as string) : "ngu",
  );
  const [hours, setHours] = useState(Number(q.get("gio")) || 8);
  const [price, setPrice] = useState(Number(q.get("giadien")) || DEFAULT_PRICE);
  useMeta("Tính công suất máy lạnh theo diện tích");
  const valid = area >= 3 && area <= 500 && height >= 2 && height <= 8;
  const r = compute({ area, height, sun, people, room, hours, price });
  const n = (v: number) => Math.round(v).toLocaleString("vi-VN");
  const matches = dt.products
    .filter((p) => p.cat === "may-lanh" && p.attrs?.capacity === r.hp)
    .sort(
      (a, b) =>
        Number(b.attrs?.tech === "Inverter") -
          Number(a.attrs?.tech === "Inverter") ||
        Number(b.sold || 0) - Number(a.sold || 0),
    )
    .slice(0, 5);

  async function share() {
    const params = new URLSearchParams({
      dt: String(area),
      tran: String(height),
      nang: sun,
      nguoi: String(people),
      phong: room,
      gio: String(hours),
      giadien: String(price),
    });
    history.replaceState(null, "", `?${params}`);
    try {
      await navigator.clipboard.writeText(location.href);
      toast("Đã sao chép liên kết");
    } catch {
      toast("Bạn có thể sao chép liên kết trên thanh địa chỉ");
    }
  }

  return (
    <div className="container cps-page">
      <header className="cps-head">
        <h1>Tính công suất máy lạnh</h1>
        <p>
          Nhập thông số phòng để biết tải lạnh (BTU/h), công suất máy phù hợp và
          tiền điện ước tính mỗi tháng.
        </p>
      </header>
      <div className="cps-layout">
        <section
          className="section-box react-form cps-form"
          aria-label="Thông số phòng"
        >
          <h2 className="cps-title">Thông số phòng</h2>
          <div className="cps-fields">
            <Field label="Diện tích phòng (m²)">
              <input
                type="number"
                inputMode="decimal"
                min={3}
                max={500}
                step="0.5"
                value={area || ""}
                onChange={(e) => setArea(Number(e.target.value))}
              />
            </Field>
            <Field label="Chiều cao trần (m)">
              <input
                type="number"
                inputMode="decimal"
                min={2}
                max={8}
                step="0.1"
                value={height || ""}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </Field>
            <Field label="Loại phòng">
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                {Object.entries(ROOMS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mức nắng của phòng">
              <select value={sun} onChange={(e) => setSun(e.target.value)}>
                {Object.entries(SUN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số người thường xuyên">
              <input
                type="number"
                min={1}
                max={100}
                value={people}
                onChange={(e) =>
                  setPeople(clamp(Number(e.target.value), 1, 100))
                }
              />
            </Field>
            <Field label="Giờ dùng mỗi ngày">
              <input
                type="number"
                min={1}
                max={24}
                value={hours}
                onChange={(e) => setHours(clamp(Number(e.target.value), 1, 24))}
              />
            </Field>
            <Field label="Giá điện (đ/kWh)">
              <input
                type="number"
                min={500}
                max={10000}
                step="1"
                value={price || ""}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </Field>
            <p className="cps-hint">
              <Icon name="alert" />
              Mặc định ≈ giá bậc 4 điện sinh hoạt EVN (chưa VAT). Nhập giá trên
              hóa đơn để tính sát hơn.
            </p>
          </div>
        </section>

        <aside className="section-box cps-result" aria-live="polite">
          {valid ? (
            <>
              <span className="cps-label">Công suất đề xuất</span>
              <div className="cps-hp">
                {r.units > 1 ? `${r.units} máy × ` : ""}
                {r.hp}
              </div>
              <div className="cps-sub">
                Máy {n(r.capacity)} BTU/h · tải lạnh của phòng ≈{" "}
                <b>{n(r.btu)} BTU/h</b>
              </div>
              <dl className="cps-lines">
                {r.lines.map((l) => (
                  <div key={l.label}>
                    <dt>{l.label}</dt>
                    <dd>
                      {l.btu >= 0 ? "+" : "−"}
                      {n(Math.abs(l.btu))}
                    </dd>
                  </div>
                ))}
                <div className="cps-total">
                  <dt>Tổng tải lạnh</dt>
                  <dd>{n(r.btu)} BTU/h</dd>
                </div>
              </dl>
              <div className="cps-cost">
                <div>
                  <span>Inverter</span>
                  <b>{money(r.costInv)}</b>
                  <small>{n(r.kwhInv)} kWh/tháng</small>
                </div>
                <div>
                  <span>Máy thường</span>
                  <b>{money(r.costStd)}</b>
                  <small>{n(r.kwhStd)} kWh/tháng</small>
                </div>
              </div>
              <p className="cps-save">
                Chọn Inverter tiết kiệm khoảng <b>{money(r.saving)}</b>/tháng (
                {hours} giờ/ngày).
              </p>
              {r.large && (
                <p className="cps-warn">
                  <Icon name="alert" />
                  Tải lạnh lớn: nên dùng máy âm trần, tủ đứng hoặc hệ thống
                  trung tâm – kỹ thuật viên cần khảo sát thực tế.
                </p>
              )}
              <div className="cps-actions">
                {matches.length > 0 && (
                  <a className="btn btn-primary" href="#cps-products">
                    Xem máy {r.hp}
                  </a>
                )}
                <button className="btn btn-outline" onClick={share}>
                  Chia sẻ kết quả
                </button>
              </div>
            </>
          ) : (
            <p role="alert">
              Nhập diện tích từ 3 đến 500 m² và chiều cao trần từ 2 đến 8 m.
            </p>
          )}
        </aside>
      </div>
      {valid && matches.length > 0 && (
        <div id="cps-products">
          <ProductSection
            title={`Máy lạnh ${r.hp} phù hợp`}
            products={matches}
          />
        </div>
      )}
      {valid && matches.length === 0 && (
        <p className="cps-empty">
          Chưa có sẵn máy {r.hp} trên website.{" "}
          <ShopLink className="link" href={dt.api.catUrl("may-lanh")}>
            Xem tất cả máy lạnh
          </ShopLink>{" "}
          hoặc để lại thông tin để được tư vấn.
        </p>
      )}
      <LeadForm type="service" title="Đặt khảo sát công suất miễn phí" />
    </div>
  );
}
