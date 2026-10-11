// Gọi PostgREST của Supabase bằng service_role key (chỉ chạy phía máy chủ, không bao giờ đưa ra trình duyệt).
import type { Env, Fetch } from './http.ts';
import { HttpError } from './http.ts';

export interface Db {
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T>;
  select<T = unknown>(table: string, query: string): Promise<T[]>;
}

export function createDb(env: Env, fetchFn: Fetch = fetch): Db {
  const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) throw new HttpError('Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY', 500);
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;  // khóa JWT kiểu cũ; khóa sb_secret_ chỉ cần apikey

  async function call(path: string, init: RequestInit) {
    const res = await fetchFn(base + path, { ...init, headers });
    const text = await res.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && typeof data === 'object' && 'message' in data) ? String((data as { message: unknown }).message) : `HTTP ${res.status}`;
      // Lỗi nghiệp vụ (raise ... errcode P0001) trả về cho khách; lỗi khác coi là lỗi máy chủ
      const business = data && typeof data === 'object' && (data as { code?: string }).code === 'P0001';
      throw new HttpError(msg, business ? 400 : 502);
    }
    return data;
  }

  return {
    rpc: (fn, args = {}) => call(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }) as Promise<never>,
    select: (table, query) => call(`/rest/v1/${table}?${query}`, { method: 'GET' }) as Promise<never>,
  };
}
