// Khung kiểm thử trình duyệt ở chế độ "đã kết nối Supabase": database thật + REST/Auth/Functions giả lập (supabase-local.ts)
// + website/quản trị phục vụ như GitHub Pages + Chromium (Playwright).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshDb, sqlOf } from './db.ts';
import { startSupabase } from './supabase-local.ts';
// @ts-ignore: module JS
import { blockExternal, chromium, pagesServer } from '../browser/lib.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DOMAIN = 'sdt.test';

let failures = 0;
export function check(cond: unknown, msg: string) {
  if (cond) console.log(`  ✔ ${msg}`);
  else { failures++; console.log(`  ✖ ${msg}`); }
}
export const section = (s: string) => console.log(`\n${s}`);
export const failed = () => failures;

export async function setup(dbName: string, opts: { env?: Record<string, string>; fetch?: typeof fetch; accessTtl?: number } = {}) {
  freshDb(dbName);
  const sql = sqlOf(dbName);
  const sb = await startSupabase({ database: dbName, env: opts.env, fetch: opts.fetch, accessTtl: opts.accessTtl });
  const { server, base } = await pagesServer(ROOT);
  const browser = await chromium();
  const errors: string[] = [];

  async function newContext(viewport = { width: 1280, height: 900 }) {
    const ctx = await browser.newContext({ viewport, acceptDownloads: true, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    await blockExternal(ctx, [sb.url]);
    await ctx.route('**/img.vietqr.io/**', (r: any) => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }));
    await ctx.route('**/assets/js/backend-config.js', (r: any) => r.fulfill({
      contentType: 'text/javascript',
      body: `window.DT = window.DT || {}; DT.BACKEND = { url: '${sb.url}', anonKey: '${sb.anonKey}', phoneEmailDomain: '${DOMAIN}', cacheMinutes: 5 };`,
    }));
    return ctx;
  }
  async function newPage(ctx?: any) {
    const page = await (ctx || await newContext()).newPage();
    page.on('pageerror', (e: Error) => errors.push(`${page.url()}: ${e.message}`));
    page.on('dialog', (d: any) => d.accept());
    return page;
  }
  return {
    sb, sql, base, fe: `${base}frontend/`, admin: `${base}admin/index.html`, browser, errors, newContext, newPage,
    async close() { await browser.close(); server.close(); await sb.close(); },
  };
}

// Chờ thông báo (toast) chứa đoạn chữ, rồi xóa hết thông báo để lần kiểm tra sau chỉ tính thông báo mới
export async function toast(page: any, text: string | RegExp, timeout = 5000) {
  let ok = true;
  try { await page.locator('.toast', { hasText: text }).first().waitFor({ timeout }); } catch { ok = false; }
  const all = await page.locator('.toast').allTextContents().catch(() => []);
  await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())).catch(() => {});
  if (!ok) console.log(`    (thông báo đang hiện: ${JSON.stringify(all)})`);
  return ok;
}
