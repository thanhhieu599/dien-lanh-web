// Sinh dữ liệu mẫu (danh mục, thương hiệu, sản phẩm) cho frontend.
// Chạy: node tools/generate-catalog.mjs  -> ghi đè frontend/assets/js/data/catalog.js
// Ở giai đoạn 2 (backend), file này dùng lại làm seed cho database.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../frontend/assets/js/data/catalog.js');

// ---------------------------------------------------------------- Thương hiệu
const brands = [
  { id: 'daikin', name: 'Daikin', origin: 'Nhật Bản', color: '#0097e0' },
  { id: 'panasonic', name: 'Panasonic', origin: 'Nhật Bản', color: '#0a3d91' },
  { id: 'mitsubishi', name: 'Mitsubishi Electric', origin: 'Nhật Bản', color: '#e60012' },
  { id: 'toshiba', name: 'Toshiba', origin: 'Nhật Bản', color: '#e60012' },
  { id: 'lg', name: 'LG', origin: 'Hàn Quốc', color: '#a50034' },
  { id: 'samsung', name: 'Samsung', origin: 'Hàn Quốc', color: '#1428a0' },
  { id: 'casper', name: 'Casper', origin: 'Thái Lan', color: '#00a0e9' },
  { id: 'gree', name: 'Gree', origin: 'Trung Quốc', color: '#004ea2' },
  { id: 'aqua', name: 'Aqua', origin: 'Nhật Bản', color: '#0068b7' },
  { id: 'sharp', name: 'Sharp', origin: 'Nhật Bản', color: '#e60012' },
  { id: 'hitachi', name: 'Hitachi', origin: 'Nhật Bản', color: '#e60027' },
  { id: 'electrolux', name: 'Electrolux', origin: 'Thụy Điển', color: '#041e50' },
  { id: 'sanaky', name: 'Sanaky', origin: 'Việt Nam', color: '#0b6fb8' },
  { id: 'alaska', name: 'Alaska', origin: 'Việt Nam', color: '#1b75bb' },
  { id: 'ariston', name: 'Ariston', origin: 'Ý', color: '#00326e' },
  { id: 'kangaroo', name: 'Kangaroo', origin: 'Việt Nam', color: '#00954c' },
  { id: 'dt', name: 'D&T Supply', origin: 'Việt Nam', color: '#0b5ed7' },
];

// ---------------------------------------------------------------- Danh mục
const PRICE_RANGES = [
  { v: '0-5', label: 'Dưới 5 triệu', min: 0, max: 5e6 },
  { v: '5-10', label: '5 - 10 triệu', min: 5e6, max: 10e6 },
  { v: '10-15', label: '10 - 15 triệu', min: 10e6, max: 15e6 },
  { v: '15-20', label: '15 - 20 triệu', min: 15e6, max: 20e6 },
  { v: '20-30', label: '20 - 30 triệu', min: 20e6, max: 30e6 },
  { v: '30-999', label: 'Trên 30 triệu', min: 30e6, max: Infinity },
];

const categories = [
  {
    id: 'may-lanh', name: 'Máy lạnh - Điều hòa', short: 'Máy lạnh', icon: 'snow', art: 'ac',
    subs: [
      { id: 'treo-tuong', name: 'Máy lạnh treo tường' },
      { id: 'am-tran', name: 'Máy lạnh âm trần cassette' },
      { id: 'tu-dung', name: 'Máy lạnh tủ đứng' },
      { id: 'ong-gio', name: 'Máy lạnh giấu trần ống gió' },
    ],
    filters: [
      { key: 'capacity', label: 'Công suất', options: ['1 HP', '1.5 HP', '2 HP', '2.5 HP', '3 HP', '4 HP', '5 HP'] },
      { key: 'tech', label: 'Công nghệ', options: ['Inverter', 'Non-Inverter'] },
      { key: 'type', label: 'Loại máy', options: ['1 chiều', '2 chiều'] },
      { key: 'room', label: 'Phạm vi làm lạnh', options: ['Dưới 15 m²', '15 - 20 m²', '20 - 30 m²', '30 - 40 m²', 'Trên 40 m²'] },
    ],
  },
  {
    id: 'tu-lanh', name: 'Tủ lạnh', short: 'Tủ lạnh', icon: 'fridge', art: 'fridge',
    subs: [
      { id: 'ngan-da-tren', name: 'Ngăn đá trên' },
      { id: 'ngan-da-duoi', name: 'Ngăn đá dưới' },
      { id: 'side-by-side', name: 'Side by side' },
      { id: 'nhieu-cua', name: 'Nhiều cửa (Multi door)' },
      { id: 'mini', name: 'Tủ lạnh mini' },
    ],
    filters: [
      { key: 'volume', label: 'Dung tích', options: ['Dưới 150 lít', '150 - 300 lít', '300 - 450 lít', '450 - 600 lít', 'Trên 600 lít'] },
      { key: 'tech', label: 'Công nghệ', options: ['Inverter', 'Non-Inverter'] },
      { key: 'family', label: 'Số người dùng', options: ['1 - 2 người', '3 - 4 người', '5 - 6 người', 'Trên 6 người'] },
    ],
  },
  {
    id: 'tu-dong-tu-mat', name: 'Tủ đông - Tủ mát', short: 'Tủ đông, tủ mát', icon: 'box', art: 'freezer',
    subs: [
      { id: 'tu-dong', name: 'Tủ đông' },
      { id: 'tu-mat', name: 'Tủ mát' },
      { id: 'tu-dong-mat', name: 'Tủ đông mát 2 ngăn' },
    ],
    filters: [
      { key: 'volume', label: 'Dung tích', options: ['Dưới 200 lít', '200 - 400 lít', '400 - 600 lít', 'Trên 600 lít'] },
      { key: 'tech', label: 'Công nghệ', options: ['Inverter', 'Non-Inverter'] },
      { key: 'door', label: 'Kiểu cửa', options: ['Cửa kính', 'Cửa lật', 'Cửa trượt'] },
    ],
  },
  {
    id: 'may-giat', name: 'Máy giặt - Máy sấy', short: 'Máy giặt', icon: 'washer', art: 'washer',
    subs: [
      { id: 'cua-truoc', name: 'Máy giặt cửa trước' },
      { id: 'cua-tren', name: 'Máy giặt cửa trên' },
      { id: 'may-say', name: 'Máy sấy quần áo' },
    ],
    filters: [
      { key: 'weight', label: 'Khối lượng giặt', options: ['Dưới 8 kg', '8 - 9 kg', '9 - 10 kg', 'Trên 10 kg'] },
      { key: 'tech', label: 'Công nghệ', options: ['Inverter', 'Non-Inverter'] },
    ],
  },
  {
    id: 'loc-khong-khi', name: 'Lọc không khí - Hút ẩm', short: 'Lọc không khí', icon: 'wind', art: 'purifier',
    subs: [
      { id: 'loc-khong-khi', name: 'Máy lọc không khí' },
      { id: 'hut-am', name: 'Máy hút ẩm' },
    ],
    filters: [
      { key: 'room', label: 'Diện tích phòng', options: ['Dưới 30 m²', '30 - 50 m²', 'Trên 50 m²'] },
    ],
  },
  {
    id: 'may-nuoc-nong', name: 'Máy nước nóng', short: 'Máy nước nóng', icon: 'drop', art: 'heater',
    subs: [
      { id: 'gian-tiep', name: 'Máy nước nóng gián tiếp' },
      { id: 'truc-tiep', name: 'Máy nước nóng trực tiếp' },
    ],
    filters: [
      { key: 'volume', label: 'Dung tích', options: ['Trực tiếp', '15 - 20 lít', '30 lít', 'Trên 30 lít'] },
    ],
  },
  {
    id: 'quat-dieu-hoa', name: 'Quạt điều hòa', short: 'Quạt điều hòa', icon: 'fan', art: 'cooler',
    subs: [
      { id: 'gia-dinh', name: 'Quạt điều hòa gia đình' },
      { id: 'cong-nghiep', name: 'Quạt điều hòa công nghiệp' },
    ],
    filters: [
      { key: 'tank', label: 'Dung tích bình', options: ['Dưới 30 lít', '30 - 60 lít', 'Trên 60 lít'] },
    ],
  },
  {
    id: 'vat-tu-dien-lanh', name: 'Vật tư điện lạnh', short: 'Vật tư', icon: 'tool', art: 'supply',
    subs: [
      { id: 'ong-dong', name: 'Ống đồng - Bảo ôn' },
      { id: 'gas', name: 'Gas lạnh' },
      { id: 'phu-kien', name: 'Giá đỡ - Phụ kiện' },
    ],
    filters: [
      { key: 'kind', label: 'Loại vật tư', options: ['Ống đồng', 'Gas lạnh', 'Giá đỡ', 'Ống thoát nước', 'Dụng cụ'] },
    ],
  },
];

// ---------------------------------------------------------------- Helpers
let seed = 20261010;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round = (n, step = 10000) => Math.round(n / step) * step - 10000;
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const brandName = (id) => brands.find((b) => b.id === id).name;

const products = [];
let idSeq = 1001;
function add(p) {
  const id = idSeq++;
  const discount = p.discount ?? pick([0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25]);
  const price = round(p.basePrice * (1 - discount));
  const name = p.name;
  products.push({
    id,
    sku: `DT${id}`,
    slug: slugify(name),
    name,
    cat: p.cat,
    sub: p.sub,
    brand: p.brand,
    price,
    oldPrice: discount > 0 ? round(p.basePrice) : null,
    rating: Math.round((4 + rand()) * 10) / 10,
    reviews: Math.floor(5 + rand() * 240),
    sold: Math.floor(20 + rand() * 1800),
    stock: Math.floor(rand() * 60),
    badges: p.badges || [],
    gift: p.gift || null,
    installment: price >= 3e6,
    freeInstall: !!p.freeInstall,
    attrs: p.attrs,
    specs: p.specs,
    art: { type: p.art, color: p.color || 'white' },
    images: [0, 1, 2].map((v) => `art:${v}`),
    short: p.short,
    highlights: p.highlights,
    warranty: p.warranty || '24 tháng',
    flashSale: !!p.flashSale,
    createdAt: `2026-${String(1 + Math.floor(rand() * 9)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
  });
}

// ---------------------------------------------------------------- Máy lạnh
const roomByHp = { '1 HP': 'Dưới 15 m²', '1.5 HP': '15 - 20 m²', '2 HP': '20 - 30 m²', '2.5 HP': '30 - 40 m²', '3 HP': 'Trên 40 m²', '4 HP': 'Trên 40 m²', '5 HP': 'Trên 40 m²' };
const btuByHp = { '1 HP': 9000, '1.5 HP': 12000, '2 HP': 18000, '2.5 HP': 24000, '3 HP': 28000, '4 HP': 36000, '5 HP': 48000 };
const acs = [
  ['daikin', 'FTKB25YVMV', 'treo-tuong', '1 HP', true, '1 chiều', 10900000, ['hot'], true],
  ['daikin', 'FTKB35YVMV', 'treo-tuong', '1.5 HP', true, '1 chiều', 13400000, ['hot'], true],
  ['daikin', 'FTHF50VAVMV', 'treo-tuong', '2 HP', true, '2 chiều', 22900000, ['new']],
  ['panasonic', 'CU/CS-XU9ZKH-8', 'treo-tuong', '1 HP', true, '1 chiều', 14990000, ['premium'], true],
  ['panasonic', 'CU/CS-PU12AKH-8', 'treo-tuong', '1.5 HP', true, '1 chiều', 13590000, []],
  ['mitsubishi', 'MSY-JW35VF', 'treo-tuong', '1.5 HP', true, '1 chiều', 14490000, ['hot']],
  ['mitsubishi', 'MSZ-HT25VF', 'treo-tuong', '1 HP', true, '2 chiều', 12990000, []],
  ['toshiba', 'RAS-H10C4KCVG-V', 'treo-tuong', '1 HP', true, '1 chiều', 9990000, [], true],
  ['lg', 'V10WIN1', 'treo-tuong', '1 HP', true, '1 chiều', 9490000, ['bestseller'], true],
  ['lg', 'V13APIUV', 'treo-tuong', '1.5 HP', true, '1 chiều', 13990000, ['new']],
  ['samsung', 'AR10DYHZAWKNSV', 'treo-tuong', '1 HP', true, '1 chiều', 10490000, []],
  ['samsung', 'AR13DYHZAWKNSV', 'treo-tuong', '1.5 HP', true, '1 chiều', 12890000, []],
  ['casper', 'TC-09IS36', 'treo-tuong', '1 HP', true, '1 chiều', 6990000, ['bestseller'], true],
  ['casper', 'KC-12FC32', 'treo-tuong', '1.5 HP', false, '1 chiều', 7490000, []],
  ['gree', 'GWC09PB-K3D0P4', 'treo-tuong', '1 HP', false, '1 chiều', 6490000, [], true],
  ['aqua', 'AQA-RV10QE', 'treo-tuong', '1 HP', true, '1 chiều', 8490000, []],
  ['sharp', 'AH-XP13YMW', 'treo-tuong', '1.5 HP', true, '1 chiều', 11290000, []],
  ['daikin', 'FCFC71DVM', 'am-tran', '3 HP', true, '1 chiều', 38900000, ['project']],
  ['panasonic', 'S-3448PU3H', 'am-tran', '4 HP', true, '1 chiều', 45900000, ['project']],
  ['lg', 'ZTNQ18GPLA0', 'am-tran', '2 HP', true, '1 chiều', 27900000, ['project']],
  ['daikin', 'FVA100AMVM', 'tu-dung', '4 HP', true, '1 chiều', 52900000, ['project']],
  ['gree', 'GVC24AG-K6NNC7A', 'tu-dung', '2.5 HP', false, '1 chiều', 26900000, []],
  ['mitsubishi', 'PEY-SM50JA', 'ong-gio', '2 HP', true, '1 chiều', 31900000, ['project']],
  ['daikin', 'FDBNQ48MV1', 'ong-gio', '5 HP', false, '1 chiều', 49900000, ['project']],
];
acs.forEach(([brand, model, sub, hp, inv, type, base, badges, flash], i) => {
  const subName = { 'treo-tuong': 'Máy lạnh', 'am-tran': 'Máy lạnh âm trần', 'tu-dung': 'Máy lạnh tủ đứng', 'ong-gio': 'Máy lạnh giấu trần ống gió' }[sub];
  const art = { 'treo-tuong': 'ac', 'am-tran': 'ac-cassette', 'tu-dung': 'ac-floor', 'ong-gio': 'ac-duct' }[sub];
  const name = `${subName} ${brandName(brand)} ${inv ? 'Inverter ' : ''}${hp} ${model}`;
  add({
    cat: 'may-lanh', sub, brand, name, basePrice: base, art, badges, flashSale: !!flash,
    freeInstall: sub === 'treo-tuong',
    gift: sub === 'treo-tuong' ? 'Tặng gói vệ sinh máy lạnh 1 năm (2 lần)' : 'Khảo sát & tư vấn thiết kế miễn phí',
    attrs: { capacity: hp, tech: inv ? 'Inverter' : 'Non-Inverter', type, room: roomByHp[hp] },
    short: `${hp} (${btuByHp[hp].toLocaleString('vi-VN')} BTU) • ${inv ? 'Inverter tiết kiệm điện' : 'Máy nén thường'} • ${type}`,
    highlights: [
      `Công suất ${hp} - phù hợp phòng ${roomByHp[hp]}`,
      inv ? 'Công nghệ Inverter tiết kiệm đến 60% điện năng' : 'Làm lạnh nhanh, vận hành bền bỉ',
      'Gas R32 thân thiện môi trường, hiệu suất cao',
      sub === 'treo-tuong' ? 'Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh' : 'Phù hợp văn phòng, nhà xưởng, showroom',
      `Bảo hành máy nén ${brand === 'daikin' || brand === 'mitsubishi' ? '5' : '7'} năm chính hãng`,
    ],
    specs: {
      'Loại máy': `${type}, ${inv ? 'Inverter' : 'Non-Inverter'}`,
      'Công suất': hp,
      'Công suất làm lạnh': `${btuByHp[hp].toLocaleString('vi-VN')} BTU`,
      'Phạm vi làm lạnh': roomByHp[hp],
      'Loại gas': 'R32',
      'Điện năng tiêu thụ': `${(btuByHp[hp] / 12000 * (inv ? 0.82 : 1.1)).toFixed(2)} kW/h`,
      'Nhãn năng lượng': inv ? '5 sao (Hiệu suất năng lượng cao)' : '3 sao',
      'Độ ồn dàn lạnh': `${19 + (i % 8)} - ${38 + (i % 6)} dB`,
      'Chế độ': 'Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm',
      'Xuất xứ': pick(['Việt Nam', 'Thái Lan', 'Malaysia']),
      'Bảo hành': `Máy 24 tháng, máy nén ${brand === 'daikin' || brand === 'mitsubishi' ? '5' : '7'} năm`,
    },
  });
});

// ---------------------------------------------------------------- Tủ lạnh
const familyByVol = (v) => (v < 150 ? '1 - 2 người' : v < 300 ? '3 - 4 người' : v < 450 ? '5 - 6 người' : 'Trên 6 người');
const volRange = (v) => (v < 150 ? 'Dưới 150 lít' : v < 300 ? '150 - 300 lít' : v < 450 ? '300 - 450 lít' : v < 600 ? '450 - 600 lít' : 'Trên 600 lít');
const fridges = [
  ['samsung', 'RT22M4032BU/SV', 'ngan-da-tren', 236, true, 6490000, 'silver', ['bestseller'], true],
  ['panasonic', 'NR-BV331BPKV', 'ngan-da-duoi', 306, true, 13990000, 'black', ['hot']],
  ['lg', 'GR-B256JDS', 'ngan-da-tren', 264, true, 7990000, 'silver', []],
  ['lg', 'GR-X257JS', 'side-by-side', 635, true, 28990000, 'silver', ['premium']],
  ['samsung', 'RS62R5001B4/SV', 'side-by-side', 647, true, 24990000, 'black', ['hot'], true],
  ['toshiba', 'GR-RT325WE-PMV', 'ngan-da-tren', 249, true, 6890000, 'silver', []],
  ['aqua', 'AQR-T239FA(HB)', 'ngan-da-tren', 212, true, 5490000, 'silver', [], true],
  ['hitachi', 'R-FW690PGV7', 'nhieu-cua', 540, true, 39900000, 'gold', ['premium']],
  ['sharp', 'SJ-FX688VG-BK', 'nhieu-cua', 626, true, 31990000, 'black', ['new']],
  ['electrolux', 'EBB3702K-H', 'ngan-da-duoi', 335, true, 13490000, 'black', []],
  ['aqua', 'AQR-D99FA(BS)', 'mini', 90, false, 3490000, 'silver', []],
  ['sanaky', 'VH-148HP', 'mini', 140, false, 4290000, 'silver', []],
];
fridges.forEach(([brand, model, sub, vol, inv, base, color, badges, flash]) => {
  const art = { 'side-by-side': 'fridge-sbs', 'nhieu-cua': 'fridge-multi', mini: 'fridge-mini' }[sub] || 'fridge';
  const name = `Tủ lạnh ${brandName(brand)} ${inv ? 'Inverter ' : ''}${vol} lít ${model}`;
  add({
    cat: 'tu-lanh', sub, brand, name, basePrice: base, art, color, badges, flashSale: !!flash,
    gift: base > 10e6 ? 'Tặng bộ hộp bảo quản thực phẩm cao cấp' : null,
    attrs: { volume: volRange(vol), tech: inv ? 'Inverter' : 'Non-Inverter', family: familyByVol(vol) },
    short: `${vol} lít • ${familyByVol(vol)} • ${inv ? 'Inverter' : 'Tiết kiệm điện'}`,
    highlights: [
      `Dung tích ${vol} lít, phù hợp gia đình ${familyByVol(vol)}`,
      inv ? 'Máy nén Inverter vận hành êm, tiết kiệm điện' : 'Thiết kế nhỏ gọn, dễ bố trí',
      'Làm lạnh đa chiều, giữ thực phẩm tươi lâu',
      'Khử mùi, kháng khuẩn bằng than hoạt tính / ion',
    ],
    specs: {
      'Kiểu tủ': categories[1].subs.find((s) => s.id === sub).name,
      'Dung tích tổng': `${vol} lít`,
      'Dung tích ngăn đá': `${Math.round(vol * 0.28)} lít`,
      'Dung tích ngăn lạnh': `${Math.round(vol * 0.72)} lít`,
      'Công nghệ': inv ? 'Inverter' : 'Non-Inverter',
      'Điện năng tiêu thụ': `~${(0.6 + vol / 600).toFixed(1)} kW/ngày`,
      'Chất liệu khay': 'Kính chịu lực',
      'Xuất xứ': pick(['Việt Nam', 'Thái Lan', 'Indonesia']),
      'Bảo hành': 'Máy 24 tháng, máy nén 10 năm',
    },
  });
});

// ---------------------------------------------------------------- Tủ đông / tủ mát
const freezers = [
  ['sanaky', 'VH-4099A4K', 'tu-dong', 400, true, 9990000, 'Cửa lật', ['bestseller']],
  ['sanaky', 'VH-308K3L', 'tu-mat', 300, false, 7490000, 'Cửa kính', []],
  ['alaska', 'BCD-5068C', 'tu-dong-mat', 500, false, 10490000, 'Cửa lật', []],
  ['alaska', 'LC-633HI', 'tu-mat', 600, true, 15990000, 'Cửa kính', ['project']],
  ['aqua', 'AQF-C4201E', 'tu-dong', 365, false, 7990000, 'Cửa lật', [], true],
  ['sanaky', 'VH-8009K', 'tu-mat', 800, false, 22900000, 'Cửa trượt', ['project']],
];
freezers.forEach(([brand, model, sub, vol, inv, base, door, badges, flash]) => {
  const subName = { 'tu-dong': 'Tủ đông', 'tu-mat': 'Tủ mát', 'tu-dong-mat': 'Tủ đông mát' }[sub];
  const name = `${subName} ${brandName(brand)} ${inv ? 'Inverter ' : ''}${vol} lít ${model}`;
  const range = vol < 200 ? 'Dưới 200 lít' : vol < 400 ? '200 - 400 lít' : vol < 600 ? '400 - 600 lít' : 'Trên 600 lít';
  add({
    cat: 'tu-dong-tu-mat', sub, brand, name, basePrice: base, art: sub === 'tu-mat' ? 'cooler-cabinet' : 'freezer', badges, flashSale: !!flash,
    attrs: { volume: range, tech: inv ? 'Inverter' : 'Non-Inverter', door },
    short: `${vol} lít • ${door} • Dàn lạnh ống đồng`,
    highlights: [
      `Dung tích ${vol} lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp`,
      'Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền',
      inv ? 'Inverter tiết kiệm 30-40% điện năng' : 'Gas R600a thân thiện môi trường',
      'Có khóa an toàn, bánh xe di chuyển',
    ],
    specs: {
      'Loại tủ': subName, 'Dung tích': `${vol} lít`, 'Kiểu cửa': door,
      'Nhiệt độ': sub === 'tu-mat' ? '0°C ~ 10°C' : '-18°C ~ -24°C',
      'Dàn lạnh': 'Ống đồng', 'Công nghệ': inv ? 'Inverter' : 'Non-Inverter',
      'Xuất xứ': 'Việt Nam', 'Bảo hành': 'Máy 24 tháng, máy nén 36 tháng',
    },
  });
});

// ---------------------------------------------------------------- Máy giặt / sấy
const washers = [
  ['lg', 'FV1410S4B', 'cua-truoc', 10, true, 12990000, 'black', ['bestseller'], true],
  ['samsung', 'WW90T634DLE/SV', 'cua-truoc', 9, true, 11490000, 'white', ['hot']],
  ['electrolux', 'EWF9024P5WB', 'cua-truoc', 9, true, 10990000, 'white', []],
  ['panasonic', 'NA-FD10VR1BV', 'cua-tren', 10, true, 10490000, 'silver', []],
  ['toshiba', 'AW-M905BV(MK)', 'cua-tren', 8.5, false, 5490000, 'silver', [], true],
  ['aqua', 'AQW-S80CT', 'cua-tren', 8, false, 4290000, 'white', ['bestseller']],
  ['electrolux', 'EDV854J3WB', 'may-say', 8.5, false, 9990000, 'white', []],
  ['lg', 'DVHP09B', 'may-say', 9, true, 17990000, 'black', ['premium']],
];
washers.forEach(([brand, model, sub, kg, inv, base, color, badges, flash]) => {
  const subName = sub === 'may-say' ? 'Máy sấy' : 'Máy giặt';
  const name = `${subName} ${brandName(brand)} ${inv ? 'Inverter ' : ''}${kg} kg ${model}`;
  const range = kg < 8 ? 'Dưới 8 kg' : kg <= 9 ? (kg < 9 ? '8 - 9 kg' : '8 - 9 kg') : kg <= 10 ? '9 - 10 kg' : 'Trên 10 kg';
  add({
    cat: 'may-giat', sub, brand, name, basePrice: base, art: sub === 'cua-tren' ? 'washer-top' : 'washer', color, badges, flashSale: !!flash,
    attrs: { weight: range, tech: inv ? 'Inverter' : 'Non-Inverter' },
    short: `${kg} kg • ${categories[3].subs.find((s) => s.id === sub).name.replace('Máy giặt ', '')} • ${inv ? 'Inverter' : 'Tiết kiệm nước'}`,
    highlights: [
      `Khối lượng ${kg} kg - phù hợp gia đình 4-6 người`,
      inv ? 'Động cơ Inverter êm ái, bền bỉ' : 'Vận hành ổn định, dễ sử dụng',
      sub === 'may-say' ? 'Sấy bơm nhiệt / thông hơi, chống nhăn' : 'Giặt hơi nước diệt khuẩn 99.9%',
      'Khóa trẻ em, hẹn giờ kết thúc',
    ],
    specs: {
      'Loại máy': categories[3].subs.find((s) => s.id === sub).name, 'Khối lượng': `${kg} kg`,
      'Công nghệ': inv ? 'Inverter' : 'Non-Inverter', 'Tốc độ quay': sub === 'may-say' ? '-' : '1200 - 1400 vòng/phút',
      'Số chương trình': `${10 + (kg | 0)} chương trình`, 'Xuất xứ': pick(['Việt Nam', 'Thái Lan']), 'Bảo hành': '24 tháng, động cơ 10 năm',
    },
  });
});

// ---------------------------------------------------------------- Lọc không khí / hút ẩm
[
  ['sharp', 'FP-J30E-B', 'loc-khong-khi', 'Dưới 30 m²', 3490000, 'purifier', ['bestseller']],
  ['daikin', 'MC55UVM6', 'loc-khong-khi', '30 - 50 m²', 8990000, 'purifier', ['hot']],
  ['samsung', 'AX60R5080WD/SV', 'loc-khong-khi', 'Trên 50 m²', 9990000, 'purifier', ['premium']],
  ['sharp', 'DW-D20A-W', 'hut-am', '30 - 50 m²', 7490000, 'dehumidifier', []],
  ['kangaroo', 'KGDH20', 'hut-am', 'Dưới 30 m²', 3990000, 'dehumidifier', []],
].forEach(([brand, model, sub, room, base, art, badges]) => {
  const subName = sub === 'hut-am' ? 'Máy hút ẩm' : 'Máy lọc không khí';
  add({
    cat: 'loc-khong-khi', sub, brand, name: `${subName} ${brandName(brand)} ${model}`, basePrice: base, art, badges,
    attrs: { room },
    short: `Phòng ${room} • Lọc HEPA • Cảm biến bụi mịn PM2.5`,
    highlights: ['Màng lọc HEPA lọc 99.97% bụi mịn PM2.5', 'Cảm biến chất lượng không khí tự động', 'Vận hành êm chế độ ngủ', `Phù hợp phòng ${room}`],
    specs: { 'Loại máy': subName, 'Diện tích sử dụng': room, 'Màng lọc': 'HEPA + than hoạt tính', 'Độ ồn': '22 - 48 dB', 'Xuất xứ': 'Thái Lan', 'Bảo hành': '12 tháng' },
  });
});

// ---------------------------------------------------------------- Máy nước nóng
[
  ['ariston', 'SL2 20 RS 2.5 FE', 'gian-tiep', '15 - 20 lít', 3490000, ['bestseller']],
  ['ariston', 'AN2 30 LUX 2.5 FE', 'gian-tiep', '30 lít', 4990000, []],
  ['panasonic', 'DH-4RL1VW', 'truc-tiep', 'Trực tiếp', 3990000, ['hot']],
  ['kangaroo', 'KG69A3', 'gian-tiep', 'Trên 30 lít', 3290000, []],
  ['alaska', 'ALT-45', 'truc-tiep', 'Trực tiếp', 2190000, [], true],
].forEach(([brand, model, sub, volume, base, badges, flash]) => {
  add({
    cat: 'may-nuoc-nong', sub, brand, name: `Máy nước nóng ${sub === 'truc-tiep' ? 'trực tiếp' : 'gián tiếp'} ${brandName(brand)} ${model}`,
    basePrice: base, art: 'heater', badges, flashSale: !!flash, freeInstall: true,
    attrs: { volume },
    short: `${volume} • Chống giật ELCB • Tiết kiệm điện`,
    highlights: ['Chống giật ELCB an toàn tuyệt đối', 'Thanh đốt bằng đồng/titan bền bỉ', 'Làm nóng nhanh, giữ nhiệt lâu', 'Lắp đặt miễn phí nội thành'],
    specs: { 'Loại': sub === 'truc-tiep' ? 'Trực tiếp' : 'Gián tiếp', 'Dung tích': volume, 'Công suất': '2500 W', 'Chống giật': 'ELCB', 'Xuất xứ': 'Việt Nam', 'Bảo hành': 'Bình chứa 7 năm, linh kiện 24 tháng' },
  });
});

// ---------------------------------------------------------------- Quạt điều hòa
[
  ['kangaroo', 'KG50F79', 'gia-dinh', 'Dưới 30 lít', 2990000, ['bestseller'], true],
  ['sanaky', 'SNK-4500A', 'gia-dinh', '30 - 60 lít', 4190000, []],
  ['kangaroo', 'KG50F68', 'cong-nghiep', 'Trên 60 lít', 8990000, ['project']],
  ['dt', 'DT-AC18000', 'cong-nghiep', 'Trên 60 lít', 12900000, ['project']],
].forEach(([brand, model, sub, tank, base, badges, flash]) => {
  add({
    cat: 'quat-dieu-hoa', sub, brand, name: `Quạt điều hòa ${sub === 'cong-nghiep' ? 'công nghiệp ' : ''}${brandName(brand)} ${model}`,
    basePrice: base, art: 'cooler', badges, flashSale: !!flash,
    attrs: { tank },
    short: `Bình ${tank} • Làm mát bằng hơi nước • Tiết kiệm 80% điện`,
    highlights: ['Làm mát bằng hơi nước tự nhiên', 'Tiết kiệm đến 80% điện năng so với máy lạnh', sub === 'cong-nghiep' ? 'Phù hợp nhà xưởng, kho bãi, căng tin' : 'Phù hợp phòng khách, phòng ngủ', 'Điều khiển từ xa, hẹn giờ'],
    specs: { 'Loại': sub === 'cong-nghiep' ? 'Công nghiệp' : 'Gia đình', 'Dung tích bình nước': tank, 'Lưu lượng gió': sub === 'cong-nghiep' ? '18.000 m³/h' : '4.500 m³/h', 'Xuất xứ': 'Việt Nam', 'Bảo hành': '12 tháng' },
  });
});

// ---------------------------------------------------------------- Vật tư điện lạnh (B2B)
[
  ['dt', 'Ống đồng máy lạnh Thái Lan 6/10 (cuộn 15m)', 'ong-dong', 'Ống đồng', 1890000, 'pipe'],
  ['dt', 'Ống đồng máy lạnh 6/12 dày 0.71mm (cuộn 15m)', 'ong-dong', 'Ống đồng', 2290000, 'pipe'],
  ['dt', 'Gas lạnh R32 Chemours bình 9kg', 'gas', 'Gas lạnh', 2490000, 'gas'],
  ['dt', 'Gas lạnh R410A Honeywell bình 11.3kg', 'gas', 'Gas lạnh', 3290000, 'gas'],
  ['dt', 'Giá đỡ cục nóng máy lạnh 1-2.5HP inox', 'phu-kien', 'Giá đỡ', 390000, 'bracket'],
  ['dt', 'Ống thoát nước ruột gà máy lạnh (cuộn 50m)', 'phu-kien', 'Ống thoát nước', 290000, 'pipe-drain'],
  ['dt', 'Bộ đồng hồ nạp gas Value VMG-2-R32', 'phu-kien', 'Dụng cụ', 1590000, 'gauge'],
].forEach(([brand, name, sub, kind, base, art]) => {
  add({
    cat: 'vat-tu-dien-lanh', sub, brand, name, basePrice: base, art, badges: ['b2b'], discount: 0.05,
    attrs: { kind },
    short: 'Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án',
    highlights: ['Hàng chính hãng, đầy đủ CO/CQ', 'Giá sỉ theo số lượng cho thợ, đại lý, dự án', 'Xuất hóa đơn VAT', 'Giao nhanh 2h nội thành'],
    specs: { 'Loại vật tư': kind, 'Đơn vị tính': 'Cuộn / Bình / Bộ', 'Chứng từ': 'CO/CQ, hóa đơn VAT', 'Xuất xứ': pick(['Thái Lan', 'Mỹ', 'Việt Nam']), 'Bảo hành': '12 tháng (lỗi NSX)' },
    warranty: '12 tháng',
  });
});

// ---------------------------------------------------------------- Ghi file
const header = `// FILE TỰ SINH bởi tools/generate-catalog.mjs - không sửa tay.\n// Giai đoạn 2: dữ liệu này sẽ được thay bằng API từ backend/admin.\nwindow.DT = window.DT || {};\n`;
const body = [
  `DT.brands = ${JSON.stringify(brands, null, 1)};`,
  `DT.priceRanges = ${JSON.stringify(PRICE_RANGES.map((r) => ({ ...r, max: r.max === Infinity ? null : r.max })), null, 1)};`,
  `DT.categories = ${JSON.stringify(categories, null, 1)};`,
  `DT.products = ${JSON.stringify(products)};`,
].join('\n');
writeFileSync(OUT, header + body + '\n');
console.log(`Đã sinh ${products.length} sản phẩm, ${categories.length} danh mục, ${brands.length} thương hiệu -> ${OUT}`);
