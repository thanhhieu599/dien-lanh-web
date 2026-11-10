// Dùng cùng ánh xạ dữ liệu mẫu của admin để tránh sai lệch với website.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildTestSeed } from './test-seed.mjs';
const root = new URL('../', import.meta.url);
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
const context = { localStorage, sessionStorage: localStorage, console };
context.window = context;
vm.createContext(context);
for (const file of ['frontend/assets/js/data/catalog.js', 'frontend/assets/js/data/content.js', 'frontend/assets/js/core/rows.js', 'admin/assets/js/db.js']) {
  vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), context, { filename: file });
}
const data = JSON.parse(storage.get(context.DT.ADMIN_DEMO_KEY || 'dt_admin_demo_v1'));
const content = ['products','categories','brands','coupons','posts','projects','faqs','banners','stores','services','policies','settings'];
const isTest = process.argv.includes('--test');
const seed = isTest ? buildTestSeed(data, context.DT) : Object.fromEntries(content.map((table) => [table, data[table]]));
const basename = isTest ? 'seed-test' : 'seed';
const output = new URL(`server/${basename}.json`, root);
fs.writeFileSync(output, JSON.stringify(seed, null, 2));
if (process.argv.includes('--sql')) {
  // Hex UTF-8 tránh phụ thuộc chế độ escape/backslash của MySQL khi import phpMyAdmin.
  const literal = (value) => `(CONVERT(0x${Buffer.from(String(value), 'utf8').toString('hex')} USING utf8mb4) COLLATE utf8mb4_unicode_ci)`;
  const primary = { coupons:'code', posts:'slug', projects:'slug', policies:'key', settings:'key' };
  const statements = ['SET NAMES utf8mb4;', 'START TRANSACTION;'];
  for (const [table, rows] of Object.entries(seed)) for (const row of rows) {
    const id = row[primary[table] || 'id'];
    const resource = literal(table); const key = literal(id);
    const timestamp = new Date().toISOString();
    const data = {created_at:timestamp,updated_at:timestamp,...row};
    statements.push(`INSERT INTO records(resource,record_id,data) SELECT ${resource},${key},${literal(JSON.stringify(data))} WHERE NOT EXISTS (SELECT 1 FROM records WHERE resource=${resource} AND record_id=${key});`);
  }
  statements.push('COMMIT;');
  fs.writeFileSync(new URL(`server/${basename}.sql`, root), statements.join('\n'));
}
console.log(`Seed: ${seed.products.length} products → ${fileURLToPath(output)}`);
if (isTest) console.table(Object.fromEntries(Object.entries(seed).map(([key, rows]) => [key, rows.length])));
