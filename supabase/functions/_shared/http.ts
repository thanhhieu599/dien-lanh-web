export type Env = Record<string, string | undefined>;
export type Fetch = typeof fetch;

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...headers } });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const d = await req.json();
    return d && typeof d === 'object' ? d as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

// Phần đường dẫn sau tên function: /functions/v1/payments/vnpay-ipn -> "vnpay-ipn"
export function subPath(req: Request, fn: string): string {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const i = parts.lastIndexOf(fn);
  return (i >= 0 ? parts.slice(i + 1) : parts).join('/');
}

export function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  return xf.split(',')[0].trim() || '127.0.0.1';
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
