// Cấu hình cửa hàng & nội dung tĩnh. Sửa thông tin doanh nghiệp tại đây.
window.DT = window.DT || {};

DT.config = {
  name: 'D&T Điện Lạnh',
  slogan: 'Mát lạnh chính hãng - Lắp đặt tận tâm',
  company: 'CÔNG TY TNHH TMDV PHÁT TRIỂN KỸ THUẬT D & T',
  taxCode: '0300000000',
  hotline: '1900 6868',
  hotlineB2B: '0909 000 000',
  email: 'sales@trangthietbi.vn',
  zalo: 'https://zalo.me/0909000000',
  facebook: 'https://facebook.com/',
  youtube: 'https://youtube.com/',
  address: 'TP. Hồ Chí Minh, Việt Nam',
  workingHours: '7:30 - 21:30 (Cả CN & ngày lễ)',
  freeShipThreshold: 2000000,
  shippingFee: 50000,
  installFee: 300000,
};

// Mã giảm giá demo (giai đoạn 2 quản lý trong admin)
DT.coupons = [
  { code: 'DTCOOL10', type: 'percent', value: 10, max: 1000000, min: 5000000, desc: 'Giảm 10% tối đa 1 triệu cho đơn từ 5 triệu' },
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
  { id: 1, name: 'D&T Điện Lạnh - Quận 7', city: 'TP. Hồ Chí Minh', address: '123 Nguyễn Thị Thập, P. Tân Phú, Quận 7', phone: '028 3700 0001', hours: '8:00 - 21:00', map: 'Nguyễn Thị Thập Quận 7' },
  { id: 2, name: 'D&T Điện Lạnh - Thủ Đức', city: 'TP. Hồ Chí Minh', address: '456 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức', phone: '028 3700 0002', hours: '8:00 - 21:00', map: 'Võ Văn Ngân Thủ Đức' },
  { id: 3, name: 'D&T Điện Lạnh - Tân Bình', city: 'TP. Hồ Chí Minh', address: '789 Cộng Hòa, P. 13, Q. Tân Bình', phone: '028 3700 0003', hours: '8:00 - 21:00', map: 'Cộng Hòa Tân Bình' },
  { id: 4, name: 'D&T Điện Lạnh - Biên Hòa', city: 'Đồng Nai', address: '12 Phạm Văn Thuận, P. Tân Mai, TP. Biên Hòa', phone: '0251 370 0004', hours: '8:00 - 20:30', map: 'Phạm Văn Thuận Biên Hòa' },
  { id: 5, name: 'D&T Điện Lạnh - Thủ Dầu Một', city: 'Bình Dương', address: '34 Đại lộ Bình Dương, P. Phú Hòa, TP. Thủ Dầu Một', phone: '0274 370 0005', hours: '8:00 - 20:30', map: 'Đại lộ Bình Dương Thủ Dầu Một' },
];

DT.posts = [
  {
    slug: 'cach-chon-cong-suat-may-lanh-theo-dien-tich',
    title: 'Cách chọn công suất máy lạnh theo diện tích phòng (bảng tra chuẩn)',
    cat: 'Tư vấn chọn mua', date: '2026-09-28', author: 'Kỹ thuật D&T', art: 'ac',
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
    cat: 'Mẹo sử dụng', date: '2026-09-20', author: 'Kỹ thuật D&T', art: 'ac',
    excerpt: 'Máy lạnh bẩn tiêu tốn thêm 15 - 25% điện năng và là nơi vi khuẩn phát triển. Đây là lịch vệ sinh khuyến nghị cho gia đình và văn phòng.',
    content: `<p>Lịch vệ sinh khuyến nghị: <strong>gia đình 3 - 6 tháng/lần</strong>, <strong>văn phòng, nhà hàng 2 - 3 tháng/lần</strong>, nhà xưởng nhiều bụi 1 - 2 tháng/lần.</p>
<h2>Dấu hiệu cần vệ sinh ngay</h2><ul><li>Máy làm lạnh yếu, chạy lâu mới mát.</li><li>Có mùi hôi khi bật máy.</li><li>Chảy nước ở dàn lạnh.</li><li>Tiền điện tăng bất thường.</li></ul>
<p>D&T cung cấp dịch vụ vệ sinh chỉ từ 150.000₫/máy, có mặt trong 2 giờ tại nội thành, bảo hành 30 ngày.</p>`,
  },
  {
    slug: 'so-sanh-tu-lanh-inverter-va-thuong',
    title: 'Tủ lạnh Inverter và tủ lạnh thường: Có đáng để trả thêm tiền?',
    cat: 'Tư vấn chọn mua', date: '2026-09-12', author: 'Biên tập D&T', art: 'fridge',
    excerpt: 'Phân tích chi phí điện năng thực tế trong 5 năm giữa tủ lạnh Inverter và tủ lạnh thường cùng dung tích.',
    content: `<p>Tủ lạnh chạy 24/7 nên điện năng là chi phí lớn nhất trong vòng đời sản phẩm. Với tủ 300 lít, bản Inverter tiêu thụ khoảng 0.9 kWh/ngày so với 1.4 kWh/ngày của bản thường.</p>
<h2>Tính toán 5 năm</h2><p>Chênh lệch 0.5 kWh × 365 ngày × 5 năm × 3.000₫ ≈ <strong>2.7 triệu đồng</strong> - thường lớn hơn chênh lệch giá mua.</p>
<h2>Kết luận</h2><p>Nên chọn Inverter cho gia đình từ 3 người trở lên hoặc tủ trên 250 lít.</p>`,
  },
  {
    slug: 'giai-phap-dieu-hoa-cho-nha-xuong',
    title: 'Giải pháp làm mát nhà xưởng: Điều hòa trung tâm, âm trần hay quạt hơi nước?',
    cat: 'Giải pháp doanh nghiệp', date: '2026-09-05', author: 'Phòng Dự án D&T', art: 'ac-cassette',
    excerpt: 'So sánh chi phí đầu tư, vận hành và hiệu quả của 3 giải pháp làm mát phổ biến cho nhà xưởng, kho bãi tại Việt Nam.',
    content: `<p>Lựa chọn giải pháp làm mát nhà xưởng cần cân bằng giữa <strong>chi phí đầu tư (CAPEX)</strong>, <strong>chi phí vận hành (OPEX)</strong> và yêu cầu nhiệt độ của quy trình sản xuất.</p>
<table><thead><tr><th>Giải pháp</th><th>Phù hợp</th><th>Chi phí đầu tư</th></tr></thead><tbody>
<tr><td>Quạt điều hòa công nghiệp</td><td>Xưởng thông thoáng, cần giảm 3-5°C</td><td>Thấp</td></tr>
<tr><td>Máy lạnh âm trần / tủ đứng</td><td>Văn phòng xưởng, phòng QC, khu đóng gói</td><td>Trung bình</td></tr>
<tr><td>VRV/VRF, Chiller</td><td>Phòng sạch, nhà máy điện tử, kiểm soát nhiệt ẩm</td><td>Cao</td></tr></tbody></table>
<p>Liên hệ phòng dự án D&T để được khảo sát và đề xuất phương án miễn phí.</p>`,
  },
  {
    slug: 'gas-r32-va-r410a-khac-nhau-the-nao',
    title: 'Gas R32 và R410A khác nhau thế nào? Lưu ý khi nạp gas',
    cat: 'Kiến thức kỹ thuật', date: '2026-08-27', author: 'Kỹ thuật D&T', art: 'gas',
    excerpt: 'R32 đang thay thế R410A trên hầu hết dòng máy mới. Hiểu sự khác biệt để bảo dưỡng đúng cách và an toàn.',
    content: `<p>R32 có chỉ số làm nóng toàn cầu (GWP) khoảng 675, chỉ bằng 1/3 R410A (2088), hiệu suất truyền nhiệt cao hơn.</p><h2>Lưu ý</h2><ul><li>Không nạp lẫn các loại gas.</li><li>R32 dễ cháy nhẹ (A2L) - cần thợ có chứng chỉ và dụng cụ phù hợp.</li><li>Dùng đồng hồ nạp gas đúng chuẩn.</li></ul>`,
  },
  {
    slug: 'meo-tiet-kiem-dien-mua-nong',
    title: '7 mẹo dùng máy lạnh tiết kiệm điện mùa nóng',
    cat: 'Mẹo sử dụng', date: '2026-08-15', author: 'Biên tập D&T', art: 'ac',
    excerpt: 'Để máy ở 26 - 27°C, kết hợp quạt và vệ sinh định kỳ có thể giảm 20 - 30% tiền điện mỗi tháng.',
    content: `<ol><li>Đặt nhiệt độ 26 - 27°C.</li><li>Kết hợp quạt để lưu thông khí.</li><li>Đóng kín cửa, dùng rèm cản nắng.</li><li>Vệ sinh lưới lọc 2 tuần/lần.</li><li>Dùng chế độ ngủ ban đêm.</li><li>Không bật/tắt liên tục.</li><li>Đặt dàn nóng nơi thoáng, tránh nắng trực tiếp.</li></ol>`,
  },
];

DT.policies = {
  'bao-hanh': { title: 'Chính sách bảo hành', body: `<p>Tất cả sản phẩm tại D&T là hàng chính hãng, được bảo hành theo tiêu chuẩn của nhà sản xuất.</p><ul><li>Bảo hành tại nhà đối với máy lạnh, tủ lạnh, máy giặt.</li><li>Tiếp nhận bảo hành qua hotline ${'1900 6868'} hoặc tại showroom.</li><li>Thời gian xử lý: 24 - 72 giờ làm việc.</li></ul><p>Không bảo hành với các trường hợp: hư hỏng do thiên tai, sử dụng sai hướng dẫn, tự ý tháo dỡ sửa chữa.</p>` },
  'doi-tra': { title: 'Chính sách đổi trả', body: `<ul><li><strong>1 đổi 1 trong 30 ngày</strong> nếu lỗi do nhà sản xuất.</li><li>Đổi sang sản phẩm khác trong 7 ngày (sản phẩm còn nguyên hộp, chưa lắp đặt), phí 10%.</li><li>Hoàn tiền trong 3 - 5 ngày làm việc sau khi nhận lại hàng.</li></ul>` },
  'van-chuyen': { title: 'Chính sách vận chuyển & lắp đặt', body: `<ul><li>Miễn phí giao hàng nội thành cho đơn từ 2.000.000₫.</li><li>Giao nhanh trong 2 - 4 giờ tại TP.HCM, Bình Dương, Đồng Nai.</li><li>Miễn phí lắp đặt máy lạnh treo tường có biểu tượng "Miễn phí lắp đặt" (chưa bao gồm vật tư ống đồng ngoài 3m tiêu chuẩn).</li></ul>` },
  'tra-gop': { title: 'Hướng dẫn mua trả góp', body: `<ul><li>Trả góp 0% qua thẻ tín dụng của 25+ ngân hàng.</li><li>Trả góp qua công ty tài chính: chỉ cần CCCD, duyệt hồ sơ 15 phút.</li><li>Kỳ hạn 3 - 12 tháng, trả trước từ 0%.</li></ul>` },
  'bao-mat': { title: 'Chính sách bảo mật thông tin', body: `<p>D&T cam kết bảo mật thông tin khách hàng theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Thông tin chỉ được dùng để xử lý đơn hàng, giao hàng, bảo hành và chăm sóc khách hàng.</p>` },
  'thanh-toan': { title: 'Phương thức thanh toán', body: `<ul><li>Thanh toán khi nhận hàng (COD).</li><li>Chuyển khoản ngân hàng / QR.</li><li>Thẻ ATM, Visa, Master, JCB qua cổng thanh toán.</li><li>Ví điện tử MoMo, ZaloPay, VNPay.</li><li>Doanh nghiệp: công nợ theo hợp đồng, xuất hóa đơn VAT.</li></ul>` },
};
