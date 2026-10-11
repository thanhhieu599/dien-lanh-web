// Kênh gửi thông báo. Mỗi hàm ném lỗi khi gửi thất bại để hàng đợi thử lại.
import type { Env, Fetch } from './http.ts';
import type { Db } from './db.ts';

const list = (s?: string) => String(s || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

async function body(res: Response): Promise<Record<string, unknown>> {
  try { return await res.json(); } catch { return {}; }
}

// ------------------------------------------------------------------ Email (Resend - https://resend.com)
export const emailEnabled = (env: Env) => !!(env.RESEND_API_KEY && env.EMAIL_FROM);
export const staffEmails = (env: Env) => list(env.STAFF_EMAILS);

export async function sendEmail(env: Env, f: Fetch, m: { to: string[]; subject: string; html: string; text: string; replyTo?: string }) {
  const res = await f('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: m.to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo || env.EMAIL_REPLY_TO || undefined }),
  });
  if (!res.ok) { const d = await body(res); throw new Error(`Resend ${res.status}: ${d.message || d.name || ''}`); }
}

// ------------------------------------------------------------------ Zalo Bot (https://bot.zaloplatforms.com) - báo cho nhân viên
// Mỗi nhân viên nhắn 1 tin cho bot để lấy chat_id (xem docs/PHASE4.md).
export const zaloBotEnabled = (env: Env) => !!(env.ZALO_BOT_TOKEN && list(env.ZALO_BOT_CHAT_IDS).length);

export async function sendZaloBot(env: Env, f: Fetch, text: string) {
  const errors: string[] = [];
  for (const chatId of list(env.ZALO_BOT_CHAT_IDS)) {
    const res = await f(`https://bot-api.zaloplatforms.com/bot${env.ZALO_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 2000) }),
    });
    const d = await body(res);
    if (!res.ok || d.ok === false) errors.push(`${chatId}: ${d.description || res.status}`);
  }
  if (errors.length) throw new Error(`Zalo Bot: ${errors.join('; ')}`);
}

// ------------------------------------------------------------------ Telegram (tùy chọn)
export const telegramEnabled = (env: Env) => !!(env.TELEGRAM_BOT_TOKEN && list(env.TELEGRAM_CHAT_IDS).length);

export async function sendTelegram(env: Env, f: Fetch, text: string) {
  const errors: string[] = [];
  for (const chatId of list(env.TELEGRAM_CHAT_IDS)) {
    const res = await f(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
    });
    const d = await body(res);
    if (!res.ok || d.ok === false) errors.push(`${chatId}: ${d.description || res.status}`);
  }
  if (errors.length) throw new Error(`Telegram: ${errors.join('; ')}`);
}

// ------------------------------------------------------------------ Zalo ZNS - tin chăm sóc khách hàng theo mẫu đã duyệt
// Access token OA sống 25 giờ; refresh token đổi mới sau mỗi lần làm mới -> lưu trong bảng integration_tokens.
export const znsEnabled = (env: Env) => !!(env.ZALO_APP_ID && env.ZALO_APP_SECRET);

interface OaToken { access_token: string; refresh_token: string; expires_at: number }

async function refreshOa(env: Env, f: Fetch, db: Db, refreshToken: string): Promise<OaToken> {
  const res = await f('https://oauth.zaloapp.com/v4/oa/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: String(env.ZALO_APP_SECRET) },
    body: new URLSearchParams({ refresh_token: refreshToken, app_id: String(env.ZALO_APP_ID), grant_type: 'refresh_token' }).toString(),
  });
  const d = await body(res);
  if (!d.access_token) throw new Error(`Zalo OA refresh: ${d.error_description || d.error_name || d.message || res.status}`);
  const t = { access_token: String(d.access_token), refresh_token: String(d.refresh_token), expires_at: Date.now() + Number(d.expires_in || 90000) * 1000 };
  await db.rpc('integration_token_set', { p_key: 'zalo_oa', p_value: t });
  return t;
}

async function oaToken(env: Env, f: Fetch, db: Db, force = false): Promise<string> {
  const saved = await db.rpc<OaToken | null>('integration_token_get', { p_key: 'zalo_oa' });
  if (saved && !force && saved.expires_at - Date.now() > 5 * 60000) return saved.access_token;
  const rt = saved?.refresh_token || env.ZALO_OA_REFRESH_TOKEN;
  if (!rt) throw new Error('Chưa có ZALO_OA_REFRESH_TOKEN');
  return (await refreshOa(env, f, db, rt)).access_token;
}

// Số điện thoại 0xxxxxxxxx -> 84xxxxxxxxx (định dạng ZNS yêu cầu)
export const zaloPhone = (p: string) => String(p || '').replace(/\D/g, '').replace(/^0/, '84').replace(/^\+/, '');

export async function sendZns(env: Env, f: Fetch, db: Db, m: { phone: string; templateId: string; data: Record<string, string | number>; trackingId: string }) {
  const send = async (token: string) => {
    const res = await f('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: token },
      body: JSON.stringify({ phone: zaloPhone(m.phone), template_id: m.templateId, template_data: m.data, tracking_id: m.trackingId }),
    });
    return body(res);
  };
  let d = await send(await oaToken(env, f, db));
  if (d.error === -124 || d.error === -216) d = await send(await oaToken(env, f, db, true));  // token hết hạn / không hợp lệ
  if (d.error !== 0) throw new Error(`ZNS ${d.error}: ${d.message || ''}`);
}
