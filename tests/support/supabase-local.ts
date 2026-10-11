// "Supabase cục bộ" cho kiểm thử: chạy trên PostgreSQL thật, mô phỏng đúng các phần website & trang quản trị dùng:
//   /rest/v1/*       PostgREST: select (cột, nhúng bảng con/cha), lọc eq/neq/gt/gte/lt/lte/ilike/is/in/or, order,
//                    limit/offset, Prefer: count=exact (Content-Range), insert/update/delete, rpc; giới hạn 1000 dòng
//   /auth/v1/*       GoTrue: signup, token (password / refresh_token), logout
//   /functions/v1/*  Edge Functions thật (payments, notify)
// Mỗi request chạy trong 1 transaction với role (anon / authenticated / service_role) + request.jwt.claims như PostgREST,
// nên RLS, quyền cột, trigger... đều là của database thật.
import http from 'node:http';
import crypto from 'node:crypto';
import pg from 'pg';
import { handle as payments } from '../../supabase/functions/payments/handler.ts';
import { handle as notify } from '../../supabase/functions/notify/handler.ts';

export const JWT_SECRET = 'test-jwt-secret-0123456789-abcdefghij';
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function sign(claims: Record<string, unknown>): string {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64(claims);
  return `${h}.${p}.${crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`;
}
function verify(token: string): Record<string, any> | null {
  const [h, p, s] = token.split('.');
  if (!s || crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url') !== s) return null;
  const c = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (c.exp && c.exp * 1000 < Date.now()) return { expired: true };
  return c;
}
export const ANON_KEY = sign({ role: 'anon', iss: 'test' });
export const SERVICE_KEY = sign({ role: 'service_role', iss: 'test' });

const MAX_ROWS = 1000;  // giống cấu hình mặc định của Supabase
const OPS: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };

type Col = Record<string, string>;
export interface Options { database: string; env?: Record<string, string>; fetch?: typeof fetch; accessTtl?: number }

export async function startSupabase(opts: Options) {
  const pool = new pg.Pool({ database: opts.database, max: 8 });
  const meta = await loadMeta(pool);
  const refresh = new Map<string, string>();   // refresh_token -> user id
  const env: Record<string, string> = { ...(opts.env || {}) };
  const accessTtl = opts.accessTtl ?? 3600;
  let base = '';

  const server = http.createServer(async (req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'Content-Range' };
    const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { ...cors, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers });
      res.end(body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') return send(204, undefined);
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString();
    const url = new URL(req.url!, base);
    try {
      if (url.pathname.startsWith('/functions/v1/')) {
        const fn = url.pathname.split('/')[3];
        const handler = fn === 'payments' ? payments : fn === 'notify' ? notify : null;
        if (!handler) return send(404, { error: 'function not found' });
        const r = await handler(new Request(url.href, { method: req.method, headers: req.headers as HeadersInit, body: ['GET', 'HEAD'].includes(req.method!) ? undefined : raw }),
          { ...env, SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY }, { fetch: opts.fetch });
        res.writeHead(r.status, { ...cors, ...Object.fromEntries(r.headers) });
        return res.end(await r.text());
      }
      if (url.pathname.startsWith('/auth/v1/')) return await auth(url, req, raw, send);
      if (url.pathname.startsWith('/rest/v1/')) return await rest(url, req, raw, send);
      send(404, { message: 'not found' });
    } catch (e) {
      const err = e as { code?: string; message: string; detail?: string; status?: number };
      const status = err.status || pgStatus(err.code, req);
      send(status, { code: err.code, message: err.message, details: err.detail || null, hint: null });
    }
  });

  // ------------------------------------------------------------------ GoTrue
  async function session(userId: string, email: string) {
    const rt = crypto.randomBytes(16).toString('hex');
    refresh.set(rt, userId);
    const exp = Math.floor(Date.now() / 1000) + accessTtl;
    return { access_token: sign({ sub: userId, role: 'authenticated', email, exp }), token_type: 'bearer', expires_in: accessTtl, expires_at: exp, refresh_token: rt, user: { id: userId, email } };
  }
  async function auth(url: URL, req: http.IncomingMessage, raw: string, send: (s: number, b: unknown) => void) {
    const body = raw ? JSON.parse(raw) : {};
    const path = url.pathname.slice('/auth/v1/'.length);
    if (path === 'signup') {
      if (!body.password || body.password.length < 6) return send(422, { code: 422, msg: 'Password should be at least 6 characters' });
      try {
        const r = await pool.query(`insert into auth.users (email, encrypted_password, raw_user_meta_data) values (lower($1), crypt($2, gen_salt('bf', 4)), $3) returning id, email`, [body.email, body.password, body.data || {}]);
        return send(200, await session(r.rows[0].id, r.rows[0].email));
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          const dup = /phone/.test((e as Error).message) ? 'duplicate key value violates unique constraint "profiles_phone_key"' : 'User already registered';
          return send(422, { code: 422, msg: dup });
        }
        throw e;
      }
    }
    if (path === 'token' && url.searchParams.get('grant_type') === 'password') {
      const r = await pool.query(`select id, email from auth.users where email = lower($1) and encrypted_password = crypt($2, encrypted_password)`, [body.email, body.password]);
      if (!r.rows[0]) return send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      return send(200, await session(r.rows[0].id, r.rows[0].email));
    }
    if (path === 'token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const uid = refresh.get(body.refresh_token);
      if (!uid) return send(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' });
      refresh.delete(body.refresh_token);
      const r = await pool.query('select id, email from auth.users where id = $1', [uid]);
      return send(200, await session(uid, r.rows[0].email));
    }
    if (path === 'logout') return send(204, undefined);
    send(404, { msg: 'not found' });
  }

  // ------------------------------------------------------------------ PostgREST
  function claimsOf(req: http.IncomingMessage) {
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.headers.apikey || '');
    const c = verify(bearer);
    if (!c) throw Object.assign(new Error('invalid JWT'), { status: 401, code: 'PGRST301' });
    if (c.expired) throw Object.assign(new Error('JWT expired'), { status: 401, code: 'PGRST303' });
    return c;
  }

  async function tx<T>(claims: Record<string, any>, fn: (q: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`, [claims.role, JSON.stringify(claims)]);
      const r = await fn((sql, params) => client.query(sql, params));
      await client.query('commit');
      return r;
    } catch (e) {
      await client.query('rollback').catch(() => {});
      throw e;
    } finally { client.release(); }
  }

  async function rest(url: URL, req: http.IncomingMessage, raw: string, send: (s: number, b: unknown, h?: Record<string, string>) => void) {
    const claims = claimsOf(req);
    const name = url.pathname.slice('/rest/v1/'.length);
    const prefer = String(req.headers.prefer || '');
    if (name.startsWith('rpc/')) {
      const fn = name.slice(4);
      const f = meta.fns[fn];
      if (!f) throw Object.assign(new Error(`function ${fn} not found`), { status: 404, code: 'PGRST202' });
      const args = raw ? JSON.parse(raw) : {};
      const params: unknown[] = [];
      const list = Object.entries(args).map(([k, v]) => {
        if (!(k in f.args)) throw Object.assign(new Error(`unknown argument ${k}`), { status: 404, code: 'PGRST202' });
        params.push(toParam(v, f.args[k]));
        return `"${k}" => $${params.length}::${f.args[k]}`;
      });
      const r = await tx(claims, (q) => q(`select public."${fn}"(${list.join(', ')}) as r`, params));
      if (f.ret === 'void') return send(204, undefined);
      return send(200, r.rows[0].r);
    }
    const table = name;
    const cols = meta.cols[table];
    if (!cols) throw Object.assign(new Error(`relation ${table} not found`), { status: 404, code: '42P01' });
    const params: unknown[] = [];
    const where = buildWhere(url.searchParams, cols, params);
    if (req.method === 'GET') {
      const sel = buildSelect(table, url.searchParams.get('select') || '*');
      const order = (url.searchParams.get('order') || '').split(',').filter(Boolean).map((o) => {
        const [c, dir, nulls] = o.split('.');
        if (!(c in cols)) throw Object.assign(new Error(`column ${c} does not exist`), { status: 400, code: '42703' });
        return `t."${c}" ${dir === 'desc' ? 'desc' : 'asc'}${nulls === 'nullsfirst' ? ' nulls first' : nulls === 'nullslast' ? ' nulls last' : ''}`;
      });
      const limit = Math.min(Number(url.searchParams.get('limit')) || MAX_ROWS, MAX_ROWS);
      const offset = Number(url.searchParams.get('offset')) || 0;
      const sql = `select coalesce(json_agg(x), '[]') as rows from (select ${sel} from public."${table}" t${where} ${order.length ? `order by ${order.join(', ')}` : ''} limit ${limit} offset ${offset}) x`;
      const out = await tx(claims, async (q) => {
        const rows = (await q(sql, params)).rows[0].rows;
        const count = /count=exact/.test(prefer) ? Number((await q(`select count(*) from public."${table}" t${where}`, params)).rows[0].count) : null;
        return { rows, count };
      });
      const range = `${out.rows.length ? `${offset}-${offset + out.rows.length - 1}` : '*'}/${out.count ?? '*'}`;
      return send(200, out.rows, { 'Content-Range': range });
    }
    const repr = /return=representation/.test(prefer);
    if (req.method === 'POST') {
      const body = JSON.parse(raw || '{}');
      const rows = Array.isArray(body) ? body : [body];
      const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      keys.forEach((k) => { if (!(k in cols)) throw Object.assign(new Error(`Could not find the '${k}' column of '${table}'`), { status: 400, code: 'PGRST204' }); });
      const values = rows.map((r) => `(${keys.map((k) => { params.push(toParam(r[k], cols[k])); return `$${params.length}::${cols[k]}`; }).join(', ')})`);
      const sql = `insert into public."${table}" (${keys.map((k) => `"${k}"`).join(', ')}) values ${values.join(', ')}${repr ? ' returning *' : ''}`;
      const r = await tx(claims, (q) => q(sql, params));
      return repr ? send(201, r.rows) : send(201, undefined);
    }
    if (req.method === 'PATCH') {
      const body = JSON.parse(raw || '{}');
      const sets = Object.entries(body).map(([k, v]) => {
        if (!(k in cols)) throw Object.assign(new Error(`Could not find the '${k}' column of '${table}'`), { status: 400, code: 'PGRST204' });
        params.push(toParam(v, cols[k]));
        return `"${k}" = $${params.length}::${cols[k]}`;
      });
      const r = await tx(claims, (q) => q(`update public."${table}" t set ${sets.join(', ')}${where}${repr ? ' returning *' : ''}`, params));
      return repr ? send(200, r.rows) : send(204, undefined);
    }
    if (req.method === 'DELETE') {
      await tx(claims, (q) => q(`delete from public."${table}" t${where}`, params));
      return send(204, undefined);
    }
    send(405, { message: 'method not allowed' });
  }

  // select=a,b,rel(*),rel2(x,y)
  function buildSelect(table: string, select: string): string {
    const parts: string[] = [];
    let depth = 0; let cur = '';
    for (const ch of select) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
    if (cur) parts.push(cur);
    return parts.map((p) => {
      const m = p.match(/^(\w+)\((.*)\)$/);
      if (!m) {
        if (p === '*') return 't.*';
        const c = p.replace(/\W/g, '');
        if (!(c in meta.cols[table])) throw Object.assign(new Error(`column ${table}.${c} does not exist`), { status: 400, code: '42703' });
        return `t."${c}"`;
      }
      const [, rel, inner] = m;
      const innerCols = inner === '*' ? 'r.*' : inner.split(',').map((c) => `r."${c.replace(/\W/g, '')}"`).join(', ');
      const child = meta.fks.find((f) => f.from === rel && f.to === table);   // bảng con trỏ về bảng này: mảng
      if (child) return `coalesce((select json_agg(x) from (select ${innerCols} from public."${rel}" r where r."${child.fromCol}" = t."${child.toCol}") x), '[]') as "${rel}"`;
      const parent = meta.fks.find((f) => f.from === table && f.to === rel);  // bảng này trỏ tới bảng cha: 1 đối tượng
      if (parent) return `(select row_to_json(x) from (select ${innerCols} from public."${rel}" r where r."${parent.toCol}" = t."${parent.fromCol}") x) as "${rel}"`;
      throw Object.assign(new Error(`Could not find a relationship between '${table}' and '${rel}'`), { status: 400, code: 'PGRST200' });
    }).join(', ');
  }

  function cond(col: string, expr: string, cols: Col, params: unknown[]): string {
    const json = col.match(/^(\w+)->>(\w+)$/);
    const ref = json ? `(t."${json[1]}"->>'${json[2]}')` : `t."${col}"`;
    const type = json ? 'text' : cols[col];
    if (!type) throw Object.assign(new Error(`column ${col} does not exist`), { status: 400, code: '42703' });
    const not = expr.startsWith('not.');
    if (not) expr = expr.slice(4);
    const dot = expr.indexOf('.');
    const op = expr.slice(0, dot); const v = expr.slice(dot + 1);
    let sql: string;
    if (OPS[op]) { params.push(toParam(v, type)); sql = `${ref} ${OPS[op]} $${params.length}::${type}`; }
    else if (op === 'ilike' || op === 'like') { params.push(v.replace(/\*/g, '%')); sql = `${ref}::text ${op} $${params.length}`; }
    else if (op === 'is') sql = `${ref} is ${v === 'null' ? 'null' : v === 'true' ? 'true' : 'false'}`;
    else if (op === 'in') {
      const items = v.replace(/^\(|\)$/g, '').match(/"([^"]*)"|[^,]+/g)!.map((s) => s.replace(/^"|"$/g, ''));
      params.push(items); sql = `${ref} = any($${params.length}::${type}[])`;
    } else throw Object.assign(new Error(`unknown operator ${op}`), { status: 400, code: 'PGRST100' });
    return not ? `not (${sql})` : sql;
  }

  function buildWhere(sp: URLSearchParams, cols: Col, params: unknown[]): string {
    const conds: string[] = [];
    for (const [k, v] of sp) {
      if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(k)) continue;
      if (k === 'or') {
        const inner = v.replace(/^\(|\)$/g, '');
        const items: string[] = []; let depth = 0; let cur = '';
        for (const ch of inner) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { items.push(cur); cur = ''; } else cur += ch; }
        if (cur) items.push(cur);
        conds.push(`(${items.map((it) => { const m = it.match(/^([\w>-]+?)\.(.*)$/)!; return cond(m[1], m[2], cols, params); }).join(' or ')})`);
      } else conds.push(cond(k, v, cols, params));
    }
    return conds.length ? ` where ${conds.join(' and ')}` : '';
  }

  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    url: base, anonKey: ANON_KEY, serviceKey: SERVICE_KEY, pool, env,
    async close() { server.close(); await pool.end(); },
    // Tạo tài khoản sẵn (vd nhân viên) - giống đăng ký trên website rồi admin đổi role
    async createUser(phone: string, password: string, name: string, role = 'customer', domain = 'sdt.test') {
      const r = await pool.query(`insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, crypt($2, gen_salt('bf', 4)), $3) returning id`,
        [`${phone}@${domain}`, password, { name, phone }]);
      await pool.query('update public.profiles set role = $1 where id = $2', [role, r.rows[0].id]);
      return r.rows[0].id as string;
    },
  };
}

function toParam(v: unknown, type: string): unknown {
  if (v === null || v === undefined) return null;
  if (type === 'jsonb' || type === 'json') return JSON.stringify(v);
  if (type.endsWith('[]')) return Array.isArray(v) ? v : v;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// Lỗi PostgreSQL -> mã HTTP như PostgREST
function pgStatus(code: string | undefined, req: http.IncomingMessage): number {
  if (!code) return 500;
  if (code === '42501') return String(req.headers.authorization || '').length && !String(req.headers.authorization).includes(ANON_KEY) ? 403 : 401;
  if (code === '23505' || code === '23503') return 409;
  if (code === 'P0001' || code.startsWith('22') || code.startsWith('23')) return 400;
  if (code === '42883' || code === '42P01') return 404;
  return 400;
}

async function loadMeta(pool: pg.Pool) {
  const cols: Record<string, Col> = {};
  const c = await pool.query(`select c.relname t, a.attname c, format_type(a.atttypid, a.atttypmod) ty
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped`);
  for (const r of c.rows) (cols[r.t] = cols[r.t] || {})[r.c] = r.ty.replace(/\(.*\)/, '');
  const f = await pool.query(`select cl.relname "from", a.attname "fromCol", ct.relname "to", af.attname "toCol"
    from pg_constraint k join pg_class cl on cl.oid = k.conrelid join pg_class ct on ct.oid = k.confrelid
    join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
    join pg_attribute af on af.attrelid = k.confrelid and af.attnum = k.confkey[1]
    join pg_namespace n on n.oid = cl.relnamespace where k.contype = 'f' and n.nspname = 'public' and ct.relnamespace = n.oid`);
  const p = await pool.query(`select p.proname, p.prorettype::regtype::text ret, p.proargnames names,
    array(select format_type(x, null) from unnest(p.proargtypes) x) types
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`);
  const fns: Record<string, { ret: string; args: Record<string, string> }> = {};
  for (const r of p.rows) fns[r.proname] = { ret: r.ret, args: Object.fromEntries((r.names || []).slice(0, r.types.length).map((n: string, i: number) => [n, r.types[i]])) };
  return { cols, fks: f.rows as { from: string; fromCol: string; to: string; toCol: string }[], fns };
}
