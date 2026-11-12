// Ảnh nền thẻ cạnh banner, ảnh quảng cáo cột đầu dải danh mục và bố cục trang Doanh nghiệp (demo build).
import assert from 'node:assert/strict';
import path from 'node:path';
import {chromium,pagesServer,blockExternal} from '../browser/lib.mjs';

// Ảnh 1×1 dạng data URL để không phụ thuộc file ảnh thật
const IMG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const local=await pagesServer(path.resolve('dist'));
const base=local.base+'frontend/';
const browser=await chromium();
try {
  for (const width of [1440, 1024, 768, 320]) {
    const context=await browser.newContext({viewport:{width,height:900},locale:'vi-VN'});
    await blockExternal(context);
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/data/content.js*',async r=>{const res=await r.fetch();r.fulfill({response:res,body:(await res.text())+`\nDT.siteContentDefaults.mini[0].image=${JSON.stringify(IMG)};`});});
    await page.route('**/data/catalog.js*',async r=>{const res=await r.fetch();r.fulfill({response:res,body:(await res.text())+`\nObject.assign(DT.categories.find(c=>c.id==='may-lanh'),{promo_image:${JSON.stringify(IMG)},promo_title:'Máy lạnh QA',promo_href:'khuyen-mai.html'});`});});
    async function open(route){await page.goto(base+route);await page.waitForSelector('html[data-react-ready="true"] #main h1',{state:'attached'});await page.waitForFunction(()=>!document.querySelector('#main .react-loading'));}

    await open('index.html');
    // Hình 1: thẻ có ảnh -> ảnh nền + chữ vẫn hiện; thẻ chưa có ảnh giữ nguyên biểu tượng
    assert.equal(await page.locator('.mini-banner.mb-1.has-image img.mini-banner-bg').count(),1,`${width}: thẻ 1 thiếu ảnh nền`);
    assert.match(await page.locator('.mini-banner.mb-1').innerText(),/Flash Sale/);
    assert.equal(await page.locator('.mini-banner.mb-2.has-image').count(),0);
    // Hình 2: cột đầu dải Máy lạnh là ảnh quảng cáo, có chữ + nút, tối đa 4 sản phẩm bên cạnh
    const promo=page.locator('[data-block="may-lanh"] .cat-promo');
    assert.equal(await promo.count(),1,`${width}: thiếu ảnh quảng cáo danh mục`);
    assert.match(await promo.getAttribute('href'),/khuyen-mai/);
    assert.match(await promo.innerText(),/Máy lạnh QA[\s\S]*Xem ngay/i);
    assert.ok(await page.locator('[data-block="may-lanh"] [data-collection-items] > *').count()<=4);
    // Danh mục không có ảnh vẫn hiển thị như cũ
    assert.equal(await page.locator('[data-block="tu-lanh"] .cat-promo').count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: trang chủ tràn ngang`);
    const box=await promo.boundingBox();assert.ok(box.width>100&&box.height>100,`${width}: ảnh quảng cáo quá nhỏ`);

    // Hình 4: trang Doanh nghiệp có số liệu, lợi ích, quy trình, lĩnh vực và form báo giá
    await open('bao-gia-du-an.html');
    assert.equal(await page.locator('.b2b-hero-stats > div').count(),4);
    assert.equal(await page.locator('.b2b-benefits > li').count(),4);
    assert.equal(await page.locator('.b2b-timeline > li').count(),4);
    assert.equal(await page.locator('#bao-gia form[data-lead="b2b-quote"]').count(),1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: trang Doanh nghiệp tràn ngang`);
    if (width>=1440) {
      // Desktop: form nằm bên phải nội dung
      const main=await page.locator('.b2b-main').boundingBox(),aside=await page.locator('.b2b-aside').boundingBox();
      assert.ok(aside.x>main.x+main.width-1,'Form báo giá phải nằm cột phải');
    }
    await page.click('.b2b-hero-actions a[href="#bao-gia"]');
    await page.waitForFunction(()=>{const r=document.querySelector('#bao-gia').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;});
    if (width===1440) {
      // Thanh toán: chỉ có COD và chuyển khoản ngân hàng
      await page.evaluate(()=>DT.store.addToCart(DT.products[0].id,1));
      await open('thanh-toan.html');
      const methods=await page.locator('input[name=payment]').evaluateAll(els=>els.map(el=>el.value));
      assert.deepEqual(methods,['cod','bank']);
      assert.equal(await page.getByText(/VNPay|MoMo|trả góp/i).count(),0);
      // Mọi đơn đều miễn phí giao hàng (kể cả đơn nhỏ): tổng = tạm tính
      const ship=page.locator('.sum-row',{hasText:'Giao hàng'});
      assert.match(await ship.innerText(),/Miễn phí/);
      const sums=await page.evaluate(()=>[...document.querySelectorAll('.sum-row b, .sum-total b')].map(b=>b.textContent));
      assert.equal(sums.at(-1),sums[0],'Tổng thanh toán phải bằng tạm tính');
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: ảnh nền thẻ cạnh banner, ảnh quảng cáo dải danh mục, trang Doanh nghiệp 320–1440px (demo build).');
} finally {await browser.close();local.server.close();}
