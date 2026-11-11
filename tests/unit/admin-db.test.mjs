import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

function storage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
}
function adapter(mode = 'mysql', fetch = async () => new Response('[]', {headers:{'content-range':'*/0'}})) {
  const context = {console, crypto:webcrypto, URLSearchParams, localStorage:storage(), sessionStorage:storage(), fetch};
  context.window = context;
  vm.createContext(context);
  for (const file of ['frontend/assets/js/data/catalog.js','frontend/assets/js/data/content.js','frontend/assets/js/core/utils.js','frontend/assets/js/core/rows.js']) {
    vm.runInContext(fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8'), context);
  }
  context.DT.BACKEND = {mode};
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
