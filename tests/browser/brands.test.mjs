// Kiểm thử trang Thương hiệu + sửa lỗi giao diện (chế độ DEMO):
// - Link "Thương hiệu" ở thanh trên cùng, trang chủ không còn khối thương hiệu
// - Danh sách thương hiệu, chi tiết thương hiệu chia sản phẩm theo danh mục
// - Quản trị demo: tải logo thương hiệu → website hiển thị
// - Trang sản phẩm: các cột cố định khi cuộn; trang so sánh: nút X hiển thị và hoạt động
// Chạy: node tests/browser/brands.test.mjs
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

try {
  console.log('Thanh trên cùng & trang chủ');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('.topbar');
  check(await page.locator('.topbar-left a.brand-link[href="thuong-hieu.html"]').count() === 1, 'thanh trên cùng (phía trên logo) có link "Thương hiệu"');
  check(!(await page.locator('main').textContent()).includes('Thương hiệu chính hãng'), 'trang chủ không còn khối "Thương hiệu chính hãng"');

  console.log('Danh sách thương hiệu');
  await page.click('.topbar-left a.brand-link');
  await page.waitForSelector('.brand-tile');
  const total = await page.evaluate(() => DT.products.length);
  check(await page.locator('.brand-tile').count() === 1, 'hiện thương hiệu từ dữ liệu');
  check((await page.locator('.brand-tile .br-meta small').textContent()).includes(`${total} sản phẩm`), `đếm đúng ${total} sản phẩm`);
  check(await page.locator('.brand-tile .br-name').count() === 1, 'chưa có logo → hiện tên thương hiệu');

  console.log('Chi tiết thương hiệu');
  await page.click('.brand-tile');
  await page.waitForSelector('.brand-head');
  check(/thuong-hieu\.html\?id=thuong-hieu/.test(page.url()), 'mở trang chi tiết thương hiệu');
  const cats = await page.evaluate(() => DT.categories.filter((c) => DT.products.some((p) => p.cat === c.id && p.brand === 'thuong-hieu')).map((c) => c.name));
  const heads = await page.locator('.brand-cat .section-head h2').allTextContents();
  check(heads.length === cats.length && heads.every((h, i) => h === cats[i]), `sản phẩm chia theo ${cats.length} danh mục`);
  const perCat = await page.$$eval('.brand-cat .pgrid', (g) => g.map((x) => x.querySelectorAll('.pcard').length));
  check(perCat.every((n) => n >= 1 && n <= 10), 'mỗi danh mục hiện tối đa 10 sản phẩm');
  check(await page.locator('main h1').count() === 1 && (await page.locator('main h1').textContent()) === 'Tên thương hiệu', 'một tiêu đề H1 duy nhất (tên thương hiệu)');
  const more = page.locator('.brand-cat .section-head a.link').first();
  check(/brand=thuong-hieu/.test(await more.getAttribute('href')), 'link "Xem tất cả" lọc sẵn theo thương hiệu');
  await more.click();
  await page.waitForSelector('.pcard');
  check(await page.locator('#active-filters .af button[data-group="brand"][data-v="thuong-hieu"]').count() === 1, 'trang danh mục mở với bộ lọc thương hiệu');
  await page.goto(`${fe}thuong-hieu.html?id=khong-co`);
  await page.waitForSelector('.brand-tile');
  check(true, 'mã thương hiệu không tồn tại → hiện danh sách thương hiệu');

  console.log('Quản trị demo: logo thương hiệu');
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');
  await page.goto(`${admin}#/brands/thuong-hieu`);
  await page.waitForSelector('#frm [data-img-field="logo"]');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 160); g.fillStyle = '#0b5ed7'; g.fillRect(40, 40, 320, 80); return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('#frm [data-img-field="logo"] input[type=file]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForSelector('#frm [data-img-field="logo"] .ad-img-prev img');
  await page.click('#save');
  check(await toast('Đã lưu'), 'tải logo cho thương hiệu');
  await page.goto(`${admin}#/brands`);
  await page.waitForSelector('.ad-table');
  check(await page.locator('.ad-table img.ad-brand-logo').count() === 1, 'danh sách quản trị hiện logo');
  await page.goto(`${admin}#/brands/new`);
  await page.waitForSelector('#frm [name=id]');
  await page.fill('#frm [name=id]', 'hang-moi');
  await page.fill('#frm [name=name]', 'Hãng Mới');
  await page.click('#save');
  check(await toast('Đã lưu'), 'thêm thương hiệu mới');

  await page.goto(`${fe}thuong-hieu.html`);
  await page.waitForSelector('.brand-tile');
  check(await page.locator('.brand-tile').count() === 2, 'website: hiện 2 thương hiệu');
  check(await page.locator('.brand-tile .br-logo img').count() === 1, 'website: logo vừa tải lên hiển thị');
  await page.goto(`${fe}thuong-hieu.html?id=hang-moi`);
  await page.waitForSelector('.brand-head');
  check((await page.locator('#brand-page').textContent()).includes('Chưa có sản phẩm'), 'thương hiệu chưa có sản phẩm → thông báo');

  console.log('Trang sản phẩm: cột cố định khi cuộn');
  await page.goto(`${fe}san-pham.html?id=1001`);
  await page.waitForSelector('.gallery');
  const pos = await page.evaluate(() => ['.gallery', '.pd-aside'].map((s) => getComputedStyle(document.querySelector(s)).position));
  check(pos.every((p) => p === 'static'), 'ảnh & cột phải không trượt theo màn hình');
  const gap = () => page.evaluate(() => document.querySelector('.gallery').getBoundingClientRect().top - document.querySelector('.pd-info').getBoundingClientRect().top);
  const g0 = await gap();
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(300);
  check(Math.abs((await gap()) - g0) < 1, 'các cột giữ nguyên vị trí tương đối khi cuộn');
  const hs = await page.evaluate(() => ['.gallery', '.pd-info', '.pd-aside'].map((x) => Math.round(document.querySelector(x).getBoundingClientRect().bottom)));
  check(hs.every((v) => Math.abs(v - hs[0]) <= 1), `3 cột đáy thẳng hàng (${hs.join(' / ')})`);
  check(await page.locator('.pd-aside [data-quote]').count() === 0, 'cột phải không còn khối "Yêu cầu báo giá"');
  const order = await page.evaluate(() => { const secs = [...document.querySelectorAll('#pd-content > div:last-child > .pd-section')]; return secs.map((x) => x.querySelector('h2').textContent); });
  check(order.at(-1) === 'Khách hàng doanh nghiệp' && order.at(-2) === 'Bài viết tư vấn' && await page.locator('.pd-b2b [data-quote]').count() === 1, 'khối "Yêu cầu báo giá" nằm dưới "Bài viết tư vấn"');

  console.log('Trang so sánh: nút X');
  await page.evaluate(() => { DT.store.clearCompare?.(); });
  await page.goto(`${fe}danh-muc.html?cat=may-lanh`);
  await page.waitForSelector('.pcard');
  const ids = await page.$$eval('.pcard', (a) => a.slice(0, 2).map((x) => x.dataset.id));
  for (const id of ids) await page.click(`.pcard[data-id="${id}"] [data-action="compare"]`, { force: true });
  await page.goto(`${fe}so-sanh.html`);
  await page.waitForSelector('.compare-table .cp-x');
  const st = await page.evaluate(() => {
    const x = document.querySelector('.compare-table .cp-x'); const td = document.querySelector('.compare-table .cp-head');
    return { color: getComputedStyle(x).color, bg: getComputedStyle(x).backgroundColor, td: getComputedStyle(td).display, tdBg: getComputedStyle(td).backgroundColor };
  });
  check(st.color !== st.bg && st.color !== 'rgb(255, 255, 255)', `nút X có màu nhìn thấy được (${st.color})`);
  check(st.td === 'table-cell' && st.tdBg !== 'rgb(11, 94, 215)', 'hàng sản phẩm hiển thị đúng dạng bảng, không bị nền xanh');
  await page.click('.compare-table .cp-x');
  await page.waitForTimeout(300);
  check(await page.locator('.compare-table .cp-head').count() === 1, 'bấm X → bỏ sản phẩm khỏi so sánh');
  const chat = await page.evaluate(() => getComputedStyle(document.querySelector('.chat-panel .cp-head')).backgroundColor);
  check(chat === 'rgb(11, 94, 215)', 'khung chat giữ nguyên giao diện');

  console.log('Điện thoại');
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mp.on('pageerror', (e) => errors.push(`${mp.url()}: ${e.message}`));
  for (const u of ['thuong-hieu.html', 'thuong-hieu.html?id=thuong-hieu']) {
    await mp.goto(`${fe}${u}`);
    await mp.waitForSelector('#brand-page > *');
    check(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${u}: không tràn ngang`);
  }
  check(await mp.locator('#drawer a[href="thuong-hieu.html"]').count() === 1, 'menu điện thoại có link "Thương hiệu"');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
