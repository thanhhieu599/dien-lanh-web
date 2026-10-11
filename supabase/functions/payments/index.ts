// Supabase Edge Function (Deno). Logic nằm ở handler.ts để kiểm thử được bằng Node.
import { handle } from './handler.ts';

Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
