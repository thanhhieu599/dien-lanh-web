import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copySiteFiles } from './copy-site.mjs';
import { buildReact } from './build-react.mjs';
import { newVersion, stampAssets } from './asset-version.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'dist');
await buildReact();
if (path.dirname(out) !== path.resolve(root) || path.basename(out) !== 'dist') throw new Error('Invalid output directory');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html','404.html','.nojekyll','.htaccess','frontend','admin','server']) {
  copySiteFiles(path.join(root, file), path.join(out, file),
    (source) => !['config.local.php','seed.json','seed.sql','uploads','src'].includes(path.basename(source)));
}
copySiteFiles(path.join(root,'.cache/react/frontend'),path.join(out,'frontend'));
  copySiteFiles(path.join(root,'.cache/react/admin'),path.join(out,'admin'));
stampAssets(out,newVersion());
console.log('Hosting source prepared in dist/. Configure server/config.local.php on the hosting.');
