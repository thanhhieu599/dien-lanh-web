import assert from 'node:assert/strict';
import { blockExternal, chromium, pagesServer } from './lib.mjs';

const { server, base } = await pagesServer(process.cwd());
let browser;
try {
  browser = await chromium();
  const context = await browser.newContext({ acceptDownloads: true });
  await blockExternal(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}admin/index.html#/customers?view=accounts`);
  await page.click('#demo-enter');
  await page.waitForSelector('#crm-list tbody tr');
  assert.equal(new URL(page.url()).hash, '#/customers');
  assert.equal(await page.locator('a[href*="view=accounts"]').count(), 0);
  const profiles = await page.evaluate(async () => (await AD.db.list('profiles', { limit: 1000 })).rows);
  const customers = await page.evaluate(async () => (await AD.db.list('crm_customer_summary', { limit: 1000 })).rows);
  for (const profile of profiles) {
    const matches = customers.filter((c) => c.profile_id === String(profile.id));
    assert.equal(matches.length, 1, `one CRM record for ${profile.id}`);
    assert.equal(matches[0].role, profile.role);
    assert.equal(matches[0].phone, profile.phone);
    assert.ok((await page.locator('#crm-list').innerText()).includes(profile.name));
  }
  await page.selectOption('#crm-search [name=role]', 'sales');
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#crm-list tbody tr');
    return rows.length === 2 && [...rows].every((r) => r.textContent.includes('Kinh doanh'));
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.click('#crm-export'),
  ]);
  assert.equal(download.suggestedFilename(), 'khach-hang.csv');
  await page.locator('#crm-list .crm-person').first().click();
  await page.waitForSelector('#crm-note');
  await page.fill('#crm-note textarea', 'Unified customer note');
  await page.click('#crm-note button');
  await page.waitForFunction(() => document.querySelector('#crm-note textarea')?.value === 'Unified customer note');
  await page.reload();
  await page.waitForSelector('#crm-note');
  assert.equal(await page.inputValue('#crm-note textarea'), 'Unified customer note');
  assert.equal(new Set(await page.locator('script[src]').evaluateAll((els) => els.map((s) => new URL(s.src).pathname))).size,
    await page.locator('script[src]').count());
  assert.deepEqual(errors, []);
  console.log('PASS: old route, unified profiles, roles, filter, CSV, detail persistence, scripts, browser errors');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
