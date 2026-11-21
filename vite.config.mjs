import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
export default defineConfig({
  base: './',
  publicDir: false,
  define: { __BUILD_VERSION__:JSON.stringify(process.env.GITHUB_SHA?.slice(0,12) || Date.now().toString(36)) },
  plugins: [react(),{
    name:'reload-shared-runtime',
    handleHotUpdate({file,server}) {
      if(['/frontend/assets/js/','/admin/assets/js/'].some(dir=>file.replaceAll('\\','/').includes(dir))){server.ws.send({type:'full-reload'});return [];}
    },
    // Khi chạy dev: file JS/CSS dùng chung (assets/) không được lưu đệm, sửa xong tải lại trang là thấy bản mới
    // (mã ?v= chỉ tạo 1 lần lúc khởi động dev nên trình duyệt có thể giữ bản cũ)
    configureServer(server) {
      server.middlewares.use((req,res,next)=>{
        if(/^\/(frontend|admin)\/assets\/.+\.(js|css)(\?|$)/.test(req.url||''))res.setHeader('Cache-Control','no-store');
        next();
      });
    },
  }],
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    watch: { ignored:['**/.cache/**','**/dist/**','**/node_modules/**'] },
    proxy: { '/server': { target: process.env.PHP_SERVER || 'http://127.0.0.1:8080', changeOrigin: false } },
  },
  build: {
    outDir: '.cache/react', emptyOutDir: true,
    assetsDir: 'frontend/react-assets',
    rollupOptions: {
      input: [...fs.readdirSync(path.join(root, 'frontend')).filter((f) => f.endsWith('.html')).map((f) => path.join(root, 'frontend', f)),path.join(root,'admin/index.html')],
    },
  },
});
