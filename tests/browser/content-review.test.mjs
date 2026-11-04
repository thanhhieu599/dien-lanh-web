// Kiểm thử các lỗi tìm thấy khi rà soát trang Quản trị › Nội dung website (bản demo):
// chữ dự phòng khi thiếu dữ liệu, ô cạnh banner bị xóa trống, link được kiểm tra giống website,
// Flash Sale hết giờ khi đang mở trang, tên cửa hàng có ký tự "$", mã mức lọc giá giữ nguyên khi lưu lại.
// Chạy: node tests/browser/content-review.test.mjs
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
const homeReady = () => page.waitForSelector('#flash .flash-head', { state: 'attached' });
// Đi qua trang khác trước, để không bấm nhầm vào form cũ còn trên màn hình
const openContent = async () => {
  await page.goto(`${admin}#/dashboard`);
  await page.waitForSelector('.ad-head h1');
  await page.goto(`${admin}#/content`);
  await page.waitForSelector('#ct-form');
};
const saveContent = async () => { await page.click('#ct-form .ad-form-foot .btn-primary'); return toast('Đã lưu nội dung website'); };
const local = (d) => new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16); // giờ VN cho ô datetime-local

try {
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');

  console.log('Chữ dự phòng khi thiếu dữ liệu (website giữ như trước)');
  await page.goto(`${admin}#/settings`);
  await page.waitForSelector('#frm [name=freeShipThreshold]');
  await page.fill('#frm [name=freeShipThreshold]', '0');
  await page.fill('#frm [name=name]', 'Điện Lạnh $& An Phát');
  await page.click('#frm .ad-form-foot .btn-primary');
  check(await toast('Đã lưu cài đặt'), 'cài đặt: bỏ ngưỡng miễn phí ship, tên có ký tự "$&"');
  for (const id of ['ve-sinh']) {
    await page.goto(`${admin}#/services/${id}`);
    await page.waitForSelector('#frm [name=price]');
    await page.fill('#frm [name=price]', '');
    await page.click('#save');
    check(await toast('Đã lưu'), 'dịch vụ vệ sinh: bỏ giá (báo giá theo hợp đồng)');
  }
  await page.goto(`${fe}index.html`);
  await homeReady();
  const mini2 = await page.locator('#hero-right .mini-banner').nth(1).locator('b').innerText();
  check(/tận nơi/.test(mini2) && !/chỉ từ\s*$/.test(mini2), `ô cạnh banner 2: không có giá vệ sinh → "tận nơi" (${mini2.replace(/\n/g, ' ')})`);
  const ship = await page.locator('.benefits .benefit').nth(2).innerText();
  check(ship.includes('Giao tận nơi') && !/từ\s*$/.test(ship), `dải cam kết: không có ngưỡng miễn phí ship → "Giao tận nơi" (${ship.replace(/\n/g, ' ')})`);
  // textContent: chữ gốc (CSS chuyển dòng này sang in hoa khi hiển thị)
  check((await page.locator('#brand-story .bs-kicker').textContent()).includes('Điện Lạnh $& An Phát'), 'tên cửa hàng có "$&" hiện đúng nguyên văn');
  await page.goto(`${fe}san-pham.html?id=1001`);
  await page.waitForSelector('.pd-aside');
  const pol = await page.locator('.pd-aside .aside-box li').nth(1).innerText();
  check(!/Đơn từ\s+nội thành/.test(pol) && pol.includes('Giao tận nơi'), `chính sách bán hàng: không có ngưỡng → "Giao tận nơi" (${pol.replace(/\n/g, ' ')})`);
  await page.evaluate(() => AD?.db?.reset?.()).catch(() => {});

  console.log('Khôi phục dữ liệu mẫu rồi lưu tiếp (trước đây báo lỗi)');
  await page.goto(admin);
  await page.waitForSelector('.ad-side');
  await page.evaluate(() => AD.db.reset());
  await openContent();
  check(await saveContent(), 'sau "Khôi phục dữ liệu mẫu": lưu Nội dung website được');
  await page.goto(`${admin}#/products/1001`);
  await page.waitForSelector('#frm [name=price]');
  await page.click('#save');
  check(await toast('Đã lưu'), 'sau "Khôi phục dữ liệu mẫu": lưu sản phẩm được');

  console.log('Ô cạnh banner bị xóa trống → không hiện khung rỗng');
  await page.goto(admin);
  await page.waitForSelector('.ad-side');
  await page.evaluate(() => AD.db.reset());
  await openContent();
  for (const k of ['title', 'sub', 'cta']) await page.fill(`[name="mini.1.${k}"]`, '');
  check(await saveContent(), 'xóa trống ô cạnh banner 2');
  await page.goto(`${fe}index.html`);
  await homeReady();
  check(await page.locator('#hero-right .mini-banner').count() === 1, 'chỉ hiện 1 ô cạnh banner');

  console.log('Kiểm tra link giống hệt website');
  for (const [href, ok] of [['//evil.example.com', false], ['zalo:0901234567', true], ['tin-tuc/meo-hay.html', true], ['javascript:alert(1)', false]]) {
    await openContent();
    await page.fill('[name="mini.0.href"]', href);
    await page.click('#ct-form .ad-form-foot .btn-primary');
    const saved = await toast('Đã lưu nội dung website');
    check(saved === ok, `link "${href}": ${ok ? 'cho lưu' : 'báo lỗi, không lưu'}`);
  }

  console.log('Mức lọc giá: lưu lại không đổi mã (link cũ vẫn dùng được)');
  await page.evaluate(() => AD.db.reset());
  await openContent();
  check(await saveContent(), 'lưu lại nguyên các mức giá mặc định');
  const vs = await page.evaluate(() => JSON.parse(localStorage.getItem(DT.ADMIN_DEMO_KEY)).settings.find((s) => s.key === 'catalog').value.priceRanges.map((r) => r.v));
  const defaults = await page.evaluate(() => DT.priceRanges.map((r) => r.v));
  check(JSON.stringify(vs) === JSON.stringify(defaults), `mã mức giá giữ nguyên (${vs.join(', ')})`);
  await page.goto(`${fe}tim-kiem.html?price=30-999`);
  await page.waitForSelector('.filters');
  check(await page.locator('#active-filters .af', { hasText: 'Trên 30 triệu' }).count() === 1, 'link cũ ?price=30-999 vẫn lọc "Trên 30 triệu"');

  console.log('Flash Sale hết giờ khi đang mở trang → tự ẩn');
  await openContent();
  await page.fill('[name="flash.endsAt"]', local(new Date(Date.now() + 2 * 60000)));
  check(await saveContent(), 'Flash Sale kết thúc sau 2 phút');
  const fp = await ctx.newPage();
  fp.on('pageerror', (e) => errors.push(`${fp.url()}: ${e.message}`));
  await fp.clock.install();
  await fp.goto(`${fe}index.html`);
  await fp.waitForSelector('#flash .flash-head', { state: 'attached' });
  check(await fp.locator('#flash').isVisible(), 'đang trong giờ: hiện Flash Sale');
  await fp.clock.fastForward('03:00');
  await fp.waitForTimeout(200);
  check(await fp.locator('#flash').isHidden(), 'hết giờ khi đang xem: khối Flash Sale tự ẩn');
  await fp.close();

  await page.evaluate(() => AD.db.reset());
  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
