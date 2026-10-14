// Chụp toàn bộ trang & trạng thái chức năng (website + quản trị, desktop + mobile) ở chế độ demo.
// Dùng làm bộ ảnh tham chiếu cho thiết kế (Figma) và tài liệu bàn giao.
// Chạy: node tools/capture-screens.mjs [thư_mục_ra]   (mặc định design/screens)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pagesServer, chromium } from '../tests/browser/lib.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'design/screens'));
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const { server, base } = await pagesServer(root);
const browser = await chromium();
const manifest = [];
let n = 0;

async function context(viewport) {
  const { isMobile, hasTouch, deviceScaleFactor, ...vp } = viewport;
  const ctx = await browser.newContext({ viewport: vp, isMobile, hasTouch, deviceScaleFactor: deviceScaleFactor || 1, locale: 'vi-VN' });
  // Chỉ cho phép font Google, chặn tài nguyên ngoài khác (GA, bản đồ...) để ảnh ổn định
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => (/fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.continue() : r.abort()));
  return ctx;
}

// Chụp một màn hình; lỗi ở một bước không làm dừng cả bộ
async function shot(page, group, name, title, { full = true, before } = {}) {
  n++;
  const file = `${group}/${String(n).padStart(3, '0')}-${name}.png`;
  try {
    if (before) await before(page);
    await page.waitForTimeout(350);
    fs.mkdirSync(path.join(OUT, group), { recursive: true });
    await page.screenshot({ path: path.join(OUT, file), fullPage: full });
    manifest.push({ group, file, title, ok: true });
    console.log(`✔ ${file}  ${title}`);
  } catch (e) {
    manifest.push({ group, file, title, ok: false, error: e.message.split('\n')[0] });
    console.log(`✖ ${file}  ${title}: ${e.message.split('\n')[0]}`);
  }
}
const go = (page, url) => page.goto(base + url, { waitUntil: 'networkidle' }).catch(() => page.goto(base + url));
const closeModal = (page) => page.evaluate(() => document.querySelectorAll('.modal-wrap,.ad-modal-wrap').forEach((m) => m.remove()));

// ======================================================================= WEBSITE - desktop
{
  const ctx = await context(DESKTOP);
  const p = await ctx.newPage();
  await go(p, 'frontend/index.html');
  await shot(p, 'web-desktop', 'trang-chu-lan-dau', 'Trang chủ - lần đầu truy cập (hộp đồng ý cookie)', { full: false });
  await p.click('[data-consent="granted"]').catch(() => {});
  const ids = await p.evaluate(() => {
    const ac = DT.products.filter((x) => x.cat === 'may-lanh');
    return { ac: ac[0]?.id, ac2: ac[1]?.id, ac3: ac[2]?.id, any: DT.products[0].id, cat: DT.categories[0].id, post: DT.posts[0]?.slug };
  });

  await shot(p, 'web-desktop', 'trang-chu', 'Trang chủ');
  await shot(p, 'web-desktop', 'mega-menu', 'Menu danh mục (mega menu)', { full: false, before: async () => { await p.evaluate(() => scrollTo(0, 0)); await p.hover('.cat-btn'); } });
  await shot(p, 'web-desktop', 'goi-y-tim-kiem', 'Ô tìm kiếm - gợi ý sản phẩm', { full: false, before: async () => { await p.mouse.move(700, 600); await p.click('#search-input'); await p.type('#search-input', 'máy lạnh', { delay: 40 }); await p.waitForSelector('.sg-item'); } });
  await shot(p, 'web-desktop', 'khung-chat', 'Khung chat tư vấn', { full: false, before: async () => { await p.keyboard.press('Escape'); await p.click('#fl-chat'); await p.waitForSelector('#chat-panel.show'); } });

  await go(p, `frontend/danh-muc.html?cat=${ids.cat}`);
  await shot(p, 'web-desktop', 'danh-muc', 'Danh mục sản phẩm');
  await shot(p, 'web-desktop', 'danh-muc-loc', 'Danh mục - đang lọc & sắp xếp', { before: async () => { await p.click('.fopt[data-group^="attr:"]'); await p.selectOption('#sort', 'price-asc'); } });
  await go(p, `frontend/danh-muc.html?cat=${ids.cat}`);
  await shot(p, 'web-desktop', 'xem-nhanh', 'Xem nhanh sản phẩm (quick view)', { full: false, before: async () => { await p.locator('.pcard').first().scrollIntoViewIfNeeded(); await p.locator('.pcard [data-action="quickview"]').first().click({ force: true }); } });
  await closeModal(p);
  await shot(p, 'web-desktop', 'thanh-so-sanh', 'Thanh so sánh sản phẩm (cuối trang)', { full: false, before: async () => {
    for (const i of [0, 1, 2]) await p.locator('.pcard [data-action="compare"]').nth(i).click({ force: true });
    for (const i of [0, 1]) await p.locator('.pcard [data-action="wishlist"]').nth(i).click({ force: true });
  } });
  await go(p, 'frontend/tim-kiem.html?q=inverter');
  await shot(p, 'web-desktop', 'tim-kiem', 'Kết quả tìm kiếm');
  await go(p, 'frontend/tim-kiem.html?q=khongcosanphamnay');
  await shot(p, 'web-desktop', 'tim-kiem-trong', 'Tìm kiếm - không có kết quả', { full: false });
  await go(p, 'frontend/khuyen-mai.html');
  await shot(p, 'web-desktop', 'khuyen-mai', 'Khuyến mãi / Flash sale');

  await go(p, `frontend/san-pham.html?id=${ids.ac}`);
  await shot(p, 'web-desktop', 'san-pham', 'Chi tiết sản phẩm');
  await shot(p, 'web-desktop', 'san-pham-viet-danh-gia', 'Chi tiết sản phẩm - form viết đánh giá', { full: false, before: async () => { await p.click('#write-review'); await p.locator('#review-form').scrollIntoViewIfNeeded(); } });
  await shot(p, 'web-desktop', 'san-pham-bao-gia', 'Yêu cầu báo giá doanh nghiệp (từ trang sản phẩm)', { full: false, before: async () => { await p.evaluate(() => scrollTo(0, 0)); await p.click('.promo-box [data-quote]'); } });
  await closeModal(p);
  await shot(p, 'web-desktop', 'them-vao-gio', 'Đã thêm vào giỏ hàng (hộp thông báo)', { full: false, before: async () => { await p.evaluate(() => scrollTo(0, 0)); await p.click('.buy-btns [data-action="add-cart"]'); } });
  await closeModal(p);

  await go(p, `frontend/san-pham.html?id=${ids.ac2}`);
  await p.click('.buy-btns [data-action="add-cart"]').catch(() => {}); await closeModal(p);
  await go(p, 'frontend/gio-hang.html');
  await shot(p, 'web-desktop', 'gio-hang', 'Giỏ hàng');
  await shot(p, 'web-desktop', 'gio-hang-ma-giam', 'Giỏ hàng - đã áp mã giảm giá', { before: async () => { await p.click('.coupon-chip'); } });
  await go(p, 'frontend/thanh-toan.html');
  await shot(p, 'web-desktop', 'thanh-toan', 'Thanh toán');
  await shot(p, 'web-desktop', 'thanh-toan-loi', 'Thanh toán - báo lỗi thiếu thông tin', { before: async () => { await p.click('#co-form button[type=submit]'); } });
  await shot(p, 'web-desktop', 'thanh-toan-nhan-tai-cua-hang', 'Thanh toán - nhận tại cửa hàng, chuyển khoản, xuất VAT', { before: async () => {
    await p.check('[name=method][value=pickup]'); await p.check('[name=payment][value=bank]'); await p.check('#need-invoice');
  } });
  await p.fill('[name=name]', 'Nguyễn Văn An'); await p.fill('[name=phone]', '0901234567');
  await p.fill('[name=company]', 'Công ty TNHH ABC'); await p.fill('[name=taxCode]', '0312345678');
  await p.click('#co-form button[type=submit]'); await p.waitForURL(/dat-hang-thanh-cong/).catch(() => {});
  await shot(p, 'web-desktop', 'dat-hang-thanh-cong', 'Đặt hàng thành công');
  const code = new URL(p.url()).searchParams.get('code');
  await go(p, 'frontend/ket-qua-thanh-toan.html');
  await shot(p, 'web-desktop', 'ket-qua-thanh-toan', 'Kết quả thanh toán online', { full: false });
  await go(p, 'frontend/tra-cuu-don-hang.html');
  await shot(p, 'web-desktop', 'tra-cuu', 'Tra cứu đơn hàng');
  await go(p, `frontend/tra-cuu-don-hang.html?code=${code}&phone=0901234567`);
  await shot(p, 'web-desktop', 'tra-cuu-ket-qua', 'Tra cứu đơn hàng - kết quả & tiến trình');
  await go(p, 'frontend/gio-hang.html');
  await shot(p, 'web-desktop', 'gio-hang-trong', 'Giỏ hàng trống', { full: false });

  await go(p, 'frontend/tai-khoan.html');
  await shot(p, 'web-desktop', 'dang-nhap', 'Tài khoản - đăng nhập');
  await go(p, 'frontend/tai-khoan.html#register');
  await shot(p, 'web-desktop', 'dang-ky', 'Tài khoản - đăng ký');
  await p.fill('#register-form [name=name]', 'Nguyễn Văn An'); await p.fill('#register-form [name=phone]', '0901234567');
  await p.fill('#register-form [name=password]', 'matkhau123'); await p.check('#register-form [name=agree]'); await p.click('#register-form button');
  await p.waitForSelector('.acc-main').catch(() => {});
  for (const [tab, t] of [['overview', 'tổng quan'], ['orders', 'đơn hàng của tôi'], ['addresses', 'sổ địa chỉ'], ['profile', 'thông tin tài khoản'], ['wishlist', 'sản phẩm yêu thích']]) {
    await go(p, `frontend/tai-khoan.html#${tab}`);
    await shot(p, 'web-desktop', `tai-khoan-${tab}`, `Tài khoản - ${t}`);
  }
  await go(p, 'frontend/yeu-thich.html'); await shot(p, 'web-desktop', 'yeu-thich', 'Sản phẩm yêu thích');
  await go(p, 'frontend/so-sanh.html'); await shot(p, 'web-desktop', 'so-sanh', 'So sánh sản phẩm');

  const pages = [
    ['tin-tuc', 'tin-tuc.html', 'Tin tức'], ['bai-viet', `bai-viet.html?slug=${ids.post}`, 'Chi tiết bài viết'],
    ['dich-vu', 'dich-vu.html', 'Dịch vụ & đặt lịch'], ['bao-gia-du-an', 'bao-gia-du-an.html', 'Báo giá dự án (B2B)'],
    ['du-an', 'du-an.html', 'Dự án tiêu biểu'], ['hoi-dap', 'hoi-dap.html', 'Hỏi đáp (FAQ)'],
    ['tinh-cong-suat', 'tinh-cong-suat-may-lanh.html', 'Công cụ tính công suất máy lạnh'],
    ['gioi-thieu', 'gioi-thieu.html', 'Giới thiệu'], ['tam-nhin-su-menh', 'tam-nhin-su-menh.html', 'Tầm nhìn & Sứ mệnh'],
    ['lien-he', 'lien-he.html', 'Liên hệ'], ['he-thong-cua-hang', 'he-thong-cua-hang.html', 'Hệ thống cửa hàng'],
    ['chinh-sach', 'chinh-sach.html?type=bao-hanh', 'Chính sách'], ['404', '404.html', 'Trang 404'],
  ];
  for (const [name, url, title] of pages) {
    await go(p, `frontend/${url}`);
    await shot(p, 'web-desktop', name, title);
    if (name === 'dich-vu') await shot(p, 'web-desktop', 'dich-vu-gui-thanh-cong', 'Đặt lịch dịch vụ - gửi thành công', { full: false, before: async () => {
      await p.fill('form[data-lead] [name=name]', 'Trần Bình'); await p.fill('form[data-lead] [name=phone]', '0912345678');
      await p.fill('form[data-lead] [name=address]', '12 Lê Lợi, Q1').catch(() => {}); await p.click('form[data-lead] button:not([type=button])');
      await p.waitForSelector('.modal');
    } });
    if (name === 'bao-gia-du-an') {
      await p.fill('form[data-lead] [name=company]', 'Nhà máy Điện tử XYZ'); await p.fill('form[data-lead] [name=name]', 'Chị Mai');
      await p.fill('form[data-lead] [name=phone]', '0987654321'); await p.fill('form[data-lead] [name=email]', 'mai@xyz.vn');
      await p.click('form[data-lead] button:not([type=button])'); await closeModal(p);
    }
    if (name === 'du-an') await shot(p, 'web-desktop', 'du-an-chi-tiet', 'Chi tiết dự án', { before: async () => { await p.click('.pj-card:nth-child(1) h3 a'); await p.waitForLoadState('networkidle'); } });
    if (name === 'tinh-cong-suat') await shot(p, 'web-desktop', 'tinh-cong-suat-ket-qua', 'Tính công suất - kết quả gợi ý', { before: async () => {
      await p.fill('#c-area', '25'); await p.check('[name=room][value="ngu"]').catch(() => {}); await p.check('[name=sun][value="1"]').catch(() => {});
      await p.click('#calc-form [type=submit], #c-submit, form#calc button').catch(() => {});
    } });
  }
  await ctx.close();
}

// ======================================================================= WEBSITE - mobile
{
  const ctx = await context(MOBILE);
  const p = await ctx.newPage();
  await go(p, 'frontend/index.html');
  await p.click('[data-consent="granted"]').catch(() => {});
  const id = await p.evaluate(() => DT.products.find((x) => x.cat === 'may-lanh')?.id);
  await shot(p, 'web-mobile', 'trang-chu', 'Mobile - Trang chủ');
  await shot(p, 'web-mobile', 'menu', 'Mobile - Menu trượt', { full: false, before: async () => { await p.evaluate(() => scrollTo(0, 0)); await p.click('#burger'); } });
  await go(p, 'frontend/danh-muc.html?cat=may-lanh');
  await shot(p, 'web-mobile', 'danh-muc', 'Mobile - Danh mục');
  await shot(p, 'web-mobile', 'bo-loc', 'Mobile - Bộ lọc', { full: false, before: async () => { await p.evaluate(() => scrollTo(0, 0)); await p.click('#filter-open'); } });
  await go(p, `frontend/san-pham.html?id=${id}`);
  await shot(p, 'web-mobile', 'san-pham', 'Mobile - Chi tiết sản phẩm (thanh mua cố định)');
  await p.click('.buy-btns [data-action="add-cart"]').catch(() => {}); await closeModal(p);
  await go(p, 'frontend/gio-hang.html'); await shot(p, 'web-mobile', 'gio-hang', 'Mobile - Giỏ hàng');
  await go(p, 'frontend/thanh-toan.html'); await shot(p, 'web-mobile', 'thanh-toan', 'Mobile - Thanh toán');
  await go(p, 'frontend/tai-khoan.html'); await shot(p, 'web-mobile', 'tai-khoan', 'Mobile - Đăng nhập');
  await go(p, 'frontend/tra-cuu-don-hang.html'); await shot(p, 'web-mobile', 'tra-cuu', 'Mobile - Tra cứu đơn');
  await go(p, 'frontend/tinh-cong-suat-may-lanh.html'); await shot(p, 'web-mobile', 'tinh-cong-suat', 'Mobile - Tính công suất');
  await go(p, 'frontend/index.html'); await shot(p, 'web-mobile', 'khung-chat', 'Mobile - Khung chat', { full: false, before: async () => { await p.click('#fl-chat'); } });
  await ctx.close();
}

// ======================================================================= QUẢN TRỊ (dùng chung localStorage với website demo ở trên? - không: context mới nên tạo lại dữ liệu)
{
  const ctx = await context(DESKTOP);
  const p = await ctx.newPage();
  // Tạo dữ liệu demo: 2 đơn hàng, 1 báo giá B2B, 1 đặt lịch dịch vụ
  await go(p, 'frontend/index.html'); await p.click('[data-consent="granted"]').catch(() => {});
  const ids = await p.evaluate(() => DT.products.slice(0, 3).map((x) => x.id));
  for (const [i, pid] of ids.slice(0, 2).entries()) {
    await go(p, `frontend/san-pham.html?id=${pid}`); await p.click('.buy-btns [data-action="buy-now"]'); await p.waitForURL(/gio-hang/);
    await go(p, 'frontend/thanh-toan.html');
    await p.fill('[name=name]', ['Lê Thị Hoa', 'Công ty TNHH Minh Phát'][i]); await p.fill('[name=phone]', ['0912000111', '0908000222'][i]);
    await p.selectOption('[name=province]', { index: 1 }).catch(() => p.fill('[name=province]', 'TP. Hồ Chí Minh'));
    await p.fill('[name=district]', 'Quận 7'); await p.fill('[name=address]', `${10 + i} Nguyễn Thị Thập`);
    await p.click('#co-form button[type=submit]'); await p.waitForURL(/dat-hang-thanh-cong/).catch(() => {});
  }
  await go(p, 'frontend/bao-gia-du-an.html');
  await p.fill('form[data-lead] [name=company]', 'Nhà máy Điện tử XYZ'); await p.fill('form[data-lead] [name=name]', 'Chị Mai');
  await p.fill('form[data-lead] [name=phone]', '0987654321'); await p.fill('form[data-lead] [name=email]', 'mai@xyz.vn');
  await p.click('form[data-lead] button:not([type=button])'); await closeModal(p);

  await go(p, 'admin/index.html');
  await shot(p, 'admin', 'dang-nhap', 'Quản trị - đăng nhập', { full: false });
  await p.click('#demo-enter'); await p.waitForSelector('.kpis', { timeout: 15000 }).catch(() => {});
  const routes = [
    ['dashboard', 'Tổng quan'], ['orders', 'Đơn hàng'], ['leads', 'Khách hàng tiềm năng'], ['customers', 'Khách hàng'],
    ['maintenance', 'Lịch bảo trì'], ['products', 'Sản phẩm'], [`products/${ids[0]}`, 'Sửa sản phẩm'], ['products/new', 'Thêm sản phẩm'],
    ['categories', 'Danh mục'], ['categories/may-lanh', 'Sửa danh mục'], ['brands', 'Thương hiệu'], ['reviews', 'Đánh giá'],
    ['coupons', 'Mã giảm giá'], ['coupons/new', 'Tạo mã giảm giá'], ['banners', 'Banner'], ['posts', 'Bài viết'], ['posts/new', 'Viết bài mới'],
    ['vision', 'Trang Tầm nhìn'], ['projects', 'Dự án tiêu biểu'], ['faqs', 'Hỏi đáp (FAQ)'], ['trust', 'Uy tín & đánh giá'],
    ['reports', 'Báo cáo'], ['notifications', 'Nhật ký thông báo'], ['misa', 'Xuất Excel MISA'],
    ['settings', 'Cài đặt cửa hàng'], ['stores', 'Cửa hàng'], ['services', 'Dịch vụ'], ['policies', 'Chính sách'],
  ];
  for (const [r, title] of routes) {
    await go(p, `admin/index.html#/${r}`); await p.waitForTimeout(500);
    await shot(p, 'admin', r.replace('/', '-'), `Quản trị - ${title}`);
    if (r === 'orders') {
      await p.click('.ad-table tr.clickable').catch(() => {}); await p.waitForSelector('.ad-steps').catch(() => {});
      await shot(p, 'admin', 'orders-chi-tiet', 'Quản trị - Chi tiết đơn hàng');
      await shot(p, 'admin', 'orders-xac-nhan-huy', 'Quản trị - Hộp xác nhận hủy đơn', { full: false, before: async () => { await p.click('[data-status="cancelled"]'); } });
      await closeModal(p);
    }
    if (r === 'leads') {
      await p.click('.ad-table tr.clickable').catch(() => {}); await p.waitForSelector('.ad-pipeline').catch(() => {});
      await shot(p, 'admin', 'leads-chi-tiet', 'Quản trị - Chi tiết khách hàng tiềm năng (pipeline)');
    }
  }
  await ctx.close();
  const m = await context(MOBILE);
  const mp = await m.newPage();
  await go(mp, 'admin/index.html'); await mp.click('#demo-enter'); await mp.waitForSelector('.kpis').catch(() => {});
  await shot(mp, 'admin', 'mobile-tong-quan', 'Quản trị mobile - Tổng quan');
  await shot(mp, 'admin', 'mobile-menu', 'Quản trị mobile - Menu', { full: false, before: async () => { await mp.evaluate(() => scrollTo(0, 0)); await mp.click('#burger'); } });
  await m.close();
}

await browser.close();
server.close();

// Trang mục lục xem nhanh toàn bộ ảnh
const groups = { 'web-desktop': 'Website - Desktop (1440px)', 'web-mobile': 'Website - Mobile (390px)', admin: 'Quản trị' };
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Bộ màn hình giao diện</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;background:#f4f6fa;color:#1d2939}h1{margin:0 0 4px}h2{margin:32px 0 12px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}figure{margin:0;background:#fff;border:1px solid #e4e7ec;border-radius:10px;overflow:hidden}
figure img{width:100%;height:220px;object-fit:cover;object-position:top;display:block;border-bottom:1px solid #e4e7ec}figcaption{padding:8px 10px;font-size:13px}figcaption small{color:#667085;display:block}</style>
<h1>Bộ màn hình giao diện</h1><p>${manifest.filter((x) => x.ok).length} ảnh • chụp ${new Date().toLocaleString('vi-VN')} • chế độ demo</p>
${Object.entries(groups).map(([g, t]) => `<h2>${t}</h2><div class="g">${manifest.filter((x) => x.group === g && x.ok).map((x) => `<figure><a href="${x.file}" target="_blank"><img src="${x.file}" loading="lazy" alt=""></a><figcaption>${x.title}<small>${x.file}</small></figcaption></figure>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const bad = manifest.filter((x) => !x.ok);
console.log(`\n${manifest.length - bad.length}/${manifest.length} ảnh -> ${OUT}`);
if (bad.length) console.log('Lỗi:\n' + bad.map((x) => ` - ${x.file}: ${x.error}`).join('\n'));
