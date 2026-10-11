// Edge Function "notify": gửi thông báo từ hàng đợi public.notifications.
//   POST /notify        xử lý hàng đợi (pg_cron gọi mỗi phút - xem supabase/setup/cron.sql)
//   POST /notify/test   gửi tin thử tới các kênh nhân viên (kiểm tra cấu hình)
//   GET  /notify/status kênh nào đã cấu hình
// Bảo vệ bằng header x-notify-secret = NOTIFY_SECRET (hoặc Authorization: Bearer <service_role key>).
import { CORS, HttpError, json, subPath } from '../_shared/http.ts';
import type { Env, Fetch } from '../_shared/http.ts';
import { createDb } from '../_shared/db.ts';
import type { Db } from '../_shared/db.ts';
import { safeEqual } from '../_shared/crypto.ts';
import * as ch from '../_shared/channels.ts';
import { customerEmail, staffEmail, staffText, znsMessage } from './messages.ts';
import type { Ctx, Json, NotifyEvent } from './messages.ts';

export interface Deps { fetch?: Fetch; db?: Db; maxBatches?: number }

function authorized(req: Request, env: Env): boolean {
  const secret = env.NOTIFY_SECRET || '';
  const h = req.headers.get('x-notify-secret') || '';
  if (secret && safeEqual(h, secret)) return true;
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return !!env.SUPABASE_SERVICE_ROLE_KEY && safeEqual(bearer, env.SUPABASE_SERVICE_ROLE_KEY);
}

export function channelStatus(env: Env) {
  return {
    email: ch.emailEnabled(env),
    staffEmails: ch.staffEmails(env).length,
    zaloBot: ch.zaloBotEnabled(env),
    telegram: ch.telegramEnabled(env),
    zns: ch.znsEnabled(env) && !!(env.ZNS_TEMPLATE_ORDER || env.ZNS_TEMPLATE_STATUS || env.ZNS_TEMPLATE_PAID || env.ZNS_TEMPLATE_CART),
  };
}

async function loadStore(db: Db, env: Env): Promise<Json> {
  try {
    const rows = await db.select<{ value: Json }>('settings', 'key=eq.store&select=value');
    return { ...(rows[0]?.value || {}) };
  } catch (e) {
    console.warn('[notify] settings', e);
    return { name: env.SHOP_NAME };
  }
}

type Delivery = [string, () => Promise<void>];

export function deliveries(ev: NotifyEvent, c: Ctx, f: Fetch, db: Db): Delivery[] {
  const env = c.env;
  const out: Delivery[] = [];
  const text = staffText(ev, c);
  if (text) {
    if (ch.zaloBotEnabled(env)) out.push(['zalo_staff', () => ch.sendZaloBot(env, f, text)]);
    if (ch.telegramEnabled(env)) out.push(['telegram_staff', () => ch.sendTelegram(env, f, text)]);
    const se = staffEmail(ev, c);
    if (se && ch.emailEnabled(env) && ch.staffEmails(env).length) {
      const replyTo = ev.order?.customer?.email || ev.lead?.email || ev.data?.email || undefined;
      out.push(['email_staff', () => ch.sendEmail(env, f, { to: ch.staffEmails(env), ...se, replyTo })]);
    }
  }
  const ce = customerEmail(ev, c);
  if (ce && ch.emailEnabled(env)) out.push(['email_customer', () => ch.sendEmail(env, f, { ...ce, to: [ce.to] })]);
  const zm = znsMessage(ev, c);
  if (zm && ch.znsEnabled(env)) out.push(['zns_customer', () => ch.sendZns(env, f, db, zm)]);
  return out;
}

export async function processEvent(ev: NotifyEvent, c: Ctx, f: Fetch, db: Db) {
  const results: Record<string, { ok: boolean; at: string; error?: string }> = {};
  let done = true;
  for (const [name, send] of deliveries(ev, c, f, db)) {
    if (ev.results?.[name]?.ok) continue;  // đã gửi ở lần trước, không gửi trùng
    const at = new Date().toISOString();
    try {
      await send();
      results[name] = { ok: true, at };
    } catch (e) {
      done = false;
      results[name] = { ok: false, at, error: String((e as Error)?.message || e).slice(0, 300) };
      console.warn(`[notify] #${ev.id} ${name}:`, results[name].error);
    }
  }
  return { results, done };
}

export async function handle(req: Request, env: Env, deps: Deps = {}): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (!authorized(req, env)) return json({ error: 'Unauthorized' }, 401);
  const f = deps.fetch || fetch;
  const route = subPath(req, 'notify');
  try {
    if (route === 'status') return json(channelStatus(env));
    const db = deps.db || createDb(env, f);
    const c: Ctx = { env, store: await loadStore(db, env) };

    if (route === 'test' && req.method === 'POST') {
      const text = `✅ Thử thông báo từ ${c.store.name || 'website'} lúc ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.\nNếu nhận được tin này, kênh đã cấu hình đúng.`;
      const out: Record<string, string> = {};
      const tries: Delivery[] = [];
      if (ch.zaloBotEnabled(env)) tries.push(['zalo_staff', () => ch.sendZaloBot(env, f, text)]);
      if (ch.telegramEnabled(env)) tries.push(['telegram_staff', () => ch.sendTelegram(env, f, text)]);
      if (ch.emailEnabled(env) && ch.staffEmails(env).length) {
        tries.push(['email_staff', () => ch.sendEmail(env, f, { to: ch.staffEmails(env), subject: 'Thử thông báo', text, html: `<p>${text.replace(/\n/g, '<br>')}</p>` })]);
      }
      for (const [name, send] of tries) {
        try { await send(); out[name] = 'ok'; } catch (e) { out[name] = String((e as Error).message || e); }
      }
      return json({ channels: channelStatus(env), results: out });
    }

    if ((route === '' || route === 'run') && req.method === 'POST') {
      let processed = 0; let sent = 0; let retry = 0;
      for (let b = 0; b < (deps.maxBatches ?? 5); b++) {
        const batch = await db.rpc<NotifyEvent[]>('notifications_claim', { p_limit: 20 });
        if (!batch.length) break;
        for (const ev of batch) {
          const { results, done } = await processEvent(ev, c, f, db);
          await db.rpc('notification_finish', { p_id: ev.id, p_results: results, p_done: done });
          processed++; if (done) sent++; else retry++;
        }
      }
      return json({ processed, done: sent, retry });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('[notify]', e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
}
