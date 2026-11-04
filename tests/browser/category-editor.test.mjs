import assert from 'node:assert/strict';
import { blockExternal, chromium, pagesServer } from './lib.mjs';

const { server, base } = await pagesServer(process.cwd());
let browser;
try {
  browser = await chromium();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await blockExternal(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}admin/index.html#/categories/may-lanh`);
  await page.click('#demo-enter');
  await page.waitForSelector('[data-member]');
  const before = await page.evaluate(async () => ({
    category: await AD.db.get('categories', 'may-lanh'),
    products: (await AD.db.list('products', { limit: 10000 })).rows,
  }));
  assert.equal(await page.locator('[name=subs], [name=filters]').count(), 0);
  const firstId = await page.locator('[data-member]').first().getAttribute('data-member');
  await page.locator(`[data-member-remove="${firstId}"]`).click();
  const manual = before.products.find((p) => p.cat !== 'may-lanh');
  await page.fill('#category-name', manual.sku);
  await page.locator(`[data-add-product="${manual.id}"]`).click();
  assert.ok((await page.locator('#category-member-count').innerText()).includes(String(before.products.filter((p) => p.cat === 'may-lanh').length)));

  // AND filters match name, human-readable product type, and manufacturer by substring.
  const sample = before.products.find((p) => p.cat !== 'may-lanh' && p.id !== manual.id && p.sub);
  const filterData = await page.evaluate((p) => {
    const cat = AD.cache.categories.find((c) => c.id === p.cat);
    const type = cat.subs.find((s) => s.id === p.sub).name;
    const brand = AD.cache.brands.find((b) => b.id === p.brand).name;
    return { type, brand };
  }, sample);
  await page.fill('#category-name', '');
  await page.fill('#category-type', filterData.type.toUpperCase());
  await page.fill('#category-brand', filterData.brand.slice(0, 3).toUpperCase());
  const filteredIds = await page.evaluate(() => {
    const norm = (x) => DT.u.norm(x || '');
    const typeNeedle = norm(document.querySelector('#category-type').value);
    const brandNeedle = norm(document.querySelector('#category-brand').value);
    return AD.db.list('products', { limit: 10000 }).then(({ rows }) => rows.filter((p) => {
      const type = AD.cache.categories.find((c) => c.id === p.cat)?.subs?.find((s) => s.id === p.sub)?.name || p.sub;
      const brand = AD.cache.brands.find((b) => b.id === p.brand)?.name || p.brand;
      return p.cat !== 'may-lanh' && norm(type).includes(typeNeedle) && norm(brand).includes(brandNeedle);
    }).map((p) => p.id));
  });
  assert.ok(filteredIds.includes(sample.id));
  await page.click('#category-select-all');
  await page.click('#category-add-selected');
  const count = before.products.filter((p) => p.cat === 'may-lanh').length - 1 + new Set([manual.id, ...filteredIds]).size;
  assert.equal(await page.locator('#category-member-count').innerText(), `(${count})`);
  while (await page.locator('#category-more-members').isVisible()) await page.click('#category-more-members');
  const lastId = await page.locator('[data-member]').last().getAttribute('data-member');
  await page.click(`[data-member-up="${lastId}"]`);
  const expected = await page.locator('[data-member]').evaluateAll((els) => els.map((e) => Number(e.dataset.member)));
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 200;
    canvas.getContext('2d').fillRect(0, 0, 200, 200);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-img-field=image] input[type=file]').setInputFiles({ name: 'category.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForSelector('[data-img-field=image] img');
  await page.click('#save');
  await page.waitForFunction(async (count) => (await AD.db.get('categories', 'may-lanh')).product_ids?.length === count, count);
  await page.reload();
  await page.waitForSelector('[data-member]');
  const saved = await page.evaluate(() => AD.db.get('categories', 'may-lanh'));
  assert.deepEqual(saved.product_ids, expected);
  assert.ok(saved.excluded_product_ids.map(String).includes(firstId));
  assert.deepEqual(saved.subs, before.category.subs);
  assert.deepEqual(saved.filters, before.category.filters);
  assert.ok(saved.image.startsWith('data:image/'));
  assert.equal((await page.evaluate((id) => AD.db.get('products', id), manual.id)).cat, manual.cat);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  await page.goto(`${base}frontend/danh-muc.html?cat=may-lanh`);
  await page.waitForSelector('.pcard');
  const storefrontIds = await page.evaluate(() => DT.api.list({ cat: 'may-lanh', sort: 'category' }).items.map((p) => p.id));
  assert.deepEqual(storefrontIds, expected);
  assert.equal(await page.locator('.cat-cover-image').getAttribute('src'), saved.image);
  await page.goto(`${base}frontend/index.html`);
  await page.waitForSelector('#quick-cats .qcat');
  assert.equal(await page.locator('#quick-cats a[href*="cat=may-lanh"] img').getAttribute('src'), saved.image);

  // New categories can collect existing products before their first save.
  await page.goto(`${base}admin/index.html#/categories/new`);
  await page.waitForSelector('#category-product-results li');
  await page.fill('[name=id]', 'test-collection');
  await page.fill('[name=name]', 'Test collection');
  await page.fill('[name=short]', 'Test');
  await page.fill('#category-name', manual.sku);
  await page.click(`[data-add-product="${manual.id}"]`);
  await page.click('#save');
  await page.waitForURL('**#/categories/test-collection');
  await page.waitForSelector('[data-member]');
  assert.deepEqual((await page.evaluate(() => AD.db.get('categories', 'test-collection'))).product_ids, [manual.id]);
  assert.deepEqual(errors, []);
  console.log('PASS: category image, manual/bulk additions, substring filters, order, removal, persistence, storefront sync, mobile, new category');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
