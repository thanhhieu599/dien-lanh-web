// Ký / kiểm tra chữ ký bằng Web Crypto (chạy được trên Supabase Edge Functions (Deno) và Node 22 khi kiểm thử).
const enc = new TextEncoder();

export async function hmacHex(alg: 'SHA-256' | 'SHA-512', key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: alg }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

// So sánh không lộ thời gian (chống dò chữ ký / khóa)
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
