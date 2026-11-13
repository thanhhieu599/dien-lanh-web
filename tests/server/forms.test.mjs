// Mọi nơi khách nhập liệu trên website phải được LƯU và XEM ĐƯỢC trong admin (PHP + MySQL thật).
// Website: đăng ký, đăng nhập, cập nhật thông tin, sổ địa chỉ, liên hệ, báo giá dự án, đặt lịch dịch vụ,
// khảo sát công suất, đăng ký nhận tin, khung chat tư vấn, đánh giá sản phẩm, đặt hàng.
// Admin: Yêu cầu khách hàng, Khách hàng, Đánh giá, Đơn hàng.
// Chạy: HOSTING_BASE=... TEST_ADMIN_PHONE=... TEST_ADMIN_PASSWORD=... node tests/server/forms.test.mjs
import assert from 'node:assert/strict';
import { chromium, blockExternal } from '../browser/lib.mjs';
const base = process.env.HOSTING_BASE || 'http://127.0.0.1:8080/';
const adminPhone = process.env.TEST_ADMIN_PHONE, adminPassword = process.env.TEST_ADMIN_PASSWORD;
assert.ok(adminPhone && adminPassword, 'Set TEST_ADMIN_PHONE and TEST_ADMIN_PASSWORD');
const tag = `QA${Date.now().toString().slice(-7)}`;
const phone = (n) => `09${String(Number(Date.now().toString().slice(-6)) + n).padStart(8, '0').slice(-8)}`;
const browser = await chromium();
let checks = 0;
const ok = (cond, label) => { assert.ok(cond, label); checks++; console.log('  ✓ ' + label); };
try {
  const shopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await blockExternal(shopCtx);
  const shop = await shopCtx.newPage();
  const errors = []; shop.on('pageerror', (e) => errors.push(e.message));
  const go = async (path) => { await shop.goto(`${base}frontend/${path}`); await shop.waitForLoadState('networkidle'); };
  const toast = (text) => shop.locator('.toast, .react-toast, [role=status]').filter({ hasText: text }).first().waitFor({ timeout: 15000 });
  async function lead(path, type, values) {
    await go(path);
    const form = shop.locator(`form[data-lead="${type}"]`).first();
    for (const [k, v] of Object.entries(values)) await form.locator(`[name="${k}"]`).fill(String(v));
    await form.locator('[name=consent]').check();
    await form.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    const note = form.locator('.react-notice');
    await note.waitFor({ timeout: 15000 });
    const code = (await note.innerText()).match(/LH[0-9A-F]+/)?.[0];
    assert.ok(code, `${type}: có mã yêu cầu`);
    return code;
  }

  // 1) Tài khoản: đăng ký → đăng xuất → đăng nhập → cập nhật thông tin → thêm địa chỉ
  const member = phone(1);
  await go('tai-khoan.html#register');
  await shop.locator('.auth-tabs button', { hasText: 'Đăng ký' }).click();
  await shop.locator('#register-form [name=name]').fill(`Khách ${tag}`);
  await shop.locator('#register-form [name=email]').fill(`${tag.toLowerCase()}@vidu.vn`);
  await shop.locator('#register-form [name=phone]').fill(member);
  await shop.locator('#register-form [name=password]').fill('MatKhau!2026');
  await shop.locator('#register-form button').click();
  await shop.locator('.account').waitFor({ timeout: 15000 });
  ok(true, 'Đăng ký tài khoản trên website');
  await shop.evaluate(() => DT.store.logout());
  await go('tai-khoan.html#login');
  await shop.locator('#login-form [name=phone]').fill(member);
  await shop.locator('#login-form [name=password]').fill('MatKhau!2026');
  await shop.locator('#login-form button').click();
  await shop.locator('.account').waitFor({ timeout: 15000 });
  ok(true, 'Đăng nhập lại bằng tài khoản vừa tạo');
  await go('tai-khoan.html#profile');
  await shop.locator('.account-profile [name=name]').fill(`Khách ${tag} Sửa`);
  await shop.locator('.account-profile button').click();
  await toast('Đã cập nhật thông tin');
  await go('tai-khoan.html#addresses');
  const addr = shop.locator('.address-form');
  await addr.locator('[name=province]').fill('TP.HCM'); await addr.locator('[name=district]').fill('Bình Tân');
  await addr.locator('[name=address]').fill(`824/2 Lê Đức Anh ${tag}`);
  await addr.getByRole('button', { name: 'Thêm địa chỉ' }).click();
  await toast('Đã lưu địa chỉ');
  ok(true, 'Cập nhật thông tin và thêm địa chỉ trong tài khoản');
  await shop.evaluate(() => DT.store.logout());

  // 2) Các form yêu cầu
  const codes = {};
  codes.contact = await lead('lien-he.html', 'contact', { name: `Liên hệ ${tag}`, phone: phone(2), email: 'lienhe@vidu.vn', message: `Cần tư vấn ${tag}` });
  codes.quote = await lead('bao-gia-du-an.html', 'b2b-quote', { name: `Báo giá ${tag}`, phone: phone(3), email: 'baogia@vidu.vn', company: `Cty ${tag}`, qty: 12, message: `Nhà xưởng 2000m2 ${tag}` });
  codes.service = await lead('dich-vu.html', 'service', { name: `Đặt lịch ${tag}`, phone: phone(4), address: `Q.1 ${tag}`, message: `Vệ sinh 3 máy ${tag}` });
  codes.survey = await lead('tinh-cong-suat-may-lanh.html', 'service', { name: `Khảo sát ${tag}`, phone: phone(5), address: `Q.7 ${tag}`, message: `Phòng 30m2 ${tag}` });
  ok(Object.values(codes).every(Boolean), 'Liên hệ, báo giá dự án, đặt lịch dịch vụ, khảo sát công suất: website trả mã yêu cầu');
  await go('index.html');
  await shop.locator('.newsletter-form [name=email]').fill(`tin-${tag.toLowerCase()}@vidu.vn`);
  await shop.locator('.newsletter-form button').click();
  await toast('Đã đăng ký nhận tin');
  await shop.getByRole('button', { name: 'Mở tư vấn' }).click();
  const chat = shop.locator('.react-chat form');
  await chat.locator('[name=name]').fill(`Chat ${tag}`); await chat.locator('[name=phone]').fill(phone(6)); await chat.locator('[name=message]').fill(`Gọi lại giúp ${tag}`);
  await chat.locator('input[type=checkbox]').check();
  await chat.getByRole('button', { name: 'Yêu cầu gọi lại' }).click();
  await toast('Đã nhận yêu cầu');
  ok(true, 'Đăng ký nhận tin (chân trang) và khung chat tư vấn gửi được');

  // 3) Đánh giá sản phẩm + đặt hàng
  const pid = await shop.evaluate(() => DT.products.find((p) => p.stock > 2)?.id);
  await go(`san-pham.html?id=${pid}`);
  const review = shop.locator('form').filter({ has: shop.locator('[name=rating]') }).first();
  await review.locator('[name=name]').fill(`Đánh giá ${tag}`); await review.locator('[name=phone]').fill(phone(7));
  await review.locator('[name=text]').fill(`Máy chạy êm, lắp nhanh ${tag}`);
  await review.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await toast('Đã gửi đánh giá');
  await shop.evaluate((id) => DT.store.addToCart(id, 1), pid);
  await go('thanh-toan.html');
  await shop.locator('[name=name]').fill(`Mua hàng ${tag}`); await shop.locator('[name=phone]').fill(phone(8));
  await shop.locator('[name=province]').fill('TP.HCM'); await shop.locator('[name=district]').fill('Quận 1'); await shop.locator('[name=address]').fill(`1 Lê Lợi ${tag}`);
  await shop.locator('[name=agree]').check();
  await shop.getByRole('button', { name: 'ĐẶT HÀNG', exact: true }).click();
  await shop.waitForURL(/dat-hang-thanh-cong/, { timeout: 20000 });
  const orderCode = new URL(shop.url()).searchParams.get('code');
  ok(!!orderCode, `Đánh giá sản phẩm và đặt hàng thành công (${orderCode})`);
  assert.deepEqual(errors, [], 'Website không lỗi: ' + errors.join(' | '));

  // 4) Admin: tất cả dữ liệu trên phải xem được
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await blockExternal(adminCtx);
  const admin = await adminCtx.newPage();
  await admin.goto(`${base}admin/`);
  await admin.locator('#login [name=id]').fill(adminPhone); await admin.locator('#login [name=password]').fill(adminPassword);
  await admin.locator('#login button').click(); await admin.waitForSelector('.ad-side');
  const view = async (route) => { await admin.goto(`${base}admin/#/${route}`); await admin.waitForLoadState('networkidle'); await admin.waitForFunction(() => !document.querySelector('#view [role="status"], .ad-loading')); return admin.locator('#view').innerText(); };
  ok(/Yêu cầu khách hàng/.test(await admin.locator('[data-nav=leads]').innerText()), 'Admin có mục "Yêu cầu khách hàng" trong menu');
  const leadsText = await view(`leads?q=${tag}`);
  for (const [label, code] of [['Liên hệ', codes.contact], ['Báo giá dự án', codes.quote], ['Đặt lịch dịch vụ', codes.service], ['Khảo sát công suất', codes.survey]])
    ok(leadsText.includes(code), `Admin → Yêu cầu khách hàng: thấy "${label}" (${code})`);
  ok(/Báo giá dự án/.test(leadsText) && /Liên hệ/.test(leadsText), 'Danh sách yêu cầu ghi rõ loại (Báo giá dự án, Liên hệ…)');
  const all = await admin.evaluate(async (t) => (await AD.db.list('leads', { order: 'created_at.desc', limit: 200 })).rows.filter((l) => JSON.stringify(l).toLowerCase().includes(t.toLowerCase())), tag);
  ok(all.some((l) => l.type === 'newsletter') && all.some((l) => l.type === 'contact' && l.name === `Chat ${tag}`), 'Đăng ký nhận tin và khung chat tư vấn được lưu vào Yêu cầu khách hàng');
  const quote = all.find((l) => l.code === codes.quote);
  await view(`leads/${encodeURIComponent(quote.id)}`);
  const detail = await admin.locator('#view').innerText();
  ok(detail.includes(`Cty ${tag}`) && detail.includes(`Nhà xưởng 2000m2 ${tag}`) && detail.includes('12'), 'Chi tiết báo giá dự án: đủ doanh nghiệp, số lượng, nhu cầu');
  const customers = await view(`customers?q=${member}`);
  ok(customers.includes(member), 'Admin → Khách hàng: thấy tài khoản vừa đăng ký');
  const profile = await admin.evaluate(async (p) => (await AD.db.list('profiles', { filters: [['phone', 'eq', p]] })).rows[0], member);
  ok(profile?.name === `Khách ${tag} Sửa` && JSON.stringify(profile.addresses || []).includes(tag), 'Thông tin đã sửa và sổ địa chỉ của khách được lưu');
  const reviews = await view('reviews?status=pending');
  ok(reviews.includes(`Đánh giá ${tag}`), 'Admin → Đánh giá: thấy đánh giá chờ duyệt');
  const orders = await view(`orders?q=${orderCode}`);
  ok(orders.includes(orderCode), 'Admin → Đơn hàng: thấy đơn vừa đặt');

  // 5) Khách xem lại đơn đã đặt (Giỏ hàng / Tra cứu); admin đổi trạng thái → khách thấy trạng thái mới
  const recent = async () => { await go('gio-hang.html'); const box = shop.locator('.recent-orders'); await box.waitFor(); await shop.waitForTimeout(800); return box.locator('tr', { hasText: orderCode }).innerText(); };
  ok(/Chờ xác nhận/.test(await recent()), 'Giỏ hàng (đã trống) vẫn hiện "Đơn hàng bạn đã đặt" kèm trạng thái');
  const oid = await admin.evaluate(async (c) => (await AD.db.list('orders', { filters: [['code', 'eq', c]] })).rows[0].id, orderCode);
  await view(`orders/${encodeURIComponent(oid)}`);
  const statusSel = admin.locator('#view form [name=status]');
  const opts = await statusSel.locator('option').evaluateAll((els) => els.map((e) => e.value));
  ok(opts.includes('shipping') && opts.includes('cancelled') && !opts.includes('xyz'), 'Admin chỉ thấy trạng thái hợp lệ để chọn');
  await statusSel.selectOption('shipping');
  await admin.locator('#view form').getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await admin.locator('.ar-toast').filter({ hasText: 'Đã cập nhật đơn hàng.' }).waitFor();
  ok((await admin.evaluate(async (id) => (await AD.db.get('orders', id)).status, oid)) === 'shipping', 'Admin chuyển thẳng Chờ xác nhận → Đang giao thành công');
  ok(!(await admin.locator('#view form [name=status] option').evaluateAll((els) => els.map((e) => e.value))).includes('pending'), 'Sau khi giao: không còn chọn lùi về Chờ xác nhận');
  ok(/Đang giao/.test(await recent()), 'Khách tải lại Giỏ hàng: thấy trạng thái mới "Đang giao hàng"');
  await shop.locator('.recent-orders tr', { hasText: orderCode }).getByRole('link', { name: 'Xem chi tiết' }).click();
  await shop.locator('.react-order, .order-details, h2', { hasText: orderCode }).first().waitFor({ timeout: 15000 });
  ok(true, 'Bấm "Xem chi tiết": tự mở chi tiết đơn ở trang Tra cứu');
} finally {
  await browser.close();
}
console.log(`PASS mọi form nhập liệu của website đều lưu và xem được trong admin: ${checks} kiểm tra.`);
