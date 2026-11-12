// Đồng bộ website ↔ admin trên PHP/MySQL thật: khách đặt hàng trên website, nhân viên xử lý trong admin,
// kho / CRM / chứng từ / trang tra cứu của khách luôn khớp nhau.
// Chạy: TEST_ADMIN_PHONE=... TEST_ADMIN_PASSWORD=... HOSTING_BASE=http://127.0.0.1:5173/ node tests/server/sync.test.mjs
import assert from 'node:assert/strict';
import { chromium, blockExternal } from '../browser/lib.mjs';
const base = process.env.HOSTING_BASE || 'http://127.0.0.1:8080/';
const phone = process.env.TEST_ADMIN_PHONE;
const password = process.env.TEST_ADMIN_PASSWORD;
assert.ok(phone && password, 'Set TEST_ADMIN_PHONE and TEST_ADMIN_PASSWORD for a test database');
const customerPhone = `09${String(Date.now()).slice(-8)}`;
const browser = await chromium();
const step = (m) => console.log('  ✓ ' + m);
try {
  // Admin và khách dùng 2 trình duyệt riêng (2 phiên đăng nhập khác nhau)
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); await blockExternal(adminCtx);
  const shopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await blockExternal(shopCtx);
  const admin = await adminCtx.newPage(); const shop = await shopCtx.newPage();
  const errors = [];
  for (const p of [admin, shop]) { p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => d.accept()); }
  await admin.goto(`${base}admin/`);
  await admin.locator('#login [name=id]').fill(phone);
  await admin.locator('#login [name=password]').fill(password);
  await admin.locator('#login button').click();
  await admin.waitForSelector('.ad-side');
  assert.equal(await admin.evaluate(() => AD.db.mode), 'mysql');
  const A = (fn, arg) => admin.evaluate(fn, arg);
  async function openAdmin(route) {
    await admin.goto(`${base}admin/#/${route}`);
    await admin.waitForSelector('#view h1');
    await admin.waitForFunction(() => !document.querySelector('#view [role="status"]'));
    assert.equal(await admin.locator('#view .ad-error').count(), 0, route);
  }
  async function openShop(path) {
    await shop.goto(`${base}frontend/${path}`);
    await shop.waitForSelector('html[data-react-ready="true"] #main h1', { state: 'attached' });
    await shop.evaluate(async () => { await DT.ready; });
  }
  const shopProduct = (id) => shop.evaluate((id) => { const p = DT.api.productById(id); return p && { stock: p.stock, price: p.price }; }, id);

  // Sản phẩm mẫu: còn hàng, không có tùy chọn bắt buộc
  const product = await A(async () => (await AD.db.list('products', { limit: 1000 })).rows.find((p) => p.active !== false && p.stock > 5 && !Object.values(p.options || {}).some((v) => (Array.isArray(v) ? v.length : String(v).trim()))));
  assert.ok(product, 'Seed must contain a stocked product');
  const originalPrice = product.price;
  try {
    // 1) Nhập hàng trong admin -> website thấy tồn mới ngay
    const supplier = await A(() => AD.db.insert('suppliers', { name: `[SYNC] NCC ${Date.now()}`, active: true }));
    const po = await A(([sid, pid]) => AD.db.rpc('inventory', { p_op: 'purchase_save', supplier_id: sid, items: [{ product_id: pid, qty: 4, price: 1000000 }], receive: true }), [supplier.id, product.id]);
    const stockAfterPo = product.stock + 4;
    assert.equal((await A((id) => AD.db.get('products', id), product.id)).stock, stockAfterPo);
    await openShop(`san-pham.html?id=${product.id}`);
    assert.equal((await shopProduct(product.id)).stock, stockAfterPo, 'Website thấy tồn sau nhập hàng');
    step('Nhập hàng trong admin → website cập nhật tồn kho');

    // 2) Đổi giá trong admin -> website hiện giá mới
    await A(([id, price]) => AD.db.update('products', id, { price }), [product.id, originalPrice + 10000]);
    await openShop(`san-pham.html?id=${product.id}`);
    assert.equal((await shopProduct(product.id)).price, originalPrice + 10000);
    assert.match(await shop.locator('.pd-info').innerText(), new RegExp((originalPrice + 10000).toLocaleString('vi-VN').replace(/\./g, '\\.')));
    step('Đổi giá trong admin → trang sản phẩm hiện giá mới');

    // 3) Khách đặt COD 2 cái trên website
    await shop.evaluate(() => { DT.store.get().cart = []; DT.store.save(); });
    await shop.locator('.buy-btns').getByRole('button', { name: 'Thêm vào giỏ', exact: false }).click();
    await shop.evaluate((id) => { const c = DT.store.get().cart.find((x) => String(x.id) === String(id)); c.qty = 2; DT.store.save(); }, product.id);
    await openShop('thanh-toan.html');
    await shop.locator('[name=name]').fill('Khách đồng bộ');
    await shop.locator('[name=phone]').fill(customerPhone);
    await shop.locator('[name=province]').fill('TP.HCM');
    await shop.locator('[name=district]').fill('Quận 1');
    await shop.locator('[name=address]').fill('1 Đồng Bộ');
    await shop.locator('input[name=payment][value=cod]').check();
    await shop.locator('[name=agree]').check();
    assert.match(await shop.locator('.sum-row', { hasText: 'Giao hàng' }).innerText(), /Miễn phí/);
    await shop.getByRole('button', { name: 'ĐẶT HÀNG', exact: true }).click();
    await shop.waitForURL('**/dat-hang-thanh-cong.html?code=*');
    const code = new URL(shop.url()).searchParams.get('code');
    step(`Khách đặt hàng COD trên website: ${code}`);

    // 4) Admin thấy đơn: đúng tiền, đúng khách, kho đã giữ hàng, lịch sử kho, CRM
    const order = await A(async (code) => (await AD.db.list('orders', { filters: [['code', 'eq', code]], select: '*,order_items(*)' })).rows[0], code);
    assert.ok(order, 'Admin thấy đơn mới');
    assert.equal(order.status, 'pending'); assert.equal(order.payment, 'cod'); assert.equal(order.payment_status, 'unpaid');
    assert.equal(order.shipping_fee, 0); assert.equal(order.total, (originalPrice + 10000) * 2);
    assert.equal(order.order_items.length, 1); assert.equal(order.order_items[0].qty, 2);
    assert.equal((await A((id) => AD.db.get('products', id), product.id)).stock, stockAfterPo - 2, 'Đặt hàng trừ tồn có thể bán');
    const saleMove = await A(async ([pid, code]) => (await AD.db.list('stock_moves', { filters: [['product_id', 'eq', pid], ['ref', 'eq', code]] })).rows, [product.id, code]);
    assert.equal(saleMove.length, 1); assert.equal(saleMove[0].type, 'sale'); assert.equal(saleMove[0].change, -2);
    const crm = await A(async (p) => (await AD.db.list('crm_customer_summary', { filters: [['phone', 'eq', p]] })).rows[0], customerPhone);
    assert.ok(crm, 'Khách mới có trong CRM'); assert.equal(crm.order_count, 1); assert.equal(crm.total_spent, 0, 'Chưa thu tiền: chưa tính chi tiêu');
    step('Admin thấy đơn đúng tiền, kho trừ 2, lịch sử kho "Bán hàng", khách vào CRM');

    // Quản lý kho: dòng sản phẩm có 2 "Đang giao dịch", tồn kho = có thể bán + 2
    await openAdmin('inventory');
    await admin.locator('.ar-toolbar input[type=search]').fill(product.sku);
    const row = admin.locator('#view .ar-table tbody tr').first();
    const cells = await row.locator('td').allInnerTexts();
    // Đang giao dịch = tổng SL của mọi đơn chưa giao xong có sản phẩm này (gồm đơn vừa đặt)
    const reserved = await A(async (pid) => (await AD.db.list('orders', { select: '*,order_items(*)', limit: 5000 })).rows
      .filter((o) => ['pending', 'confirmed', 'shipping', 'installing'].includes(o.status))
      .reduce((s, o) => s + o.order_items.filter((i) => String(i.product_id) === String(pid)).reduce((t, i) => t + i.qty, 0), 0), product.id);
    assert.ok(reserved >= 2);
    assert.equal(Number(cells[2]), stockAfterPo - 2, 'Có thể bán');
    assert.equal(Number(cells[3]), reserved, 'Đang giao dịch');
    assert.equal(Number(cells[1]), stockAfterPo - 2 + reserved, 'Tồn kho thực = có thể bán + đang giao dịch');
    step('Quản lý kho: Tồn kho / Có thể bán / Đang giao dịch khớp đơn của khách');

    // 5) Admin xử lý đơn qua giao diện -> khách tra cứu thấy trạng thái mới
    await openAdmin(`orders/${encodeURIComponent(order.id)}`);
    // Bấm "Chuyển sang: …" theo đúng quy trình (Xác nhận → Đang giao → Đang lắp đặt → Hoàn thành)
    const statusOf = async () => (await A((id) => AD.db.get('orders', id), order.id)).status;
    for (let i = 0; i < 6 && (await statusOf()) !== 'done'; i++) {
      const before = await statusOf();
      await admin.locator('#view .ar-head').getByRole('button', { name: /Chuyển sang:/ }).click();
      for (let t = 0; t < 50 && (await statusOf()) === before; t++) await admin.waitForTimeout(100);
      assert.notEqual(await statusOf(), before, 'Trạng thái đơn phải đổi sau khi bấm');
      await admin.locator('#view .ar-head').waitFor();
    }
    assert.equal(await statusOf(), 'done');
    const done = await A((id) => AD.db.get('orders', id), order.id);
    assert.equal(done.payment_status, 'paid', 'COD giao xong tự thành đã thanh toán');
    await openShop(`tra-cuu-don-hang.html`);
    await shop.locator('[name=code]').fill(code);
    await shop.locator('[name=phone]').fill(customerPhone);
    await shop.locator('#main form button[type=submit], #main form .btn-primary').first().click();
    await shop.getByText('Đã thanh toán').first().waitFor();
    const crmPaid = await A(async (p) => (await AD.db.list('crm_customer_summary', { filters: [['phone', 'eq', p]] })).rows[0], customerPhone);
    assert.equal(crmPaid.total_spent, order.total, 'CRM cộng chi tiêu sau khi thu tiền');
    step('Admin chuyển đơn tới Hoàn thành → khách tra cứu thấy "Đã thanh toán", CRM cộng chi tiêu');

    // 6) Hóa đơn + phiếu xuất kho bán hàng của đơn thật
    await openAdmin(`invoice/${encodeURIComponent(order.id)}`);
    await admin.locator('#inv-issue').click();
    await admin.locator('.inv-no', { hasText: /^\d{7}$/ }).waitFor();
    assert.match(await admin.locator('.inv-sheet').innerText(), new RegExp(order.total.toLocaleString('vi-VN').replace(/\./g, '\\.')));
    await openAdmin(`voucher/ban/${encodeURIComponent(order.id)}`);
    assert.match(await admin.locator('.vc-sheet').innerText(), new RegExp(`Xuất bán hàng theo đơn ${code}`));
    await openAdmin(`voucher/nhap/${po.id}`);
    assert.equal(await admin.locator('.vc-total').innerText(), '4.000.000');
    step('Hóa đơn bán hàng, phiếu xuất kho bán hàng, phiếu nhập kho in được từ dữ liệu thật');

    // 7) Đơn chuyển khoản, khách tự hủy -> hoàn kho + lịch sử "Hủy đơn"
    await openShop(`san-pham.html?id=${product.id}`);
    await shop.evaluate(() => { DT.store.get().cart = []; DT.store.save(); });
    await shop.locator('.buy-btns').getByRole('button', { name: 'Thêm vào giỏ', exact: false }).click();
    await openShop('thanh-toan.html');
    await shop.locator('[name=name]').fill('Khách đồng bộ');
    await shop.locator('[name=phone]').fill(customerPhone);
    await shop.locator('[name=province]').fill('TP.HCM');
    await shop.locator('[name=district]').fill('Quận 1');
    await shop.locator('[name=address]').fill('1 Đồng Bộ');
    await shop.locator('input[name=payment][value=bank]').check();
    await shop.locator('[name=agree]').check();
    await shop.getByRole('button', { name: 'ĐẶT HÀNG', exact: true }).click();
    await shop.waitForURL('**/dat-hang-thanh-cong.html?code=*');
    const code2 = new URL(shop.url()).searchParams.get('code');
    assert.equal((await A((id) => AD.db.get('products', id), product.id)).stock, stockAfterPo - 3);
    await shop.getByRole('button', { name: 'Hủy đơn hàng' }).click();
    await shop.getByText('Đã hủy', { exact: true }).first().waitFor();
    assert.equal((await A((id) => AD.db.get('products', id), product.id)).stock, stockAfterPo - 2, 'Khách hủy đơn → hoàn kho');
    const cancelMove = await A(async ([pid, code]) => (await AD.db.list('stock_moves', { filters: [['product_id', 'eq', pid], ['ref', 'eq', code]], order: 'id.asc' })).rows.map((m) => m.type), [product.id, code2]);
    assert.deepEqual(cancelMove, ['sale', 'cancel']);
    assert.equal((await A(async (c) => (await AD.db.list('orders', { filters: [['code', 'eq', c]] })).rows[0], code2)).status, 'cancelled');
    step('Đơn chuyển khoản bị khách hủy → admin thấy "Đã hủy", kho hoàn lại, lịch sử kho đầy đủ');

    // 8) Kiểm hàng trong admin -> website thấy tồn đã cân bằng; hết hàng -> không mua được
    await A((pid) => AD.db.rpc('inventory', { p_op: 'adjustment_save', items: [{ product_id: pid, actual: 0, reason: 'Kiểm thử đồng bộ' }], balance: true }), product.id);
    await openShop(`san-pham.html?id=${product.id}`);
    assert.equal((await shopProduct(product.id)).stock, 0);
    const placed = await shop.evaluate(async (id) => { const r = await fetch(DT.apiEndpoint('/rpc/place_order'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-DT-Request': '1' }, body: JSON.stringify({ p_items: [{ id, qty: 1 }], p_customer: { name: 'X', phone: '0911111199' }, p_shipping: { method: 'delivery', address: 'A' }, p_payment: 'cod' }) }); return r.status; }, product.id);
    assert.equal(placed, 400, 'Hết hàng: máy chủ chặn đặt hàng');
    step('Kiểm hàng về 0 → website hiện hết hàng, máy chủ chặn đặt thêm');
    // Trả lại tồn cho sản phẩm (dữ liệu thử nghiệm)
    await A(([pid, n]) => AD.db.rpc('inventory', { p_op: 'adjustment_save', items: [{ product_id: pid, actual: n, reason: 'Hoàn tác kiểm thử' }], balance: true }), [product.id, product.stock]);

    // 9) Nội dung: đổi hotline trong Cài đặt -> website hiện hotline mới
    const store = await A(() => AD.db.get('settings', 'store'));
    try {
      await A((v) => AD.db.update('settings', 'store', { value: { ...v, hotline: '0909000111' } }), store.value);
      await openShop('index.html');
      assert.equal(await shop.evaluate(() => DT.config.hotline), '0909000111');
      assert.ok((await shop.locator('body').innerText()).includes('0909'), 'Website hiện hotline mới');
      step('Đổi hotline trong Cài đặt → website hiện ngay');
    } finally { await A((v) => AD.db.update('settings', 'store', { value: v }), store.value); }

    // Mọi trang admin mới mở được trên dữ liệu thật
    for (const r of ['inventory', 'purchases', `purchases/${po.id}`, 'stocktakes', 'stock-exports', 'suppliers', 'stock-history', 'purchases/new', 'stocktakes/new', 'stock-exports/new']) await openAdmin(r);
    step('Các trang Kho hàng mở được trên MySQL');
  } finally {
    await admin.evaluate(([id, price]) => AD.db.update('products', id, { price }), [product.id, originalPrice]).catch(() => {});
  }
  assert.deepEqual(errors, [], 'Không có lỗi JavaScript trên website và admin');
  console.log('PASS đồng bộ website ↔ admin trên PHP/MySQL.');
} finally { await browser.close(); }
