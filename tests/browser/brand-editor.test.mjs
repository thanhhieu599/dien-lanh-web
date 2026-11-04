import assert from 'node:assert/strict';
import { blockExternal, chromium, pagesServer } from './lib.mjs';

const { server, base } = await pagesServer(process.cwd());
let browser;
try {
  browser = await chromium();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await blockExternal(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const admin = `${base}admin/index.html`;
  await page.goto(`${admin}#/brands/new`);
  await page.click('#demo-enter');
  await page.waitForSelector('#brand-products #category-product-results li');
  await page.fill('[name=name]', 'Điện Lạnh An Phát');
  assert.ok((await page.inputValue('#brand-url')).endsWith('/thuong-hieu/dien-lanh-an-phat.html'));
  assert.equal(await page.locator('#brand-url').getAttribute('readonly'), '');
  await page.fill('#category-name', 'DT1001');
  await page.click('[data-add-product="1001"]');
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 100;
    c.getContext('2d').fillRect(0, 0, 100, 100);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-img-field=logo] input[type=file]').setInputFiles({ name: 'brand.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForSelector('[data-img-field=logo] img');
  await page.click('#save');
  await page.waitForURL('**#/brands/dien-lanh-an-phat');
  await page.waitForSelector('[data-member="1001"]');
  assert.equal((await page.evaluate(() => AD.db.get('products', 1001))).brand, 'dien-lanh-an-phat');
  // Bulk selection uses the same substring filters as categories.
  await page.fill('#category-name', 'DT100');
  await page.click('#category-select-all');
  await page.click('#category-add-selected');
  await page.click('#save');
  await page.waitForFunction(async () => (await AD.db.get('products', 1002)).brand === 'dien-lanh-an-phat');
  await page.reload();
  await page.waitForSelector('[data-member="1002"]');
  // Editing a product updates both brand lists, even if an old order list contains its ID.
  await page.goto(`${admin}#/products/1002`);
  await page.waitForSelector('[name=brand]');
  await page.selectOption('[name=brand]', 'thuong-hieu');
  await page.click('#save');
  await page.waitForFunction(async () => (await AD.db.get('products', 1002)).brand === 'thuong-hieu');
  await page.goto(`${admin}#/brands/dien-lanh-an-phat`);
  await page.waitForSelector('[data-member="1001"]');
  assert.equal(await page.locator('[data-member="1002"]').count(), 0);
  await page.fill('[name=name]', 'An Phát Chính Hãng');
  await page.click('#save');
  await page.waitForFunction(async () => (await AD.db.get('brands', 'dien-lanh-an-phat')).slug === 'an-phat-chinh-hang');
  const saved = await page.evaluate(() => AD.db.get('brands', 'dien-lanh-an-phat'));
  assert.equal((await page.evaluate(() => AD.db.get('products', 1001))).brand, saved.id);
  await page.goto(`${base}frontend/thuong-hieu.html?id=an-phat-chinh-hang`);
  await page.waitForSelector('.brand-head');
  assert.equal(await page.locator('.brand-head h1').innerText(), saved.name);
  assert.equal(await page.locator('.brand-head img').getAttribute('src'), saved.logo);
  assert.ok(await page.evaluate(() => DT.products.some((p) => p.id === 1001 && p.brand === 'dien-lanh-an-phat')));
  await page.goto(`${base}frontend/thuong-hieu.html`);
  await page.waitForSelector('.brand-tile');
  assert.equal(await page.locator('a.brand-tile[href*="an-phat-chinh-hang"]').count(), 1);
  await page.goto(`${admin}#/brands/dien-lanh-an-phat`);
  await page.waitForSelector('[data-member]');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.uncheck('[name=active]');
  await page.click('#save');
  await page.waitForFunction(async () => (await AD.db.get('brands', 'dien-lanh-an-phat')).active === false);
  await page.goto(`${base}frontend/thuong-hieu.html`);
  await page.waitForSelector('.brand-tile');
  assert.equal(await page.locator('a.brand-tile[href*="an-phat-chinh-hang"]').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: brand name/slug/image, manual/bulk assignments, product → brand sync, rename, storefront, visibility, mobile');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
