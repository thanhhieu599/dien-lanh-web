// Kiểm thử Uy tín & SEO (chế độ DEMO): dự án tiêu biểu, chi tiết dự án, hỏi đáp + FAQPage,
// logo / chứng nhận / đánh giá Google, cửa hàng (HVACBusiness), quản trị demo, điện thoại.
// Chạy: node tests/browser/trust.test.mjs
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
const ld = (type) => page.evaluate((t) => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((x) => x['@type'] === t) || null, type);
const toast = async (t) => { try { await page.locator('.toast', { hasText: t }).first().waitFor({ timeout: 4000 }); return true; } catch { return false; } finally { await page.evaluate(() => document.querySelectorAll('.toast').forEach((x) => x.remove())); } };

try {
  console.log('Dự án tiêu biểu');
  await page.goto(`${fe}du-an.html`);
  await page.waitForSelector('.pj-card');
  check(await page.locator('.pj-card').count() === 4, 'hiện 4 dự án');
  check(await page.locator('.pj-card .pj-sample').count() === 4, 'dự án mẫu có nhãn "Dự án mẫu"');
  const stats = await page.locator('#pj-stats b').allTextContents();
  check(stats[0] === '4' && stats[1] === '138', `số liệu tổng hợp từ dữ liệu dự án (${stats.join(' / ')})`);
  await page.click('#pj-filter [data-ind="Văn phòng"]');
  check(await page.locator('.pj-card').count() === 1 && (await page.locator('.pj-card h3').textContent()).includes('văn phòng'), 'lọc theo lĩnh vực');
  await page.click('#pj-filter [data-ind=""]');
  check((await ld('ItemList'))?.itemListElement?.length === 4, 'dữ liệu có cấu trúc ItemList');
  check(await page.locator('.trust-section .tr-logo').count() === 6 && await page.locator('.trust-section .tr-cert').count() === 3, 'khối uy tín: 6 khung logo + 3 chứng nhận (khung chờ)');
  check((await page.locator('.trust-section').textContent()).includes('Khung chờ'), 'khung chờ có ghi chú hướng dẫn nhập trong quản trị');

  console.log('Chi tiết dự án');
  await page.click('.pj-card:nth-child(1) h3 a');
  await page.waitForSelector('.pj-detail');
  check(/du-an-chi-tiet\.html\?slug=/.test(page.url()), 'mở trang chi tiết');
  const facts = await page.locator('.pj-facts-box dt').allTextContents();
  check(['Khách hàng', 'Số máy / dàn lạnh', 'Tổng công suất', 'Thời gian thi công'].every((f) => facts.includes(f)), 'bảng thông tin dự án (khách hàng, số máy, công suất, thời gian)');
  check(await page.locator('.ba-pair figure').count() === 2, 'chưa có ảnh → 2 khung Trước / Sau');
  check(await page.locator('.pj-quote blockquote').count() === 1, 'có cảm nhận khách hàng');
  check(await page.locator('.pj-sample-note').count() === 1, 'ghi chú dự án mẫu');
  const art = await ld('Article');
  check(art?.headline && art.publisher?.name, 'dữ liệu có cấu trúc Article');
  check(/\| Tên thương hiệu$/.test(await page.title()), 'tiêu đề trang theo tên dự án');
  check(await page.locator('.pj-detail .pj-grid .pj-card').count() === 3, 'gợi ý 3 dự án khác');
  await page.goto(`${fe}du-an-chi-tiet.html?slug=khong-ton-tai`);
  await page.waitForURL(/404\.html/);
  check(true, 'dự án không tồn tại → trang 404');

  console.log('Hỏi đáp');
  await page.goto(`${fe}hoi-dap.html`);
  await page.waitForSelector('.faq-list details');
  check(await page.locator('.faq-list details').count() === 24, '24 câu hỏi');
  const faq = await ld('FAQPage');
  check(faq?.mainEntity?.length === 24 && faq.mainEntity.every((q) => q.name && q.acceptedAnswer.text && !/<[a-z]/.test(q.acceptedAnswer.text)), 'FAQPage: 24 câu, câu trả lời dạng chữ thuần');
  await page.fill('#faq-q', 'gas r32');
  await page.waitForTimeout(300);
  const found = await page.locator('.faq-list summary').allTextContents();
  check(found.length >= 1 && found.some((t) => /R32/.test(t)), `tìm "gas r32" (không dấu, chữ thường) → ${found.length} kết quả`);
  await page.fill('#faq-q', 'lap dat');
  await page.waitForTimeout(300);
  check(await page.locator('.faq-list details').count() >= 4, 'tìm không dấu "lap dat"');
  await page.fill('#faq-q', 'xyzkhongco');
  await page.waitForTimeout(300);
  check(await page.locator('.faq-list details').count() === 0 && await page.locator('.faq-list .section-box').count() === 1, 'không có kết quả → thông báo');
  await page.fill('#faq-q', '');
  await page.waitForTimeout(300);
  await page.click('#faq-cats [data-cat="Lắp đặt"]');
  check(await page.locator('.faq-list details').count() === 4, 'lọc nhóm "Lắp đặt" → 4 câu');
  await page.locator('.faq-list details').first().locator('summary').click();
  await page.waitForFunction(() => /#q-\d+$/.test(location.href), null, { timeout: 3000 }).catch(() => {});
  check(/#q-\d+$/.test(page.url()), 'mở câu hỏi → link chia sẻ #q-…');
  const link = page.url();
  await page.goto('about:blank');
  await page.goto(link);
  await page.waitForSelector('.faq-list details[open]');
  check(await page.locator('.faq-list details[open]').count() === 1, 'mở link #q-… → tự mở đúng câu');
  await page.click('#faq-chat');
  check(await page.locator('#chat-panel.show').count() === 1, '"Hỏi chuyên viên" mở khung chat');
  await page.keyboard.press('Escape');
  check(await page.locator('.faq-list a[href="tinh-cong-suat-may-lanh.html"]').count() >= 1, 'câu trả lời có liên kết nội bộ (công cụ tính công suất)');

  console.log('Trang chủ, cửa hàng, giới thiệu, tầm nhìn');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#home-projects .pj-card');
  check(await page.locator('#home-projects .pj-card').count() === 3, 'trang chủ: 3 dự án tiêu biểu');
  check(await page.locator('#home-trust .trust-section').count() === 1 && await page.locator('#home-trust .rv-card').count() === 3, 'trang chủ: khối uy tín + 3 khung đánh giá');
  await page.goto(`${fe}he-thong-cua-hang.html`);
  await page.waitForSelector('.store-card');
  check(await page.locator('.store-card a[href*="google.com/maps/search"]').count() === 5, 'mỗi cửa hàng có link "Xem & đánh giá trên Google"');
  const stores = await ld('ItemList');
  check(stores?.itemListElement?.length === 5 && stores.itemListElement.every((x) => x.item['@type'] === 'HVACBusiness' && x.item.address?.streetAddress && x.item.openingHoursSpecification), 'dữ liệu có cấu trúc HVACBusiness cho 5 cửa hàng (địa chỉ, giờ mở cửa)');
  check(await page.locator('[data-trust="reviews"] .rv-card').count() === 3, 'trang cửa hàng: khối đánh giá');
  await page.goto(`${fe}gioi-thieu.html`);
  await page.waitForSelector('[data-trust] .trust-section');
  check(await page.locator('.about-links a[href="du-an.html"]').count() === 1, 'trang Giới thiệu: khối uy tín + link Dự án');
  await page.goto(`${fe}tam-nhin-su-menh.html`);
  await page.waitForSelector('[data-trust] .trust-section');
  check(true, 'trang Tầm nhìn: khối uy tín');
  check(await page.locator('footer a[href="du-an.html"]').count() === 1 && await page.locator('footer a[href="hoi-dap.html"]').count() === 1, 'chân trang có link Dự án & Hỏi đáp');

  console.log('Quản trị demo → website demo');
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');
  for (const r of ['projects', 'faqs', 'trust']) {
    await page.goto(`${admin}#/${r}`);
    await page.waitForSelector('.ad-head h1');
  }
  check(true, 'mở các mục Dự án, Hỏi đáp, Uy tín');
  await page.goto(`${admin}#/projects`);
  await page.waitForSelector('.ad-table');
  check(await page.locator('.ad-table tbody tr').count() === 4, 'quản trị: danh sách 4 dự án');
  await page.goto(`${admin}#/projects/dieu-hoa-van-phong-6-tang`);
  await page.waitForSelector('#frm [data-img-field="after_image"]');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 500; const g = c.getContext('2d'); g.fillStyle = '#16a34a'; g.fillRect(0, 0, 800, 500); return c.toDataURL('image/png').split(',')[1]; });
  await page.locator('#frm [data-img-field="after_image"] input[type=file]').setInputFiles({ name: 'sau.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForSelector('#frm [data-img-field="after_image"] .ad-img-prev img');
  await page.click('#save');
  check(await toast('Đã lưu'), 'quản trị demo: tải ảnh sau thi công cho dự án');
  await page.goto(`${admin}#/trust`);
  await page.waitForSelector('#trust-form');
  await page.fill('#trust-form [name=g_rating]', '4.7');
  await page.fill('#trust-form [name=g_count]', '86');
  await page.fill('#trust-form [name=g_url]', 'maps.google.com/abc');
  await page.click('#trust-form .ad-form-foot .btn-primary');
  check(await toast('https://'), 'link Google Maps sai định dạng → báo lỗi');
  await page.fill('#trust-form [name=g_url]', 'https://maps.app.goo.gl/test');
  await page.click('#trust-form [data-add="reviews"]');
  await page.fill('#trust-form [data-list="reviews"] .tr-row:last-child [data-k=name]', 'Chị Thảo');
  await page.fill('#trust-form [data-list="reviews"] .tr-row:last-child [data-k=text]', 'Thợ đến đúng giờ, làm sạch sẽ.');
  await page.click('#trust-form [data-add="logos"]');
  await page.fill('#trust-form [data-list="logos"] .tr-row:last-child [data-k=name]', 'Công ty Đối Tác A');
  await page.click('#trust-form .ad-form-foot .btn-primary');
  check(await toast('Đã lưu mục Uy tín'), 'quản trị demo: lưu điểm Google, đánh giá, logo');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#home-trust .trust-section');
  const ht = await page.locator('#home-trust').textContent();
  check(ht.includes('4,7') && ht.includes('86 đánh giá') && ht.includes('Chị Thảo') && ht.includes('Công ty Đối Tác A'), 'website demo hiện điểm Google, đánh giá & logo vừa nhập');
  check(await page.locator('#home-trust .g-links a[href="https://maps.app.goo.gl/test"]').count() === 1, 'link "Xem trên Google Maps"');

  console.log('Điện thoại');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  await blockExternal(m);
  const mp = await m.newPage();
  mp.on('pageerror', (e) => errors.push(`mobile ${mp.url()}: ${e.message}`));
  for (const u of ['du-an.html', 'du-an-chi-tiet.html?slug=dieu-hoa-van-phong-6-tang', 'hoi-dap.html', 'index.html', 'he-thong-cua-hang.html', 'gioi-thieu.html']) {
    await mp.goto(`${fe}${u}`);
    await mp.waitForTimeout(500);
    check(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${u}: không tràn ngang`);
  }
  for (const r of ['projects', 'faqs', 'trust']) {
    await mp.goto(`${admin}#/${r}`);
    await mp.waitForTimeout(600);
    check(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `quản trị #/${r}: không tràn ngang`);
  }

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
