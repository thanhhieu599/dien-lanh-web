import { build } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function buildReact() { await build({configFile:path.resolve('vite.config.mjs')}); }
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await buildReact();
