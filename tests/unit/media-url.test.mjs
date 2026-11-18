// Ảnh kho media (frontend/assets/js/core/utils.js › DT.u.localMedia): lưu kèm địa chỉ nào cũng hiển thị từ máy chủ đang chạy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function boot(mode = 'mysql', apiUrl = 'https://nhathaudienlanhkhanhle.vn/server/api.php') {
  const context = { console, URL, document: { baseURI: 'https://nhathaudienlanhkhanhle.vn/frontend/' } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext('window.DT = {};', context);
  context.DT.BACKEND = { mode, apiUrl };
  context.DT.apiEndpoint = (path) => { const [route, query = ''] = path.split('?'); const url = new URL(apiUrl); url.search = query; url.searchParams.set('route', route); return url.href; };
  vm.runInContext(fs.readFileSync(new URL('../../frontend/assets/js/core/utils.js', import.meta.url), 'utf8'), context);
  return context.DT;
}

test('ảnh tải lên ở máy local / www vẫn hiển thị từ máy chủ hiện tại', () => {
  const DT = boot();
  assert.equal(DT.u.safeUrl('http://127.0.0.1:5173/server/api.php?route=%2Fmedia%2Fhome%2Fa.webp'), 'https://nhathaudienlanhkhanhle.vn/server/api.php?route=%2Fmedia%2Fhome%2Fa.webp');
  assert.equal(DT.u.safeUrl('https://www.nhathaudienlanhkhanhle.vn/server/api.php?route=/media/brands/b.png'), 'https://nhathaudienlanhkhanhle.vn/server/api.php?route=%2Fmedia%2Fbrands%2Fb.png');
});

test('link ngoài, đường dẫn lạ và giao thức nguy hiểm không bị đổi sai', () => {
  const DT = boot();
  assert.equal(DT.u.safeUrl('https://example.com/x.jpg'), 'https://example.com/x.jpg');
  assert.equal(DT.u.safeUrl('http://127.0.0.1:5173/server/api.php?route=%2Fmedia%2F..%2Fx.png'), 'http://127.0.0.1:5173/server/api.php?route=%2Fmedia%2F..%2Fx.png');
  assert.equal(DT.u.safeUrl('https://a.vn/server/api.php?route=/orders'), 'https://a.vn/server/api.php?route=/orders');
  assert.equal(DT.u.safeUrl('javascript:alert(1)'), '');
  assert.equal(DT.u.safeUrl('tel:0387770075'), 'tel:0387770075');
});

test('bản demo (không máy chủ) giữ nguyên địa chỉ ảnh', () => {
  const DT = boot('demo');
  assert.equal(DT.u.safeUrl('http://127.0.0.1:5173/server/api.php?route=%2Fmedia%2Fhome%2Fa.webp'), 'http://127.0.0.1:5173/server/api.php?route=%2Fmedia%2Fhome%2Fa.webp');
});
