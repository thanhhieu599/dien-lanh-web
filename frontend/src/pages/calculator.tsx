import { useState, type ReactNode } from "react";
import { dt, money, toast } from "../services/runtime";
import { compute, ROOMS, SUN, STEPS, DEFAULT_PRICE } from "../services/calculator";
import { Icon, ShopLink, useMeta } from "../components/common";
import { ProductSection } from "../components/products";
import { LeadForm } from "./content";

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
const round1 = (v: number) => Math.round(v * 10) / 10;
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

// Icon nét mảnh cho ô chọn loại phòng / mức nắng
const svg = (d: string) => (
  <svg className="cps-ic" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ROOM_ICONS: Record<string, ReactNode> = {
  ngu: svg("M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 14h18M5 10V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"),
  khach: svg("M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 12h20v5H2zM5 17v2M19 17v2"),
  bep: svg("M4 10h16v10H4zM8 6c0-2 2-2 2-4M12 6c0-2 2-2 2-4M8 14h8"),
  vanphong: svg("M3 4h18v12H3zM8 20h8M12 16v4"),
  kinhdoanh: svg("M3 9l2-5h14l2 5M4 9v11h16V9M9 20v-6h6v6"),
};
const SUN_ICONS: Record<string, ReactNode> = {
  ram: svg("M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 18z"),
  vua: svg("M9 3v1M4.2 5.2l.7.7M3 10h1M13.8 5.9l.7-.7M6.5 11a3.5 3.5 0 0 1 6.4-2M9 21h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5 1.5A2.8 2.8 0 0 0 9 21z"),
  nhieu: svg("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"),
};
const ROOM_SHORT: Record<string, string> = { ngu: "Phòng ngủ", khach: "Phòng khách", bep: "Bếp / ăn", vanphong: "Văn phòng", kinhdoanh: "Cửa hàng" };
const SUN_SHORT: Record<string, string> = { ram: "Râm mát", vua: "Bình thường", nhieu: "Nắng Tây / kính lớn" };

function Stepper({ label, value, step, min, max, unit = "", onChange }: { label: string; value: number; step: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(clamp(round1(v), min, max));
  return (
    <div className="cps-step">
      <span>{label}</span>
      <div>
        <button type="button" aria-label={`Giảm ${label}`} onClick={() => set(value - step)} disabled={value <= min}>−</button>
        <label>
          <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value || ""} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} onBlur={() => set(value)} />
          {unit && <small>{unit}</small>}
        </label>
        <button type="button" aria-label={`Tăng ${label}`} onClick={() => set(value + step)} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

// Đồng hồ công suất: nửa vòng tròn, kim chỉ theo bậc 1 HP → 5 HP
function Gauge({ capacity, full, children }: { capacity: number; full: boolean; children: ReactNode }) {
  const idx = Math.max(0, STEPS.findIndex(([v]) => v === capacity));
  const frac = full ? 1 : 0.06 + (idx / (STEPS.length - 1)) * 0.88;
  const R = 110, L = Math.PI * R;
  const a = Math.PI * (1 - frac);
  const x = 130 + R * Math.cos(a), y = 135 - R * Math.sin(a);
  return (
    <div className="cps-gauge">
      <svg viewBox="0 0 260 150" aria-hidden="true">
        <path d="M20 135 A110 110 0 0 1 240 135" className="track" />
        <path d="M20 135 A110 110 0 0 1 240 135" className="fill" strokeDasharray={`${L * frac} ${L}`} />
        <circle cx={x} cy={y} r="12" className="knob" />
      </svg>
      <div className="cps-gauge-v">{children}</div>
    </div>
  );
}

export function CalculatorPage() {
  const q = new URLSearchParams(location.search);
  const [area, setArea] = useState(Number(q.get("dt")) || 18);
  const [height, setHeight] = useState(legacyHeight(Number(q.get("tran"))) || 3);
  const [sun, setSun] = useState(legacySun(q.get("nang")));
  const [people, setPeople] = useState(Number(q.get("nguoi")) || 2);
  const [room, setRoom] = useState(ROOMS[q.get("phong") || ""] ? (q.get("phong") as string) : "ngu");
  const [hours, setHours] = useState(Number(q.get("gio")) || 8);
  const [price, setPrice] = useState(Number(q.get("giadien")) || DEFAULT_PRICE);
  useMeta("Tính công suất máy lạnh theo diện tích");
  const valid = area >= 3 && area <= 500 && height >= 2 && height <= 8;
  const r = compute({ area, height, sun, people, room, hours, price });
  const n = (v: number) => Math.round(v).toLocaleString("vi-VN");
  const matches = dt.products
    .filter((p) => p.cat === "may-lanh" && p.attrs?.capacity === r.hp)
    .sort((a, b) => Number(b.attrs?.tech === "Inverter") - Number(a.attrs?.tech === "Inverter") || Number(b.sold || 0) - Number(a.sold || 0))
    .slice(0, 5);
  // Mặt bằng minh họa: phòng gần vuông, khung co giãn theo diện tích (tối đa 100 m²)
  const side = Math.sqrt(clamp(area, 3, 500));
  const w = round1(side * 1.15), d = round1(area / (side * 1.15));
  const scale = Math.sqrt(clamp(area, 5, 100) / 100);
  const slider = clamp(area, 5, 100);

  async function share() {
    const params = new URLSearchParams({ dt: String(area), tran: String(height), nang: sun, nguoi: String(people), phong: room, gio: String(hours), giadien: String(price) });
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
        <p>Chọn loại phòng, kéo diện tích – kết quả cập nhật ngay.</p>
      </header>
      <div className="cps-layout">
        <section className="section-box cps-form" aria-label="Thông số phòng">
          <p className="cps-q">1. Loại phòng</p>
          <div className="cps-rooms" role="radiogroup" aria-label="Loại phòng">
            {Object.entries(ROOMS).map(([k, v]) => (
              <button type="button" key={k} role="radio" aria-checked={room === k} className={room === k ? "on" : ""} onClick={() => setRoom(k)}>
                {ROOM_ICONS[k]}
                {ROOM_SHORT[k] || v.label}
              </button>
            ))}
          </div>

          <div className="cps-area">
            <div>
              <p className="cps-q">2. Diện tích phòng</p>
              <label className="cps-big">
                <input type="number" inputMode="decimal" min={3} max={500} step="0.5" value={area || ""} aria-label="Diện tích phòng (m²)" style={{ width: `${Math.max(2, String(area || "").length) + 0.6}ch` }} onChange={(e) => setArea(Number(e.target.value))} />
                <span>m²</span>
              </label>
              <input className="cps-range" type="range" min={5} max={100} step={1} value={slider} aria-label="Kéo chọn diện tích" style={{ "--p": `${((slider - 5) / 95) * 100}%` } as React.CSSProperties} onChange={(e) => setArea(Number(e.target.value))} />
              <div className="cps-scale"><span>5</span><span>25</span><span>50</span><span>75</span><span>100 m²</span></div>
            </div>
            <div className="cps-plan" aria-hidden="true">
              <div className="room" style={{ width: `${30 + scale * 64}%`, height: `${30 + scale * 62}%` }}>
                <i className="ac" />
                <span>{w.toLocaleString("vi-VN")} × {d.toLocaleString("vi-VN")} m</span>
              </div>
            </div>
          </div>

          <p className="cps-q">3. Nắng chiếu vào phòng</p>
          <div className="cps-sun" role="radiogroup" aria-label="Mức nắng">
            {Object.keys(SUN).map((k) => (
              <button type="button" key={k} role="radio" aria-checked={sun === k} className={sun === k ? "on" : ""} onClick={() => setSun(k)}>
                {SUN_ICONS[k]}
                {SUN_SHORT[k]}
              </button>
            ))}
          </div>

          <div className="cps-steps">
            <Stepper label="Trần cao" unit="m" value={height} step={0.1} min={2} max={8} onChange={setHeight} />
            <Stepper label="Số người" value={people} step={1} min={1} max={100} onChange={setPeople} />
            <Stepper label="Giờ dùng / ngày" value={hours} step={1} min={1} max={24} onChange={setHours} />
            <Stepper label="Giá điện (đ/kWh)" value={price} step={100} min={500} max={10000} onChange={setPrice} />
          </div>
          <p className="cps-hint"><Icon name="alert" />Giá điện mặc định ≈ bậc 4 điện sinh hoạt EVN (chưa VAT) – nhập giá trên hóa đơn để tính sát hơn.</p>
        </section>

        <aside className="cps-result" aria-live="polite">
          <span className="cps-label">Công suất đề xuất</span>
          {valid ? (
            <>
              <Gauge capacity={r.capacity} full={r.units > 1}>
                <b>{r.units > 1 ? `${r.units} × ` : ""}{r.hp}</b>
                <small>{n(r.capacity)} BTU/h · phòng cần {n(r.btu)}</small>
              </Gauge>
              <div className="cps-ticks"><span>1 HP</span><span>2 HP</span><span>2.5 HP</span><span>3 HP</span><span>5 HP</span></div>
              <div className="cps-cost">
                <div><span>Tiền điện Inverter</span><b>{money(r.costInv)}</b></div>
                <div><span>Máy thường</span><b>{money(r.costStd)}</b></div>
              </div>
              <p className="cps-save">💡 Inverter tiết kiệm <b>{money(r.saving * 12)}/năm</b> ({hours} giờ/ngày)</p>
              {r.large && <p className="cps-warn"><Icon name="alert" />Tải lạnh lớn: nên dùng máy âm trần, tủ đứng hoặc hệ thống trung tâm – cần khảo sát thực tế.</p>}
              {matches.length > 0 && <a className="cps-cta" href="#cps-products">Xem {matches.length} máy {r.hp} phù hợp →</a>}
              <a className="cps-cta2" href="#cps-lead">Nhờ kỹ thuật khảo sát miễn phí</a>
              <button type="button" className="cps-share" onClick={share}>Chia sẻ kết quả</button>
            </>
          ) : (
            <p role="alert" className="cps-invalid">Nhập diện tích từ 3 đến 500 m² và chiều cao trần từ 2 đến 8 m.</p>
          )}
        </aside>
      </div>
      {valid && matches.length > 0 && (
        <div id="cps-products">
          <ProductSection title={`Máy lạnh ${r.hp} phù hợp`} products={matches} />
        </div>
      )}
      {valid && matches.length === 0 && (
        <p className="cps-empty">
          Chưa có sẵn máy {r.hp} trên website.{" "}
          <ShopLink className="link" href={dt.api.catUrl("may-lanh")}>Xem tất cả máy lạnh</ShopLink>{" "}
          hoặc để lại thông tin để được tư vấn.
        </p>
      )}
      <div id="cps-lead">
        <LeadForm type="service" title="Đặt khảo sát công suất miễn phí" />
      </div>
    </div>
  );
}
