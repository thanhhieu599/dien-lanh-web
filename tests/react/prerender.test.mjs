import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pagesServer,chromium,blockExternal} from '../browser/lib.mjs';
const dir=path.resolve(process.argv[2] || 'dist');
const {server,base}=await pagesServer(dir);const browser=await chromium();
try {
  const slug=fs.readdirSync(path.join(dir,'frontend/sp')).find(f=>f.endsWith('.html'));
  const raw=fs.readFileSync(path.join(dir,'frontend/sp',slug),'utf8');
  assert.match(raw,/<h1>[^<]+<\/h1>/);assert.match(raw,/class="[^"]*\bspecs\b[^"]*"/);assert.ok(!raw.includes('script data-shared-runtime'),'Generated page must let the React bootstrap load the shared runtime once');
  const plain=await browser.newContext({javaScriptEnabled:false});await blockExternal(plain);const staticPage=await plain.newPage();await staticPage.goto(base+'frontend/sp/'+slug);assert.equal(await staticPage.locator('.pd-title h1').count(),1);assert.ok(await staticPage.locator('.specs tr').count()>0);await plain.close();
  const context=await browser.newContext();await blockExternal(context);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'frontend/sp/'+slug);await page.waitForSelector('html[data-react-ready="true"] .buy-btns');
  assert.equal(await page.locator('.pd-title h1').count(),1);assert.equal(await page.locator('#site-header').count(),1);assert.equal(await page.locator('#site-footer').count(),1);assert.equal(await page.locator('script[data-ld=Product]').count(),1);
  assert.equal(await page.locator('script[data-shared-runtime="components/analytics"]').count(),1,'Runtime must execute once when lazy page chunks import shared code');
  const pathname=new URL(page.url()).pathname;
  // The current product page exposes the reviews section without a jump link.
  await page.evaluate(()=>{window.location.hash='reviews';});await page.waitForURL('**#reviews');assert.equal(new URL(page.url()).pathname,pathname);
  await page.locator('#reviews').waitFor({state:'attached'});
  const add=page.locator('.buy-btns button[data-action="add-cart"]');if(await add.count()){await add.click();await page.waitForFunction(()=>Number(document.querySelector('#cart-count').textContent)>0);}
  await page.goto(base+'frontend/danh-muc/may-lanh.html');await page.waitForSelector('html[data-react-ready="true"] .listing-main .pcard');assert.equal(await page.locator('#cat-title').textContent(),'Máy lạnh - Điều hòa');
  // Router commits the controlled checkbox after navigation; verify the settled state.
  await page.locator('#filters input[type=checkbox]').first().click();await page.waitForURL('**/danh-muc/may-lanh.html?brand=*');await page.waitForFunction(()=>document.querySelector('#filters input[type=checkbox]').checked);assert.ok(!new URL(page.url()).searchParams.has('cat'));
  await page.goto(base+'frontend/tin-tuc/'+fs.readdirSync(path.join(dir,'frontend/tin-tuc'))[0]);await page.waitForSelector('html[data-react-ready="true"] #main article h2');assert.equal(await page.locator('#main h1').count(),1);
  // Kiểm toán SEO toàn bộ trang dựng sẵn: không lộ địa chỉ máy build, sitemap chỉ chứa trang index được với canonical khớp
  const pages=[];(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory()){if(!['assets','react-assets','og'].includes(f))walk(p);}else if(f.endsWith('.html'))pages.push(p);}})(path.join(dir,'frontend'));
  for(const p of pages){const html=fs.readFileSync(p,'utf8');assert.ok(!/https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(html),`Địa chỉ máy build trong ${path.relative(dir,p)}`);}
  const sitemap=fs.readFileSync(path.join(dir,'frontend/sitemap.xml'),'utf8');const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);const siteBase=locs[0];
  assert.ok(locs.length>5&&/^https:\/\//.test(siteBase),'Sitemap dùng HTTPS');
  for(const loc of locs){const rel=loc.slice(siteBase.length)||'index.html';const html=fs.readFileSync(path.join(dir,'frontend',rel),'utf8');
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html),`Trang noindex nằm trong sitemap: ${rel}`);
    assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],loc,`Canonical khác URL sitemap: ${rel}`);}
  const robots=fs.readFileSync(path.join(dir,'robots.txt'),'utf8');assert.match(robots,/Disallow: \/admin\//);assert.match(robots,new RegExp(`Sitemap: ${siteBase}sitemap\\.xml`));
  assert.ok(fs.existsSync(path.join(dir,'.htaccess')),'Bản SEO có .htaccess (301 trang gốc, 404, bảo mật)');
  const home=fs.readFileSync(path.join(dir,'frontend/index.html'),'utf8');const brandName=home.match(/<meta property="og:site_name" content="([^"]+)"/)[1];
  assert.equal(home.match(/<title>([^<]+)<\/title>/)[1].split(brandName).length-1,1,'Title trang chủ không lặp tên cửa hàng');
  const lds=[...home.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])['@type']);
  assert.ok(lds.includes('HVACBusiness')&&lds.includes('WebSite'),`Trang chủ cần dữ liệu doanh nghiệp: ${lds}`);
  const sub=pages.find(p=>/danh-muc[\\/][^\\/]+[\\/][^\\/]+\.html$/.test(p));
  if(sub){const parent=sub.replace(/[\\/][^\\/]+\.html$/,'.html');const t=(f)=>fs.readFileSync(f,'utf8').match(/<title>([^<]+)<\/title>/)[1];assert.notEqual(t(sub),t(parent),'Danh mục con có title riêng');}
  const crumbs=fs.readFileSync(path.join(dir,'frontend/sp',slug),'utf8');assert.match(crumbs,/"@type":"BreadcrumbList"/);
  const adminHtml=fs.readFileSync(path.join(dir,'admin/index.html'),'utf8');
  assert.ok(!adminHtml.includes('src/main.tsx'),'SEO package must include the compiled admin entry');
  assert.match(adminHtml,/react-assets\/index-[\w-]+\.js/);
  await page.goto(base+'admin/');await page.click('#demo-enter');await page.waitForSelector('html[data-admin="react"] #view h1');
  assert.deepEqual(errors,[]);
  console.log('PASS: React prerender HTML without JS, hydration without duplicates, pretty product/category/article URLs, cart');
} finally {await browser.close();server.close();}
