import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

function storage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
}
function adapter(mode = 'mysql', fetch = async () => new Response('[]', {headers:{'content-range':'*/0'}}), seed = {}) {
  const context = {console, crypto:webcrypto, URLSearchParams, localStorage:storage(), sessionStorage:storage(), fetch};
  for (const [key, value] of Object.entries(seed)) context.localStorage.setItem(key, JSON.stringify(value));
  context.window = context;
  vm.createContext(context);
  for (const file of ['frontend/assets/js/data/catalog.js','frontend/assets/js/data/content.js','frontend/assets/js/core/utils.js','frontend/assets/js/core/rows.js']) {
    vm.runInContext(fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8'), context);
  }
  context.DT.BACKEND = {mode};
  context.DT.api ??= {productById: () => null};
  context.DT.apiEndpoint = path => 'http://localhost/' + path;
  vm.runInContext(fs.readFileSync(new URL('../../admin/assets/js/db.js', import.meta.url), 'utf8'), context);
  return context.AD.db;
}

test('MySQL adapter preserves both date bounds through PHP query parsing', async () => {
  let query;
  const db = adapter('mysql', async url => {
    query = new URL(url).searchParams;
    return new Response('[]', {headers:{'content-range':'*/0'}});
  });
  await db.list('orders', {filters:[['created_at','gte','2026-05-01'],['created_at','lt','2026-06-01'],['status','eq','done']]});
  assert.deepEqual(query.getAll('created_at[]'), ['gte.2026-05-01','lt.2026-06-01']);
  assert.equal(query.get('status'), 'eq.done');
});

test('MySQL adapter sends tag containment as a JSON array', async () => {
  let query;
  const db = adapter('mysql', async url => {
    query = new URL(url).searchParams;
    return new Response('[]', {headers:{'content-range':'*/0'}});
  });
  await db.list('crm_customer_summary', {filters:[['tags','cs',['VIP','Repeat']]]});
  assert.equal(query.get('tags'), 'cs.["VIP","Repeat"]');
});

test('Demo VIP filter excludes untagged customers', async () => {
  const db = adapter('demo');
  const vip = await db.insert('crm_customers', {name:'VIP customer',phone:'0901234567',tags:['VIP']});
  await db.insert('crm_customers', {name:'Regular customer',phone:'0901234568',tags:[]});
  const result = await db.list('crm_customer_summary', {filters:[['tags','cs',['VIP']]]});
  assert.deepEqual(Array.from(result.rows, row => row.id), [vip.id]);
});

test('Demo: COD giao xong tự thành đã thu tiền; chuyển khoản chờ xác nhận; CRM chỉ cộng đơn đã thu', async () => {
  const order = (code, payment, total) => ({code, createdAt:'2026-11-01T00:00:00Z', status:'shipping', payment, customer:{name:'Khách QA', phone:'0901111222'},
    shipping:{method:'delivery', address:'1 QA'}, items:[{id:1, name:'SP', price:total, qty:1}], subtotal:total, shippingFee:0, discount:0, total});
  const db = adapter('demo', undefined, {dt_shop_v1:{orders:[order('DTCOD1','cod',3000000), order('DTBANK1','bank',5000000)], users:[], cart:[]}});
  await db.update('orders', 'DTCOD1', {status:'done', payment_status:'unpaid'});
  await db.update('orders', 'DTBANK1', {status:'done', payment_status:'unpaid'});
  const cod = await db.get('orders', 'DTCOD1'), bank = await db.get('orders', 'DTBANK1');
  assert.equal(cod.payment_status, 'paid');
  assert.equal(cod.order_status_history.at(-1).note, 'Đã thu tiền COD khi giao');
  assert.equal(bank.payment_status, 'unpaid');
  const spent = async () => (await db.list('crm_customer_summary')).rows.find(c => c.phone === '0901111222').total_spent;
  assert.equal(await spent(), 3000000);
  await db.update('orders', 'DTBANK1', {payment_status:'paid'});
  assert.equal(await spent(), 8000000);
});
