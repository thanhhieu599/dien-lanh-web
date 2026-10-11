// Kiểm thử trang quản trị ở chế độ đã kết nối Supabase: đăng nhập theo vai trò, mọi mục quản lý, phân quyền (RLS thật).
// Chạy: PGHOST=localhost PGUSER=postgres PGPASSWORD=... node --experimental-strip-types tests/browser/admin.test.ts
import fs from 'node:fs';
import { check, DOMAIN, failed, section, setup, toast } from '../support/harness.ts';

const T = await setup('dt_admin', { accessTtl: 3600 });
const { sql, sb, admin, fe } = T;
await sb.createUser('0900000001', 'admin123', 'Quản Trị Viên', 'admin', DOMAIN);
await sb.createUser('0900000002', 'staff123', 'Nhân Viên Bán Hàng', 'staff', DOMAIN);
await sb.createUser('0900000003', 'khach123', 'Khách Thường', 'customer', DOMAIN);

// Dữ liệu: vài đơn, lead, đánh giá
const order = (phone: string, name: string, pay = 'cod') => JSON.parse(sql(`select public.place_order('[{"id":1003,"qty":1,"install":true},{"id":1010,"qty":2}]',
  '{"name":"${name}","phone":"${phone}","email":"${phone}@example.com"}', '{"method":"delivery","province":"TP. Hồ Chí Minh","district":"Q7","address":"1 NTT"}', '${pay}')`)).code;
const o1 = order('0911000001', 'Nguyễn Văn Một');
const o2 = order('0911000002', 'Trần Thị Hai', 'bank');
sql(`select public.submit_lead('b2b-quote', '{"name":"Anh Hùng","phone":"0922000001","company":"Cty Điện tử FDI","items":"40 bộ âm trần","budget":"Trên 1 tỷ"}')`);
sql(`insert into public.reviews (product_id, name, rating, text) values (1003, 'Khách chờ duyệt', 5, 'Rất tốt')`);

async function login(page: any, id: string, pw: string) {
  await page.goto(admin);
  await page.waitForSelector('#login');
  await page.fill('#login [name=id]', id);
  await page.fill('#login [name=password]', pw);
  await page.click('#login button');
}
const go = async (page: any, hash: string, sel = '.ad-head h1') => { await page.goto(`${admin}#/${hash}`); await page.waitForSelector(sel); await page.waitForTimeout(150); };

try {
  section('Đăng nhập & phân quyền');
  const ctx = await T.newContext();
  const page = await T.newPage(ctx);
  await login(page, '0900000003', 'khach123');
  await page.waitForSelector('.ad-alert-err');
  check((await page.locator('.ad-alert-err').textContent())!.includes('không có quyền'), 'tài khoản khách bị từ chối');
  await login(page, '0900000002', 'sai');
  await page.waitForSelector('.ad-alert-err');
  check((await page.locator('.ad-alert-err').textContent())!.includes('Sai số điện thoại'), 'sai mật khẩu báo lỗi');
  await login(page, '0900000002', 'staff123');
  await page.waitForSelector('.ad-side');
  check(await page.locator('[data-nav="settings"]').count() === 0 && await page.locator('[data-nav="policies"]').count() === 0, 'nhân viên: ẩn Cài đặt & Chính sách');
  await page.waitForSelector('[data-badge="orders"]:not([hidden])');
  check((await page.locator('[data-badge="orders"]').textContent()) === '2', 'bộ đếm đơn chờ xác nhận = 2');
  check(await page.locator('.kpi', { hasText: 'Đơn chờ xác nhận' }).locator('b').textContent() === '2', 'tổng quan: 2 đơn chờ');

  section('Đơn hàng (nhân viên)');
  await go(page, 'orders', '.ad-table');
  check(await page.locator('.ad-table tbody tr').count() === 2, 'danh sách 2 đơn');
  await go(page, 'orders?q=' + encodeURIComponent('Trần Thị'), '.ad-table');
  check(await page.locator('.ad-table tbody tr').count() === 1 && (await page.locator('.ad-table').textContent())!.includes(o2), 'tìm theo tên khách');
  await go(page, 'orders?q=0911000001', '.ad-table');
  check((await page.locator('.ad-table').textContent())!.includes(o1), 'tìm theo SĐT');
  // Đơn đặt lúc 1 giờ sáng (giờ VN) hôm nay phải nằm trong bộ lọc "hôm nay"
  sql(`update public.orders set created_at = date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' + interval '1 hour' where code = '${o2}'`);
  const today = new Date(); const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await go(page, `orders?from=${ymd}&to=${ymd}`, '#list .ad-table, #list .ad-empty');
  check(await page.locator('.ad-table tbody tr').count() === 2, 'lọc theo ngày hôm nay thấy đủ đơn (múi giờ VN)');
  await go(page, 'orders?payment=bank', '.ad-table');
  check(await page.locator('.ad-table tbody tr').count() === 1, 'lọc phương thức chuyển khoản');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  check(csv.includes('Mã đơn') && csv.includes(o2), 'xuất CSV đơn hàng');

  const id1 = sql(`select id from public.orders where code = '${o1}'`);
  await go(page, `orders/${id1}`, '#ops');
  check((await page.locator('.ad-card', { hasText: 'Sản phẩm' }).first().textContent())!.includes('kèm lắp đặt'), 'chi tiết đơn: sản phẩm, lắp đặt');
  await page.click('[data-status="confirmed"]');
  check(await toast(page, 'Đã chuyển đơn sang'), 'chuyển sang Đã xác nhận');
  await page.waitForSelector('[data-status="shipping"]');
  check(sql(`select status from public.orders where id = ${id1}`) === 'confirmed', 'database: confirmed');
  await page.selectOption('#ops [name=payment_status]', 'paid');
  await page.fill('#ops [name=staff_note]', 'Khách đã chuyển khoản, giao chiều nay');
  await page.click('#ops button');
  check(await toast(page, 'Đã lưu'), 'lưu thanh toán + ghi chú nội bộ');
  check(sql(`select payment_status || '|' || staff_note || '|' || (paid_at is not null) from public.orders where id = ${id1}`) === 'paid|Khách đã chuyển khoản, giao chiều nay|true', 'database: đã thanh toán (có thời điểm), ghi chú');
  await page.waitForSelector('.ad-timeline li');
  check(await page.locator('.ad-timeline li').count() === 2, 'lịch sử trạng thái 2 mốc');
  const stock = Number(sql(`select stock from public.products where id = 1010`));
  const id2 = sql(`select id from public.orders where code = '${o2}'`);
  await go(page, `orders/${id2}`, '#ops');
  await page.click('[data-status="cancelled"]');
  await page.click('#cf-ok');
  check(await toast(page, 'Đã chuyển đơn sang'), 'hủy đơn');
  await page.waitForTimeout(300);
  check(Number(sql(`select stock from public.products where id = 1010`)) === stock + 2, 'hủy đơn → hoàn tồn kho');

  section('Khách hàng tiềm năng (CRM)');
  await go(page, 'leads', '.ad-table');
  await page.locator('.ad-table tbody tr').first().click();
  await page.waitForSelector('#lf');
  check((await page.locator('.ad-dl').first().textContent())!.includes('40 bộ âm trần'), 'chi tiết lead: nội dung yêu cầu');
  check(await page.locator('#lf [name=assigned_to] option').count() === 3, 'danh sách người phụ trách (admin + nhân viên)');
  await page.click('[data-st="contacted"]');
  check(await toast(page, 'Đã cập nhật'), 'chuyển bước "Đã liên hệ"');
  await page.waitForSelector('#lf');
  await page.selectOption('#lf [name=assigned_to]', { label: 'Nhân Viên Bán Hàng' });
  await page.fill('#lf [name=staff_note]', 'Hẹn khảo sát thứ 5');
  await page.click('#lf button');
  check(await toast(page, 'Đã cập nhật'), 'giao phụ trách + ghi chú');
  check(sql(`select status || '|' || staff_note || '|' || (assigned_to is not null) from public.leads limit 1`) === 'contacted|Hẹn khảo sát thứ 5|true', 'database: lead đã cập nhật');

  section('Sản phẩm');
  await go(page, 'products/new', '#frm');
  await page.fill('#frm [name=name]', 'Máy lạnh Test Admin 1.5HP');
  await page.fill('#frm [name=sku]', 'TEST-ADM-01');
  await page.selectOption('#frm [name=brand]', 'daikin');
  await page.selectOption('#frm [name=cat]', 'may-lanh');
  await page.fill('#frm [name=price]', '12345678');
  await page.fill('#frm [name=stock]', '7');
  await page.click('#save');
  await page.waitForURL(/#\/products\/\d+/);
  check(await toast(page, 'Đã lưu'), 'thêm sản phẩm mới (bỏ trống các trường không bắt buộc)');
  const pid = Number(page.url().split('/').pop());
  check(sql(`select slug || '|' || sold || '|' || price from public.products where id = ${pid}`) === 'may-lanh-test-admin-1-5hp|0|12345678', 'database: slug tự tạo, đã bán = 0, giá lẻ đúng (không bị làm tròn 1.000)');
  await page.fill('#frm [name=old_price]', '1000');
  await page.click('#save');
  await page.waitForSelector('[data-field="old_price"].invalid');
  check(true, 'kiểm tra giá gốc < giá bán');
  await page.fill('#frm [name=old_price]', '');
  await page.selectOption('#frm [name=sub]', 'treo-tuong');
  await page.fill('#frm [name=sold]', '');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'sửa sản phẩm (xóa trống "Đã bán")');
  check(sql(`select sub || '|' || sold from public.products where id = ${pid}`) === 'treo-tuong|0', 'database: loại đã lưu');
  await page.click('a:has-text("Nhân bản")');
  await page.waitForSelector('#frm');
  await page.fill('#frm [name=sku]', 'TEST-ADM-02');
  await page.click('#save');
  await page.waitForURL((u: URL) => /#\/products\/\d+$/.test(u.href) && !u.href.endsWith(`/${pid}`));
  check(Number(sql(`select count(*) from public.products where sku like 'TEST-ADM-%'`)) === 2, 'nhân bản sản phẩm');
  await page.click('a:has-text("Nhân bản")');
  await page.waitForSelector('#frm');
  await page.fill('#frm [name=sku]', 'TEST-ADM-03');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'nhân bản lần 2 (slug không bị trùng)');
  sql(`update public.products set stock = 2 where sku = 'TEST-ADM-02'`);
  await go(page, 'products?stock=5', '.ad-table');
  check((await page.locator('.ad-table').textContent())!.includes('TEST-ADM-02'), 'lọc sắp hết hàng');
  await go(page, `products/${pid}`, '#frm');
  await page.click('#del');
  await page.click('#cf-ok');
  await page.waitForURL(/#\/products$/);
  check(sql(`select count(*) from public.products where id = ${pid}`) === '0', 'xóa sản phẩm');

  section('Danh mục, thương hiệu, mã giảm giá, banner, bài viết, cửa hàng, dịch vụ');
  await go(page, 'brands/new', '#frm');
  await page.fill('#frm [name=id]', 'hang-moi-test');
  await page.fill('#frm [name=name]', 'Hãng Mới Test');
  await page.fill('#frm [name=sort]', '');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm thương hiệu (bỏ trống thứ tự)');
  await go(page, 'categories/new', '#frm');
  await page.fill('#frm [name=id]', 'dieu-hoa-trung-tam');
  await page.fill('#frm [name=name]', 'Điều hòa trung tâm');
  await page.fill('#frm [name=short]', 'ĐH trung tâm');
  await page.selectOption('#frm [name=icon]', '');
  await page.fill('#frm [name=sort]', '');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm danh mục (bỏ trống biểu tượng, thứ tự)');
  await go(page, 'coupons/new', '#frm');
  await page.fill('#frm [name=code]', 'fdi2026');
  await page.fill('#frm [name=value]', '5');
  await page.fill('#frm [name=min]', '0');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm mã giảm giá (gõ chữ thường tự đổi IN HOA)');
  check(sql(`select count(*) from public.coupons where code = 'FDI2026'`) === '1', 'database: FDI2026');
  await go(page, 'banners/new', '#frm');
  await page.fill('#frm [name=title]', 'Banner test');
  await page.fill('#frm [name=sort]', '');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm banner');
  await go(page, 'posts/new', '#frm');
  await page.fill('#frm [name=title]', 'Cách bảo trì điều hòa nhà xưởng');
  await page.fill('#frm [name=date]', '');
  await page.fill('#frm [name=content]', '<p>Nội dung</p>');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm bài viết (bỏ trống ngày)');
  check(sql(`select slug from public.posts where title = 'Cách bảo trì điều hòa nhà xưởng'`) === 'cach-bao-tri-dieu-hoa-nha-xuong', 'database: slug bài viết');
  await go(page, 'stores/new', '#frm');
  await page.fill('#frm [name=name]', 'D&T Long An');
  await page.fill('#frm [name=city]', 'Long An');
  await page.fill('#frm [name=address]', '1 Hùng Vương');
  await page.fill('#frm [name=sort]', '');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm cửa hàng');
  await go(page, 'services/new', '#frm');
  await page.fill('#frm [name=id]', 'bao-duong-chiller');
  await page.fill('#frm [name=name]', 'Bảo dưỡng chiller');
  await page.fill('#frm [name=price]', '');
  await page.fill('#frm [name=sort]', '');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'thêm dịch vụ (giá trống = báo giá)');
  await go(page, 'categories/may-lanh', '#frm');
  await page.click('#del');
  await page.click('#cf-ok');
  check(await toast(page, 'đang được sử dụng'), 'không xóa được danh mục đang có sản phẩm (báo dễ hiểu)');

  section('Đánh giá');
  await go(page, 'reviews', '.ad-table');
  await page.click('[data-rv="approved"]');
  check(await toast(page, 'Đã duyệt'), 'duyệt đánh giá');
  check(sql(`select status from public.reviews where name = 'Khách chờ duyệt'`) === 'approved', 'database: approved');

  section('Khách hàng & quyền (nhân viên không đổi được vai trò)');
  await go(page, 'customers', '.ad-table');
  check(await page.locator('[data-role]').count() === 0, 'nhân viên không thấy ô đổi vai trò');
  await go(page, 'settings', '.ad-head h1');
  check((await page.locator('#view').textContent())!.includes('Chỉ quản trị viên'), 'nhân viên mở Cài đặt: chỉ xem');
  await go(page, 'policies', '.ad-empty, .ad-head h1');
  check((await page.locator('#view').textContent())!.includes('không có quyền'), 'nhân viên không vào được Chính sách');

  section('Báo cáo & nhật ký thông báo');
  await go(page, 'reports', '#ch-rev');
  check((await page.locator('.kpi').first().textContent())!.includes('Doanh thu'), 'báo cáo hiển thị');
  for (const p of ['month', 'lastmonth', '90d', 'year']) { await go(page, `reports?p=${p}`, '#ch-rev'); }
  check(true, 'mọi kỳ báo cáo đều mở được');
  sql(`update public.notifications set status = 'failed', attempts = 6, results = '{"zalo_staff":{"ok":false,"error":"token sai"}}' where id = (select min(id) from public.notifications)`);
  await go(page, 'notifications', '.ad-table');
  check(await page.locator('.ad-table tbody tr').count() >= 3, 'nhật ký thông báo');
  await page.click('[data-retry]');
  check(await toast(page, 'hàng đợi'), 'gửi lại thông báo lỗi');
  check(sql(`select status from public.notifications where id = (select min(id) from public.notifications)`) === 'pending', 'database: chờ gửi lại');
  await page.click('#logout');
  await page.waitForSelector('#login');

  section('Quản trị viên');
  await login(page, '0900000001', 'admin123');
  await page.waitForSelector('[data-nav="settings"]');
  await go(page, 'customers', '.ad-table');
  const staffRow = page.locator('tr', { hasText: 'Khách Thường' });
  await staffRow.locator('[data-role]').selectOption('staff');
  await page.click('#cf-ok');
  check(await toast(page, 'Đã cập nhật vai trò'), 'admin cấp quyền nhân viên');
  check(sql(`select role from public.profiles where phone = '0900000003'`) === 'staff', 'database: role = staff');
  await go(page, 'settings', '#frm');
  await page.fill('#frm [name=hotlineB2B]', '');
  await page.fill('#frm [name=bankAccount]', '1903 5555 6666');
  await page.fill('#frm [name=shippingFee]', '35000');
  await page.click('#frm button');
  check(await toast(page, 'Đã lưu cài đặt'), 'lưu cài đặt cửa hàng');
  check(sql(`select (value->>'shippingFee') || '|' || (value->>'bankAccount') from public.settings where key = 'store'`) === '35000|1903 5555 6666', 'database: phí ship & STK mới');
  await go(page, 'policies/doi-tra', '#frm');
  await page.click('#save');
  check(await toast(page, 'Đã lưu'), 'admin sửa chính sách');

  section('Website nhận cấu hình mới');
  const shop = await T.newPage();
  await shop.goto(`${fe}index.html`);
  const cheap = Number(sql(`select id from public.products where active and price < 1000000 order by price limit 1`));
  await shop.evaluate((id: number) => { DT.store.addToCart(id, 1); }, cheap);
  await shop.goto(`${fe}gio-hang.html`);
  await shop.waitForSelector('.summary');
  check((await shop.locator('.summary').textContent())!.includes('35.000₫'), 'phí ship mới áp dụng ngay trên website');
  check(await shop.locator('footer').textContent().then((t: string | null) => !t!.includes('Doanh nghiệp:')), 'xóa hotline doanh nghiệp → ẩn khỏi footer (không lỗi)');

  section('Dữ liệu lớn (>1000 đơn): báo cáo không bị cắt');
  sql(`insert into public.orders (code, phone, customer, shipping, payment, subtotal, total, created_at)
       select 'DTBULK' || lpad(g::text, 5, '0'), '0900111222', '{"name":"Khách sỉ"}', '{"method":"pickup"}', 'cod', 1000000, 1000000, now() - (g % 20) * interval '1 day'
       from generate_series(1, 1200) g`);
  const rev30 = Number(sql(`select sum(total) from public.orders where status <> 'cancelled' and created_at >= date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' - interval '29 days'`));
  await go(page, 'dashboard', '#ch-rev');
  const kpi = Number((await page.locator('.kpi', { hasText: 'Doanh thu 30 ngày' }).locator('b').textContent())!.replace(/\D/g, ''));
  check(kpi === rev30, `tổng quan: doanh thu 30 ngày đủ ${(rev30 / 1e6).toLocaleString('vi-VN')} triệu (${kpi === rev30 ? 'khớp' : `web ${kpi}`})`);
  await go(page, 'reports?p=month', '#ch-rev');
  const repRev = Number((await page.locator('.kpi', { hasText: 'Doanh thu' }).first().locator('b').textContent())!.replace(/\D/g, ''));
  const monthRev = Number(sql(`select sum(total) from public.orders where status <> 'cancelled' and created_at >= date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'`));
  check(repRev === monthRev, 'báo cáo tháng: doanh thu khớp database');
  await go(page, 'orders', '.ad-table');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  const lines = fs.readFileSync(await dl2.path(), 'utf8').trim().split('\n').length - 1;
  check(lines === Number(sql(`select count(*) from public.orders`)), `xuất CSV đủ ${lines} đơn`);

  section('Phiên đăng nhập hết hạn');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dt_admin_auth_v1')!); s.expires_at = 1; s.refresh_token = 'het-han'; localStorage.setItem('dt_admin_auth_v1', JSON.stringify(s)); });
  await page.goto(`${admin}#/orders`);
  await page.reload();
  await page.waitForSelector('#login, .ad-table');
  check(await page.locator('#login').count() === 1, 'hết phiên → quay về màn hình đăng nhập (không hiện dữ liệu trống)');
} catch (e) {
  console.error(e);
  check(false, `lỗi khi chạy kịch bản: ${(e as Error).message.split('\n')[0]}`);
}

check(T.errors.length === 0, `không có lỗi JavaScript${T.errors.length ? `: ${[...new Set(T.errors)].slice(0, 6).join(' | ')}` : ''}`);
await T.close();
console.log(failed() ? `\n${failed()} kiểm tra THẤT BẠI` : '\nTất cả kiểm tra đạt');
process.exit(failed() ? 1 : 0);
