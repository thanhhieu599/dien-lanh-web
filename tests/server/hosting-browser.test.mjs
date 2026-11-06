// Kiểm tra adapter trình duyệt trên backend PHP thật (tài khoản admin thử nghiệm).
import assert from 'node:assert/strict';
import { chromium, blockExternal } from '../browser/lib.mjs';
const base = process.env.HOSTING_BASE || 'http://127.0.0.1:8080/';
const phone = process.env.TEST_ADMIN_PHONE;
const password = process.env.TEST_ADMIN_PASSWORD;
assert.ok(phone && password, 'Set TEST_ADMIN_PHONE and TEST_ADMIN_PASSWORD for a test database');
const browser = await chromium();
try {
  const context = await browser.newContext(); await blockExternal(context);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}admin/`);
  await page.locator('#login [name=id]').fill(phone);
  await page.locator('#login [name=password]').fill(password);
  await page.locator('#login button').click();
  await page.waitForSelector('.ad-side');
  assert.equal(await page.evaluate(() => AD.db.mode), 'mysql');
  const routes = ['orders','products','categories','brands','customers','settings','content'];
  for (const route of routes) {
    await page.goto(`${base}admin/#/${route}`);
    await page.waitForSelector('.ad-head h1');
    assert.equal(await page.locator('.ad-error').count(), 0, route);
  }
  const result = await page.evaluate(async () => {
    const {rows} = await AD.db.list('products', {limit:1});
    const original = rows[0];
    try {
      await AD.db.update('products', original.id, {price:original.price+1000});
      const updated = await AD.db.get('products', original.id);
      await AD.db.update('products', original.id, {active:false});
      const publicRows = await (await fetch(DT.apiEndpoint(`/data/products?id=eq.${original.id}`))).json();
      const adminRows = await AD.db.list('products', {filters:[['id','eq',original.id]]});
      const brand = await AD.db.saveBrand({name:'Hosting test brand',slug:`hosting-test-${Date.now()}`,product_ids:[]});
      await AD.db.remove('brands', brand.id);
      const image = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XcAAAAASUVORK5CYII='), c=>c.charCodeAt(0));
      const url = await AD.db.upload(`tests/hosting-${Date.now()}.png`, new Blob([image],{type:'image/png'}));
      const imageStatus = (await fetch(url)).status;
      await AD.db.removeFile(url);
      const removedStatus = (await fetch(url)).status;
      return {original:original.price, updated:updated.price, publicCount:publicRows.length, adminCount:adminRows.rows.length,imageStatus,removedStatus};
    } finally { await AD.db.update('products', original.id, {price:original.price,active:original.active ?? true}); }
  });
  assert.equal(result.updated, result.original+1000);
  assert.equal(result.publicCount, 0, 'Storefront must hide drafts even with an admin cookie');
  assert.equal(result.adminCount, 1);
  assert.equal(result.imageStatus, 200);
  assert.equal(result.removedStatus, 404);
  const storefront = await context.newPage();
  await storefront.goto(`${base}frontend/`);
  await storefront.waitForSelector('html[data-frontend="react"] #main h1',{state:'attached'});
  assert.equal(await storefront.evaluate(async()=>{await DT.ready;return DT.backend.enabled && !DT.backend.offline;}), true);
  const login = await storefront.evaluate(async({phone,password})=>{
    const result = await DT.store.login(phone,password);
    const role = DT.store.get().user?.role;
    await DT.store.logout();
    return {ok:result.ok,role};
  }, {phone,password});
  assert.equal(login.ok, true);
  assert.equal(login.role, 'admin');
  storefront.on('dialog',dialog=>dialog.accept());
  storefront.on('pageerror',error=>errors.push(error.message));
  const item=await storefront.evaluate(()=>DT.products.find(p=>p.stock>2 && !Object.values(p.options || {}).some(values=>values.length)));
  await storefront.goto(`${base}frontend/san-pham.html?id=${item.id}`);
  await storefront.locator('.buy-btns').getByRole('button',{name:'Thêm vào giỏ',exact:false}).click();
  await storefront.locator('.h-cart').click();
  await storefront.getByRole('link',{name:'Tiến hành thanh toán'}).click();
  await storefront.locator('[name=name]').fill('React MySQL test');
  await storefront.locator('[name=phone]').fill('0911111122');
  await storefront.locator('[name=province]').fill('TP.HCM');
  await storefront.locator('[name=district]').fill('Quận 1');
  await storefront.locator('[name=address]').fill('Test only');
  await storefront.locator('[name=agree]').check();
  await storefront.getByRole('button',{name:'ĐẶT HÀNG',exact:true}).click();
  await storefront.waitForURL('**/dat-hang-thanh-cong.html?code=*');
  await storefront.getByRole('button',{name:'Hủy đơn hàng'}).click();
  await storefront.getByText('Đã hủy',{exact:true}).first().waitFor();
  assert.deepEqual(errors, []);
  console.log('PHP/MySQL browser adapter checks passed.');
} finally { await browser.close(); }
