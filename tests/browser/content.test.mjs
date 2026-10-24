// Kiểm thử Quản trị › Nội dung website (bản demo): sửa nội dung trang chủ, dải cam kết, chính sách bán hàng,
// ô nhận tin, Flash Sale, mức lọc giá, phụ kiện mua kèm -> website hiển thị đúng; khôi phục mặc định.
// Chạy: node tests/browser/content.test.mjs
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
const text = async (sel) => (await page.locator(sel).first().innerText()) || '';
// Giờ theo múi giờ của trình duyệt kiểm thử (Asia/Ho_Chi_Minh, UTC+7) cho ô datetime-local
const local = (d) => new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16);
const openForm = async () => { await page.goto(`${admin}#/content`); await page.waitForSelector('#ct-form'); };
const save = async (msg = 'Đã lưu nội dung website') => { await page.click('#ct-form .ad-form-foot .btn-primary'); return toast(msg); };

try {
  console.log('Mặc định: website không đổi khi chưa sửa');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#brand-story .bs-stats');
  check((await text('#brand-story')).includes('50.000+') && (await text('#b2b-banner')).includes('Công nợ 30 - 60 ngày') && (await text('#hero-right')).includes('Flash Sale'), 'trang chủ hiện nội dung mặc định');

  console.log('Quản trị › Nội dung website');
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');
  check(await page.locator('.ad-side a[href="#/content"]').count() === 1, 'menu quản trị có mục "Nội dung website"');
  await openForm();
  await page.fill('[name="mini.0.title"]', 'Giờ vàng\ngiảm 30%');
  await page.fill('[name="mini.0.href"]', 'khuyen-mai.html');
  await page.fill('[name="story.title"]', 'Đối tác *điện lạnh* tin cậy');
  await page.fill('[name="story.stats.1.value"]', '80.000+');
  await page.fill('[name="b2b.points.0"]', 'Khảo sát tận nơi trong 24h');
  await page.fill('[name="b2b.stats.0.value"]', '700+');
  await page.fill('[name="flash.title"]', 'GIỜ VÀNG GIÁ SỐC');
  await page.fill('[name="flash.endsAt"]', local(new Date(Date.now() + 3 * 86400000 + 3600000)));
  await page.fill('[name="benefits.0.title"]', 'Hàng chính hãng có CO/CQ');
  await page.selectOption('[name="benefits.0.icon"]', 'star');
  await page.fill('[name="salesPolicy.2.sub"]', 'Bảo hành lắp đặt 24 tháng');
  await page.fill('[name="newsletter.title"]', 'Đăng ký nhận bảng giá mới');
  // Mức lọc giá: thêm "Dưới 3 triệu" lên đầu
  await page.click('[data-add="ranges"]');
  const last = page.locator('[data-list="ranges"] .tr-row').last();
  await last.locator('[data-k="label"]').fill('Dưới 3 triệu');
  await last.locator('[data-k="min"]').fill('0');
  await last.locator('[data-k="max"]').fill('3');
  // Phụ kiện mua kèm: chỉ giữ ống thoát nước (DT1070)
  for (let i = await page.locator('[data-list="bundles"] .tr-row').count() - 1; i >= 0; i--) {
    const r = page.locator('[data-list="bundles"] .tr-row').nth(i);
    if (await r.locator('[data-k="sku"]').inputValue() !== 'DT1070') await r.locator('[data-del]').click();
  }
  check(await save(), 'lưu nội dung');

  // Kiểm tra dữ liệu sai bị chặn
  await page.fill('[name="mini.1.href"]', 'javascript:alert(1)');
  await page.click('#ct-form .ad-form-foot .btn-primary');
  check(await toast('Liên kết không hợp lệ'), 'liên kết nguy hiểm bị chặn');
  await openForm();
  check(await page.locator('[name="mini.0.title"]').inputValue() === 'Giờ vàng\ngiảm 30%' && await page.locator('[data-list="bundles"] .tr-row').count() === 1, 'mở lại form: giữ nội dung đã lưu');

  console.log('Website nhận nội dung mới');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#brand-story .bs-stats');
  check((await text('#hero-right')).includes('Giờ vàng') && await page.locator('#hero-right .mini-banner').first().evaluate((a) => a.querySelector('b').innerHTML.includes('<br>')), 'ô cạnh banner: tiêu đề mới, xuống dòng đúng');
  check(await page.locator('#brand-story h2 span').textContent() === 'điện lạnh' && (await text('#brand-story')).includes('80.000+'), 'dải giới thiệu: tiêu đề có chữ nhấn mạnh, số liệu mới');
  check((await text('#b2b-banner')).includes('Khảo sát tận nơi trong 24h') && (await text('#b2b-banner')).includes('700+'), 'khối doanh nghiệp: ý & số liệu mới');
  check((await text('.flash-head h2')).includes('GIỜ VÀNG GIÁ SỐC') && await page.locator('#cd-d-wrap').isVisible() && (await page.locator('#cd-d').textContent()) === '3', 'Flash Sale: tiêu đề mới, đếm ngược theo giờ kết thúc (còn 3 ngày)');
  check((await text('.benefits')).includes('Hàng chính hãng có CO/CQ'), 'dải cam kết: mục mới');
  check((await text('.newsletter')).includes('Đăng ký nhận bảng giá mới'), 'ô nhận tin: tiêu đề mới');
  await page.goto(`${fe}san-pham.html?id=1001`);
  await page.waitForSelector('.pd-aside');
  check((await text('.pd-aside .aside-box')).includes('Bảo hành lắp đặt 24 tháng'), 'trang sản phẩm: chính sách bán hàng mới');
  await page.goto(`${fe}danh-muc.html?cat=may-lanh`);
  await page.waitForSelector('.filters');
  const opt = page.locator('.filters [data-group="price"]', { hasText: 'Dưới 3 triệu' });
  check(await opt.count() === 1, 'bộ lọc giá: có mức mới "Dưới 3 triệu"');
  await page.goto(`${fe}tim-kiem.html`);
  await page.waitForSelector('.filters');
  await page.locator('.filters [data-group="price"]', { hasText: 'Dưới 3 triệu' }).click();
  await page.waitForTimeout(300);
  const prices = await page.$$eval('.pgrid .pcard', (a) => a.map((c) => DT.api.productById(Number(c.dataset.id)).price));
  check(prices.length > 0 && prices.every((p) => p < 3000000), `lọc "Dưới 3 triệu" đúng (${prices.length} sản phẩm)`);
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1001, 1); });
  await page.goto(`${fe}gio-hang.html`);
  await page.waitForSelector('.cart-item');
  const xs = await page.$$eval('.cart-xsell [data-xsell]', (a) => a.map((b) => DT.api.productById(Number(b.dataset.xsell)).sku));
  check(xs.length === 1 && xs[0] === 'DT1070', `giỏ hàng: chỉ gợi ý phụ kiện đã cấu hình (${xs.join(', ')})`);

  console.log('Flash Sale đã kết thúc → ẩn');
  await openForm();
  await page.fill('[name="flash.endsAt"]', local(new Date(Date.now() - 3600000)));
  check(await save(), 'đặt giờ kết thúc trong quá khứ');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#brand-story .bs-stats');
  check(await page.locator('#flash').isHidden(), 'khối Flash Sale tự ẩn khi hết giờ');

  console.log('Khôi phục mặc định');
  await openForm();
  await page.click('#ct-reset');
  check(await toast('Đã khôi phục'), 'khôi phục nội dung mặc định');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#brand-story .bs-stats');
  check((await text('#brand-story')).includes('50.000+') && (await text('.flash-head h2')).includes('FLASH SALE') && await page.locator('#flash').isVisible() && !(await text('#hero-right')).includes('Giờ vàng'), 'website về nội dung mặc định');

  console.log('Phân quyền');
  await page.goto(admin);
  await page.waitForSelector('.ad-side');
  await page.selectOption('#demo-role', 'staff').catch(() => {});
  await page.goto(`${admin}#/content`);
  await page.waitForTimeout(500);
  check(await page.locator('#ct-form').count() === 0, 'nhân viên vận hành không sửa được Nội dung website');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
