// Cấu hình cửa hàng & nội dung tĩnh. Sửa thông tin doanh nghiệp tại đây.
window.DT = window.DT || {};

DT.config = {
  name: 'Tên thương hiệu',
  slogan: 'Mát lạnh chính hãng - Lắp đặt tận tâm',
  company: 'TÊN CÔNG TY',
  taxCode: '0300000000',
  hotline: '1900 6868',
  hotlineB2B: '0909 000 000',
  email: 'email@tencongty.vn',
  zalo: 'https://zalo.me/0909000000',
  messenger: '',      // link Messenger của fanpage, vd https://m.me/ten-fanpage (để trống = ẩn)
  facebook: 'https://facebook.com/',
  youtube: 'https://youtube.com/',
  address: 'TP. Hồ Chí Minh, Việt Nam',
  workingHours: '7:30 - 21:30 (Cả CN & ngày lễ)',
  openTime: '07:30',   // giờ mở / đóng cửa: khung chat & form tự hẹn giờ gọi lại khi ngoài giờ
  closeTime: '21:30',
  freeShipThreshold: 2000000,
  shippingFee: 50000,
  installFee: 300000,
  // Tài khoản nhận chuyển khoản (sửa trong Quản trị > Cài đặt cửa hàng). bankBin: mã ngân hàng theo chuẩn VietQR
  // (Vietcombank 970436, Techcombank 970407, MB 970422, ACB 970416, BIDV 970418, VietinBank 970415, VPBank 970432)
  bankName: 'Vietcombank - CN TP.HCM',
  bankBin: '970436',
  bankAccount: '0071000000000',
  bankOwner: 'TEN CONG TY',
};

// Ảnh trang Tầm nhìn & Sứ mệnh: quản lý trong Quản trị > Trang Tầm nhìn & Sứ mệnh.
// Có database: link ảnh lưu ở settings 'vision'. Chế độ demo: lưu trên trình duyệt (localStorage).
DT.visionSlots = [
  { key: 'hero', label: 'Ảnh lớn đầu trang', hint: 'Trụ sở / toàn cảnh công ty', size: '1200 × 1500 px (dọc)' },
  { key: 'tam-nhin', label: 'Tầm nhìn - ảnh lớn', hint: 'Công trình / dự án tiêu biểu', size: '1200 × 1500 px (dọc)' },
  { key: 'doi-ngu', label: 'Tầm nhìn - ảnh nhỏ', hint: 'Đội ngũ kỹ thuật', size: '800 × 800 px' },
  { key: 'gia-tri', label: 'Giá trị cốt lõi', hint: 'Hoạt động / văn hóa công ty', size: '1600 × 1000 px (ngang)' },
  { key: 'anh-1', label: 'Thư viện ảnh 1', hint: 'Showroom', size: '1600 × 1000 px' },
  { key: 'anh-2', label: 'Thư viện ảnh 2', hint: 'Thi công công trình', size: '800 × 1000 px' },
  { key: 'anh-3', label: 'Thư viện ảnh 3', hint: 'Đào tạo kỹ thuật', size: '800 × 800 px' },
  { key: 'anh-4', label: 'Thư viện ảnh 4', hint: 'Ký kết hợp tác', size: '800 × 800 px' },
  { key: 'anh-5', label: 'Thư viện ảnh 5', hint: 'Hoạt động cộng đồng', size: '1600 × 800 px' },
  { key: 'lanh-dao', label: 'Thông điệp lãnh đạo', hint: 'Chân dung Giám đốc', size: '900 × 1200 px (dọc)' },
];
DT.VISION_DEMO_KEY = 'dt_vision_v1';
// Bản demo: ảnh sản phẩm tải lên ở trang quản trị demo -> website demo (cùng trình duyệt) hiển thị
DT.PRODUCT_IMG_DEMO_KEY = 'dt_product_images_v1';
DT.visionImages = () => {
  if (DT.backend?.enabled) return DT.vision?.images || {};
  try { return JSON.parse(localStorage.getItem(DT.VISION_DEMO_KEY) || '{}').images || {}; } catch { return {}; }
};

// Phụ kiện mua kèm máy lạnh (combo lắp đặt trọn gói), theo mã SKU sản phẩm vật tư.
// subs: chỉ áp dụng loại máy; maxHp/minHp: theo công suất máy
DT.bundleRules = [
  { sku: 'DT1065', note: 'Đủ cho 1 bộ máy ≤ 1.5 HP', subs: ['treo-tuong'], maxHp: 1.5 },
  { sku: 'DT1066', note: 'Dùng cho máy 2 HP', subs: ['treo-tuong'], minHp: 2, maxHp: 2 },
  { sku: 'DT1069', note: 'Inox chống gỉ, chịu lực tốt', subs: ['treo-tuong'], maxHp: 2.5 },
  { sku: 'DT1070', note: 'Thoát nước ngưng, chống đọng', subs: ['treo-tuong', 'am-tran', 'tu-dung', 'ong-gio'] },
];

// Mã giảm giá demo (giai đoạn 2 quản lý trong admin)
DT.coupons = [
  { code: 'COOL10', type: 'percent', value: 10, max: 1000000, min: 5000000, desc: 'Giảm 10% tối đa 1 triệu cho đơn từ 5 triệu' },
  { code: 'GIAM300K', type: 'fixed', value: 300000, min: 3000000, desc: 'Giảm 300.000₫ cho đơn từ 3 triệu' },
  { code: 'FREESHIP', type: 'ship', value: 0, min: 0, desc: 'Miễn phí vận chuyển mọi đơn hàng' },
];

DT.banners = [
  { title: 'Siêu sale máy lạnh Inverter', sub: 'Giảm đến 25% • Miễn phí lắp đặt • Trả góp 0%', cta: 'Mua ngay', href: 'danh-muc.html?cat=may-lanh', theme: 'blue', art: 'ac' },
  { title: 'Tủ lạnh thông minh - Giữ tươi gấp đôi', sub: 'Tặng hộp bảo quản cao cấp cho đơn từ 10 triệu', cta: 'Khám phá', href: 'danh-muc.html?cat=tu-lanh', theme: 'navy', art: 'fridge-sbs' },
  { title: 'Giải pháp điều hòa cho nhà xưởng & văn phòng', sub: 'Khảo sát miễn phí • Báo giá dự án trong 24h • Xuất VAT', cta: 'Nhận báo giá', href: 'bao-gia-du-an.html', theme: 'teal', art: 'ac-cassette' },
  { title: 'Vệ sinh máy lạnh chỉ từ 150K', sub: 'Thợ chuyên nghiệp • Có mặt trong 2h • Bảo hành 30 ngày', cta: 'Đặt lịch', href: 'dich-vu.html', theme: 'orange', art: 'ac' },
];

DT.services = [
  { id: 've-sinh', name: 'Vệ sinh máy lạnh', price: 150000, unit: 'máy', icon: 'spray', desc: 'Vệ sinh dàn lạnh, dàn nóng, kiểm tra gas, bảo hành 30 ngày.' },
  { id: 'lap-dat', name: 'Lắp đặt máy lạnh', price: 300000, unit: 'bộ', icon: 'tool', desc: 'Lắp đặt chuẩn kỹ thuật hãng, test vận hành, bàn giao hướng dẫn.' },
  { id: 'nap-gas', name: 'Nạp gas máy lạnh', price: 250000, unit: 'máy', icon: 'snow', desc: 'Nạp gas R32/R410A/R22 chính hãng, đo áp suất chuẩn.' },
  { id: 'sua-chua', name: 'Sửa chữa điện lạnh', price: 200000, unit: 'lần', icon: 'wrench', desc: 'Sửa máy lạnh, tủ lạnh, máy giặt tại nhà, báo giá trước khi sửa.' },
  { id: 'bao-tri', name: 'Bảo trì định kỳ doanh nghiệp', price: 0, unit: 'hợp đồng', icon: 'building', desc: 'Hợp đồng bảo trì cho văn phòng, nhà máy, có báo cáo định kỳ.' },
  { id: 'thao-lap', name: 'Tháo lắp, di dời máy lạnh', price: 400000, unit: 'bộ', icon: 'truck', desc: 'Tháo, di dời, lắp lại, thay ống đồng nếu cần.' },
];

DT.stores = [
  { id: 1, name: 'Tên thương hiệu - Quận 7', city: 'TP. Hồ Chí Minh', address: '123 Nguyễn Thị Thập, P. Tân Phú, Quận 7', phone: '028 3700 0001', hours: '8:00 - 21:00', map: 'Nguyễn Thị Thập Quận 7' },
  { id: 2, name: 'Tên thương hiệu - Thủ Đức', city: 'TP. Hồ Chí Minh', address: '456 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức', phone: '028 3700 0002', hours: '8:00 - 21:00', map: 'Võ Văn Ngân Thủ Đức' },
  { id: 3, name: 'Tên thương hiệu - Tân Bình', city: 'TP. Hồ Chí Minh', address: '789 Cộng Hòa, P. 13, Q. Tân Bình', phone: '028 3700 0003', hours: '8:00 - 21:00', map: 'Cộng Hòa Tân Bình' },
  { id: 4, name: 'Tên thương hiệu - Biên Hòa', city: 'Đồng Nai', address: '12 Phạm Văn Thuận, P. Tân Mai, TP. Biên Hòa', phone: '0251 370 0004', hours: '8:00 - 20:30', map: 'Phạm Văn Thuận Biên Hòa' },
  { id: 5, name: 'Tên thương hiệu - Thủ Dầu Một', city: 'Bình Dương', address: '34 Đại lộ Bình Dương, P. Phú Hòa, TP. Thủ Dầu Một', phone: '0274 370 0005', hours: '8:00 - 20:30', map: 'Đại lộ Bình Dương Thủ Dầu Một' },
];

DT.posts = [
  {
    slug: 'cach-chon-cong-suat-may-lanh-theo-dien-tich',
    title: 'Cách chọn công suất máy lạnh theo diện tích phòng (bảng tra chuẩn)',
    cat: 'Tư vấn chọn mua', date: '2026-09-28', author: 'Phòng Kỹ thuật', art: 'ac',
    excerpt: 'Chọn sai công suất khiến máy lạnh chạy quá tải, tốn điện và nhanh hỏng. Bảng tra BTU theo m² dưới đây giúp bạn chọn đúng ngay lần đầu.',
    content: `<p>Công suất máy lạnh (HP hoặc BTU) quyết định khả năng làm lạnh và mức tiêu thụ điện. Nguyên tắc cơ bản: <strong>1 m² cần khoảng 600 BTU</strong> với phòng tiêu chuẩn cao 3m, ít nắng.</p>
<h2>Bảng tra nhanh</h2>
<table><thead><tr><th>Diện tích phòng</th><th>Công suất đề xuất</th></tr></thead><tbody>
<tr><td>Dưới 15 m²</td><td>1 HP (9.000 BTU)</td></tr>
<tr><td>15 - 20 m²</td><td>1.5 HP (12.000 BTU)</td></tr>
<tr><td>20 - 30 m²</td><td>2 HP (18.000 BTU)</td></tr>
<tr><td>30 - 40 m²</td><td>2.5 HP (24.000 BTU)</td></tr>
<tr><td>Trên 40 m²</td><td>Âm trần / tủ đứng 3 - 5 HP</td></tr></tbody></table>
<h2>Các yếu tố cần cộng thêm công suất</h2>
<ul><li>Phòng hướng Tây, mái tôn, nhiều kính: cộng thêm 15 - 20%.</li><li>Phòng đông người (văn phòng, quán ăn): cộng 500 BTU/người từ người thứ 3.</li><li>Có thiết bị tỏa nhiệt (máy chủ, bếp): khảo sát thực tế.</li></ul>
<h2>Nên chọn Inverter hay thường?</h2>
<p>Nếu dùng trên 6 giờ/ngày, Inverter giúp tiết kiệm 30 - 60% điện, thời gian hoàn vốn chênh lệch giá thường dưới 2 năm.</p>`,
  },
  {
    slug: 've-sinh-may-lanh-bao-lau-mot-lan',
    title: 'Bao lâu nên vệ sinh máy lạnh một lần? Dấu hiệu cần vệ sinh ngay',
    cat: 'Mẹo sử dụng', date: '2026-09-20', author: 'Phòng Kỹ thuật', art: 'ac',
    excerpt: 'Máy lạnh bẩn tiêu tốn thêm 15 - 25% điện năng và là nơi vi khuẩn phát triển. Đây là lịch vệ sinh khuyến nghị cho gia đình và văn phòng.',
    content: `<p>Lịch vệ sinh khuyến nghị: <strong>gia đình 3 - 6 tháng/lần</strong>, <strong>văn phòng, nhà hàng 2 - 3 tháng/lần</strong>, nhà xưởng nhiều bụi 1 - 2 tháng/lần.</p>
<h2>Dấu hiệu cần vệ sinh ngay</h2><ul><li>Máy làm lạnh yếu, chạy lâu mới mát.</li><li>Có mùi hôi khi bật máy.</li><li>Chảy nước ở dàn lạnh.</li><li>Tiền điện tăng bất thường.</li></ul>
<p>Chúng tôi cung cấp dịch vụ vệ sinh chỉ từ 150.000₫/máy, có mặt trong 2 giờ tại nội thành, bảo hành 30 ngày.</p>`,
  },
  {
    slug: 'so-sanh-tu-lanh-inverter-va-thuong',
    title: 'Tủ lạnh Inverter và tủ lạnh thường: Có đáng để trả thêm tiền?',
    cat: 'Tư vấn chọn mua', date: '2026-09-12', author: 'Ban biên tập', art: 'fridge',
    excerpt: 'Phân tích chi phí điện năng thực tế trong 5 năm giữa tủ lạnh Inverter và tủ lạnh thường cùng dung tích.',
    content: `<p>Tủ lạnh chạy 24/7 nên điện năng là chi phí lớn nhất trong vòng đời sản phẩm. Với tủ 300 lít, bản Inverter tiêu thụ khoảng 0.9 kWh/ngày so với 1.4 kWh/ngày của bản thường.</p>
<h2>Tính toán 5 năm</h2><p>Chênh lệch 0.5 kWh × 365 ngày × 5 năm × 3.000₫ ≈ <strong>2.7 triệu đồng</strong> - thường lớn hơn chênh lệch giá mua.</p>
<h2>Kết luận</h2><p>Nên chọn Inverter cho gia đình từ 3 người trở lên hoặc tủ trên 250 lít.</p>`,
  },
  {
    slug: 'giai-phap-dieu-hoa-cho-nha-xuong',
    title: 'Giải pháp làm mát nhà xưởng: Điều hòa trung tâm, âm trần hay quạt hơi nước?',
    cat: 'Giải pháp doanh nghiệp', date: '2026-09-05', author: 'Phòng Dự án', art: 'ac-cassette',
    excerpt: 'So sánh chi phí đầu tư, vận hành và hiệu quả của 3 giải pháp làm mát phổ biến cho nhà xưởng, kho bãi tại Việt Nam.',
    content: `<p>Lựa chọn giải pháp làm mát nhà xưởng cần cân bằng giữa <strong>chi phí đầu tư (CAPEX)</strong>, <strong>chi phí vận hành (OPEX)</strong> và yêu cầu nhiệt độ của quy trình sản xuất.</p>
<table><thead><tr><th>Giải pháp</th><th>Phù hợp</th><th>Chi phí đầu tư</th></tr></thead><tbody>
<tr><td>Quạt điều hòa công nghiệp</td><td>Xưởng thông thoáng, cần giảm 3-5°C</td><td>Thấp</td></tr>
<tr><td>Máy lạnh âm trần / tủ đứng</td><td>Văn phòng xưởng, phòng QC, khu đóng gói</td><td>Trung bình</td></tr>
<tr><td>VRV/VRF, Chiller</td><td>Phòng sạch, nhà máy điện tử, kiểm soát nhiệt ẩm</td><td>Cao</td></tr></tbody></table>
<p>Liên hệ phòng dự án của chúng tôi để được khảo sát và đề xuất phương án miễn phí.</p>`,
  },
  {
    slug: 'gas-r32-va-r410a-khac-nhau-the-nao',
    title: 'Gas R32 và R410A khác nhau thế nào? Lưu ý khi nạp gas',
    cat: 'Kiến thức kỹ thuật', date: '2026-08-27', author: 'Phòng Kỹ thuật', art: 'gas',
    excerpt: 'R32 đang thay thế R410A trên hầu hết dòng máy mới. Hiểu sự khác biệt để bảo dưỡng đúng cách và an toàn.',
    content: `<p>R32 có chỉ số làm nóng toàn cầu (GWP) khoảng 675, chỉ bằng 1/3 R410A (2088), hiệu suất truyền nhiệt cao hơn.</p><h2>Lưu ý</h2><ul><li>Không nạp lẫn các loại gas.</li><li>R32 dễ cháy nhẹ (A2L) - cần thợ có chứng chỉ và dụng cụ phù hợp.</li><li>Dùng đồng hồ nạp gas đúng chuẩn.</li></ul>`,
  },
  {
    slug: 'meo-tiet-kiem-dien-mua-nong',
    title: '7 mẹo dùng máy lạnh tiết kiệm điện mùa nóng',
    cat: 'Mẹo sử dụng', date: '2026-08-15', author: 'Ban biên tập', art: 'ac',
    excerpt: 'Để máy ở 26 - 27°C, kết hợp quạt và vệ sinh định kỳ có thể giảm 20 - 30% tiền điện mỗi tháng.',
    content: `<ol><li>Đặt nhiệt độ 26 - 27°C.</li><li>Kết hợp quạt để lưu thông khí.</li><li>Đóng kín cửa, dùng rèm cản nắng.</li><li>Vệ sinh lưới lọc 2 tuần/lần.</li><li>Dùng chế độ ngủ ban đêm.</li><li>Không bật/tắt liên tục.</li><li>Đặt dàn nóng nơi thoáng, tránh nắng trực tiếp.</li></ol>`,
  },
];

DT.policies = {
  'bao-hanh': { title: 'Chính sách bảo hành', body: `<p>Tất cả sản phẩm tại cửa hàng là hàng chính hãng, được bảo hành theo tiêu chuẩn của nhà sản xuất.</p><ul><li>Bảo hành tại nhà đối với máy lạnh, tủ lạnh, máy giặt.</li><li>Tiếp nhận bảo hành qua hotline ${'1900 6868'} hoặc tại showroom.</li><li>Thời gian xử lý: 24 - 72 giờ làm việc.</li></ul><p>Không bảo hành với các trường hợp: hư hỏng do thiên tai, sử dụng sai hướng dẫn, tự ý tháo dỡ sửa chữa.</p>` },
  'doi-tra': { title: 'Chính sách đổi trả', body: `<ul><li><strong>1 đổi 1 trong 30 ngày</strong> nếu lỗi do nhà sản xuất.</li><li>Đổi sang sản phẩm khác trong 7 ngày (sản phẩm còn nguyên hộp, chưa lắp đặt), phí 10%.</li><li>Hoàn tiền trong 3 - 5 ngày làm việc sau khi nhận lại hàng.</li></ul>` },
  'van-chuyen': { title: 'Chính sách vận chuyển & lắp đặt', body: `<ul><li>Miễn phí giao hàng nội thành cho đơn từ 2.000.000₫.</li><li>Giao nhanh trong 2 - 4 giờ tại TP.HCM, Bình Dương, Đồng Nai.</li><li>Miễn phí lắp đặt máy lạnh treo tường có biểu tượng "Miễn phí lắp đặt" (chưa bao gồm vật tư ống đồng ngoài 3m tiêu chuẩn).</li></ul>` },
  'tra-gop': { title: 'Hướng dẫn mua trả góp', body: `<ul><li>Trả góp 0% qua thẻ tín dụng của 25+ ngân hàng.</li><li>Trả góp qua công ty tài chính: chỉ cần CCCD, duyệt hồ sơ 15 phút.</li><li>Kỳ hạn 3 - 12 tháng, trả trước từ 0%.</li></ul>` },
  'bao-mat': { title: 'Chính sách bảo mật thông tin', body: `<p>Chúng tôi cam kết bảo mật thông tin khách hàng theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Thông tin chỉ được dùng để xử lý đơn hàng, giao hàng, bảo hành và chăm sóc khách hàng.</p>` },
  'thanh-toan': { title: 'Phương thức thanh toán', body: `<ul><li>Thanh toán khi nhận hàng (COD).</li><li>Chuyển khoản ngân hàng / QR.</li><li>Thẻ ATM, Visa, Master, JCB qua cổng thanh toán.</li><li>Ví điện tử MoMo, ZaloPay, VNPay.</li><li>Doanh nghiệp: công nợ theo hợp đồng, xuất hóa đơn VAT.</li></ul>` },
};

// ---------------------------------------------------------------- Uy tín & SEO
// Dự án tiêu biểu: dữ liệu MẪU để trình diễn bố cục (sample: true -> hiện nhãn "Dự án mẫu").
// Khi kết nối database, quản lý tại Quản trị › Dự án tiêu biểu (ảnh trước / sau, quy mô, cảm nhận khách hàng).
DT.projects = [
  {
    slug: 'dieu-hoa-am-tran-nha-may-linh-kien-dien-tu', sample: true, featured: true,
    title: 'Hệ thống điều hòa âm trần cho nhà máy linh kiện điện tử',
    client: 'Nhà máy linh kiện điện tử (FDI)', industry: 'Nhà máy FDI', location: 'Khu công nghiệp tại Bình Dương', year: 2025,
    units: 48, capacity: '144 HP', duration: '15 ngày',
    summary: 'Thay hệ thống cũ cho khu lắp ráp 2.400 m²: 48 dàn âm trần Inverter, chia vùng nhiệt độ theo dây chuyền, thi công ngoài giờ không dừng sản xuất.',
    content: '<h2>Yêu cầu</h2><p>Khu lắp ráp cần giữ nhiệt độ ổn định 24 – 26°C, độ ẩm thấp để bảo vệ linh kiện; thi công không ảnh hưởng ca sản xuất.</p><h2>Giải pháp</h2><ul><li>Khảo sát tải nhiệt từng khu, chia 6 vùng điều khiển độc lập.</li><li>48 dàn lạnh âm trần cassette Inverter, ống đồng bảo ôn dày, ống thoát nước có độ dốc chuẩn.</li><li>Thi công theo ca đêm và cuối tuần, che chắn bụi khu vực sản xuất.</li></ul><h2>Kết quả</h2><ul><li>Nhiệt độ ổn định theo yêu cầu, giảm tiếng ồn so với hệ cũ.</li><li>Bàn giao hồ sơ hoàn công, lịch bảo trì định kỳ 3 tháng / lần.</li></ul>',
    testimonial: 'Đội thi công làm việc ngoài giờ rất chủ động, bàn giao đúng tiến độ và có lịch bảo trì rõ ràng.', testimonialName: 'Trưởng bộ phận Hành chính', testimonialRole: 'Nhà máy linh kiện điện tử',
  },
  {
    slug: 'dieu-hoa-van-phong-6-tang', sample: true, featured: true,
    title: 'Giải pháp điều hòa cho tòa văn phòng 6 tầng',
    client: 'Công ty dịch vụ (văn phòng)', industry: 'Văn phòng', location: 'TP. Hồ Chí Minh', year: 2025,
    units: 32, capacity: '78 HP', duration: '10 ngày',
    summary: 'Kết hợp máy giấu trần ống gió cho phòng họp, âm trần cho khu làm việc mở; điều khiển theo tầng giúp tiết kiệm điện ngoài giờ.',
    content: '<h2>Yêu cầu</h2><p>Văn phòng 6 tầng, mỗi tầng ~250 m², cần thẩm mỹ cao ở sảnh và phòng họp, chi phí điện hợp lý.</p><h2>Giải pháp</h2><ul><li>Máy giấu trần ống gió cho sảnh, phòng họp; âm trần cassette cho khu làm việc mở.</li><li>Toàn bộ dùng máy Inverter gas R32, điều khiển riêng từng tầng.</li></ul><h2>Kết quả</h2><ul><li>Không gian gọn đẹp, gió phân bổ đều.</li><li>Có hợp đồng bảo trì 6 tháng / lần.</li></ul>',
    testimonial: 'Tư vấn đúng công suất, không bán thừa. Hóa đơn và hồ sơ đầy đủ cho kế toán.', testimonialName: 'Quản lý tòa nhà', testimonialRole: 'Công ty dịch vụ',
  },
  {
    slug: 'may-lanh-tu-dung-chuoi-nha-hang', sample: true,
    title: 'Máy lạnh tủ đứng cho chuỗi 3 nhà hàng',
    client: 'Chuỗi nhà hàng', industry: 'Nhà hàng – F&B', location: 'TP. Hồ Chí Minh & Đồng Nai', year: 2024,
    units: 18, capacity: '72 HP', duration: '3 ngày / cơ sở',
    summary: 'Không gian mở cửa liên tục, nhiều nhiệt từ bếp: chọn máy tủ đứng công suất lớn, bố trí thổi gió dọc dãy bàn, lắp đặt trong 1 ngày nghỉ của mỗi cơ sở.',
    content: '<h2>Yêu cầu</h2><p>Khu ăn uống đông khách, gần bếp, mở cửa thường xuyên; cần lắp nhanh để không ảnh hưởng kinh doanh.</p><h2>Giải pháp</h2><ul><li>Máy tủ đứng 4 – 5 HP, hướng gió dọc dãy bàn.</li><li>Lịch vệ sinh 2 tháng / lần do môi trường dầu mỡ.</li></ul><h2>Kết quả</h2><ul><li>Mỗi cơ sở hoàn thành trong 1 ngày nghỉ.</li></ul>',
    testimonial: 'Lắp nhanh, gọn trong ngày, khách quay lại đều khen mát hơn hẳn.', testimonialName: 'Quản lý vận hành', testimonialRole: 'Chuỗi nhà hàng',
  },
  {
    slug: 'quat-dieu-hoa-cong-nghiep-xuong-may', sample: true,
    title: 'Làm mát nhà xưởng may bằng quạt điều hòa công nghiệp',
    client: 'Xưởng may mặc', industry: 'Nhà xưởng', location: 'Long An', year: 2024,
    units: 40, capacity: '40 quạt 18.000 m³/h', duration: '7 ngày',
    summary: 'Xưởng mái tôn, thông thoáng, 300 công nhân: quạt điều hòa công nghiệp (làm mát bay hơi) giúp giảm nóng với chi phí điện thấp hơn nhiều so với máy lạnh.',
    content: '<h2>Yêu cầu</h2><p>Xưởng 3.000 m² mái tôn, nóng vào buổi chiều, ngân sách điện hạn chế.</p><h2>Giải pháp</h2><ul><li>Khảo sát luồng gió, bố trí 40 quạt điều hòa công nghiệp kết hợp quạt hút.</li><li>Cấp nước tự động, lịch vệ sinh tấm làm mát định kỳ.</li></ul><h2>Kết quả</h2><ul><li>Không khí trong xưởng dễ chịu hơn rõ rệt vào giờ cao điểm nắng.</li></ul>',
    testimonial: 'Chi phí đầu tư và tiền điện phù hợp, công nhân làm việc thoải mái hơn.', testimonialName: 'Giám đốc xưởng', testimonialRole: 'Xưởng may mặc',
  },
];

// Hỏi đáp: hiển thị ở trang hoi-dap.html (kèm dữ liệu có cấu trúc FAQPage). Quản trị › Hỏi đáp khi có database.
DT.faqs = [
  ['Chọn mua máy lạnh', 'Máy lạnh 1 HP dùng cho phòng bao nhiêu m²?', 'Máy lạnh 1 HP (khoảng 9.000 BTU/h) phù hợp phòng <b>dưới 15 m²</b>, trần cao 2,7 – 3,2 m, ít nắng. Phòng nắng chiều, tầng mái hoặc đông người nên chọn 1.5 HP. Dùng <a href="tinh-cong-suat-may-lanh.html">công cụ tính công suất</a> để có kết quả theo phòng thực tế.'],
  ['Chọn mua máy lạnh', '1 HP bằng bao nhiêu BTU? Quy đổi công suất máy lạnh thế nào?', 'Theo cách gọi phổ biến trên thị trường: 1 HP ≈ 9.000 BTU/h, 1.5 HP ≈ 12.000 BTU/h, 2 HP ≈ 18.000 BTU/h, 2.5 HP ≈ 24.000 BTU/h. Công suất chính xác của từng model xem trong bảng thông số kỹ thuật.'],
  ['Chọn mua máy lạnh', 'Nên mua máy lạnh Inverter hay máy thường (Non-Inverter)?', 'Nếu dùng <b>từ 6 giờ/ngày trở lên</b>, nên chọn Inverter: máy nén điều chỉnh tốc độ theo nhiệt độ phòng nên thường tiết kiệm khoảng 30 – 50% điện, chạy êm và nhiệt độ ổn định hơn. Máy thường có giá mua thấp hơn, phù hợp phòng ít sử dụng.'],
  ['Chọn mua máy lạnh', 'Gas R32 khác gas R410A thế nào?', 'Cả hai đều là môi chất lạnh không phá hủy tầng ozone. <b>R32</b> là gas đơn chất, hiệu suất truyền nhiệt cao hơn, lượng nạp ít hơn và chỉ số làm nóng toàn cầu (GWP) khoảng 675 – thấp hơn nhiều so với <b>R410A</b> (khoảng 2.088). R32 thuộc nhóm cháy nhẹ (A2L) nên phải lắp đặt, hút chân không đúng kỹ thuật. Lưu ý: máy thiết kế cho gas nào thì <b>chỉ được nạp đúng gas đó</b>, không nạp lẫn.'],
  ['Chọn mua máy lạnh', 'Máy lạnh 1 chiều và 2 chiều khác nhau thế nào?', 'Máy 2 chiều có thêm chế độ sưởi ấm (bơm nhiệt), phù hợp miền Bắc, Tây Nguyên có mùa lạnh. Ở miền Nam, máy 1 chiều là đủ và có giá tốt hơn.'],
  ['Chọn mua máy lạnh', 'Nhãn năng lượng 5 sao trên máy lạnh có ý nghĩa gì?', 'Nhãn năng lượng xác nhận mức hiệu suất của thiết bị, từ 1 đến 5 sao; càng nhiều sao càng tiết kiệm điện. Khi so sánh, xem thêm chỉ số hiệu suất (CSPF) – chỉ số càng cao càng tiết kiệm.'],
  ['Lắp đặt', 'Lắp đặt một bộ máy lạnh treo tường mất bao lâu?', 'Thông thường 1,5 – 3 giờ cho một bộ treo tường ở vị trí thuận lợi. Máy âm trần, giấu trần ống gió hoặc công trình nhiều máy sẽ có tiến độ cụ thể sau khi khảo sát.'],
  ['Lắp đặt', 'Lắp máy lạnh có bắt buộc hút chân không không?', 'Có. Hút chân không loại bỏ không khí và hơi ẩm trong đường ống trước khi xả gas; bỏ qua bước này làm máy kém lạnh, tăng áp suất, giảm tuổi thọ máy nén. Với máy dùng gas R32 hoặc R410A, đây là bước bắt buộc theo hướng dẫn của nhà sản xuất.'],
  ['Lắp đặt', 'Vị trí đặt cục nóng thế nào là đúng?', 'Đặt nơi thông thoáng, hạn chế nắng chiếu trực tiếp lâu, đủ khoảng cách với tường và vật cản theo hướng dẫn của hãng để tản nhiệt tốt; giá đỡ chắc chắn, thuận tiện cho bảo trì. Chiều dài và chênh lệch độ cao đường ống phải nằm trong giới hạn của từng model.'],
  ['Lắp đặt', 'Vật tư lắp đặt (ống đồng, dây điện) tính phí thế nào?', 'Vật tư như ống đồng, bảo ôn, dây điện, ống thoát nước thường được tính theo số mét thực tế tại công trình. Kỹ thuật viên sẽ báo rõ chi phí trước khi thi công để khách hàng duyệt.'],
  ['Sử dụng & tiết kiệm điện', 'Để máy lạnh bao nhiêu độ là tiết kiệm điện?', 'Nên đặt khoảng <b>26 – 28°C</b> kết hợp quạt để tăng cảm giác mát. Mỗi độ C cài thấp hơn khiến máy chạy nhiều hơn và tốn điện hơn. Đóng kín cửa, che nắng và vệ sinh lưới lọc định kỳ cũng giúp giảm tiền điện đáng kể.'],
  ['Sử dụng & tiết kiệm điện', 'Có nên tắt máy lạnh khi ra khỏi phòng một lúc?', 'Với máy Inverter, nếu chỉ ra ngoài ngắn (dưới khoảng 30 phút) không nên tắt – bật liên tục vì mỗi lần khởi động máy phải chạy công suất cao. Nếu đi lâu, hãy tắt máy hoặc dùng chế độ hẹn giờ.'],
  ['Sử dụng & tiết kiệm điện', 'Vì sao máy lạnh chảy nước trong nhà?', 'Nguyên nhân thường gặp: ống thoát nước bị tắc hoặc lắp không đủ độ dốc, dàn lạnh bẩn, máy lắp nghiêng, hoặc thiếu gas khiến dàn lạnh đóng băng rồi tan chảy. Nên tắt máy và gọi kỹ thuật kiểm tra, vệ sinh để tránh hư hại trần, tường.'],
  ['Bảo trì & sửa chữa', 'Bao lâu nên vệ sinh máy lạnh một lần?', 'Gia đình: <b>3 – 6 tháng/lần</b>. Văn phòng, nhà hàng, môi trường nhiều bụi hoặc dầu mỡ: <b>1 – 3 tháng/lần</b>. Lưới lọc bụi nên được rửa 2 – 4 tuần/lần.'],
  ['Bảo trì & sửa chữa', 'Máy lạnh có cần nạp gas định kỳ không?', 'Không. Hệ thống gas là hệ kín, nếu lắp đúng kỹ thuật thì không hao hụt. Máy thiếu gas nghĩa là có điểm rò rỉ – cần tìm và xử lý chỗ rò trước khi nạp bổ sung.'],
  ['Bảo trì & sửa chữa', 'Dấu hiệu nào cho thấy máy lạnh cần bảo dưỡng?', 'Máy kém lạnh, có mùi hôi, tiếng ồn lạ, chảy nước, đóng tuyết ở ống đồng hoặc tiền điện tăng bất thường. Bảo dưỡng sớm giúp tránh hỏng máy nén – bộ phận đắt nhất của máy lạnh.'],
  ['Doanh nghiệp & dự án', 'Doanh nghiệp có được xuất hóa đơn VAT và công nợ không?', 'Có. Chúng tôi xuất hóa đơn GTGT cho mọi đơn hàng doanh nghiệp; điều khoản công nợ (thường 30 – 60 ngày) áp dụng theo hợp đồng. <a href="bao-gia-du-an.html">Gửi yêu cầu báo giá dự án</a> để được tư vấn.'],
  ['Doanh nghiệp & dự án', 'Khảo sát và tư vấn thiết kế cho nhà xưởng, văn phòng có mất phí không?', 'Miễn phí. Kỹ thuật viên khảo sát thực tế, tính tải nhiệt, đề xuất phương án và báo giá chi tiết trước khi ký hợp đồng.'],
  ['Doanh nghiệp & dự án', 'Nhà xưởng nên dùng máy lạnh hay quạt điều hòa công nghiệp?', 'Xưởng cần kiểm soát nhiệt độ và độ ẩm chặt chẽ (điện tử, dược phẩm, phòng sạch) nên dùng máy lạnh công nghiệp / âm trần / tủ đứng. Xưởng thông thoáng, mái cao, nhiều công nhân có thể dùng quạt điều hòa công nghiệp (làm mát bay hơi) – chi phí đầu tư và tiền điện thấp hơn nhiều, giảm nóng hiệu quả khi không khí không quá ẩm.'],
  ['Doanh nghiệp & dự án', 'Có hợp đồng bảo trì định kỳ cho doanh nghiệp không?', 'Có. Hợp đồng bảo trì gồm lịch vệ sinh định kỳ, kiểm tra thông số vận hành, báo cáo tình trạng thiết bị sau mỗi lần và ưu tiên xử lý sự cố.'],
  ['Mua hàng & bảo hành', 'Sản phẩm được bảo hành như thế nào?', 'Sản phẩm chính hãng được bảo hành theo chính sách của nhà sản xuất (thời hạn ghi trên trang sản phẩm). Công lắp đặt do chúng tôi thực hiện được bảo hành 12 tháng. Xem <a href="chinh-sach.html?type=bao-hanh">chính sách bảo hành</a>.'],
  ['Mua hàng & bảo hành', 'Giao hàng và lắp đặt mất bao lâu?', 'Nội thành giao nhanh trong khoảng 2 giờ với sản phẩm có sẵn; lắp đặt theo lịch hẹn của khách hàng. Khu vực khác và đơn số lượng lớn sẽ được thông báo thời gian cụ thể khi xác nhận đơn.'],
  ['Mua hàng & bảo hành', 'Có những hình thức thanh toán nào?', 'Thanh toán khi nhận hàng (COD), chuyển khoản / quét mã VietQR, thẻ ATM – Visa – Master qua VNPay, ví MoMo và trả góp 0% qua thẻ tín dụng hoặc công ty tài chính.'],
  ['Mua hàng & bảo hành', 'Chính sách đổi trả ra sao?', 'Hỗ trợ 1 đổi 1 trong 30 ngày nếu sản phẩm lỗi do nhà sản xuất. Xem chi tiết tại <a href="chinh-sach.html?type=doi-tra">chính sách đổi trả</a>.'],
].map(([category, question, answer], i) => ({ id: i + 1, category, question, answer, sort: i }));

// Uy tín: logo khách hàng / đối tác, chứng nhận, đánh giá Google. Quản trị › Uy tín & đánh giá.
// Chưa có dữ liệu -> trang hiện khung chờ (chế độ demo) hoặc ẩn khối (khi đã có database).
DT.trust = {
  logos: [],
  certs: [
    { title: 'Giấy chứng nhận đại lý ủy quyền', issuer: 'Nhà sản xuất', image: '' },
    { title: 'Chứng nhận hệ thống quản lý chất lượng ISO 9001', issuer: 'Tổ chức chứng nhận', image: '' },
    { title: 'Chứng chỉ kỹ thuật viên điện lạnh', issuer: 'Cơ sở đào tạo nghề', image: '' },
  ],
  google: { url: '', placeId: '', rating: null, count: null },
  reviews: [],
};
DT.TRUST_DEMO_KEY = 'dt_trust_v1';
// Dữ liệu uy tín đang dùng: database (khi đã kết nối) / bản quản trị demo lưu trên trình duyệt / dữ liệu mặc định
DT.trustData = () => {
  if (!DT.backend?.enabled) {
    try { const d = JSON.parse(localStorage.getItem(DT.TRUST_DEMO_KEY) || 'null'); if (d) return { logos: [], certs: [], reviews: [], google: {}, ...d }; } catch { /* bỏ qua */ }
  }
  return DT.trust;
};
