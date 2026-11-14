// Tính tải lạnh & công suất máy lạnh cho phòng dân dụng / văn phòng nhỏ.
// Cơ sở (xem phần "Cơ sở tính toán" trên trang):
//  - Tải nền: 200 BTU/h cho mỗi m³ thể tích phòng (≈ 600 BTU/m² với trần 3 m) – cách chọn nhanh
//    các hãng máy lạnh tại Việt Nam công bố cho khí hậu nóng ẩm.
//  - Hiệu chỉnh theo ENERGY STAR (EPA Hoa Kỳ): phòng râm mát −10%, phòng nhiều nắng +10%,
//    trên 2 người thường xuyên +600 BTU/h mỗi người, phòng bếp +4.000 BTU/h.
//  - Thiết bị văn phòng: mỗi máy tính ~100 W tỏa nhiệt ≈ 340 BTU/h (1 W = 3,412 BTU/h).
//  - Tiền điện: điện năng = tải lạnh trung bình / hiệu suất năng lượng (CSPF) theo nhãn năng lượng
//    TCVN 7830:2021, nhân giá điện người dùng nhập (mặc định ≈ bậc 4 biểu giá EVN, chưa VAT).
export const STEPS: [number, string][] = [
  [9000, '1 HP'], [12000, '1.5 HP'], [18000, '2 HP'], [24000, '2.5 HP'],
  [28000, '3 HP'], [36000, '4 HP'], [48000, '5 HP'],
];
export const ROOMS: Record<string, { label: string; note: string }> = {
  ngu: { label: 'Phòng ngủ', note: '' },
  khach: { label: 'Phòng khách', note: '' },
  vanphong: { label: 'Văn phòng', note: 'Máy tính mỗi người ~100 W' },
  bep: { label: 'Phòng bếp / phòng ăn', note: 'Bếp nấu +4.000 BTU/h' },
  kinhdoanh: { label: 'Cửa hàng / quán', note: 'Cửa mở ra vào thường xuyên +10%' },
};
export const SUN: Record<string, { label: string; factor: number }> = {
  ram: { label: 'Râm mát, ít nắng', factor: 0.9 },
  vua: { label: 'Bình thường', factor: 1 },
  nhieu: { label: 'Nhiều nắng / hướng Tây / kính lớn', factor: 1.1 },
};
export const BTU_PER_M3 = 200;
export const DEFAULT_PRICE = 3000; // đ/kWh ≈ bậc 4 (2.998 đ) theo QĐ 1279/QĐ-BCT, chưa VAT
const CSPF_INVERTER = 5; // máy Inverter phổ biến (nhãn 4–5 sao)
const CSPF_STANDARD = 3.1; // máy thường (non-inverter)
const AVG_LOAD = 0.75; // tải trung bình khi chạy so với tải đỉnh

export type CalcInput = { area: number; height?: number; sun?: string; people?: number; room?: string; hours?: number; price?: number };
export type CalcLine = { label: string; btu: number };

export function compute({ area, height = 3, sun = 'vua', people = 2, room = 'ngu', hours = 8, price = DEFAULT_PRICE }: CalcInput) {
  const volume = area * height;
  const base = volume * BTU_PER_M3;
  const lines: CalcLine[] = [{ label: `Thể tích ${fmt(area)} m² × ${fmt(height)} m = ${fmt(volume)} m³ × ${BTU_PER_M3}`, btu: base }];
  const sunInfo = SUN[sun] || SUN.vua;
  if (sunInfo.factor !== 1) lines.push({ label: `${sunInfo.label} (${sunInfo.factor > 1 ? '+' : '−'}10%)`, btu: base * (sunInfo.factor - 1) });
  if (room === 'kinhdoanh') lines.push({ label: 'Cửa ra vào mở thường xuyên (+10%)', btu: base * 0.1 });
  if (people > 2) lines.push({ label: `${people - 2} người thêm × 600`, btu: (people - 2) * 600 });
  if (room === 'vanphong') lines.push({ label: `${people} máy tính × 340`, btu: people * 340 });
  if (room === 'bep') lines.push({ label: 'Bếp nấu', btu: 4000 });
  const btu = Math.round(lines.reduce((s, l) => s + l.btu, 0) / 100) * 100;
  // Chọn công suất tiêu chuẩn nhỏ nhất đáp ứng tải (chấp nhận thiếu tối đa 5%)
  let units = 1;
  let step = STEPS.find(([v]) => v >= btu * 0.95);
  if (!step) { units = Math.ceil(btu / 48000); step = STEPS.find(([v]) => v >= (btu / units) * 0.95) || STEPS[STEPS.length - 1]; }
  const [capacity, hp] = step;
  const thermalKwh = (btu / 3412) * AVG_LOAD * hours * 30; // kWh nhiệt / tháng
  const kwhInv = Math.round(thermalKwh / CSPF_INVERTER);
  const kwhStd = Math.round(thermalKwh / CSPF_STANDARD);
  const p = price > 0 ? price : DEFAULT_PRICE;
  return {
    btu, hp, units, capacity, lines,
    kwhInv, kwhStd,
    costInv: Math.round((kwhInv * p) / 1000) * 1000,
    costStd: Math.round((kwhStd * p) / 1000) * 1000,
    saving: Math.round(((kwhStd - kwhInv) * p) / 1000) * 1000,
    large: btu > 48000 * 0.95,
  };
}
function fmt(n: number) {
  return Number(n.toFixed(2)).toLocaleString('vi-VN');
}
