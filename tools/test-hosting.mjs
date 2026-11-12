import { createServer } from 'vite';
import { spawn } from 'node:child_process';
const server=await createServer({server:{open:false}});
try {
  await server.listen();
  const address=server.httpServer.address();
  const run=(file)=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,HOSTING_BASE:`http://127.0.0.1:${address.port}/`}});
    child.on('error',reject);child.on('exit',code=>resolve(code ?? 1));
  });
  // Adapter PHP/MySQL, rồi đồng bộ website ↔ admin (đặt hàng, kho, CRM, chứng từ)
  let status=await run('tests/server/hosting-browser.test.mjs');
  if(!status)status=await run('tests/server/sync.test.mjs');
  process.exitCode=status;
} finally {await server.close();}
