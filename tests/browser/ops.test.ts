// Kiểm thử Vận hành & quản trị (đã kết nối database):
//  GA4 + Meta Pixel + hộp đồng ý cookie, nguồn khách (UTM) vào lead & đơn hàng, nhắc bảo trì định kỳ,
//  phân quyền kinh doanh / kế toán, xuất Excel MISA, tải ảnh sản phẩm.
// Chạy: PGHOST=localhost PGUSER=postgres PGPASSWORD=... node --experimental-strip-types tests/browser/ops.test.ts
import fs from 'node:fs';
import { check, DOMAIN, failed, section, setup, toast } from '../support/harness.ts';

const T = await setup('dt_ops', { accessTtl: 3600 });
const { sql, sb, admin, fe } = T;
await sb.createUser('0900000001', 'admin123', 'Quản Trị Viên', 'admin', DOMAIN);
await sb.createUser('0900000002', 'staff123', 'Nhân Viên Vận Hành', 'staff', DOMAIN);
await sb.createUser('0900000004', 'sales123', 'Kinh Doanh Minh', 'customer', DOMAIN);
await sb.createUser('0900000005', 'sales223', 'Kinh Doanh Lan', 'sales', DOMAIN);
await sb.createUser('0900000006', 'ketoan123', 'Kế Toán Hoa', 'accountant', DOMAIN);
sql(`update public.settings set value = value || '{"ga4Id":"G-TEST12345","metaPixelId":"1234567890"}' where key = 'store'`);

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
const img = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

async function login(page: any, id: string, pw: string) {
  await page.goto(admin);
  await page.waitForSelector('#login');
  await page.fill('#login [name=id]', id);
  await page.fill('#login [name=password]', pw);
  await page.click('#login button');
  await page.waitForSelector('.ad-side, .ad-alert-err');
}
async function logout(page: any) {
  await page.click('#logout');
  await page.waitForSelector('#login');
}
async function go(page: any, hash: string, sel = '.ad-head h1, .ad-empty') {
  await page.evaluate(() => document.querySelectorAll('#view > div').forEach((d) => d.setAttribute('data-old', '1'))).catch(() => {});
  await page.goto(`${admin}#/${hash}`);
  await page.waitForFunction((s: string) => {
    const v = document.querySelector('#view > div:not([data-old])');
    return !!v && !v.querySelector('.ad-loading') && !!v.querySelector(s);
  }, sel, { timeout: 15000 });
}
const nav = (page: any) => page.locator('.ad-side [data-nav]').evaluateAll((a: Element[]) => a.map((x) => (x as HTMLElement).dataset.nav));
const events = (page: any) => page.evaluate(() => DT.analytics.log.map((e: any) => e[0]));

// Đọc file .xlsx (ZIP lưu trữ, không nén) -> nội dung từng file XML
function unzip(buf: Buffer) {
  const out: Record<string, string> = {};
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const size = buf.readUInt32LE(p + 18); const n = buf.readUInt16LE(p + 26); const extra = buf.readUInt16LE(p + 28);
    const name = buf.toString('utf8', p + 30, p + 30 + n);
    out[name] = buf.toString('utf8', p + 30 + n + extra, p + 30 + n + extra + size);
    p += 30 + n + extra + size;
  }
  return out;
}
const cells = (xml: string) => [...xml.matchAll(/<row r="(\d+)">(.*?)<\/row>/g)].map((m) => [...m[2].matchAll(/<c r="([A-Z]+)\d+"[^>]*>(?:<v>([^<]*)<\/v>|<is><t[^>]*>([^<]*)<\/t><\/is>)<\/c>/g)].reduce((o: Record<string, string>, c) => { o[c[1]] = c[2] ?? c[3]; return o; }, {}));

try {
  section('Đo lường GA4 + Meta Pixel, hộp đồng ý cookie');
  const ctx = await T.newContext();
  const page = await T.newPage(ctx);
  await page.goto(`${fe}index.html?utm_source=facebook&utm_medium=cpc&utm_campaign=he-2026&fbclid=FB123`);
  await page.waitForSelector('.cookie-bar');
  check(await page.locator('script[src*="googletagmanager.com/gtag/js?id=G-TEST12345"]').count() === 1, 'tải GA4 theo mã trong Cài đặt');
  check(await page.evaluate(() => (window as any).dataLayer.some((a: any) => a[0] === 'consent' && a[1] === 'default' && a[2].analytics_storage === 'denied')), 'GA4 mặc định chưa được ghi cookie (Consent Mode)');
  check(await page.evaluate(() => typeof (window as any).fbq) === 'undefined', 'chưa đồng ý → chưa tải Meta Pixel');
  await page.click('.cookie-bar [data-consent="granted"]');
  check(await page.evaluate(() => typeof (window as any).fbq === 'function' && (window as any).fbq.queue.some((a: any) => a[0] === 'init' && a[1] === '1234567890')), 'đồng ý → tải Meta Pixel đúng ID');
  check(await page.evaluate(() => (window as any).dataLayer.some((a: any) => a[0] === 'consent' && a[1] === 'update' && a[2].ad_storage === 'granted')), 'đồng ý → GA4 được ghi cookie');
  await page.reload();
  await page.waitForFunction(() => DT.analytics.enabled());
  check(await page.locator('.cookie-bar').count() === 0, 'đã chọn → không hỏi lại');
  check(await page.evaluate(() => DT.analytics.label()) === 'facebook / cpc / he-2026', 'ghi nhận nguồn khách từ link quảng cáo');

  await page.goto(`${fe}san-pham.html?id=1003`);
  await page.waitForSelector('.pd-title h1');
  await page.click('.buy-btns [data-action="add-cart"]');
  await page.goto(`${fe}tim-kiem.html?q=inverter`);
  await page.waitForFunction(() => DT.analytics.log.some((e: any) => e[0] === 'search'));
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForSelector('#co-form');
  check(await page.locator('#maintenance').isChecked() === false, 'đơn có máy lạnh: hiện ô nhắc bảo trì, KHÔNG tick sẵn');
  await page.fill('[name=name]', 'Chị Đo Lường');
  await page.fill('[name=phone]', '0388222333');
  await page.fill('[name=email]', 'doluong@example.com');
  await page.check('[name=method][value=pickup]');
  await page.check('#maintenance');
  await page.click('#co-form button[type=submit]');
  await page.waitForURL(/dat-hang-thanh-cong/);
  await page.waitForSelector('.success-ic');
  const code = sql(`select code from public.orders where phone = '0388222333'`);
  const o = JSON.parse(sql(`select row_to_json(o) from public.orders o where code = '${code}'`));
  check(o.maintenance_optin === true, 'database: khách đồng ý nhắc bảo trì');
  check(o.attribution?.source === 'facebook' && o.attribution?.campaign === 'he-2026' && o.attribution?.fbclid === 'FB123', 'database: đơn hàng ghi nguồn quảng cáo (facebook / he-2026)');
  const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('dt_purchase_sent_v1') || '[]'));
  check(ev.includes(code), 'ghi nhận chuyển đổi Purchase cho đơn');
  const purchases = await page.evaluate(() => (window as any).dataLayer.filter((a: any) => a[0] === 'event' && a[1] === 'purchase').length);
  await page.reload();
  await page.waitForSelector('.success-ic');
  check(await page.evaluate(() => (window as any).dataLayer.filter((a: any) => a[0] === 'event' && a[1] === 'purchase').length) === 0 && purchases === 0, 'tải lại trang thành công không đếm trùng đơn');
  const dl = await page.evaluate((c: string) => ({ ga: (window as any).dataLayer, fb: (window as any).fbq?.queue }), code).catch(() => null);
  check(!!dl, 'trang thành công chạy đo lường không lỗi');

  // Sự kiện của cả hành trình (ghi trong DT.analytics.log của từng trang): kiểm tra lại trên 1 lượt mới
  await page.goto(`${fe}san-pham.html?id=1002`);
  await page.waitForSelector('.pd-title h1');
  check((await events(page)).includes('view_item'), 'xem sản phẩm → view_item / ViewContent');
  await page.click('.buy-btns [data-action="add-cart"]');
  check((await events(page)).includes('add_to_cart'), 'thêm giỏ → add_to_cart / AddToCart');
  check(await page.evaluate(() => (window as any).fbq.queue.some((a: any) => a[1] === 'AddToCart' && a[2].content_ids[0] === 'DT1002')), 'Pixel AddToCart có mã sản phẩm');
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForSelector('#co-form');
  check((await events(page)).includes('begin_checkout'), 'vào thanh toán → begin_checkout / InitiateCheckout');
  await page.fill('[name=name]', 'Anh Mua Hai');
  await page.fill('[name=phone]', '0388222444');
  await page.check('[name=method][value=pickup]');
  await page.click('#co-form button[type=submit]');
  await page.waitForURL(/dat-hang-thanh-cong/);
  const code2 = sql(`select code from public.orders where phone = '0388222444'`);
  check(sql(`select maintenance_optin from public.orders where code = '${code2}'`) === 'f', 'không tick → không nhắc bảo trì');
  check(JSON.parse(await page.evaluate(() => localStorage.getItem('dt_purchase_sent_v1') || '[]')).includes(code2), 'Purchase gửi trước khi rời trang thanh toán');
  await page.goto(`${fe}dich-vu.html?svc=ve-sinh&utm_source=nhac-bao-tri&utm_medium=email&utm_campaign=bao-tri-dinh-ky`);
  await page.waitForSelector('#book-form [name=service] option', { state: 'attached' });
  check(await page.waitForFunction(() => (document.querySelector('#book-form [name=service]') as HTMLSelectElement).value === 've-sinh', null, { timeout: 5000 }).then(() => true, () => false), 'link từ lời nhắc chọn sẵn dịch vụ vệ sinh');
  await page.fill('#book-form [name=name]', 'Chị Đo Lường');
  await page.fill('#book-form [name=phone]', '0388222333');
  await page.fill('#book-form [name=address]', '1 Lê Lợi');
  await page.click('#book-form button');
  await page.waitForSelector('.modal .cb-text, .toast');
  check(sql(`select data->>'src' from public.leads where phone = '0388222333'`) === 'nhac-bao-tri / email / bao-tri-dinh-ky', 'lead ghi nguồn: nhac-bao-tri / email');
  check((await events(page)).includes('generate_lead'), 'gửi form → generate_lead / Lead');
  await page.goto(`${fe}lien-he.html`);
  await page.waitForSelector('#site-footer a[href^="tel:"]');
  await page.locator('a[href^="tel:"]').first().evaluate((a: HTMLElement) => { a.addEventListener('click', (e) => e.preventDefault()); a.click(); });
  check((await events(page)).includes('contact'), 'bấm gọi điện → contact / Contact');

  section('Từ chối cookie: không tải Pixel; tắt hộp cookie trong cài đặt');
  const ctx2 = await T.newContext({ width: 390, height: 844 });
  const p2 = await T.newPage(ctx2);
  await p2.goto(`${fe}index.html`);
  await p2.waitForSelector('.cookie-bar');
  const bar = await p2.locator('.cookie-bar').boundingBox();
  check(!!bar && bar.x >= 0 && bar.x + bar.width <= 390, 'hộp cookie vừa màn hình điện thoại');
  await p2.click('.cookie-bar [data-consent="denied"]');
  check(await p2.evaluate(() => typeof (window as any).fbq) === 'undefined' && await p2.locator('.cookie-bar').count() === 0, 'từ chối → không tải Pixel, đóng hộp');
  sql(`update public.settings set value = value || '{"cookieConsent":false,"metaPixelId":""}' where key = 'store'`);
  const p3 = await T.newPage(await T.newContext());
  await p3.goto(`${fe}index.html`);
  await p3.waitForFunction(() => DT.analytics.enabled());
  check(await p3.locator('.cookie-bar').count() === 0 && await p3.evaluate(() => typeof (window as any).fbq) === 'undefined', 'tắt hộp cookie + bỏ Pixel ID → chỉ chạy GA4');
  sql(`update public.settings set value = value - 'ga4Id' - 'metaPixelId' - 'cookieConsent' where key = 'store'`);
  const p4 = await T.newPage(await T.newContext());
  await p4.goto(`${fe}index.html`);
  await p4.waitForSelector('#site-footer .footer, #site-footer footer, #site-footer *');
  check(await p4.locator('script[src*="googletagmanager"]').count() === 0 && await p4.locator('.cookie-bar').count() === 0, 'chưa nhập mã → không tải script đo lường, không hiện hộp cookie');

  section('Quản trị: cài đặt đo lường, phân quyền nhân viên');
  const a = await T.newPage(await T.newContext());
  await login(a, '0900000001', 'admin123');
  await go(a, 'settings', '#frm');
  await a.fill('#frm [name=ga4Id]', 'UA-12345');
  await a.click('#frm .ad-form-foot button');
  check(await toast(a, 'G-XXXXXXXXXX'), 'mã GA4 sai định dạng → báo lỗi');
  await a.fill('#frm [name=ga4Id]', 'g-abc12345');
  await a.fill('#frm [name=metaPixelId]', '9876 5432 10');
  await a.fill('#frm [name=maintenanceMonths]', '6');
  await a.selectOption('#frm [name=vatRate]', '8');
  await a.click('#frm .ad-form-foot button');
  check(await toast(a, 'Đã lưu cài đặt'), 'lưu cài đặt đo lường');
  const st = JSON.parse(sql(`select value from public.settings where key = 'store'`));
  check(st.ga4Id === 'G-ABC12345' && st.metaPixelId === '9876543210' && st.cookieConsent === true && st.vatRate === 8, 'database: GA4 viết hoa, Pixel bỏ khoảng trắng, thuế 8%');
  sql(`update public.settings set value = value || '{"vatRate":10}' where key = 'store'`);

  await go(a, 'customers', '.ad-table');
  check(await a.locator('.ad-help').count() === 1, 'có hướng dẫn phân quyền');
  const row = a.locator('.ad-table tr', { hasText: '0900000004' });
  await row.locator('[data-role]').selectOption('sales');
  await a.click('#cf-ok');
  check(await toast(a, 'Đã cập nhật vai trò'), 'đổi vai trò → Kinh doanh');
  check(sql(`select role from public.profiles where phone = '0900000004'`) === 'sales', 'database: role = sales');

  sql(`select public.submit_lead('b2b-quote', '{"name":"Anh Giao Minh","phone":"0922000011","company":"Cty Giao Minh"}')`);
  sql(`select public.submit_lead('b2b-quote', '{"name":"Chị Giao Lan","phone":"0922000012","company":"Cty Giao Lan"}')`);
  sql(`update public.leads set assigned_to = (select id from public.profiles where phone = '0900000005') where name = 'Chị Giao Lan'`);
  const leadId = sql(`select id from public.leads where name = 'Anh Giao Minh'`);
  await go(a, `leads/${leadId}`, '#lf');
  const opts = await a.locator('#lf [name=assigned_to] option').allTextContents();
  check(opts.some((t: string) => t.includes('Kinh Doanh Minh (kinh doanh)')), 'chọn được nhân viên kinh doanh phụ trách');
  await a.selectOption('#lf [name=assigned_to]', { label: 'Kinh Doanh Minh (kinh doanh)' });
  await a.click('#lf button');
  check(await toast(a, 'Đã cập nhật'), 'giao lead cho kinh doanh');
  await go(a, 'leads?owner=none', '.ad-table');
  check(await a.locator('.ad-table', { hasText: 'Cty Giao Minh' }).count() === 0, 'lọc "Chưa giao" không còn lead vừa giao');
  await go(a, 'reports', '#sources');
  check(await a.locator('#sources tr', { hasText: 'facebook / cpc' }).count() === 1, 'báo cáo: hiệu quả theo nguồn có facebook / cpc');
  const fb = a.locator('#sources tr', { hasText: 'facebook / cpc' });
  const fbRev = Number(sql(`select sum(total) from public.orders where attribution->>'source' = 'facebook' and status <> 'cancelled'`));
  await fb.locator('.ad-spend').fill(String(fbRev / 4));
  check((await fb.locator('[data-roas]').textContent())!.trim() === '4.0', `nhập chi phí → ROAS = doanh thu ÷ chi phí (4.0; 2 đơn từ facebook giữ nguồn 30 ngày)`);

  section('Nhân viên kinh doanh: chỉ thấy khách hàng của mình');
  await logout(a);
  await login(a, '0900000004', 'sales123');
  check(JSON.stringify(await nav(a)) === '["leads"]', 'menu chỉ có "Khách hàng của tôi"');
  await a.waitForSelector('.ad-table');
  check(await a.locator('.ad-table tbody tr').count() === 1 && await a.locator('.ad-table', { hasText: 'Cty Giao Minh' }).count() === 1, 'chỉ thấy lead được giao');
  check(await a.locator('#qs').count() === 0, 'không có ô tìm đơn hàng');
  await go(a, `leads/${leadId}`, '#lf');
  check(await a.locator('#lf [name=assigned_to]').count() === 0, 'không tự chuyển lead cho người khác');
  await a.click('.ad-pipeline [data-st="contacted"]');
  check(await toast(a, 'Đã cập nhật'), 'cập nhật trạng thái "Đã liên hệ"');
  check(sql(`select status from public.leads where id = ${leadId}`) === 'contacted', 'database: lead đã liên hệ');
  const other = sql(`select id from public.leads where name = 'Chị Giao Lan'`);
  await go(a, `leads/${other}`, '.ad-empty, #lf');
  check(await a.locator('#lf').count() === 0, 'mở link lead của người khác → không thấy');
  await go(a, 'orders', '.ad-empty');
  check((await a.locator('.ad-empty').textContent())!.includes('không có quyền'), 'mở #/orders → báo không có quyền');

  section('Kế toán: đơn hàng & thanh toán, xuất MISA');
  await logout(a);
  await login(a, '0900000006', 'ketoan123');
  check(JSON.stringify(await nav(a)) === '["orders","reports","misa"]', 'menu kế toán: Đơn hàng & thanh toán, Báo cáo, Xuất MISA');
  await a.waitForSelector('.ad-table');
  check((await a.locator('.ad-head h1').textContent())!.includes('thanh toán'), 'trang đầu: Đơn hàng & thanh toán');
  await go(a, `orders/${o.id}`, '#ops');
  check(await a.locator('[data-status]').count() === 0 && await a.locator('#ops [name=status]').count() === 0 && await a.locator('#ops [name=staff_note]').count() === 0, 'không đổi được trạng thái / ghi chú đơn');
  await a.selectOption('#ops [name=payment_status]', 'paid');
  await a.click('#ops button');
  check(await toast(a, 'Đã lưu'), 'xác nhận đã thu tiền');
  check(sql(`select payment_status || '|' || (paid_at is not null) from public.orders where id = ${o.id}`) === 'paid|true', 'database: đã thanh toán, có thời điểm');
  await go(a, 'leads', '.ad-empty');
  check((await a.locator('.ad-empty').textContent())!.includes('không có quyền'), 'không xem được khách hàng tiềm năng');
  await go(a, 'reports', '#sources');
  check(await a.locator('.kpi', { hasText: 'Khách hàng tiềm năng' }).count() === 0, 'báo cáo kế toán: ẩn số liệu lead');

  // Đơn hoàn thành để xuất MISA: có lắp đặt, giảm giá, xuất VAT
  sql(`update public.orders set status = 'done' where id = ${o.id}`);
  const vat = JSON.parse(sql(`select public.place_order('[{"id":1020,"qty":2,"install":true},{"id":1014,"qty":1}]', '{"name":"Anh FDI","phone":"0911555666","email":"fdi@example.com"}', '{"method":"delivery","province":"Bình Dương","district":"Thuận An","address":"KCN VSIP"}', 'bank', '{"company":"Cty TNHH FDI Việt Nam","taxCode":"3701234567","address":"KCN VSIP, Bình Dương","email":"ketoan@fdi.vn"}', null, 'GIAM300K')`));
  sql(`update public.orders set status = 'done', payment_status = 'paid' where code = '${vat.code}'`);
  const expect = Number(sql(`select sum(total) from public.orders where status = 'done'`));
  await go(a, 'misa', '#pv .kpis');
  check((await a.locator('#pv .kpi', { hasText: 'Tổng thanh toán' }).textContent())!.includes('Khớp tổng tiền đơn hàng'), 'xem trước: tổng chứng từ khớp tổng tiền đơn');
  const [file] = await Promise.all([a.waitForEvent('download'), a.click('#dl')]);
  check(/^MISA-ban-hang-\d{4}-\d{2}-\d{2}-den-\d{4}-\d{2}-\d{2}\.xlsx$/.test(file.suggestedFilename()), `tải file ${file.suggestedFilename()}`);
  const x = unzip(fs.readFileSync(await file.path()));
  check(['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet4.xml'].every((k) => k in x), 'file Excel đủ cấu trúc (4 sheet)');
  check(/Chung tu ban hang.*Khach hang.*Vat tu hang hoa.*Huong dan/.test(x['xl/workbook.xml']), 'sheet: Chứng từ bán hàng, Khách hàng, Vật tư hàng hóa, Hướng dẫn');
  const rows = cells(x['xl/worksheets/sheet1.xml']);
  const H = rows[0];
  const colOf = (label: string) => Object.keys(H).find((k) => H[k] === label)!;
  const [cDoc, cAmt, cCk, cTax, cDebit, cRev, cCode, cCust, cMst] = ['Số chứng từ (*)', 'Thành tiền', 'Tiền chiết khấu', 'Tiền thuế GTGT', 'TK Nợ/TK tiền (*)', 'TK Doanh thu/Có (*)', 'Mã hàng (*)', 'Mã khách hàng', 'Mã số thuế'].map(colOf);
  const body = rows.slice(1);
  const sumAll = body.reduce((s, r) => s + Number(r[cAmt] || 0) - Number(r[cCk] || 0) + Number(r[cTax] || 0), 0);
  check(sumAll === expect, `Excel: thành tiền − chiết khấu + thuế = tổng đơn (${sumAll.toLocaleString('vi-VN')}₫)`);
  const vr = body.filter((r) => r[cDoc] === vat.code);
  check(vr.length === 3 && vr.some((r) => r[cCode] === 'DV-LAPDAT' && r[cRev] === '5113'), 'đơn VAT: 2 sản phẩm + 1 dòng phí lắp đặt (TK 5113)');
  check(vr.every((r) => r[cCust] === 'KH3701234567' && r[cMst] === '3701234567' && r[cDebit] === '1121'), 'khách công ty: mã KH theo MST, đã chuyển khoản → TK 1121');
  check(vr.reduce((s, r) => s + Number(r[cCk] || 0), 0) > 0, 'giảm giá phân bổ thành tiền chiết khấu');
  const unitNet = Number(vr.find((r) => r[cCode] === 'DT1020')![colOf('Đơn giá')]);
  const price = Number(sql(`select price from public.products where id = 1020`));
  check(unitNet === Math.round(price / 1.1), 'đơn giá = giá website ÷ 1,1 (tách VAT 10%)');
  check(/t="inlineStr"><is><t xml:space="preserve">Cty TNHH FDI Việt Nam/.test(x['xl/worksheets/sheet2.xml']), 'sheet Khách hàng có tên công ty tiếng Việt');
  check(/<c r="A2" s="2"><v>\d{5}<\/v><\/c>/.test(x['xl/worksheets/sheet1.xml']), 'ngày chứng từ là ngày Excel (định dạng dd/mm/yyyy)');

  section('Lịch bảo trì định kỳ');
  await logout(a);
  await login(a, '0900000002', 'staff123');
  check(sql(`select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = ${o.id}`) === '4', 'đơn máy lạnh hoàn thành + khách đồng ý → 4 lần nhắc');
  await go(a, 'maintenance', '.kpis');
  check(await a.locator('.ad-table tbody tr', { hasText: 'Chị Đo Lường' }).count() === 4, 'trang Lịch bảo trì liệt kê 4 lần nhắc');
  await a.locator('.ad-table tbody tr', { hasText: 'Chị Đo Lường' }).first().locator('[data-skip]').click();
  check(await toast(a, 'Đã bỏ lần nhắc'), 'bỏ 1 lần nhắc');
  await go(a, 'maintenance?tab=cancelled', '.ad-table');
  check(await a.locator('.ad-table tbody tr', { hasText: 'nhân viên bỏ' }).count() === 1, 'tab Đã hủy: ghi lý do "nhân viên bỏ"');
  await a.click('[data-unskip]');
  check(await toast(a, 'Đã bật lại'), 'bật lại lần nhắc');
  await go(a, 'maintenance', '.ad-table');
  await a.locator('.ad-table tbody tr', { hasText: 'Chị Đo Lường' }).first().locator('[data-now]').click();
  check(await toast(a, 'hàng đợi'), 'gửi ngay');
  const sent = await fetch(`${sb.url}/functions/v1/notify`, { method: 'POST', headers: { Authorization: `Bearer ${sb.serviceKey}` } }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  check(sent.processed >= 1, `notify xử lý lời nhắc đến hạn (${JSON.stringify(sent)})`);
  await go(a, 'maintenance?tab=reached', '.ad-table');
  check(await a.locator('.ad-table tbody tr', { hasText: 'Chị Đo Lường' }).count() >= 1, 'tab "Đã đến hạn" có lời nhắc vừa xử lý');
  await go(a, `orders/${o.id}`, '#ops');
  check((await a.locator('#ops .ad-check').textContent())!.includes('Lịch nhắc: 4 lần'), 'chi tiết đơn: tóm tắt lịch nhắc');
  await a.uncheck('#ops [name=maintenance_optin]');
  await a.click('#ops button');
  await toast(a, 'Đã lưu');
  check(sql(`select count(*) from public.notifications where event = 'maintenance_reminder' and order_id = ${o.id} and status = 'pending'`) === '0', 'bỏ tick nhắc trong đơn → hủy mọi lần nhắc');

  section('Ảnh sản phẩm: tải nhiều ảnh, tự nén, sắp xếp');
  await go(a, 'products/1001', '#frm');
  check(await a.locator('[data-gal="images"] .ad-gal-add').count() === 1, 'ô tải ảnh thay cho dán link');
  await a.locator('[data-gal="images"] input[type=file]').setInputFiles([img('a.png'), img('b.png'), img('c.png')]);
  await a.waitForFunction(() => document.querySelectorAll('[data-gal="images"] .ad-gal-item').length === 3, null, { timeout: 15000 });
  check(await toast(a, 'Đã tải lên 3 ảnh'), 'nhân viên tải 3 ảnh cùng lúc');
  const srcs = await a.locator('[data-gal="images"] .ad-gal-item img').evaluateAll((im: HTMLImageElement[]) => im.map((i) => i.getAttribute('src')));
  check(srcs.every((s: string) => s.startsWith(`${sb.url}/storage/v1/object/public/media/products/`) && /\.(webp|jpg)$/.test(s)), 'ảnh lưu ở kho ảnh, thư mục products/, đã nén (webp/jpg)');
  await a.locator('[data-gal="images"] .ad-gal-item').nth(2).locator('[data-gal-move="-1"]').click();
  await a.locator('[data-gal="images"] .ad-gal-item').nth(0).locator('[data-gal-del]').click();
  await a.fill('[data-gal-url]', 'ftp://sai');
  await a.click('[data-gal-addurl]');
  check(await toast(a, 'http'), 'link ảnh sai → báo lỗi');
  await a.fill('[data-gal-url]', 'https://cdn.example.com/may-lanh.jpg');
  await a.press('[data-gal-url]', 'Enter');
  check(await a.locator('[data-gal="images"] .ad-gal-item').count() === 3 && await a.locator('.ad-gal-main').count() === 1, 'xóa / đổi thứ tự / thêm link: còn 3 ảnh, 1 ảnh chính');
  await a.click('#frm .ad-form-foot .btn-primary');
  check(await toast(a, 'Đã lưu'), 'lưu sản phẩm');
  const imgs = JSON.parse(sql(`select to_json(images) from public.products where id = 1001`));
  check(imgs.length === 3 && imgs[0] === srcs[2] && imgs[1] === srcs[1] && imgs[2] === 'https://cdn.example.com/may-lanh.jpg', 'database: đúng thứ tự ảnh đã sắp xếp');
  const shop = await T.newPage(await T.newContext());
  await shop.goto(`${fe}san-pham.html?id=1001`);
  await shop.waitForSelector('#g-main img');
  check(await shop.locator('#g-main img').getAttribute('src') === imgs[0] && await shop.locator('.gallery-thumbs button').count() === 3, 'website hiện ảnh chính + 3 ảnh nhỏ');
  check(await shop.locator('#g-main img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0), 'ảnh tải được từ kho ảnh');
} catch (e) {
  console.error(e);
  check(false, `lỗi khi chạy kịch bản: ${(e as Error).message.split('\n')[0]}`);
}

check(T.errors.length === 0, `không có lỗi JavaScript${T.errors.length ? `: ${[...new Set(T.errors)].slice(0, 6).join(' | ')}` : ''}`);
await T.close();
console.log(failed() ? `\n${failed()} kiểm tra THẤT BẠI` : '\nTất cả kiểm tra đạt');
process.exit(failed() ? 1 : 0);
