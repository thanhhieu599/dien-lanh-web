// Kiểm thử ĐỒNG BỘ quản trị ↔ website (chế độ DEMO, cùng trình duyệt):
// sửa từng mục trong quản trị demo -> website hiển thị đúng; dữ liệu khách tạo trên website -> quản trị;
// bảng chưa sửa không bị dữ liệu demo cũ ghi đè.
// Chạy: node tests/browser/sync-demo.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { server, base } = await pagesServer(ROOT);
const browser = await chromium();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
await blockExternal(ctx);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
page.on('dialog', (d) => d.accept());
const fe = `${base}frontend/`;
const admin = `${base}admin/index.html`;
const toast = async (t) => { try { await page.locator('.toast', { hasText: t }).first().waitFor({ timeout: 4000 }); return true; } catch { return false; } finally { await page.evaluate(() => document.querySelectorAll('.toast').forEach((x) => x.remove())); } };
const text = async (sel = 'body') => (await page.locator(sel).first().textContent()) || '';

// Mở form quản trị, điền, lưu. fills: { name: value | true/false (ô tích) }
async function adminSave(route, fills, label) {
  await page.goto(`${admin}#/${route}`);
  await page.waitForSelector('#frm');
  for (const [k, v] of Object.entries(fills)) {
    const el = page.locator(`#frm [name="${k}"]`).first();
    const tag = await el.evaluate((x) => (x.type === 'checkbox' ? 'check' : x.tagName));
    if (tag === 'check') await el.setChecked(!!v);
    else if (tag === 'SELECT') await el.selectOption(String(v));
    else await el.fill(String(v));
  }
  await page.click('#save');
  check(await toast('Đã lưu'), `quản trị: ${label}`);
}

try {
  console.log('Chuẩn bị');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('.pcard');
  const cats = await page.evaluate(() => DT.categories.map((c) => c.id));
  const hideCat = cats.at(-1);
  const hideCatName = await page.evaluate((id) => DT.categories.find((c) => c.id === id).name, hideCat);
  const hideCatCount = await page.evaluate((id) => DT.products.filter((p) => p.cat === id).length, hideCat);
  const firstPost = await page.evaluate(() => DT.posts[0].slug);
  const projSlug = await page.evaluate(() => DT.projects[0].slug);
  check(hideCatCount > 0, `danh mục "${hideCatName}" đang có ${hideCatCount} sản phẩm`);

  console.log('Quản trị demo: sửa từng mục');
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');

  await page.goto(`${admin}#/settings`);
  await page.waitForSelector('#frm [name=hotline]');
  await page.fill('#frm [name=hotline]', '1800 1234');
  await page.fill('#frm [name=hotlineB2B]', '');
  await page.fill('#frm [name=email]', 'lienhe@dongbo.vn');
  await page.fill('#frm [name=workingHours]', '8:00 - 20:00');
  await page.fill('#frm [name=freeShipThreshold]', '3000000');
  await page.click('#frm .ad-form-foot .btn-primary');
  check(await toast('Đã lưu cài đặt'), 'quản trị: cài đặt (hotline, email, giờ làm việc, ngưỡng miễn phí ship)');

  await adminSave('products/1001', { name: 'Máy lạnh Đồng Bộ 1 HP', price: 7777000, rating: 4.2, reviews: 9, stock: 3 }, 'sửa tên, giá, điểm đánh giá, tồn kho sản phẩm 1001');
  await adminSave('products/1002', { active: false }, 'ẩn sản phẩm 1002');
  await adminSave(`categories/${hideCat}`, { active: false }, `ẩn danh mục "${hideCatName}"`);
  await adminSave('brands/thuong-hieu', { name: 'Hãng Đồng Bộ' }, 'đổi tên thương hiệu');
  await adminSave('banners/1', { title: 'Banner đồng bộ từ quản trị' }, 'sửa banner trang chủ');
  await adminSave(`posts/${firstPost}`, { title: 'Bài viết đồng bộ từ quản trị' }, 'sửa bài viết');
  await adminSave('policies/new', { key: 'kiem-tra', title: 'Chính sách kiểm tra đồng bộ', body: '<p>Nội dung chính sách mới.</p>' }, 'thêm chính sách');
  await adminSave('stores/1', { name: 'Showroom Đồng Bộ' }, 'sửa tên cửa hàng');
  await adminSave('services/ve-sinh', { price: 120000 }, 'sửa giá dịch vụ vệ sinh');
  await adminSave('coupons/new', { code: 'SYNC5', type: 'percent', value: 5, min: 0, description: 'Giảm 5% đồng bộ' }, 'thêm mã giảm giá công khai');
  await adminSave('coupons/new', { code: 'TUONGLAI', type: 'percent', value: 5, min: 0, starts_at: '2099-01-01T08:00', description: 'Chưa tới ngày' }, 'thêm mã giảm giá chưa tới ngày bắt đầu');
  await adminSave('faqs/new', { question: 'Câu hỏi đồng bộ từ quản trị?', category: 'Mua hàng & bảo hành', answer: 'Trả lời đồng bộ.' }, 'thêm câu hỏi FAQ');
  await adminSave(`projects/${projSlug}`, { published: false }, 'gỡ đăng một dự án');

  console.log('Website nhận thay đổi');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('.pcard');
  check((await text('.h-hotline')).includes('1800 1234'), 'đầu trang: hotline mới');
  check((await text('footer')).includes('1800 1234') && !(await text('footer')).includes('Doanh nghiệp: 0909'), 'chân trang: hotline mới, ẩn hotline doanh nghiệp đã xóa');
  check((await text('.benefits')).includes('Miễn phí đơn từ 3 triệu'), 'dải cam kết: ngưỡng miễn phí ship mới (3 triệu)');
  check((await text('main')).includes('Banner đồng bộ từ quản trị'), 'trang chủ: banner mới');
  check((await text('#hero-right')).includes('chỉ từ 120K'), 'trang chủ: giá vệ sinh theo mục Dịch vụ (120K)');
  check(!(await text('.catnav')).includes(hideCatName), 'menu: danh mục đã ẩn không hiện');
  const st = await page.evaluate((id) => ({ hidden: DT.products.filter((p) => p.cat === id).length, p2: !!DT.api.productById(1002), p1: DT.api.productById(1001) }), hideCat);
  check(st.hidden === 0, 'sản phẩm của danh mục đã ẩn không hiện');
  check(!st.p2, 'sản phẩm đã ẩn (1002) không hiện');
  check(st.p1?.name === 'Máy lạnh Đồng Bộ 1 HP' && st.p1.price === 7777000 && st.p1.stock === 3, 'dữ liệu sản phẩm 1001 theo quản trị');

  await page.goto(`${fe}san-pham.html?id=1001`);
  await page.waitForSelector('#pd .pd-price');
  check((await text('h1')).includes('Máy lạnh Đồng Bộ 1 HP'), 'trang sản phẩm: tên mới');
  check((await text('.pd-price')).includes('7.777.000'), 'trang sản phẩm: giá mới');
  check((await text('.pd-sub')).includes('4.2') && (await text('.pd-sub')).includes('9 đánh giá'), 'trang sản phẩm: điểm & số lượt đánh giá theo quản trị');
  check((await text('.pd-sub')).includes('Hãng Đồng Bộ'), 'trang sản phẩm: tên thương hiệu mới');
  check((await text('.aside-box')).includes('3.000.000'), 'chính sách bán hàng: ngưỡng miễn phí ship mới');
  check((await text('.pd-aside')).includes('Showroom Đồng Bộ') || (await text('.pd-aside')).includes('Đồng Bộ'), 'còn hàng tại cửa hàng: tên cửa hàng mới');
  await page.goto(`${fe}san-pham.html?id=1002`);
  await page.waitForURL(/404\.html/);
  check(true, 'mở sản phẩm đã ẩn → trang 404');

  await page.goto(`${fe}thuong-hieu.html`);
  await page.waitForSelector('.brand-tile');
  check((await text('.brand-tile')).includes('Hãng Đồng Bộ'), 'trang Thương hiệu: tên mới');
  await page.goto(`${fe}tin-tuc.html`);
  await page.waitForSelector('main');
  await page.waitForTimeout(300);
  check((await text('main')).includes('Bài viết đồng bộ từ quản trị'), 'tin tức: tiêu đề bài viết mới');
  await page.goto(`${fe}chinh-sach.html?type=kiem-tra`);
  await page.waitForSelector('#policy .policy-nav');
  check((await text('#policy')).includes('Nội dung chính sách mới.') && (await text('.policy-nav')).includes('Chính sách kiểm tra đồng bộ'), 'chính sách mới hiển thị');
  await page.goto(`${fe}he-thong-cua-hang.html`);
  await page.waitForSelector('.store-card');
  check((await text('#store-list')).includes('Showroom Đồng Bộ'), 'hệ thống cửa hàng: tên mới');
  await page.goto(`${fe}dich-vu.html`);
  await page.waitForTimeout(400);
  check((await text('main')).includes('120.000'), 'trang dịch vụ: giá mới');
  check((await text('main')).includes('1800 1234'), 'trang dịch vụ: hotline mới');
  await page.goto(`${fe}lien-he.html`);
  await page.waitForTimeout(300);
  const contact = await text('aside');
  check(contact.includes('1800 1234') && contact.includes('lienhe@dongbo.vn') && contact.includes('8:00 - 20:00'), 'trang liên hệ: hotline, email, giờ làm việc mới');
  check(!(await page.locator('[data-cfg="hotlineB2B"]').first().isVisible()), 'trang liên hệ: ẩn dòng hotline doanh nghiệp đã xóa');
  check(await page.locator('a[data-cfg="email"]').getAttribute('href') === 'mailto:lienhe@dongbo.vn', 'trang liên hệ: link email đúng');
  await page.goto(`${fe}hoi-dap.html`);
  await page.waitForSelector('.faq-list details');
  check((await text('.faq-list')).includes('Câu hỏi đồng bộ từ quản trị?'), 'hỏi đáp: câu hỏi mới');
  await page.goto(`${fe}du-an.html`);
  await page.waitForSelector('#pj-grid');
  check(await page.locator(`#pj-grid a[href*="${projSlug}"]`).count() === 0, 'dự án đã gỡ đăng không hiện');

  console.log('Mã giảm giá');
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1001, 1); });
  await page.goto(`${fe}gio-hang.html`);
  await page.waitForSelector('.coupon-list');
  check(await page.locator('.coupon-chip[data-code="SYNC5"]').count() === 1, 'giỏ hàng: hiện mã mới SYNC5');
  check(await page.locator('.coupon-chip[data-code="TUONGLAI"]').count() === 0, 'giỏ hàng: không hiện mã chưa tới ngày bắt đầu');
  await page.click('.coupon-chip[data-code="SYNC5"]');
  await page.waitForSelector('.coupon-applied');
  check((await text('.coupon-applied')).includes('SYNC5'), 'áp dụng được mã mới');
  // Ngưỡng miễn phí ship mới 3 triệu: đơn 2-3 triệu phải tính phí (ngưỡng mặc định 2 triệu thì miễn phí)
  const ship = await page.evaluate(() => {
    const p = DT.products.find((x) => x.price >= 2000000 && x.price < 3000000);
    if (!p) return null;
    DT.store.clearCart(); DT.store.addToCart(p.id, 1);
    const a = DT.store.totals().shipping;
    DT.store.clearCart(); DT.store.addToCart(1001, 1);
    return { a, b: DT.store.totals().shipping };
  });
  check(ship && ship.a > 0 && ship.b === 0, `phí ship theo ngưỡng mới: đơn 2-3 triệu tính phí (${ship?.a}), đơn 7,8 triệu miễn phí`);

  console.log('Đánh giá: website → quản trị → website');
  await page.goto(`${fe}san-pham.html?id=1003`);
  await page.waitForSelector('#write-review');
  await page.click('#write-review');
  await page.fill('#review-form [name=name]', 'Khách Kiểm Duyệt');
  await page.fill('#review-form [name=phone]', '0901234567');
  await page.fill('#review-form [name=text]', 'Đánh giá cần kiểm duyệt.');
  await page.click('#review-form button.btn-primary');
  await page.waitForTimeout(400);
  check((await text('#review-list')).includes('Khách Kiểm Duyệt'), 'website: đánh giá mới hiển thị');
  await page.goto(`${admin}#/reviews?status=`);
  await page.waitForSelector('.ad-table');
  const row = page.locator('.ad-table tbody tr', { hasText: 'Khách Kiểm Duyệt' });
  check(await row.count() === 1, 'quản trị: thấy đánh giá từ website');
  await row.locator('[data-rv="rejected"]').click();
  check(await toast(''), 'quản trị: từ chối đánh giá');
  await page.goto(`${fe}san-pham.html?id=1003`);
  await page.waitForSelector('#review-list');
  check(!(await text('#review-list')).includes('Khách Kiểm Duyệt'), 'website: đánh giá bị từ chối không còn hiện');

  console.log('Bảng chưa sửa không bị dữ liệu demo cũ ghi đè');
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem(DT.ADMIN_DEMO_KEY));
    db.posts = [{ slug: 'bai-cu', title: 'Bài viết CŨ không được hiện', cat: 'x', date: '2020-01-01', published: true }];
    delete db.touched.posts;
    localStorage.setItem(DT.ADMIN_DEMO_KEY, JSON.stringify(db));
  });
  await page.goto(`${fe}tin-tuc.html`);
  await page.waitForTimeout(400);
  check(!(await text('main')).includes('Bài viết CŨ không được hiện'), 'website: bảng chưa sửa trong quản trị dùng dữ liệu mới nhất');
  await page.goto(`${admin}#/posts`);
  await page.waitForSelector('.ad-table');
  check(!(await text('.ad-table')).includes('Bài viết CŨ'), 'quản trị: bảng chưa sửa tự cập nhật theo dữ liệu mới nhất');

  console.log('Khôi phục dữ liệu mẫu');
  await page.evaluate(() => { AD.db.reset(); });
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('.pcard');
  check(!(await text('.h-hotline')).includes('1800 1234') && await page.evaluate(() => !!DT.api.productById(1002)), 'quản trị đặt lại dữ liệu demo → website về mặc định');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
