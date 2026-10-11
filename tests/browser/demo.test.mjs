// Kiểm thử chế độ DEMO (chưa kết nối Supabase): website + trang quản trị dùng chung dữ liệu trên trình duyệt.
// Chạy: node tests/browser/demo.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { server, base } = await pagesServer(ROOT);
const browser = await chromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
await blockExternal(ctx);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
page.on('dialog', (d) => d.accept());
const fe = `${base}frontend/`;
const admin = `${base}admin/index.html`;
const toast = async (t) => { try { await page.locator('.toast', { hasText: t }).first().waitFor({ timeout: 4000 }); return true; } catch { return false; } finally { await page.evaluate(() => document.querySelectorAll('.toast').forEach((x) => x.remove())); } };

try {
  console.log('Website demo');
  await page.goto(`${fe}san-pham.html?id=1003`);
  await page.waitForSelector('.pd-title h1');
  await page.click('.buy-btns [data-action="add-cart"]');
  await page.goto(`${fe}gio-hang.html`);
  await page.locator('.coupon-chip[data-code="DTCOOL10"]').click();
  check(await toast('Đã áp dụng'), 'áp mã DTCOOL10');
  const cartTotal = Number((await page.locator('.summary .sum-total b').textContent()).replace(/\D/g, ''));
  await page.goto(`${fe}tai-khoan.html#register`);
  await page.fill('#register-form [name=name]', 'Khách Demo');
  await page.fill('#register-form [name=phone]', '0901234567');
  await page.fill('#register-form [name=password]', '123456');
  await page.check('#register-form [name=agree]');
  await page.click('#register-form button');
  await page.waitForSelector('.acc-nav');
  check(true, 'đăng ký tài khoản demo');
  await page.goto(`${fe}thanh-toan.html`);
  await page.fill('[name=province]', 'TP. Hồ Chí Minh').catch(() => page.selectOption('[name=province]', 'TP. Hồ Chí Minh'));
  await page.fill('[name=district]', 'Quận 7');
  await page.fill('[name=address]', '123 Nguyễn Thị Thập');
  const coTotal = Number((await page.locator('#co-summary .sum-total b').textContent()).replace(/\D/g, ''));
  check(coTotal === cartTotal, 'tổng thanh toán = giỏ hàng');
  await page.click('#co-form button[type=submit]');
  await page.waitForURL(/dat-hang-thanh-cong/);
  const code = new URL(page.url()).searchParams.get('code');
  check(!!code, `đặt hàng demo ${code}`);
  await page.goto(`${fe}tai-khoan.html#orders`);
  await page.waitForSelector('.order-card');
  check((await page.locator('.order-card').first().textContent()).includes(code), 'đơn hàng của tôi');
  await page.goto(`${fe}bao-gia-du-an.html`);
  await page.fill('form[data-lead] [name=company]', 'Cty Demo');
  await page.fill('form[data-lead] [name=name]', 'Anh Demo');
  await page.fill('form[data-lead] [name=phone]', '0909888777');
  await page.fill('form[data-lead] [name=email]', 'demo@example.com');
  await page.click('form[data-lead] button:not([type=button])');
  await page.waitForSelector('.modal-wrap');
  check(true, 'gửi yêu cầu báo giá demo');

  console.log('Quản trị demo đọc dữ liệu từ website');
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');
  await page.goto(`${admin}#/orders`);
  await page.waitForSelector('.ad-table');
  check((await page.locator('.ad-table').textContent()).includes(code), 'đơn từ website hiện trong quản trị');
  await page.locator('.ad-table tbody tr', { hasText: code }).click();
  await page.waitForSelector('#ops');
  await page.click('[data-status="confirmed"]');
  check(await toast('Đã chuyển đơn sang'), 'xác nhận đơn');
  await page.waitForSelector('#ops');
  await page.selectOption('#ops [name=payment_status]', 'paid');
  await page.click('#ops button');
  check(await toast('Đã lưu'), 'đánh dấu đã thanh toán');
  await page.goto(`${admin}#/leads`);
  await page.waitForSelector('.ad-table');
  check((await page.locator('.ad-table').textContent()).includes('Cty Demo'), 'lead từ website hiện trong quản trị');
  await page.goto(`${admin}#/products/1003`);
  await page.waitForSelector('#frm');
  await page.fill('#frm [name=sold]', '');
  await page.click('#save');
  check(await toast('Đã lưu'), 'sửa sản phẩm demo (bỏ trống "Đã bán")');
  for (const r of ['dashboard', 'customers', 'reviews', 'reports', 'settings', 'notifications', 'coupons', 'posts', 'categories']) {
    await page.goto(`${admin}#/${r}`);
    await page.waitForSelector('.ad-head h1');
  }
  check(true, 'mở mọi mục quản trị demo');

  console.log('Khách thấy cập nhật từ quản trị');
  await page.goto(`${fe}tra-cuu-don-hang.html?code=${code}&phone=0901234567`);
  await page.waitForSelector('.order-info');
  const info = await page.locator('#track-result').textContent();
  check(info.includes('Đã xác nhận'), 'tra cứu: trạng thái "Đã xác nhận"');
  check(info.includes('Đã thanh toán'), 'tra cứu: "Đã thanh toán"');

  console.log('Điện thoại');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await blockExternal(m);
  const mp = await m.newPage();
  mp.on('pageerror', (e) => errors.push(`mobile ${mp.url()}: ${e.message}`));
  for (const u of ['frontend/index.html', 'frontend/danh-muc.html?cat=may-lanh', 'frontend/san-pham.html?id=1003', 'frontend/gio-hang.html', 'frontend/thanh-toan.html', 'admin/index.html']) {
    await mp.goto(base + u);
    await mp.waitForTimeout(300);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `${u}: không tràn ngang trên điện thoại`);
  }
  await mp.click('#demo-enter');
  await mp.waitForSelector('.ad-side');
  for (const r of ['dashboard', 'orders', 'products', 'products/1003', 'leads', 'reports', 'settings']) {
    await mp.goto(`${admin}#/${r}`);
    await mp.waitForSelector('.ad-head h1');
    await mp.waitForTimeout(200);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `quản trị #/${r}: không tràn ngang trên điện thoại${overflow > 1 ? ` (tràn ${overflow}px)` : ''}`);
  }
  await mp.click('#burger');
  await mp.waitForTimeout(300);
  check(await mp.locator('.ad-side').isVisible(), 'quản trị: mở menu trên điện thoại');
} catch (e) {
  console.error(e);
  check(false, `lỗi khi chạy kịch bản: ${e.message.split('\n')[0]}`);
}
check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
await browser.close();
server.close();
done();
