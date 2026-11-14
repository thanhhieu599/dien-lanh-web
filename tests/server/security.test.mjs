// Test bảo mật trên PHP + MySQL thật (bản chạy thử, không phải hosting thật).
// Chạy: API_BASE=http://127.0.0.1:8080/server/api.php SITE_BASE=http://127.0.0.1:8080/ node tests/server/security.test.mjs
// Mỗi nhóm là một kiểu tấn công thường gặp vào website bán hàng; kết quả đúng là bị chặn và máy chủ không sập.
import assert from 'node:assert/strict';
const api = process.env.API_BASE || 'http://127.0.0.1:8080/server/api.php';
const site = process.env.SITE_BASE || new URL('../', api).href;
let checks = 0;
const ok = (cond, label) => { assert.ok(cond, label); checks++; console.log('  ✓ ' + label); };
function client() {
  let cookie = '';
  const fn = async (route, { method = 'GET', body, raw, headers = {}, csrf = true } = {}) => {
    const [name, query = ''] = route.split('?');
    const url = new URL(api); url.search = query; url.searchParams.set('route', name);
    const h = { 'Content-Type': 'application/json', ...headers };
    if (csrf) h['X-DT-Request'] = '1';
    if (cookie) h.Cookie = cookie;
    const res = await fetch(url, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: 'manual' });
    const set = res.headers.getSetCookie().filter((c) => /^dt_(session|admin)=/.test(c)).pop();
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch { /* không phải JSON */ }
    return { status: res.status, data, text, headers: res.headers, setCookie: set };
  };
  fn.cookie = () => cookie; fn.setCookie = (c) => { cookie = c; };
  return fn;
}
const guest = client();
const PRIVATE = ['profiles', 'orders', 'order_items', 'order_status_history', 'payments', 'leads', 'crm_customers', 'crm_customer_summary', 'crm_customer_products', 'notifications', 'cart_reminders', 'maintenance_contracts', 'maintenance_visits', 'suppliers', 'purchase_orders', 'stock_adjustments', 'stock_exports', 'stock_moves'];
const WRITABLE = ['products', 'categories', 'brands', 'coupons', 'posts', 'banners', 'stores', 'services', 'policies', 'settings', 'projects', 'faqs', ...PRIVATE];

console.log('--- S1. Dữ liệu nội bộ không lộ ra ngoài');
for (const t of PRIVATE) {
  const r = await guest(`data/${t}?select=*`);
  ok(r.status === 401 || (r.status === 200 && Array.isArray(r.data) && r.data.length === 0), `S1 Người lạ không đọc được bảng ${t}`);
}
const counters = await guest('data/settings?key=eq.counters');
ok(counters.status === 200 && counters.data.length === 0, 'S1 Cài đặt nội bộ (bộ đếm chứng từ) không lộ');
const pub = await guest('data/settings?select=*');
ok(pub.data.every((s) => ['store', 'vision', 'trust', 'home', 'catalog'].includes(s.key)), 'S1 Chỉ cài đặt công khai được đọc');
const reviews = await guest('data/reviews?select=*');
ok(reviews.status === 200 && reviews.data.every((r) => r.phone === undefined), 'S1 Số điện thoại người đánh giá không lộ');

console.log('--- S2. Người lạ / khách hàng không ghi được dữ liệu');
for (const t of WRITABLE) {
  const a = await guest(`data/${t}`, { method: 'POST', body: { id: 'hack', name: 'hack', price: 1 } });
  const b = await guest(`data/${t}?id=eq.1001`, { method: 'PATCH', body: { price: 1, role: 'admin' } });
  const c = await guest(`data/${t}?id=eq.1001`, { method: 'DELETE' });
  ok([a, b, c].every((r) => [400, 401, 403, 404].includes(r.status)), `S2 Người lạ không thêm/sửa/xóa được ${t}`);
}
const customer = client();
const phone = `09${String(Date.now()).slice(-8)}`;
const signup = await customer('auth/signup', { method: 'POST', body: { phone, password: 'Khach!2026xx', data: { phone, name: 'Khách bảo mật' } } });
ok(signup.status === 200, 'S2 Tạo tài khoản khách để thử');
const me = signup.data.user.id;
for (const t of ['products', 'orders', 'settings', 'coupons', 'suppliers', 'purchase_orders', 'stock_moves']) {
  const a = await customer(`data/${t}`, { method: 'POST', body: { id: 'hack', name: 'hack' } });
  const b = await customer(`data/${t}?id=eq.1001`, { method: 'PATCH', body: { price: 1 } });
  ok([a, b].every((r) => [400, 403, 404].includes(r.status)), `S2 Khách hàng không sửa được ${t}`);
}
ok((await customer(`data/profiles?id=eq.${me}`, { method: 'PATCH', body: { role: 'admin' } })).data?.[0]?.role === 'customer', 'S2 Khách không tự nâng quyền thành quản trị');
for (const [fn, args] of [['admin_users', { p_op: 'list' }], ['admin_create_order', { p_items: [{ product_id: 1001, qty: 1, price: 1 }] }], ['inventory', { p_op: 'purchase_save' }], ['issue_invoice', { p_id: 'x' }], ['save_brand', { p_brand: { name: 'x' } }], ['maintenance_skip', { p_id: 'x' }]]) {
  ok([401, 403].includes((await guest(`rpc/${fn}`, { method: 'POST', body: args })).status) && [401, 403].includes((await customer(`rpc/${fn}`, { method: 'POST', body: args })).status), `S2 Chức năng quản trị ${fn} bị chặn với người lạ và khách`);
}
ok((await guest('rpc/my_orders', { method: 'POST' })).status === 401, 'S2 Xem "đơn của tôi" phải đăng nhập');

console.log('--- S3. Chống giả mạo yêu cầu (CSRF)');
ok((await customer('rpc/my_orders', { method: 'POST', csrf: false })).status === 403, 'S3 Thiếu header bảo vệ: chặn');
ok((await customer('rpc/my_orders', { method: 'POST', headers: { Origin: 'https://evil.example' } })).status === 403, 'S3 Gửi từ trang web lạ: chặn');
ok((await guest('auth/login', { method: 'POST', csrf: false, body: { phone, password: 'x' } })).status === 403, 'S3 Đăng nhập từ trang lạ: chặn');

console.log('--- S4. Đăng nhập & phiên làm việc');
const wrong = await client()('auth/login', { method: 'POST', body: { phone, password: 'SaiMatKhau!1' } });
const unknown = await client()('auth/login', { method: 'POST', body: { phone: '0999999999', password: 'SaiMatKhau!1' } });
ok(wrong.status === 401 && unknown.status === 401 && wrong.data.message === unknown.data.message, 'S4 Sai mật khẩu và tài khoản không tồn tại báo giống nhau (không dò được tài khoản)');
const fix = client(); await fix('auth/session'); const before = fix.cookie();
await fix('auth/login', { method: 'POST', body: { phone, password: 'Khach!2026xx' } });
ok(fix.cookie() && fix.cookie() !== before, 'S4 Đăng nhập cấp mã phiên mới (chống cố định phiên)');
ok(/HttpOnly/i.test(signup.setCookie || '') && /SameSite=Lax/i.test(signup.setCookie || ''), 'S4 Cookie phiên HttpOnly + SameSite (JavaScript lạ không đọc được)');
const old = fix.cookie(); await fix('auth/logout', { method: 'POST' });
const reuse = client(); reuse.setCookie(old);
ok((await reuse('rpc/my_orders', { method: 'POST' })).status === 401, 'S4 Đăng xuất xong, mã phiên cũ hết hiệu lực');
ok((await client()('auth/signup', { method: 'POST', body: { phone: '0911222333', password: 'ngan', data: { phone: '0911222333', name: 'x' } } })).status === 400, 'S4 Mật khẩu quá ngắn bị từ chối');
ok((await client()('auth/signup', { method: 'POST', body: { phone, password: 'Khach!2026xx', data: { phone, name: 'Trùng' } } })).status === 409, 'S4 Không đăng ký trùng số điện thoại');

console.log('--- S5. Chèn mã độc / dữ liệu rác không làm sập máy chủ');
const objName = await guest('rpc/place_order', { method: 'POST', body: { p_items: [{ id: 'khong-co', qty: 1 }], p_customer: { name: { a: 1 }, phone: '0900000001' }, p_shipping: { method: 'delivery', address: 'a' }, p_payment: 'cod' } });
ok(objName.status === 400, 'S5 Tên khách dạng object (không phải chữ): từ chối, không lưu dữ liệu làm hỏng trang quản trị');
const lead = await guest('rpc/submit_lead', { method: 'POST', body: { p_type: 'contact', p_data: { name: ['x'], phone: { a: 1 }, company: { b: 2 } }, p_source_url: { c: 3 } } });
ok(lead.status === 200 && lead.data.name === '' && lead.data.company === '' && lead.data.source_url === '', 'S5 Liên hệ gửi tên/công ty dạng object: lưu thành chữ rỗng, không làm hỏng trang quản trị');
const inStock = (await guest('data/products?select=id&stock=gt.5&active=eq.true&order=stock.desc&limit=1')).data[0]?.id ?? 1001;
const weird = [null, 1, 'x', [], {}, true, -1, 1e308, '<script>alert(1)</script>', "' OR 1=1 -- ", { a: { b: 1 } }, [[[]]], '../../etc/passwd'];
const rpcs = ['place_order', 'validate_coupon_cart', 'track_order', 'cancel_order', 'order_extras', 'submit_lead', 'save_cart_reminder', 'khong_ton_tai'];
const keys = ['p_items', 'p_customer', 'p_shipping', 'p_payment', 'p_coupon', 'p_code', 'p_phone', 'p_type', 'p_data', 'p_request_id', 'p_invoice', 'p_note', 'p_maintenance', 'p_attribution'];
const crashes = [];
const fuzz = client();
for (const fn of rpcs) for (const k of keys) for (const v of weird) {
  // Chỉ dùng sản phẩm thật khi thử các trường xử lý sau giỏ hàng, tránh tạo hàng trăm đơn rác / trừ kho.
  const body = { p_items: [{ id: ['p_coupon', 'p_invoice', 'p_note'].includes(k) ? inStock : 'khong-co', qty: 1 }], p_customer: { name: 'a', phone: '0900000000' }, p_shipping: { method: 'delivery', address: 'a' }, p_payment: 'cod', p_code: 'DTX', p_phone: '0900000000', p_type: 'contact', [k]: v };
  const r = await fuzz(`rpc/${fn}`, { method: 'POST', body });
  if (r.status >= 500) crashes.push(`${fn}.${k}=${JSON.stringify(v)} → ${r.status} ${r.text.slice(0, 80)}`);
}
ok(!crashes.length, `S5 ${rpcs.length * keys.length * weird.length} yêu cầu kiểu dữ liệu sai vào các chức năng công khai: không lỗi máy chủ${crashes.length ? '\n' + crashes.slice(0, 60).join('\n') : ''}`);
const sqlish = ["id=eq.1' OR '1'='1", 'id=eq.1;DROP TABLE records', 'order=price.desc;DELETE', 'select=*,order_items(*)', 'limit=-5', 'offset=abc', 'price=gte.abc', 'tags=cs.notjson', 'id=zz.1', 'id[]=eq.1&id[]=x', "name=ilike.*'*", 'created_at=gte.%00', 'data->>x=eq.1'];
const sqlCrash = [];
for (const t of ['products', 'categories', 'faqs', 'orders', 'khong-co', '../records']) for (const q of sqlish) {
  const r = await guest(`data/${t}?${q}`);
  if (r.status >= 500) sqlCrash.push(`${t}?${q} → ${r.status}`);
}
ok(!sqlCrash.length, `S5 Chèn câu lệnh SQL vào bộ lọc / sắp xếp / mã bản ghi: không lỗi, không lộ dữ liệu${sqlCrash.length ? '\n' + sqlCrash.join('\n') : ''}`);
const count = (await guest('data/products?select=id&limit=10000')).data.length;
ok((await guest("data/products?id=eq.1' OR '1'='1")).data.length === 0 && count > 0, 'S5 Mẹo "OR 1=1" không trả thêm bản ghi');
const nested = JSON.stringify(Array.from({ length: 80 }).reduce((a) => [a], 1));
for (const [label, raw] of [['JSON hỏng', '{"p_items":'], ['JSON lồng 80 tầng', nested], ['Chuỗi thay vì object', '"abc"'], ['Số', '42']]) {
  const r = await guest('rpc/place_order', { method: 'POST', raw });
  ok(r.status === 400, `S5 ${label}: báo lỗi 400, không sập`);
}
const big = await guest('rpc/submit_lead', { method: 'POST', raw: JSON.stringify({ p_type: 'contact', p_data: { note: 'x'.repeat(2 * 1024 * 1024) } }) });
ok(big.status === 413, 'S5 Gửi dữ liệu quá lớn (2 MB): từ chối 413');
for (const m of ['PUT', 'OPTIONS']) { const r = await guest('data/products', { method: m }); ok(r.status >= 400 && r.status < 500, `S5 Phương thức ${m} bị từ chối (${r.status})`); }
ok(!/Fatal|Stack trace|\.php on line|PDOException|SQLSTATE/i.test(crashes.join() + (await guest('rpc/place_order', { method: 'POST', raw: '{' })).text), 'S5 Thông báo lỗi không lộ đường dẫn / mã nguồn / câu SQL');

console.log('--- S6. Tệp tin và thư mục nhạy cảm');
for (const path of ['server/bootstrap.php', 'server/config.example.php', 'server/config.local.php', 'server/schema.sql', 'server/.htaccess', 'server/inventory.php', 'server/uploads/', '.git/config', '.git/HEAD', '.env', 'package.json', 'docker-compose.yml', 'frontend/assets/', 'admin/assets/js/']) {
  const r = await fetch(new URL(path, site), { redirect: 'manual' });
  ok([403, 404].includes(r.status), `S6 Không tải được /${path} (${r.status})`);
}
for (const p of ['media/../server/bootstrap.php', 'media/..%2F..%2Fserver%2Fbootstrap.php', 'media/a.php', 'media/a.png.php', 'media/%00.png', 'media/.htaccess']) {
  const r = await guest(p);
  ok([400, 404].includes(r.status) && !/<\?php/.test(r.text), `S6 Đường dẫn ảnh độc hại bị chặn: ${p}`);
}
ok((await guest('media/hack.png', { method: 'POST', raw: '<?php echo 1;', headers: { 'Content-Type': 'image/png' } })).status === 401, 'S6 Người lạ không tải tệp lên được');
const php = await customer('media/hack.png', { method: 'POST', raw: '<?php echo 1;', headers: { 'Content-Type': 'image/png' } });
ok(php.status === 403, 'S6 Khách hàng không tải tệp lên được');

console.log('--- S7. Header bảo mật (chống nhúng trang, chống đoán sai loại tệp, giấu phiên bản)');
const h = (await guest('health')).headers;
ok(h.get('x-content-type-options') === 'nosniff', 'S7 API: X-Content-Type-Options nosniff');
ok(/DENY|SAMEORIGIN/i.test(h.get('x-frame-options') || ''), 'S7 API: không cho trang lạ nhúng (X-Frame-Options)');
ok(!h.get('x-powered-by'), 'S7 API: không lộ phiên bản PHP (X-Powered-By)');
ok(h.get('cache-control')?.includes('no-store'), 'S7 API: không lưu đệm dữ liệu riêng tư');
const page = await fetch(new URL('frontend/index.html', site));
ok(page.status === 200 && page.headers.get('x-content-type-options') === 'nosniff' && /SAMEORIGIN|DENY/i.test(page.headers.get('x-frame-options') || ''), 'S7 Trang web: chống nhúng vào trang lừa đảo (clickjacking)');
ok(!!page.headers.get('referrer-policy'), 'S7 Trang web: Referrer-Policy');

console.log('--- S8. Chống spam / quá tải');
const burst = await Promise.all(Array.from({ length: 40 }, () => fetch(new URL('?route=data/products&select=id&limit=5', api)).then((r) => r.status)));
ok(burst.every((s) => s === 200), 'S8 40 yêu cầu đồng thời: máy chủ vẫn trả lời bình thường');
let limited = false;
for (let i = 0; i < 200 && !limited; i++) limited = (await guest('rpc/submit_lead', { method: 'POST', body: { p_type: 'contact', p_data: { name: 'spam', phone: '0900000000' } } })).status === 429;
ok(limited, 'S8 Gửi form liên hệ liên tục (spam): bị chặn 429 sau giới hạn');
ok((await guest('auth/login', { method: 'POST', body: { phone: '0900000000', password: 'x' } })).status !== 500, 'S8 Bị chặn spam vẫn không làm lỗi máy chủ');
ok((await guest('health')).status === 200, 'S8 Sau toàn bộ tấn công thử, máy chủ vẫn hoạt động');

console.log(`PASS bảo mật: ${checks} kiểm tra.`);
