import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,pagesServer,blockExternal} from '../browser/lib.mjs';

const hosted=process.env.STOREFRONT_BASE;
const local=hosted?null:await pagesServer(path.resolve('dist'));
const base=hosted || local.base+'frontend/';
const browser=await chromium();
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'vi-VN'});
 await blockExternal(context);
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function open(route){await page.goto(base+route);await page.waitForSelector('html[data-react-ready="true"] #main h1',{state:'attached'});await page.waitForFunction(()=>!document.querySelector('#main .react-loading'));}
 await open('index.html');
 const sample=await page.evaluate(()=>{
  const category=DT.categories.find(c=>DT.products.filter(p=>p.cat===c.id).length>5);
  const product=DT.products.find(p=>p.cat===category?.id);
  const other=DT.categories.find(c=>c.id!==category.id&&DT.products.some(p=>p.cat===c.id));
  return {category:category.id,product:product.id,brand:product.brand,other:other?.id};
 });
 async function geometry(label){
  const issues=await page.evaluate(()=>{
   const issues=[];
   if(document.documentElement.scrollWidth>innerWidth+1)issues.push('Tràn ngang trang');
   for(const list of document.querySelectorAll('[data-collection-items]'))if(list.children.length>5)issues.push('Danh sách hiển thị quá 5 mục');
   if(document.querySelector('.product-pagination'))issues.push('Vẫn còn dòng đếm/nút quay lại cũ');
   for(const grid of document.querySelectorAll('.pgrid')) {
    const cards=[...grid.querySelectorAll(':scope > .pcard')];
    if(cards.length>5 && !(location.pathname.endsWith('/khuyen-mai.html') && grid.closest('.listing-main')))issues.push('Hiện quá 5 sản phẩm');
    if(grid.scrollWidth>grid.clientWidth+1)issues.push('Lưới cuộn ngang');
    const boxes=cards.map(card=>card.getBoundingClientRect());
    for(let i=0;i<cards.length;i++) {
     const card=cards[i],box=boxes[i],image=card.querySelector('.pcard-img').getBoundingClientRect();
     if(Math.abs(image.width-image.height)>1)issues.push('Ảnh không vuông');
     if(box.left<0||box.right>innerWidth+1||box.width<120)issues.push('Thẻ quá hẹp hoặc nằm ngoài màn hình');
     if(Math.abs(box.width-boxes[0].width)>1)issues.push('Chiều rộng thẻ không đều');
     if(card.querySelector('.pcard-name').getBoundingClientRect().top<image.bottom-1)issues.push('Tên chồng lên ảnh');
     if(card.querySelector('.pcard-buy').getBoundingClientRect().bottom>box.bottom+1)issues.push('Nút vượt khỏi thẻ');
    }
    const gaps=boxes.slice(1).flatMap((box,i)=>Math.abs(box.top-boxes[i].top)<1?[box.left-boxes[i].right]:[]);
    if(gaps.some(gap=>Math.abs(gap-gaps[0])>1||gap<8))issues.push('Khoảng cách thẻ không đều');
   }
   return issues;
  });
  assert.deepEqual(issues,[],label);
 }
 for(const width of [320,390,768,1024,1440]) {
  await page.setViewportSize({width,height:1000});
  for(const route of ['index.html',`danh-muc.html?cat=${sample.category}`,`san-pham.html?id=${sample.product}`,'khuyen-mai.html',`thuong-hieu.html?id=${sample.brand}`,'dich-vu.html','he-thong-cua-hang.html','tin-tuc.html','du-an.html','gioi-thieu.html','hoi-dap.html','thuong-hieu.html']) {
   await open(route);await geometry(`${width}px ${route}`);
   if(route==='khuyen-mai.html') {
    const expected=await page.evaluate(()=>DT.api.list({flash:true,page:1,limit:Math.max(1,DT.products.length)}).total);
    assert.equal(await page.locator('.listing-main .pcard').count(),expected,'Khuyến mãi hiển thị toàn bộ sản phẩm');
    assert.equal(await page.locator('.listing-main').getByRole('button',{name:'Xem thêm',exact:true}).count(),0);
   }
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await open('index.html');
 const group=page.locator('.product-results').filter({has:page.getByRole('button',{name:'Xem thêm',exact:true})}).first();
 const ids=()=>group.locator('.pcard').evaluateAll(cards=>cards.map(card=>card.dataset.id));
 const first=await ids();assert.equal(first.length,5);
 await group.getByRole('button',{name:'Xem thêm',exact:true}).click();
 const second=await ids();assert.ok(second.length<=5);assert.ok(second.every(id=>!first.includes(id)));
 assert.equal(await group.getByRole('button').filter({hasText:'Quay lại'}).count(),0);
 const groupTotal=Number(await group.locator('.paged-list').getAttribute('data-collection-size'));
 for(let i=1;i<Math.ceil(groupTotal/5);i++)await group.getByRole('button',{name:'Xem thêm',exact:true}).click();
 assert.deepEqual(await ids(),first,'Nút chuyển tiếp quay vòng để truy cập lại các mục đầu');
 const quick=page.locator('[data-collection="Danh mục nhanh"]');
 const allCategoryNames=new Set();
 const categoryCount=await page.evaluate(()=>new Set(DT.categories.map(c=>DT.u.norm(c.short||c.name.replace(/\[TEST[^\]]*\]\s*/gi,'')))).size);
 for(let i=0;i<Math.ceil(categoryCount/5);i++){
  const names=await quick.locator('.quick-cat>b').allTextContents();
  for(const name of names){assert.ok(!allCategoryNames.has(name),'Danh mục nhanh không bị trùng giữa các lượt');allCategoryNames.add(name);}
  if(categoryCount>5)await quick.getByRole('button',{name:'Xem thêm',exact:true}).click();
 }
 assert.equal(allCategoryNames.size,categoryCount);
 await open(`danh-muc.html?cat=${sample.category}`);
 const listing=page.locator('.listing-main');
 const firstPage=await listing.locator('.pcard').evaluateAll(cards=>cards.map(card=>card.dataset.id));
 await listing.getByRole('button',{name:'Xem thêm',exact:true}).click();await page.waitForURL('**page=2');
 await page.waitForFunction(previous=>[...document.querySelectorAll('.listing-main .pcard')].every(card=>!previous.includes(card.dataset.id)),firstPage);
 assert.equal(await listing.locator('.pcard').count(),5);
 assert.ok((await listing.locator('.pcard').evaluateAll(cards=>cards.map(card=>card.dataset.id))).every(id=>!firstPage.includes(id)));
 await page.getByLabel('Sắp xếp').selectOption('price-asc');
 await page.waitForURL('**sort=price-asc');
 assert.ok(!new URL(page.url()).searchParams.has('page'),'Đổi bộ lọc trở về lượt đầu');
 await open(`danh-muc.html?cat=${sample.category}&page=9999`);
 await page.waitForFunction(()=>Number(new URL(location.href).searchParams.get('page'))<9999);
 assert.ok(await listing.locator('.pcard').count()>0);
 await page.getByLabel('Danh mục').selectOption('');
 await page.getByRole('heading',{name:'Tất cả sản phẩm',exact:true}).waitFor();
 assert.ok(await listing.locator('.pcard').count()>0,'Chọn tất cả danh mục không được báo lỗi');
 if(sample.other){
  await page.evaluate(cat=>{const url=new URL(`danh-muc/${cat}.html`,document.baseURI);history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));},sample.category);
  await page.getByLabel('Danh mục').selectOption(sample.other);
  await page.waitForFunction(cat=>new URL(location.href).searchParams.get('cat')===cat,sample.other);
  await page.waitForFunction(cat=>document.querySelector('#main h1')?.textContent===DT.api.category(cat)?.name,sample.other);
  assert.ok(await listing.locator('.pcard').count()>0,'Đổi danh mục trên URL SEO phải cập nhật danh sách');
 }
 // Ảnh thực tế, ảnh hỏng và tên dài đều phải giữ được hình vuông và bố cục.
 const imageProduct=await page.evaluate(()=>{
  const p=DT.products[0];p.images=['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XcAAAAASUVORK5CYII='];
  p.name='Tên sản phẩm rất dài '.repeat(15);p.sold=999999;p.flashSale=true;return p.id;
 });
 await page.locator('.logo').first().click();await page.waitForSelector('.react-home');
 await page.locator(`.pcard[data-id="${imageProduct}"] img`).first().evaluate(img=>img.scrollIntoView());
 await page.waitForFunction(id=>document.querySelector(`.pcard[data-id="${id}"] img`)?.naturalWidth===1,imageProduct);
 await geometry('Ảnh có dữ liệu/tên dài');
 await page.route('**/layout-broken-image.png',route=>route.fulfill({status:404,body:''}));
 await page.evaluate(()=>{const p=DT.products[0];p.images=['layout-broken-image.png'];DT.store.toggleWishlist(p.id);});
 await page.locator(`.pcard[data-id="${imageProduct}"] .react-placeholder`).first().waitFor();
 await geometry('Ảnh hỏng/tên dài');
 fs.mkdirSync('.cache/product-layout',{recursive:true});
 await page.screenshot({path:'.cache/product-layout/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await geometry('Ảnh hỏng/tên dài mobile');
 await page.screenshot({path:'.cache/product-layout/mobile.png',fullPage:true});
 assert.deepEqual(errors,[],'Không có lỗi JavaScript');
 console.log(`PASS: khuyến mãi hiển thị toàn bộ, các danh sách khác tối đa 5 mục, danh mục không trùng, reset bộ lọc và responsive 320–1440px (${hosted?'MySQL thật':'demo build'}).`);
} finally {await browser.close();local?.server.close();}
