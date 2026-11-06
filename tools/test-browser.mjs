import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Các bộ .mjs chạy demo độc lập; bộ .ts cần PostgreSQL được chạy riêng trong CI.
const files = readdirSync(new URL('../tests/browser/', import.meta.url))
  .filter((file) => file.endsWith('.test.mjs') && file !== 'prerender.test.mjs')
  .sort();
for (const file of files) {
  console.log(`\nBrowser: ${file}`);
  const result = spawnSync(process.execPath, [`tests/browser/${file}`], {
    cwd: root, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
