// Đo chịu tải: mô phỏng N khách vào cùng lúc trên bản build hosting (dist/) chạy Docker – KHÔNG chạy vào hosting thật.
// Mỗi khách: mở trang chủ lần đầu (HTML + JS/CSS + /version + /catalog + /auth/session), đọc 3–8 giây, xem tiếp 4 trang.
// Chạy: BASE=http://127.0.0.1:8090 node tools/load-test.mjs 1000 10   (1000 khách, vào rải trong 10 giây)
import http from 'node:http';
const BASE = new URL(process.env.BASE || 'http://127.0.0.1:8090');
const N = Number(process.argv[2]) || 1000, RAMP = Number(process.argv[3]) || 10;
const agent = new http.Agent({ keepAlive: true, maxSockets: N * 2 });
const lat = []; const codes = {}; let ok = 0, err = 0;
const get = (path) => new Promise((done) => {
  const t = Date.now();
  const r = http.get({ host: BASE.hostname, port: BASE.port || 80, path, agent, headers: { 'accept-encoding': 'gzip' }, timeout: 30000 }, (s) => {
    s.resume(); s.on('end', () => { lat.push(Date.now() - t); codes[s.statusCode] = (codes[s.statusCode] || 0) + 1; s.statusCode < 400 ? ok++ : err++; done(); });
  });
  r.on('timeout', () => r.destroy()); r.on('error', () => { err++; codes.err = (codes.err || 0) + 1; done(); });
});
const text = (path) => new Promise((done) => http.get({ host: BASE.hostname, port: BASE.port || 80, path }, (s) => { let b = ''; s.on('data', (c) => (b += c)); s.on('end', () => done(b)); }));
const html = await text('/frontend/index.html');
const assets = [...html.matchAll(/(?:src|href)="\.\.\/(frontend\/react-assets\/[^"]+\.(?:js|css))"/g)].map((m) => '/' + m[1]);
const parts = { settings: 'key=in.(store,vision,trust,home,catalog)&select=key,value', categories: 'select=id,name,short,icon,art,image,promo_image,promo_title,promo_href,product_ids,excluded_product_ids,subs,filters,show_home,home_subs,sort&order=sort', brands: 'select=id,name,slug,origin,color,logo,product_ids,show_home,sort&order=sort', products: 'select=*&order=id', stores: 'select=id,name,city,address,phone,hours,map&order=sort', posts: 'select=slug,title,cat,date,author,art,excerpt,content&order=date.desc', banners: 'select=title,sub,cta,href,theme,art,image&order=sort', services: 'select=id,name,price,unit,icon,description,image&order=sort', policies: 'select=key,title,body&order=sort', coupons: 'select=*', projects: 'select=*&published=is.true&order=sort,year.desc', faqs: 'select=id,category,question,answer,sort&active=is.true&order=sort,id' };
const api = ['/server/api.php?route=/version', `/server/api.php?route=/catalog&parts=${encodeURIComponent(JSON.stringify(parts))}`, '/server/api.php?route=/auth/session'];
const pages = ['/frontend/danh-muc.html?cat=may-lanh', '/frontend/san-pham.html?id=1001', '/frontend/khuyen-mai.html', '/frontend/gio-hang.html'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function visitor() {
  await sleep(Math.random() * RAMP * 1000);
  await get('/frontend/index.html');
  const list = [...assets, ...api];
  for (let k = 0; k < list.length; k += 6) await Promise.all(list.slice(k, k + 6).map(get)); // trình duyệt mở ~6 kết nối
  for (const p of pages) { await sleep(3000 + Math.random() * 5000); await Promise.all([get(p), get(api[0]), get(api[2])]); }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: N }, visitor));
lat.sort((a, b) => a - b); const q = (p) => lat[Math.floor(lat.length * p)] || 0;
console.log(JSON.stringify({ users: N, ramp_s: RAMP, seconds: Math.round((Date.now() - t0) / 1000), ok, err, codes, p50_ms: q(0.5), p95_ms: q(0.95), p99_ms: q(0.99), max_ms: lat.at(-1) }));
process.exit(err ? 1 : 0);
