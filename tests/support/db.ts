// Tạo database kiểm thử sạch: giả lập auth của Supabase + migrations + dữ liệu mẫu.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function freshDb(name: string) {
  const psql = (args: string[]) => execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-q', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
  execFileSync('dropdb', ['--if-exists', name], { stdio: 'ignore' });
  execFileSync('createdb', [name]);
  const files = ['supabase/tests/auth_stub.sql', ...fs.readdirSync(path.join(ROOT, 'supabase/migrations')).sort().map((f) => `supabase/migrations/${f}`), 'supabase/seed.sql'];
  for (const f of files) psql(['-d', name, '-f', path.join(ROOT, f)]);
  // Supabase cấp sẵn toàn quyền bảng cho service_role
  psql(['-d', name, '-c', 'grant select, insert, update, delete on all tables in schema public to service_role; grant execute on all functions in schema public to service_role;']);
  return name;
}

export const sqlOf = (db: string) => (q: string) => execFileSync('psql', ['-d', db, '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', q], { encoding: 'utf8' }).trim();
