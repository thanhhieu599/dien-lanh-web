// Giả lập tối thiểu PostgREST của Supabase cho kiểm thử: chuyển POST /rest/v1/rpc/<hàm> thành SQL chạy qua psql
// với role service_role (giống Edge Function dùng service_role key). Chỉ dùng trong test.
import { execFileSync } from 'node:child_process';

const DB = process.env.E2E_DB || 'dt_e2e';
const lit = (v: unknown) => (v === null || v === undefined ? 'NULL'
  : `'${(typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(/'/g, "''")}'`);

export function sql(q: string, role = 'postgres'): string {
  try {
    return execFileSync('psql', ['-d', DB, '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', `set role ${role}`, '-c', q], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    const msg = String((e as { stderr?: string }).stderr || e).match(/ERROR:\s+(.*)/)?.[1] || String(e);
    throw Object.assign(new Error(msg), { pg: true });
  }
}

const retType = (fn: string) => sql(`select prorettype::regtype from pg_proc where proname = '${fn.replace(/\W/g, '')}' limit 1`);

export const SUPABASE_URL = 'http://supabase.test';

// fetch giả: URL Supabase -> psql; còn lại -> external(url, init)
export function makeFetch(external: (url: string, init: RequestInit) => Promise<Response>) {
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    if (!url.startsWith(SUPABASE_URL)) return external(url, init);
    const u = new URL(url);
    const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
    try {
      if (rpc) {
        const args = JSON.parse(String(init.body || '{}'));
        const call = `public.${rpc[1]}(${Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(', ')})`;
        const out = sql(`select ${call}`, 'service_role');
        const t = retType(rpc[1]);
        const data = t === 'void' ? null : t === 'jsonb' ? (out ? JSON.parse(out) : null) : out;
        return new Response(JSON.stringify(data), { status: 200 });
      }
      if (u.pathname === '/rest/v1/settings') {
        const key = u.searchParams.get('key')!.replace(/^eq\./, '');
        const out = sql(`select coalesce(json_agg(json_build_object('value', value)), '[]') from public.settings where key = ${lit(key)}`, 'service_role');
        return new Response(out, { status: 200 });
      }
      return new Response('{"message":"not supported by shim"}', { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ code: 'P0001', message: (e as Error).message }), { status: 400 });
    }
  }) as typeof fetch;
}
