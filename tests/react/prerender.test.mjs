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
  const adminHtml=fs.readFileSync(path.join(dir,'admin/index.html'),'utf8');
  assert.ok(!adminHtml.includes('src/main.tsx'),'SEO package must include the compiled admin entry');
  assert.match(adminHtml,/react-assets\/index-[\w-]+\.js/);
  await page.goto(base+'admin/');await page.click('#demo-enter');await page.waitForSelector('html[data-admin="react"] #view h1');
  assert.deepEqual(errors,[]);
  console.log('PASS: React prerender HTML without JS, hydration without duplicates, pretty product/category/article URLs, cart');
} finally {await browser.close();server.close();}
