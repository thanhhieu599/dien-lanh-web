// Sao chép bằng API file thông thường, tương thích thư mục OneDrive trên Windows.
import fs from 'node:fs';
import path from 'node:path';
export function copySiteFiles(source, destination, filter = () => true) {
  if (!filter(source)) return;
  const info = fs.lstatSync(source);
  if (info.isSymbolicLink()) throw new Error(`Không sao chép symbolic link: ${source}`);
  if (info.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) copySiteFiles(path.join(source, entry), path.join(destination, entry), filter);
  } else {
    fs.copyFileSync(source, destination);
  }
}
