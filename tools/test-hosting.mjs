import { createServer } from 'vite';
import { spawn } from 'node:child_process';
const server=await createServer({server:{open:false}});
try {
  await server.listen();
  const address=server.httpServer.address();
  const status=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['tests/server/hosting-browser.test.mjs'],{stdio:'inherit',env:{...process.env,HOSTING_BASE:`http://127.0.0.1:${address.port}/`}});
    child.on('error',reject);child.on('exit',code=>resolve(code ?? 1));
  });
  process.exitCode=status;
} finally {await server.close();}
