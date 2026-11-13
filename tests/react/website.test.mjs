import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, pagesServer, blockExternal } from '../browser/lib.mjs';

const {server,base}=await pagesServer(path.resolve('dist'));
const browser=await chromium();
try {
  const context=await browser.newContext({viewport:{width:1366,height:900},locale:'vi-VN'});
  await blockExternal(context);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  const fe=base+'frontend/';
  async function open(route){console.log(`Open: ${route}`);await page.goto(fe+route);await page.waitForSelector('html[data-frontend="react"] #main h1',{state:'attached'});await page.waitForFunction(()=>!document.querySelector('#main [role="status"]'));}
  await open('index.html');
  assert.ok(await page.locator('.pcard').count()>0);
  assert.equal(await page.locator('script[data-shared-runtime*="pages/"]').count(),0,'React must render pages without the old page scripts');
  assert.equal(await page.locator('script[data-shared-runtime="components/analytics"]').count(),1,'Shared runtime must initialize once');
  const product=await page.evaluate(()=>DT.products.find(p=>p.stock>5 && !Object.values(p.options || {}).some(v=>v.length)));
  const post=await page.evaluate(()=>DT.posts[0].slug);
  const project=await page.evaluate(()=>DT.projects[0]?.slug);
  const contrast=await page.evaluate(()=>{
    const light=token=>{
      const probe=document.createElement('span');probe.style.color=`var(${token})`;document.body.append(probe);
      const channels=getComputedStyle(probe).color.match(/[\d.]+/g).slice(0,3).map(Number);probe.remove();
      const c=channels.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
      return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
    };
    return [
      ['--color-text-primary','--color-surface-base',4.5],['--color-text-secondary','--color-surface-base',4.5],
      ['--color-text-inverse','--color-brand',4.5],['--color-text-inverse','--color-brand-hover',4.5],
      ['--color-text-inverse','--color-brand-active',4.5],['--color-accent','--color-surface-base',4.5],
      ['--color-error','--color-surface-base',4.5],['--color-disabled-text','--color-disabled-surface',4.5],
      ['--color-border-control','--color-surface-base',3],['--color-focus','--color-surface-base',3],
    ].map(([fg,bg,min])=>({fg,bg,min,ratio:(Math.max(light(fg),light(bg))+0.05)/(Math.min(light(fg),light(bg))+0.05)}));
  });
  for(const pair of contrast)assert.ok(pair.ratio>=pair.min,`Contrast ${pair.fg}/${pair.bg}: ${pair.ratio}`);
  await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true,'First Tab reaches skip link');
  await page.keyboard.press('Enter');assert.equal(await page.locator('#main').evaluate(el=>el===document.activeElement),true,'Skip link focuses main');
  await open('index.html');
  assert.equal(await page.locator('.slider-pause').count(),0,'Không còn nút Tạm dừng trên banner');
  assert.ok(await page.locator('.slide[inert]').count()>0,'Inactive banners are inert');
  const search=page.getByRole('searchbox',{name:'Tìm kiếm sản phẩm'});await search.fill('máy lạnh');
  await page.waitForSelector('#search-suggestions a');
  await page.keyboard.press('Tab');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.matches('.react-suggestion')),true,'Tab reaches suggested product');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#search-suggestions').count(),0);
  await search.focus();
  assert.equal(await search.evaluate(el=>getComputedStyle(el).outlineStyle),'solid','Search has a visible keyboard focus ring');
  const routes=fs.readdirSync('frontend').filter(f=>f.endsWith('.html') && !['bai-viet.html','du-an-chi-tiet.html','san-pham.html','danh-muc.html','dat-hang-thanh-cong.html'].includes(f));
  for(const route of [...routes,`san-pham.html?id=${product.id}`,'danh-muc.html?cat=may-lanh',`bai-viet.html?slug=${post}`,...(project?[`du-an-chi-tiet.html?slug=${project}`]:[])]){
    await open(route);assert.equal(await page.locator('#root').count(),1);assert.ok((await page.locator('#main h1').first().textContent()).trim(),route);assert.equal(await page.locator('#main').getByText('Không hiển thị được trang',{exact:true}).count(),0,route);
    console.log(`React route: ${route}`);
  }
  await open('index.html');await page.evaluate(()=>window.__reactSentinel=123);
  await page.locator('.mainnav').getByRole('link',{name:'KHUYẾN MÃI',exact:true}).click();
  await page.waitForURL('**/khuyen-mai.html');assert.equal(await page.evaluate(()=>window.__reactSentinel),123,'Internal links must navigate without reloading');
  await open('danh-muc.html?cat=may-lanh');
  await page.getByLabel('Sắp xếp').selectOption('price-asc');await page.waitForURL('**sort=price-asc');
  await page.waitForFunction(()=>{const prices=[...document.querySelectorAll('.listing-main .pcard-price strong')].map(el=>Number(el.textContent.replace(/\D/g,'')));return prices.length>0 && prices.every((p,i)=>!i || p>=prices[i-1]);});
  const prices=await page.locator('.listing-main .pcard-price strong').allTextContents();const values=prices.map(p=>Number(p.replace(/\D/g,'')));assert.deepEqual(values,[...values].sort((a,b)=>a-b));
  await open(`san-pham.html?id=${product.id}`);
  await page.locator('.pd-title').getByRole('button',{name:'Yêu thích',exact:true}).click();
  await page.locator('.buy-btns').getByRole('button',{name:'Thêm vào giỏ',exact:false}).click();
  assert.equal(await page.locator('#cart-count').textContent(),'1');
  await page.locator('.h-cart').click();await page.waitForURL('**/gio-hang.html');await page.locator('.cart-item input[type=number]').fill('2');
  await page.getByRole('link',{name:'Tiến hành thanh toán'}).click();await page.waitForURL('**/thanh-toan.html');
  // Chuyển khoản: hiện QR công ty (ACB) + đầy đủ tài khoản ngay ở bước thanh toán
  await page.locator('input[value=bank]').check();
  const bank=page.locator('.checkout-bank');await bank.waitFor();
  for(const text of ['75575668','ACB','CONG TY TNHH KY NGHE LANH KHANH LE'])assert.ok((await bank.textContent()).includes(text),`Thiếu ${text}`);
  assert.match(await bank.locator('img.checkout-qr').getAttribute('src'),/970416-75575668/);
  await page.locator('input[value=cod]').check();
  await page.locator('[name=name]').fill('React Customer');await page.locator('[name=phone]').fill('0912345678');await page.locator('[name=province]').fill('TP.HCM');await page.locator('[name=district]').fill('Quận 1');await page.locator('[name=address]').fill('123 Test');await page.locator('[name=agree]').check();await page.getByRole('button',{name:'ĐẶT HÀNG',exact:true}).click();await page.waitForURL('**/dat-hang-thanh-cong.html?code=*');
  const order=await page.evaluate(()=>DT.store.get().orders[0]);assert.equal(order.items[0].qty,2);
  assert.ok((await page.locator('.react-order').textContent()).includes(order.code));
  await open(`tra-cuu-don-hang.html?code=${order.code}`);await page.locator('form [name=phone]').fill('0912345678');await page.getByRole('button',{name:'Tra cứu đơn hàng',exact:true}).click();await page.waitForSelector('.react-order');await page.getByRole('button',{name:'Hủy đơn hàng'}).click();await page.getByText('Đã hủy',{exact:true}).first().waitFor();
  await open('yeu-thich.html');assert.equal(await page.locator('.pcard').count(),1);
  await open(`san-pham.html?id=${product.id}`);await page.locator('.pd-title').getByRole('button',{name:'So sánh',exact:true}).click();await open('so-sanh.html');assert.equal(await page.locator('.compare-table thead th').count(),2);
  await open('tai-khoan.html');await page.locator('#main').getByRole('button',{name:'Đăng ký',exact:true}).click();await page.locator('#register-form [name=name]').fill('React User');await page.locator('#register-form [name=phone]').fill('0987654321');await page.locator('#register-form [name=password]').fill('ReactPassword!');await page.getByRole('button',{name:'Tạo tài khoản'}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).waitFor();
  await open('lien-he.html');await page.locator('form[data-lead] [name=name]').fill('React Lead');await page.locator('form[data-lead] [name=phone]').fill('0912345678');await page.locator('form[data-lead] [name=message]').fill('Tư vấn máy lạnh');await page.locator('form[data-lead] [name=consent]').check();await page.locator('form[data-lead]').getByRole('button',{name:'Gửi yêu cầu'}).click();await page.locator('form[data-lead] [role=status]').waitFor();
  const leads=await page.evaluate(()=>JSON.parse(localStorage.getItem('dt_leads_v1')));assert.equal(leads[0].type,'contact');
  await page.goto(base+'admin/');await page.click('#demo-enter');await page.waitForSelector('.ad-side');assert.equal(await page.evaluate(()=>AD.db.mode),'demo');assert.ok((await page.evaluate(()=>AD.db.list('orders'))).rows.some(o=>o.code===order.code),'Existing admin must read React orders');
  await page.evaluate(async id=>{await AD.db.update('products',id,{options:{Color:['White','Black']},images:['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XcAAAAASUVORK5CYII=']});},product.id);
  await open(`san-pham.html?id=${product.id}`);await page.getByRole('button',{name:'Mua ngay',exact:true}).click();assert.equal(await page.evaluate(()=>DT.store.get().cart.length),0,'Required options must be selected before adding');
  await page.waitForFunction(()=>document.querySelector('#g-main img')?.naturalWidth===1);
  await page.getByRole('button',{name:'White',exact:true}).click();await page.locator('.buy-btns').getByRole('button',{name:'Thêm vào giỏ',exact:false}).click();await page.getByRole('button',{name:'Black',exact:true}).click();await page.locator('.buy-btns').getByRole('button',{name:'Thêm vào giỏ',exact:false}).click();assert.equal(await page.evaluate(()=>DT.store.get().cart.length),2,'Different options must produce separate cart lines');
  await page.setViewportSize({width:390,height:844});
  for(const route of ['index.html',`san-pham.html?id=${product.id}`,'danh-muc.html?cat=may-lanh','thanh-toan.html','hoi-dap.html']){await open(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Mobile overflow: ${route}`);}
  await open('index.html');await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('.drawer.open').waitFor();await page.getByRole('button',{name:'Đóng menu'}).click();
  // Exercise the breakpoints where the legacy CSS previously hid filters or squeezed the grid.
  // Đã bỏ trang "Về công ty": không còn liên kết; link cũ chuyển sang Tầm nhìn & Sứ mệnh
  await open('index.html');
  assert.equal(await page.locator('a[href*="gioi-thieu"]').count(),0,'Không còn liên kết Về công ty');
  await open('gioi-thieu.html');await page.waitForURL('**/tam-nhin-su-menh.html');
  for(const width of [320,768,900,1024,1440]){
    await page.setViewportSize({width,height:900});
    for(const route of ['danh-muc.html?cat=may-lanh','tin-tuc.html','du-an.html','tam-nhin-su-menh.html','he-thong-cua-hang.html','gio-hang.html']){
      await open(route);
      const issues=await page.evaluate(()=>{
        const issues=[];
        for(const card of document.querySelectorAll('.listing-main .pcard,.news-card')){
          const box=card.getBoundingClientRect();
          if(box.left<0 || box.right>innerWidth+1 || box.width<120)issues.push('Card squeezed or outside viewport');
          const image=card.querySelector('.news-img'),body=card.querySelector('.news-body');
          if(image && body && image.getBoundingClientRect().bottom>body.getBoundingClientRect().top+1)issues.push('Image overlaps text');
          if(body && body.getBoundingClientRect().bottom>box.bottom+1)issues.push('Content escapes card');
        }
        for(const img of document.querySelectorAll('#main img'))if(img.complete && !img.naturalWidth)issues.push('Broken content image');
        for(const info of document.querySelectorAll('.ci-info'))if(info.getBoundingClientRect().width<130)issues.push('Cart name squeezed into a narrow column');
        for(const card of document.querySelectorAll('.store-card')){
          const heading=card.querySelector('h2').getBoundingClientRect(),address=card.querySelector('p').getBoundingClientRect();
          if(address.top<heading.bottom)issues.push('Store address must appear below its name');
        }
        return issues;
      });
      assert.deepEqual(issues,[],`${width}px ${route}`);
      if(route.startsWith('danh-muc') && width<=992){
        const toggle=page.locator('.react-filter-toggle');
        assert.equal(await page.locator('#filters').isVisible(),false);
        await toggle.click();assert.equal(await page.locator('#filters').isVisible(),true);
        const box=await page.locator('#filters').boundingBox();assert.ok(box.x>=0 && box.x+box.width<=width+1,'Filter must be on screen');
        await page.getByLabel('Khoảng giá').selectOption({index:1});
        assert.ok((new URL(page.url())).searchParams.has('price'),'Mobile filter must update products');
        await toggle.click();assert.equal(await page.locator('#filters').isVisible(),false);
      }
    }
    if(width<=768){
      assert.equal(await page.locator('.header-main .h-cart>.react-icon').isVisible(),true,'Mobile cart icon is visible');
      await page.getByRole('button',{name:'Mở menu',exact:true}).click();
      await page.keyboard.press('Escape');assert.equal(await page.locator('.drawer').count(),0);
    }
  }
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS: React routes, SPA navigation, filtering, cart, checkout, orders, account, leads, existing admin, mobile');
} finally {await browser.close();server.close();}
