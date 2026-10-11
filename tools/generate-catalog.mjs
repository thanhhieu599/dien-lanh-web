// Sinh dữ liệu mẫu (danh mục, thương hiệu, sản phẩm) cho frontend.
// Chạy: node tools/generate-catalog.mjs  -> ghi đè frontend/assets/js/data/catalog.js
// Ở giai đoạn 2 (backend), file này dùng lại làm seed cho database.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../frontend/assets/js/data/catalog.js');

// ---------------------------------------------------------------- Thương hiệu
// Bản demo: chưa gắn thương hiệu thật. Khi có hàng thật, thêm thương hiệu trong trang quản trị.
const brands = [
  { id: 'thuong-hieu', name: 'Tên thương hiệu', origin: '', color: '#475467' },
];
const BRAND = brands[0].id;

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
const slugs = new Set();
let idSeq = 1001;
function add(p) {
  const id = idSeq++;
  const discount = p.discount ?? pick([0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25]);
  const price = round(p.basePrice * (1 - discount));
  const name = p.name;
  products.push({
    id,
    sku: `DT${id}`,
    slug: slugs.has(slugify(name)) ? `${slugify(name)}-${id}` : (slugs.add(slugify(name)), slugify(name)),
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
    images: [], // Bản demo: chưa có ảnh; ảnh thật upload trong trang quản trị
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
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 10900000, ['hot'], true],
  [BRAND, 'treo-tuong', '1.5 HP', true, '1 chiều', 13400000, ['hot'], true],
  [BRAND, 'treo-tuong', '2 HP', true, '2 chiều', 22900000, ['new']],
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 14990000, ['premium'], true],
  [BRAND, 'treo-tuong', '1.5 HP', true, '1 chiều', 13590000, []],
  [BRAND, 'treo-tuong', '1.5 HP', true, '1 chiều', 14490000, ['hot']],
  [BRAND, 'treo-tuong', '1 HP', true, '2 chiều', 12990000, []],
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 9990000, [], true],
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 9490000, ['bestseller'], true],
  [BRAND, 'treo-tuong', '1.5 HP', true, '1 chiều', 13990000, ['new']],
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 10490000, []],
  [BRAND, 'treo-tuong', '1.5 HP', true, '1 chiều', 12890000, []],
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 6990000, ['bestseller'], true],
  [BRAND, 'treo-tuong', '1.5 HP', false, '1 chiều', 7490000, []],
  [BRAND, 'treo-tuong', '1 HP', false, '1 chiều', 6490000, [], true],
  [BRAND, 'treo-tuong', '1 HP', true, '1 chiều', 8490000, []],
  [BRAND, 'treo-tuong', '1.5 HP', true, '1 chiều', 11290000, []],
  [BRAND, 'am-tran', '3 HP', true, '1 chiều', 38900000, ['project']],
  [BRAND, 'am-tran', '4 HP', true, '1 chiều', 45900000, ['project']],
  [BRAND, 'am-tran', '2 HP', true, '1 chiều', 27900000, ['project']],
  [BRAND, 'tu-dung', '4 HP', true, '1 chiều', 52900000, ['project']],
  [BRAND, 'tu-dung', '2.5 HP', false, '1 chiều', 26900000, []],
  [BRAND, 'ong-gio', '2 HP', true, '1 chiều', 31900000, ['project']],
  [BRAND, 'ong-gio', '5 HP', false, '1 chiều', 49900000, ['project']],
];
acs.forEach(([brand, sub, hp, inv, type, base, badges, flash], i) => {
  const subName = { 'treo-tuong': 'Máy lạnh', 'am-tran': 'Máy lạnh âm trần', 'tu-dung': 'Máy lạnh tủ đứng', 'ong-gio': 'Máy lạnh giấu trần ống gió' }[sub];
  const art = { 'treo-tuong': 'ac', 'am-tran': 'ac-cassette', 'tu-dung': 'ac-floor', 'ong-gio': 'ac-duct' }[sub];
  const name = `${subName} ${brandName(brand)} ${inv ? 'Inverter ' : ''}${hp}`;
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
      `Bảo hành máy nén 5 năm chính hãng`,
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
      'Bảo hành': `Máy 24 tháng, máy nén 5 năm`,
    },
  });
});

// ---------------------------------------------------------------- Tủ lạnh
const familyByVol = (v) => (v < 150 ? '1 - 2 người' : v < 300 ? '3 - 4 người' : v < 450 ? '5 - 6 người' : 'Trên 6 người');
const volRange = (v) => (v < 150 ? 'Dưới 150 lít' : v < 300 ? '150 - 300 lít' : v < 450 ? '300 - 450 lít' : v < 600 ? '450 - 600 lít' : 'Trên 600 lít');
const fridges = [
  [BRAND, 'ngan-da-tren', 236, true, 6490000, 'silver', ['bestseller'], true],
  [BRAND, 'ngan-da-duoi', 306, true, 13990000, 'black', ['hot']],
  [BRAND, 'ngan-da-tren', 264, true, 7990000, 'silver', []],
  [BRAND, 'side-by-side', 635, true, 28990000, 'silver', ['premium']],
  [BRAND, 'side-by-side', 647, true, 24990000, 'black', ['hot'], true],
  [BRAND, 'ngan-da-tren', 249, true, 6890000, 'silver', []],
  [BRAND, 'ngan-da-tren', 212, true, 5490000, 'silver', [], true],
  [BRAND, 'nhieu-cua', 540, true, 39900000, 'gold', ['premium']],
  [BRAND, 'nhieu-cua', 626, true, 31990000, 'black', ['new']],
  [BRAND, 'ngan-da-duoi', 335, true, 13490000, 'black', []],
  [BRAND, 'mini', 90, false, 3490000, 'silver', []],
  [BRAND, 'mini', 140, false, 4290000, 'silver', []],
];
fridges.forEach(([brand, sub, vol, inv, base, color, badges, flash]) => {
  const art = { 'side-by-side': 'fridge-sbs', 'nhieu-cua': 'fridge-multi', mini: 'fridge-mini' }[sub] || 'fridge';
  const name = `Tủ lạnh ${brandName(brand)} ${inv ? 'Inverter ' : ''}${vol} lít`;
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
  [BRAND, 'tu-dong', 400, true, 9990000, 'Cửa lật', ['bestseller']],
  [BRAND, 'tu-mat', 300, false, 7490000, 'Cửa kính', []],
  [BRAND, 'tu-dong-mat', 500, false, 10490000, 'Cửa lật', []],
  [BRAND, 'tu-mat', 600, true, 15990000, 'Cửa kính', ['project']],
  [BRAND, 'tu-dong', 365, false, 7990000, 'Cửa lật', [], true],
  [BRAND, 'tu-mat', 800, false, 22900000, 'Cửa trượt', ['project']],
];
freezers.forEach(([brand, sub, vol, inv, base, door, badges, flash]) => {
  const subName = { 'tu-dong': 'Tủ đông', 'tu-mat': 'Tủ mát', 'tu-dong-mat': 'Tủ đông mát' }[sub];
  const name = `${subName} ${brandName(brand)} ${inv ? 'Inverter ' : ''}${vol} lít`;
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
  [BRAND, 'cua-truoc', 10, true, 12990000, 'black', ['bestseller'], true],
  [BRAND, 'cua-truoc', 9, true, 11490000, 'white', ['hot']],
  [BRAND, 'cua-truoc', 9, true, 10990000, 'white', []],
  [BRAND, 'cua-tren', 10, true, 10490000, 'silver', []],
  [BRAND, 'cua-tren', 8.5, false, 5490000, 'silver', [], true],
  [BRAND, 'cua-tren', 8, false, 4290000, 'white', ['bestseller']],
  [BRAND, 'may-say', 8.5, false, 9990000, 'white', []],
  [BRAND, 'may-say', 9, true, 17990000, 'black', ['premium']],
];
washers.forEach(([brand, sub, kg, inv, base, color, badges, flash]) => {
  const subName = sub === 'may-say' ? 'Máy sấy' : 'Máy giặt';
  const name = `${subName} ${brandName(brand)} ${inv ? 'Inverter ' : ''}${kg} kg`;
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
  [BRAND, 'loc-khong-khi', 'Dưới 30 m²', 3490000, 'purifier', ['bestseller']],
  [BRAND, 'loc-khong-khi', '30 - 50 m²', 8990000, 'purifier', ['hot']],
  [BRAND, 'loc-khong-khi', 'Trên 50 m²', 9990000, 'purifier', ['premium']],
  [BRAND, 'hut-am', '30 - 50 m²', 7490000, 'dehumidifier', []],
  [BRAND, 'hut-am', 'Dưới 30 m²', 3990000, 'dehumidifier', []],
].forEach(([brand, sub, room, base, art, badges]) => {
  const subName = sub === 'hut-am' ? 'Máy hút ẩm' : 'Máy lọc không khí';
  add({
    cat: 'loc-khong-khi', sub, brand, name: `${subName} ${brandName(brand)}`, basePrice: base, art, badges,
    attrs: { room },
    short: `Phòng ${room} • Lọc HEPA • Cảm biến bụi mịn PM2.5`,
    highlights: ['Màng lọc HEPA lọc 99.97% bụi mịn PM2.5', 'Cảm biến chất lượng không khí tự động', 'Vận hành êm chế độ ngủ', `Phù hợp phòng ${room}`],
    specs: { 'Loại máy': subName, 'Diện tích sử dụng': room, 'Màng lọc': 'HEPA + than hoạt tính', 'Độ ồn': '22 - 48 dB', 'Xuất xứ': 'Thái Lan', 'Bảo hành': '12 tháng' },
  });
});

// ---------------------------------------------------------------- Máy nước nóng
[
  [BRAND, 'gian-tiep', '15 - 20 lít', 3490000, ['bestseller']],
  [BRAND, 'gian-tiep', '30 lít', 4990000, []],
  [BRAND, 'truc-tiep', 'Trực tiếp', 3990000, ['hot']],
  [BRAND, 'gian-tiep', 'Trên 30 lít', 3290000, []],
  [BRAND, 'truc-tiep', 'Trực tiếp', 2190000, [], true],
].forEach(([brand, sub, volume, base, badges, flash]) => {
  add({
    cat: 'may-nuoc-nong', sub, brand, name: `Máy nước nóng ${sub === 'truc-tiep' ? 'trực tiếp' : 'gián tiếp'} ${brandName(brand)}`,
    basePrice: base, art: 'heater', badges, flashSale: !!flash, freeInstall: true,
    attrs: { volume },
    short: `${volume} • Chống giật ELCB • Tiết kiệm điện`,
    highlights: ['Chống giật ELCB an toàn tuyệt đối', 'Thanh đốt bằng đồng/titan bền bỉ', 'Làm nóng nhanh, giữ nhiệt lâu', 'Lắp đặt miễn phí nội thành'],
    specs: { 'Loại': sub === 'truc-tiep' ? 'Trực tiếp' : 'Gián tiếp', 'Dung tích': volume, 'Công suất': '2500 W', 'Chống giật': 'ELCB', 'Xuất xứ': 'Việt Nam', 'Bảo hành': 'Bình chứa 7 năm, linh kiện 24 tháng' },
  });
});

// ---------------------------------------------------------------- Quạt điều hòa
[
  [BRAND, 'gia-dinh', 'Dưới 30 lít', 2990000, ['bestseller'], true],
  [BRAND, 'gia-dinh', '30 - 60 lít', 4190000, []],
  [BRAND, 'cong-nghiep', 'Trên 60 lít', 8990000, ['project']],
  [BRAND, 'cong-nghiep', 'Trên 60 lít', 12900000, ['project']],
].forEach(([brand, sub, tank, base, badges, flash]) => {
  add({
    cat: 'quat-dieu-hoa', sub, brand, name: `Quạt điều hòa ${sub === 'cong-nghiep' ? 'công nghiệp ' : ''}${brandName(brand)}`,
    basePrice: base, art: 'cooler', badges, flashSale: !!flash,
    attrs: { tank },
    short: `Bình ${tank} • Làm mát bằng hơi nước • Tiết kiệm 80% điện`,
    highlights: ['Làm mát bằng hơi nước tự nhiên', 'Tiết kiệm đến 80% điện năng so với máy lạnh', sub === 'cong-nghiep' ? 'Phù hợp nhà xưởng, kho bãi, căng tin' : 'Phù hợp phòng khách, phòng ngủ', 'Điều khiển từ xa, hẹn giờ'],
    specs: { 'Loại': sub === 'cong-nghiep' ? 'Công nghiệp' : 'Gia đình', 'Dung tích bình nước': tank, 'Lưu lượng gió': sub === 'cong-nghiep' ? '18.000 m³/h' : '4.500 m³/h', 'Xuất xứ': 'Việt Nam', 'Bảo hành': '12 tháng' },
  });
});

// ---------------------------------------------------------------- Vật tư điện lạnh (B2B)
[
  [BRAND, 'Ống đồng máy lạnh Thái Lan 6/10 (cuộn 15m)', 'ong-dong', 'Ống đồng', 1890000, 'pipe'],
  [BRAND, 'Ống đồng máy lạnh 6/12 dày 0.71mm (cuộn 15m)', 'ong-dong', 'Ống đồng', 2290000, 'pipe'],
  [BRAND, 'Gas lạnh R32 bình 9kg', 'gas', 'Gas lạnh', 2490000, 'gas'],
  [BRAND, 'Gas lạnh R410A bình 11.3kg', 'gas', 'Gas lạnh', 3290000, 'gas'],
  [BRAND, 'Giá đỡ cục nóng máy lạnh 1-2.5HP inox', 'phu-kien', 'Giá đỡ', 390000, 'bracket'],
  [BRAND, 'Ống thoát nước ruột gà máy lạnh (cuộn 50m)', 'phu-kien', 'Ống thoát nước', 290000, 'pipe-drain'],
  [BRAND, 'Bộ đồng hồ nạp gas R32', 'phu-kien', 'Dụng cụ', 1590000, 'gauge'],
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
