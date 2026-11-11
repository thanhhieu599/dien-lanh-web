// Luật giá phía trình duyệt (frontend/assets/js/core/promotions.js) phải khớp bộ ca chung tests/fixtures/pricing.json.
// Bản PHP chạy cùng bộ ca: php tests/unit/pricing.test.php
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const context = { console };
context.window = context;
vm.createContext(context);
for (const file of ['data/catalog', 'data/content', 'core/rows', 'core/utils', 'core/api', 'core/promotions']) {
  vm.runInContext(fs.readFileSync(new URL(`frontend/assets/js/${file}.js`, root), 'utf8'), context, { filename: file });
}
const DT = context.DT;
const fixture = JSON.parse(fs.readFileSync(new URL('tests/fixtures/pricing.json', root), 'utf8'));
DT.categories = fixture.categories.map((c) => ({ subs: [], filters: [], ...c }));

for (const c of fixture.cases) {
  test(c.name, () => {
    const lines = c.lines.map((l) => ({ ...l, product: DT.rows.product.toView({ created_at: '2026-01-01', ...l.product }) }));
    let result = null;
    if (c.coupon) {
      result = DT.promotions.evaluate(DT.rows.coupon.toView(c.coupon), lines, {
        phone: c.phone || '',
        orders: (c.orders || []).map((o) => ({ ...o, customer: { phone: o.phone } })),
        customers: c.customers || [],
      });
      const got = { ok: result.ok, discount: result.discount, free_ship: result.free_ship, ...(result.ok ? {} : { msg: result.msg }) };
      assert.deepEqual(got, c.expect.coupon);
    }
    if (c.expect.quote) {
      const quote = DT.promotions.quote(lines, c.config ?? fixture.config, c.method || 'delivery', result?.ok ? result : null);
      assert.deepEqual({ ...quote }, c.expect.quote);
    }
  });
}
