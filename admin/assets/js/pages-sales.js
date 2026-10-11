// Tổng quan, Đơn hàng, Khách hàng tiềm năng (CRM), Báo cáo
window.AD = window.AD || {};
AD.pages = AD.pages || {};

(() => {
  const { esc, money, dt, d, badge, ic, table, pager, run, confirm } = AD.ui;
  const dayKey = (s) => { const x = new Date(s); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const startOfDay = (offset = 0) => { const x = new Date(); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + offset); return x; };
  const valid = (o) => o.status !== 'cancelled';
  const sum = (a, f) => a.reduce((s, x) => s + Number(f(x) || 0), 0);
  const tel = (p) => (p ? `<a href="tel:${esc(p)}">${esc(p)}</a> · <a href="https://zalo.me/${esc(String(p).replace(/^0/, '84'))}" target="_blank" rel="noopener">Zalo</a>` : '-');

  // ======================================================================= Tổng quan
  AD.pages.dashboard = async (params, el) => {
    el.innerHTML = `<div class="ad-head"><div><h1>Tổng quan</h1><small class="muted">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small></div></div><div class="ad-loading">Đang tải…</div>`;
    const since = startOfDay(-29).toISOString();
    const [ord, leads, low, rv, pend] = await Promise.all([
      AD.db.list('orders', { select: 'id,code,created_at,status,total,payment_status,customer,phone', filters: [['created_at', 'gte', since]], order: 'created_at.desc', limit: 2000 }),
      AD.db.list('leads', { select: 'id,code,type,name,phone,company,created_at,status', filters: [['status', 'eq', 'new']], order: 'created_at.desc', limit: 6 }),
      AD.db.list('products', { select: 'id,sku,name,stock,price,art,images,brand', filters: [['active', 'eq', true], ['stock', 'lte', 5]], order: 'stock.asc', limit: 8 }),
      AD.db.list('reviews', { select: 'id', filters: [['status', 'eq', 'pending']], limit: 1 }),
      AD.db.list('orders', { select: 'id', filters: [['status', 'eq', 'pending']], limit: 1 }),
    ]);
    const orders = ord.rows;
    const today = orders.filter((o) => new Date(o.created_at) >= startOfDay() && valid(o));
    const ok30 = orders.filter(valid);
    const rev30 = sum(ok30, (o) => o.total);
    const byDay = {};
    for (let i = 29; i >= 0; i--) byDay[dayKey(startOfDay(-i))] = 0;
    ok30.forEach((o) => { const k = dayKey(o.created_at); if (k in byDay) byDay[k] += Number(o.total); });

    el.innerHTML = `<div class="ad-head"><div><h1>Tổng quan</h1><small class="muted">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small></div>
        <div class="ad-head-actions"><a class="btn btn-light" href="#/reports">${ic('grid')} Báo cáo chi tiết</a></div></div>
      <div class="kpis">
        <a class="kpi" href="#/orders"><span>Doanh thu hôm nay</span><b>${money(sum(today, (o) => o.total))}</b><small>${today.length} đơn</small></a>
        <a class="kpi" href="#/reports"><span>Doanh thu 30 ngày</span><b>${money(rev30)}</b><small>${ok30.length} đơn • TB ${money(ok30.length ? rev30 / ok30.length : 0)}/đơn</small></a>
        <a class="kpi ${pend.count ? 'kpi-warn' : ''}" href="#/orders?status=pending"><span>Đơn chờ xác nhận</span><b>${pend.count}</b><small>Cần gọi xác nhận</small></a>
        <a class="kpi ${leads.count ? 'kpi-warn' : ''}" href="#/leads?status=new"><span>Khách hàng tiềm năng mới</span><b>${leads.count}</b><small>Báo giá, dịch vụ, liên hệ</small></a>
        <a class="kpi ${rv.count ? 'kpi-warn' : ''}" href="#/reviews?status=pending"><span>Đánh giá chờ duyệt</span><b>${rv.count}</b><small>&nbsp;</small></a>
      </div>
      <section class="ad-card"><div class="ad-card-head"><h3>Doanh thu 30 ngày gần nhất</h3><small class="muted">Không tính đơn đã hủy</small></div><div id="ch-rev"></div></section>
      <div class="ad-cols">
        <section class="ad-card"><div class="ad-card-head"><h3>Đơn hàng mới</h3><a href="#/orders">Tất cả →</a></div>
          ${table([
            { label: 'Mã đơn', render: (o) => `<b>${esc(o.code)}</b><small>${dt(o.created_at)}</small>` },
            { label: 'Khách', render: (o) => `${esc(o.customer?.name || '')}<small>${esc(o.phone || '')}</small>` },
            { label: 'Tổng', render: (o) => money(o.total), cls: 'num' },
            { label: 'Trạng thái', render: (o) => badge(AD.ORDER_STATUS, o.status) },
          ], orders.slice(0, 8), { rowHref: (o) => `#/orders/${encodeURIComponent(o.id)}`, empty: 'Chưa có đơn hàng trong 30 ngày' })}</section>
        <section class="ad-card"><div class="ad-card-head"><h3>Khách hàng tiềm năng mới</h3><a href="#/leads">Tất cả →</a></div>
          ${table([
            { label: 'Loại', render: (l) => `<b>${esc(AD.LEAD_TYPE[l.type] || l.type)}</b><small>${dt(l.created_at)}</small>` },
            { label: 'Khách', render: (l) => `${esc(l.company || l.name || '')}<small>${esc(l.phone || '')}</small>` },
          ], leads.rows, { rowHref: (l) => `#/leads/${encodeURIComponent(l.id)}`, empty: 'Không có yêu cầu mới' })}
          <div class="ad-card-head" style="margin-top:16px"><h3>Sắp hết hàng</h3><a href="#/products?stock=5">Tất cả →</a></div>
          ${table([
            { label: '', render: (p) => AD.ui.thumb(p), cls: 'w-thumb' },
            { label: 'Sản phẩm', render: (p) => `${esc(p.name)}<small>${esc(p.sku)}</small>` },
            { label: 'Tồn', render: (p) => `<b class="${p.stock <= 0 ? 'txt-danger' : 'txt-warn'}">${p.stock}</b>`, cls: 'num' },
          ], low.rows, { rowHref: (p) => `#/products/${p.id}`, empty: 'Tồn kho ổn định' })}</section>
      </div>`;
    AD.chart.columns(el.querySelector('#ch-rev'), Object.entries(byDay).map(([k, v]) => ({ label: new Date(k).toLocaleDateString('vi-VN'), short: k.slice(8) + '/' + k.slice(5, 7), value: v })), { labelEvery: 3, tableLabel: 'Ngày' });
  };

  // ======================================================================= Đơn hàng
  const ORDER_FLOW = ['pending', 'confirmed', 'shipping', 'installing', 'done'];

  AD.pages.orders = async (params, el) => {
    const size = 25; const page = Number(params.page) || 1;
    // "2026-10-11" -> 00:00 giờ địa phương (new Date("2026-10-11") là 00:00 UTC = 7:00 sáng giờ VN)
    const localDay = (s, add = 0) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd + add).toISOString(); };
    const filters = [['status', 'eq', params.status], ['payment', 'eq', params.payment],
      ['created_at', 'gte', params.from ? localDay(params.from) : undefined],
      ['created_at', 'lt', params.to ? localDay(params.to, 1) : undefined]];
    const search = params.q ? { q: params.q, cols: ['code', 'phone', 'customer->>name'] } : null;
    const acc = AD.me.role === 'accountant';
    el.innerHTML = `<div class="ad-head"><div><h1>${acc ? 'Đơn hàng & thanh toán' : 'Đơn hàng'}</h1>${acc ? '<small class="muted">Đối soát thanh toán, xác nhận đã thu tiền, xuất dữ liệu sang MISA</small>' : ''}</div><div class="ad-head-actions"><a class="btn btn-light" href="#/misa${params.from || params.to ? `?${new URLSearchParams({ from: params.from || '', to: params.to || '' })}` : ''}">${ic('file')} Xuất Excel MISA</a><button class="btn btn-light" id="csv">${ic('file')} Xuất CSV</button></div></div>
      <div class="ad-tabs">${[['', 'Tất cả'], ...Object.entries(AD.ORDER_STATUS).map(([k, [l]]) => [k, l])].map(([k, l]) => `<a href="#/orders${k ? `?status=${k}` : ''}" class="${(params.status || '') === k ? 'active' : ''}">${l}</a>`).join('')}</div>
      <form class="ad-toolbar" id="tb">
        <input type="hidden" name="status" value="${esc(params.status || '')}">
        <input name="q" type="search" placeholder="Mã đơn, SĐT, tên khách…" value="${esc(params.q || '')}">
        <select name="payment"><option value="">Thanh toán: tất cả</option>${Object.entries(AD.PAYMENT).map(([k, l]) => `<option value="${k}" ${params.payment === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label class="ad-inline">Từ <input type="date" name="from" value="${esc(params.from || '')}"></label>
        <label class="ad-inline">đến <input type="date" name="to" value="${esc(params.to || '')}"></label>
        <button class="btn btn-light">${ic('search')} Lọc</button>
      </form><div id="list"><div class="ad-loading">Đang tải…</div></div>`;
    AD.bindToolbar(el.querySelector('#tb'), 'orders', params);
    const opts = { select: '*,order_items(*)', filters, search, order: 'created_at.desc' };
    const { rows, count } = await AD.db.list('orders', { ...opts, limit: size, offset: (page - 1) * size });
    el.querySelector('#list').innerHTML = table([
      { label: 'Mã đơn', render: (o) => `<b>${esc(o.code)}</b><small>${dt(o.created_at)}</small>` },
      { label: 'Khách hàng', render: (o) => `${esc(o.customer?.gender || '')} ${esc(o.customer?.name || '')}${o.invoice ? ' <span class="st st-info">VAT</span>' : ''}<small>${esc(o.phone)}</small>` },
      { label: 'Sản phẩm', render: (o) => `${esc(o.order_items?.[0]?.name || '')}${o.order_items?.length > 1 ? `<small>+ ${o.order_items.length - 1} sản phẩm khác</small>` : ''}` },
      { label: 'Nhận hàng', render: (o) => (o.shipping?.method === 'pickup' ? 'Tại cửa hàng' : esc(o.shipping?.province || '')) },
      { label: 'Tổng tiền', render: (o) => `<b>${money(o.total)}</b><small>${AD.PAYMENT[o.payment] || o.payment}</small>`, cls: 'num' },
      { label: 'Thanh toán', render: (o) => badge(AD.PAY_STATUS, o.payment_status) },
      { label: 'Trạng thái', render: (o) => badge(AD.ORDER_STATUS, o.status) },
    ], rows, { rowHref: (o) => `#/orders/${encodeURIComponent(o.id)}`, empty: 'Không có đơn hàng phù hợp' }) + pager(page, count, size);
    AD.bindPager(el, 'orders', params);
    el.querySelector('#csv').onclick = async () => {
      const all = (await AD.db.list('orders', { ...opts, limit: 5000 })).rows;
      AD.ui.csv(`don-hang-${dayKey(new Date())}.csv`, [
        { label: 'Mã đơn', key: 'code' }, { label: 'Ngày', value: (o) => dt(o.created_at) }, { label: 'Khách hàng', value: (o) => o.customer?.name },
        { label: 'SĐT', key: 'phone' }, { label: 'Email', value: (o) => o.customer?.email }, { label: 'Địa chỉ', value: (o) => (o.shipping?.method === 'pickup' ? `Nhận tại ${o.shipping.store}` : [o.shipping?.address, o.shipping?.district, o.shipping?.province].filter(Boolean).join(', ')) },
        { label: 'Sản phẩm', value: (o) => (o.order_items || []).map((i) => `${i.name} x${i.qty}`).join('; ') },
        { label: 'Tạm tính', key: 'subtotal' }, { label: 'Lắp đặt', key: 'install_fee' }, { label: 'Vận chuyển', key: 'shipping_fee' }, { label: 'Giảm giá', key: 'discount' }, { label: 'Mã giảm', key: 'coupon' }, { label: 'Tổng', key: 'total' },
        { label: 'Thanh toán', value: (o) => AD.PAYMENT[o.payment] }, { label: 'TT thanh toán', value: (o) => AD.PAY_STATUS[o.payment_status]?.[0] }, { label: 'Trạng thái', value: (o) => AD.ORDER_STATUS[o.status]?.[0] },
        { label: 'Công ty', value: (o) => o.invoice?.company }, { label: 'MST', value: (o) => o.invoice?.taxCode }, { label: 'Ghi chú khách', key: 'note' }, { label: 'Ghi chú nội bộ', key: 'staff_note' },
      ], all);
    };
  };

  AD.pages.orderDetail = async (id, params, el) => {
    const o = await AD.db.get('orders', id, '*,order_items(*),order_status_history(*),payments(*)');
    if (!o) { el.innerHTML = '<div class="ad-empty"><p>Không tìm thấy đơn hàng.</p><a class="btn btn-light" href="#/orders">Quay lại</a></div>'; return; }
    const hist = (o.order_status_history || []).slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const idx = ORDER_FLOW.indexOf(o.status);
    const next = idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
    const s = o.shipping || {};
    const ops = AD.isOps();
    const hasAc = (o.order_items || []).some((i) => DT.api.productById(i.product_id)?.cat === 'may-lanh' || /máy lạnh|điều hòa/i.test(i.name || ''));
    const maint = ops && hasAc ? await AD.maintenanceOf(o) : null;
    const src = o.attribution ? [o.attribution.source, o.attribution.medium, o.attribution.campaign].filter(Boolean).join(' / ') : '';
    el.innerHTML = `<div class="ad-head"><div><a class="ad-back" href="#/orders">${ic('left')} Đơn hàng</a>
        <h1>Đơn ${esc(o.code)} ${badge(AD.ORDER_STATUS, o.status)}</h1><small class="muted">Đặt lúc ${dt(o.created_at)}</small></div>
      <div class="ad-head-actions no-print">
        <button class="btn btn-light" onclick="window.print()">${ic('file')} In phiếu</button>
        ${ops && o.status !== 'cancelled' && o.status !== 'done' ? `<button class="btn btn-light txt-danger" data-status="cancelled">${ic('close')} Hủy đơn</button>` : ''}
        ${ops && next ? `<button class="btn btn-primary" data-status="${next}">${ic('check')} Chuyển sang: ${AD.ORDER_STATUS[next][0]}</button>` : ''}
      </div></div>
      <div class="ad-steps no-print">${ORDER_FLOW.map((k, i) => `<div class="${o.status === 'cancelled' ? '' : i <= idx ? 'done' : ''} ${k === o.status ? 'cur' : ''}"><span>${i + 1}</span>${AD.ORDER_STATUS[k][0]}</div>`).join('')}</div>
      <div class="ad-cols ad-cols-wide">
        <div>
          <section class="ad-card"><h3>Sản phẩm</h3>
            ${table([
              { label: 'Sản phẩm', render: (i) => `<b>${esc(i.name)}</b><small>${esc(i.sku || '')}${i.install ? ' • kèm lắp đặt' : ''}</small>` },
              { label: 'Đơn giá', render: (i) => money(i.price), cls: 'num' }, { label: 'SL', key: 'qty', cls: 'num' },
              { label: 'Thành tiền', render: (i) => money(i.price * i.qty), cls: 'num' },
            ], o.order_items || [])}
            <div class="ad-sum">
              <div><span>Tạm tính</span><b>${money(o.subtotal)}</b></div>
              ${o.install_fee ? `<div><span>Phí lắp đặt</span><b>${money(o.install_fee)}</b></div>` : ''}
              <div><span>Vận chuyển</span><b>${o.shipping_fee ? money(o.shipping_fee) : 'Miễn phí'}</b></div>
              ${o.discount ? `<div><span>Giảm giá ${o.coupon ? `(${esc(o.coupon)})` : ''}</span><b class="txt-ok">-${money(o.discount)}</b></div>` : ''}
              <div class="total"><span>Tổng thanh toán</span><b>${money(o.total)}</b></div>
            </div></section>
          <section class="ad-card no-print"><h3>${ops ? 'Xử lý nội bộ' : 'Xác nhận thanh toán'}</h3>
            <form id="ops" class="ad-grid">
              <div class="ad-field third"><label>Thanh toán</label><select name="payment_status">${Object.entries(AD.PAY_STATUS).map(([k, [l]]) => `<option value="${k}" ${o.payment_status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
              ${ops ? `<div class="ad-field third"><label>Trạng thái</label><select name="status">${Object.entries(AD.ORDER_STATUS).map(([k, [l]]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
              <div class="ad-field full"><label>Ghi chú nội bộ (khách không thấy)</label><textarea name="staff_note" rows="3" placeholder="VD: Đã gọi xác nhận 10h, hẹn lắp chiều mai, thợ Minh">${esc(o.staff_note || '')}</textarea></div>
              ${hasAc ? `<label class="ad-check full"><input type="checkbox" name="maintenance_optin" ${o.maintenance_optin ? 'checked' : ''}> <span>Nhắc khách vệ sinh máy lạnh định kỳ (khách đã đồng ý)</span><small class="help">${maint ? esc(maint) : 'Lịch nhắc được xếp khi đơn chuyển sang "Hoàn thành".'}</small></label>` : ''}`
              : `<div class="ad-field third"><label>Trạng thái đơn</label><div class="ad-ro">${badge(AD.ORDER_STATUS, o.status)}</div></div><p class="muted full">Kế toán chỉ cập nhật trạng thái thanh toán. Đổi trạng thái giao hàng do bộ phận vận hành thực hiện.</p>`}
              <div class="ad-field full"><button class="btn btn-primary">${ic('check')} Lưu thay đổi</button></div>
            </form></section>
        </div>
        <div>
          <section class="ad-card"><h3>Khách hàng</h3>
            <dl class="ad-dl"><dt>Họ tên</dt><dd>${esc(o.customer?.gender || '')} ${esc(o.customer?.name || '')}</dd>
            <dt>Điện thoại</dt><dd>${tel(o.phone)}</dd><dt>Email</dt><dd>${o.customer?.email ? `<a href="mailto:${esc(o.customer.email)}">${esc(o.customer.email)}</a>` : '-'}</dd>
            <dt>Tài khoản</dt><dd>${o.user_id ? 'Thành viên' : 'Khách vãng lai'}</dd>
            ${src ? `<dt>Nguồn khách</dt><dd>${esc(src)}${o.attribution.gclid ? ' <span class="st st-info">Google Ads</span>' : ''}${o.attribution.fbclid ? ' <span class="st st-info">Facebook</span>' : ''}</dd>` : ''}</dl></section>
          <section class="ad-card"><h3>Nhận hàng & thanh toán</h3>
            <dl class="ad-dl">${s.method === 'pickup' ? `<dt>Hình thức</dt><dd>Nhận tại cửa hàng</dd><dt>Cửa hàng</dt><dd>${esc(s.store || '')}</dd>`
              : `<dt>Hình thức</dt><dd>Giao tận nơi</dd><dt>Địa chỉ</dt><dd>${esc([s.address, s.district, s.province].filter(Boolean).join(', '))}</dd>${s.date ? `<dt>Hẹn giao</dt><dd>${d(s.date)} ${esc(s.slot || '')}</dd>` : ''}`}
            <dt>Thanh toán</dt><dd>${AD.PAYMENT[o.payment] || o.payment} ${badge(AD.PAY_STATUS, o.payment_status)}</dd>
            ${o.note ? `<dt>Ghi chú khách</dt><dd>${esc(o.note)}</dd>` : ''}</dl></section>
          ${o.payments?.length ? `<section class="ad-card"><h3>Giao dịch thanh toán</h3>${table([
            { label: 'Cổng / mã GD', render: (p) => `<b>${esc(AD.PAY_PROVIDER[p.provider] || p.provider)}</b><small class="mono">${esc(p.txn_ref)}${p.provider_txn ? ` • ${esc(p.provider_txn)}` : ''}</small>` },
            { label: 'Số tiền', render: (p) => money(p.amount), cls: 'num' },
            { label: 'Kết quả', render: (p) => `${badge(AD.TXN_STATUS, p.status)}<small>${dt(p.paid_at || p.created_at)}${p.message ? ` • ${esc(p.message)}` : ''}</small>` },
          ], o.payments.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))))}</section>` : ''}
          ${o.invoice ? `<section class="ad-card"><h3>Xuất hóa đơn VAT</h3><dl class="ad-dl"><dt>Công ty</dt><dd>${esc(o.invoice.company || '')}</dd><dt>MST</dt><dd class="mono">${esc(o.invoice.taxCode || '')}</dd><dt>Địa chỉ</dt><dd>${esc(o.invoice.address || '-')}</dd><dt>Email HĐ</dt><dd>${esc(o.invoice.email || '-')}</dd></dl></section>` : ''}
          <section class="ad-card no-print"><h3>Lịch sử</h3><ul class="ad-timeline">${hist.map((h) => `<li><b>${AD.ORDER_STATUS[h.status]?.[0] || h.status}</b><small>${dt(h.created_at)}</small></li>`).join('') || '<li>Chưa có</li>'}</ul></section>
        </div>
      </div>`;

    const save = async (patch, btn, msg) => { if (await run(btn, () => AD.db.update('orders', id, patch), msg)) { AD.refreshBadges(); AD.route(); } };
    el.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', async () => {
      const st = b.dataset.status;
      if (st === 'cancelled' && !(await confirm(`Hủy đơn <b>${esc(o.code)}</b>? Tồn kho sẽ được hoàn lại.`, { ok: 'Hủy đơn', danger: true }))) return;
      save({ status: st }, b, `Đã chuyển đơn sang "${AD.ORDER_STATUS[st][0]}"`);
    }));
    el.querySelector('#ops').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const patch = { payment_status: f.payment_status.value };
      if (ops) {
        Object.assign(patch, { status: f.status.value, staff_note: f.staff_note.value.trim() || null });
        if (f.maintenance_optin) patch.maintenance_optin = f.maintenance_optin.checked;
      } else if (patch.payment_status === o.payment_status) { AD.ui.toast('Không có thay đổi'); return; }
      save(patch, f.querySelector('button'), 'Đã lưu');
    });
  };

  // ======================================================================= Khách hàng tiềm năng (CRM)
  const LEAD_FIELDS = {
    company: 'Công ty', name: 'Người liên hệ', position: 'Chức vụ', phone: 'Điện thoại', email: 'Email', projectType: 'Loại dự án',
    items: 'Sản phẩm / số lượng', budget: 'Ngân sách', service: 'Dịch vụ', address: 'Địa chỉ', date: 'Ngày hẹn', qty: 'Số lượng máy',
    note: 'Mô tả', topic: 'Chủ đề', message: 'Nội dung', sku: 'Mã SP', src: 'Nguồn truy cập',
  };
  // Nhân viên có thể nhận lead (vận hành, kinh doanh, quản trị) – dùng cho ô "Phụ trách"
  AD.staffList = async () => {
    if (!AD.isOps()) return [];
    if (!AD.cache.staff) AD.cache.staff = (await AD.db.list('profiles', { select: 'id,name,role', filters: [['role', 'in', ['staff', 'admin', 'sales']]], order: 'name.asc' })).rows;
    return AD.cache.staff;
  };

  AD.pages.leads = async (params, el) => {
    const size = 25; const page = Number(params.page) || 1;
    const filters = [['type', 'eq', params.type], ['status', 'eq', params.status],
      params.owner === 'none' ? ['assigned_to', 'is', null] : ['assigned_to', 'eq', params.owner]];
    const search = params.q ? { q: params.q, cols: ['code', 'name', 'phone', 'company', 'email'] } : null;
    const sales = AD.me.role === 'sales';
    const staff = await AD.staffList();
    const owner = (id) => staff.find((x) => x.id === id)?.name;
    el.innerHTML = `<div class="ad-head"><div><h1>${sales ? 'Khách hàng của tôi' : 'Khách hàng tiềm năng'}</h1><small class="muted">${sales ? 'Các yêu cầu được giao cho bạn chăm sóc. Cập nhật trạng thái sau mỗi lần liên hệ.' : 'Yêu cầu báo giá dự án, đặt lịch dịch vụ, liên hệ, đăng ký nhận tin từ website'}</small></div>
        <div class="ad-head-actions"><button class="btn btn-light" id="csv">${ic('file')} Xuất CSV</button></div></div>
      <div class="ad-tabs">${[['', 'Tất cả'], ...Object.entries(AD.LEAD_TYPE)].map(([k, l]) => `<a href="#/leads${k ? `?type=${k}` : ''}" class="${(params.type || '') === k ? 'active' : ''}">${l}</a>`).join('')}</div>
      <form class="ad-toolbar" id="tb"><input type="hidden" name="type" value="${esc(params.type || '')}">
        <input name="q" type="search" placeholder="Tên, SĐT, công ty, mã…" value="${esc(params.q || '')}">
        <select name="status"><option value="">Trạng thái: tất cả</option>${Object.entries(AD.LEAD_STATUS).map(([k, [l]]) => `<option value="${k}" ${params.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${staff.length ? `<select name="owner"><option value="">Phụ trách: tất cả</option><option value="none" ${params.owner === 'none' ? 'selected' : ''}>Chưa giao</option>${staff.map((x) => `<option value="${esc(x.id)}" ${params.owner === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
        <button class="btn btn-light">${ic('search')} Lọc</button></form>
      <div id="list"><div class="ad-loading">Đang tải…</div></div>`;
    AD.bindToolbar(el.querySelector('#tb'), 'leads', params);
    const { rows, count } = await AD.db.list('leads', { filters, search, order: 'created_at.desc', limit: size, offset: (page - 1) * size });
    el.querySelector('#list').innerHTML = table([
      { label: 'Mã / thời gian', render: (l) => `<b class="mono">${esc(l.code)}</b><small>${dt(l.created_at)}</small>` },
      { label: 'Loại', render: (l) => `${esc(AD.LEAD_TYPE[l.type] || l.type)}${l.data?.src ? `<small>${esc(l.data.src)}</small>` : ''}` },
      { label: 'Khách hàng', render: (l) => `<b>${esc(l.company || l.name || l.email || '')}</b><small>${esc([l.company && l.name, l.phone].filter(Boolean).join(' • '))}</small>` },
      { label: 'Nội dung', render: (l) => `<span class="clamp">${esc(l.data?.items || l.data?.message || l.data?.note || (l.data?.service ? `Dịch vụ: ${l.data.service}` : '') || '')}</span>` },
      ...(staff.length ? [{ label: 'Phụ trách', render: (l) => (l.assigned_to ? esc(owner(l.assigned_to) || '—') : '<span class="muted">Chưa giao</span>') }] : []),
      { label: 'Trạng thái', render: (l) => badge(AD.LEAD_STATUS, l.status) },
    ], rows, { rowHref: (l) => `#/leads/${encodeURIComponent(l.id)}`, empty: sales ? 'Chưa có khách hàng nào được giao cho bạn' : 'Chưa có yêu cầu nào' }) + pager(page, count, size);
    AD.bindPager(el, 'leads', params);
    el.querySelector('#csv').onclick = async () => {
      const all = (await AD.db.list('leads', { filters, search, order: 'created_at.desc', limit: 5000 })).rows;
      AD.ui.csv(`khach-hang-tiem-nang-${dayKey(new Date())}.csv`, [
        { label: 'Mã', key: 'code' }, { label: 'Ngày', value: (l) => dt(l.created_at) }, { label: 'Loại', value: (l) => AD.LEAD_TYPE[l.type] },
        { label: 'Công ty', key: 'company' }, { label: 'Người liên hệ', key: 'name' }, { label: 'SĐT', key: 'phone' }, { label: 'Email', key: 'email' },
        { label: 'Nội dung', value: (l) => Object.entries(l.data || {}).filter(([k]) => !['name', 'phone', 'email', 'company'].includes(k)).map(([k, v]) => `${LEAD_FIELDS[k] || k}: ${v}`).join(' | ') },
        { label: 'Nguồn', value: (l) => l.data?.src || '' }, { label: 'Phụ trách', value: (l) => owner(l.assigned_to) || '' },
        { label: 'Trạng thái', value: (l) => AD.LEAD_STATUS[l.status]?.[0] }, { label: 'Ghi chú', key: 'staff_note' },
      ], all);
    };
  };

  AD.pages.leadDetail = async (id, params, el) => {
    const l = await AD.db.get('leads', id);
    if (!l) { el.innerHTML = '<div class="ad-empty"><p>Không tìm thấy.</p><a class="btn btn-light" href="#/leads">Quay lại</a></div>'; return; }
    const staff = await AD.staffList();
    const svc = l.data?.service && (AD.cache.services || DT.services).find((x) => x.id === l.data.service);
    el.innerHTML = `<div class="ad-head"><div><a class="ad-back" href="#/leads">${ic('left')} Khách hàng tiềm năng</a>
        <h1>${esc(AD.LEAD_TYPE[l.type] || l.type)}: ${esc(l.company || l.name || l.email || '')} ${badge(AD.LEAD_STATUS, l.status)}</h1><small class="muted">Mã ${esc(l.code)} • ${dt(l.created_at)}</small></div>
      <div class="ad-head-actions">${l.phone ? `<a class="btn btn-light" href="tel:${esc(l.phone)}">${ic('phone')} Gọi</a><a class="btn btn-light" target="_blank" rel="noopener" href="https://zalo.me/${esc(String(l.phone).replace(/^0/, '84'))}">Zalo</a>` : ''}
        ${l.email ? `<a class="btn btn-light" href="mailto:${esc(l.email)}?subject=${encodeURIComponent(`Phản hồi yêu cầu ${l.code}`)}">${ic('mail')} Email</a>` : ''}</div></div>
      <div class="ad-pipeline">${['new', 'contacted', 'quoted', 'won', 'lost'].map((k) => `<button class="${l.status === k ? 'active' : ''}" data-st="${k}">${AD.LEAD_STATUS[k][0]}</button>`).join('')}</div>
      <div class="ad-cols ad-cols-wide">
        <section class="ad-card"><h3>Nội dung yêu cầu</h3>
          <dl class="ad-dl">${Object.entries(l.data || {}).map(([k, v]) => `<dt>${esc(LEAD_FIELDS[k] || k)}</dt><dd>${k === 'service' && svc ? esc(svc.name) : esc(v)}</dd>`).join('')}</dl>
          ${l.source_url ? `<small class="muted">Gửi từ: ${esc(l.source_url)}</small>` : ''}</section>
        <section class="ad-card"><h3>Xử lý</h3><form id="lf" class="ad-grid">
          <div class="ad-field full"><label>Trạng thái</label><select name="status">${Object.entries(AD.LEAD_STATUS).map(([k, [lb]]) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${lb}</option>`).join('')}</select></div>
          ${staff.length ? `<div class="ad-field full"><label>Phụ trách</label><select name="assigned_to"><option value="">-- Chưa giao --</option>${staff.map((s) => `<option value="${esc(s.id)}" ${l.assigned_to === s.id ? 'selected' : ''}>${esc(s.name)}${s.role === 'sales' ? ' (kinh doanh)' : ''}</option>`).join('')}</select><small class="help">Nhân viên kinh doanh chỉ thấy khách hàng được giao cho mình.</small></div>` : ''}
          <div class="ad-field full"><label>Ghi chú chăm sóc</label><textarea name="staff_note" rows="6" placeholder="VD: 12/10 đã gọi, khách cần báo giá 20 bộ âm trần trước 15/10, gửi báo giá qua email">${esc(l.staff_note || '')}</textarea></div>
          <div class="ad-field full"><button class="btn btn-primary">${ic('check')} Lưu</button></div></form></section>
      </div>`;
    const save = async (patch, btn) => { if (await run(btn, () => AD.db.update('leads', id, patch), 'Đã cập nhật')) { AD.refreshBadges(); AD.route(); } };
    el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => save({ status: b.dataset.st }, b)));
    el.querySelector('#lf').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const patch = { status: f.status.value, staff_note: f.staff_note.value.trim() || null };
      if (f.assigned_to) patch.assigned_to = f.assigned_to.value || null;
      save(patch, f.querySelector('button'));
    });
  };

  // ======================================================================= Báo cáo
  AD.pages.reports = async (params, el) => {
    const now = new Date();
    const periods = {
      '30d': ['30 ngày qua', startOfDay(-29), null],
      month: ['Tháng này', new Date(now.getFullYear(), now.getMonth(), 1), null],
      lastmonth: ['Tháng trước', new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1)],
      '90d': ['90 ngày qua', startOfDay(-89), null],
      year: ['Năm nay', new Date(now.getFullYear(), 0, 1), null],
    };
    const pk = periods[params.p] ? params.p : '30d';
    const [label, from, to] = periods[pk];
    el.innerHTML = `<div class="ad-head"><div><h1>Báo cáo</h1><small class="muted">${label}: ${from.toLocaleDateString('vi-VN')} → ${(to ? new Date(to - 1) : now).toLocaleDateString('vi-VN')}</small></div>
      <div class="ad-head-actions"><div class="ad-seg">${Object.entries(periods).map(([k, [l]]) => `<a href="#/reports?p=${k}" class="${k === pk ? 'active' : ''}">${l}</a>`).join('')}</div></div></div>
      <div class="ad-loading">Đang tải…</div>`;
    const filters = [['created_at', 'gte', from.toISOString()], ['created_at', 'lt', to ? to.toISOString() : undefined]];
    const [ord, leads, prods] = await Promise.all([
      AD.db.list('orders', { select: 'id,created_at,status,total,payment,discount,attribution,order_items(product_id,name,price,qty)', filters, order: 'created_at.asc', limit: 10000 }),
      AD.me.role === 'accountant' ? Promise.resolve({ rows: [] }) : AD.db.list('leads', { select: 'id,type,status,data', filters, limit: 10000 }),
      AD.db.list('products', { select: 'id,cat,brand', limit: 10000 }),
    ]);
    const pmap = new Map(prods.rows.map((p) => [String(p.id), p]));
    const all = ord.rows; const ok = all.filter(valid);
    const revenue = sum(ok, (o) => o.total);
    const items = ok.flatMap((o) => o.order_items || []);
    const group = (keyFn, labelFn) => {
      const m = new Map();
      items.forEach((i) => { const k = keyFn(i); const c = m.get(k) || { label: labelFn(k, i), value: 0, qty: 0 }; c.value += i.price * i.qty; c.qty += i.qty; m.set(k, c); });
      return [...m.values()].sort((a, b) => b.value - a.value);
    };
    const byCat = group((i) => pmap.get(String(i.product_id))?.cat || 'khac', (k) => (AD.cache.categories || []).find((c) => c.id === k)?.name || 'Khác');
    const byBrand = group((i) => pmap.get(String(i.product_id))?.brand || 'khac', (k) => (AD.cache.brands || []).find((b) => b.id === k)?.name || 'Khác').slice(0, 10);
    const top = group((i) => String(i.product_id), (k, i) => i.name).slice(0, 10);
    const byPay = Object.entries(ok.reduce((m, o) => { m[o.payment] = (m[o.payment] || 0) + Number(o.total); return m; }, {})).map(([k, v]) => ({ label: AD.PAYMENT[k] || k, value: v })).sort((a, b) => b.value - a.value);
    // Doanh thu theo ngày (≤ 92 ngày) hoặc theo tháng
    const days = Math.round(((to || now) - from) / 86400000);
    const series = {};
    if (days <= 92) { for (let x = new Date(from); x < (to || now); x.setDate(x.getDate() + 1)) series[dayKey(x)] = 0; ok.forEach((o) => { const k = dayKey(o.created_at); if (k in series) series[k] += Number(o.total); }); }
    else { for (let m = from.getMonth(); m <= now.getMonth(); m++) series[`T${m + 1}`] = 0; ok.forEach((o) => { series[`T${new Date(o.created_at).getMonth() + 1}`] += Number(o.total); }); }
    const leadTypes = Object.keys(AD.LEAD_TYPE).map((t) => { const l = leads.rows.filter((x) => x.type === t); const won = l.filter((x) => x.status === 'won').length; return { type: AD.LEAD_TYPE[t], total: l.length, won, rate: l.length ? Math.round((won / l.length) * 100) : 0 }; });
    const cancel = all.length ? Math.round(((all.length - ok.length) / all.length) * 100) : 0;
    // Hiệu quả theo nguồn khách: lead + đơn + doanh thu; nhập chi phí quảng cáo để tính ROAS, chi phí / lead
    const showLeads = AD.me.role !== 'accountant';
    const srcKey = (a) => (a?.source ? `${a.source} / ${a.medium || '(none)'}` : 'Trực tiếp / không rõ');
    const srcMap = new Map();
    const srcRow = (k) => { if (!srcMap.has(k)) srcMap.set(k, { k, leads: 0, orders: 0, revenue: 0 }); return srcMap.get(k); };
    ok.forEach((o) => { const r = srcRow(srcKey(o.attribution)); r.orders++; r.revenue += Number(o.total); });
    if (showLeads) leads.rows.filter((l) => l.type !== 'newsletter').forEach((l) => { const [a, b] = String(l.data?.src || '').split(' / '); srcRow(a ? `${a} / ${b || '(none)'}` : 'Trực tiếp / không rõ').leads++; });
    const sources = [...srcMap.values()].sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
    const SPEND_KEY = 'dt_ad_spend_v1';
    const spendAll = (() => { try { return JSON.parse(localStorage.getItem(SPEND_KEY) || '{}'); } catch { return {}; } })();
    const spend = spendAll[pk] || {};

    el.querySelector('.ad-loading').outerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Doanh thu</span><b>${money(revenue)}</b><small>${ok.length} đơn thành công</small></div>
        <div class="kpi"><span>Giá trị đơn trung bình</span><b>${money(ok.length ? revenue / ok.length : 0)}</b><small>&nbsp;</small></div>
        <div class="kpi"><span>Sản phẩm bán ra</span><b>${sum(items, (i) => i.qty)}</b><small>${top.length ? `Nhiều nhất: ${esc(top[0].label.slice(0, 28))}` : '&nbsp;'}</small></div>
        <div class="kpi"><span>Tỷ lệ hủy đơn</span><b>${cancel}%</b><small>${all.length - ok.length} / ${all.length} đơn</small></div>
        ${showLeads ? `<div class="kpi"><span>Khách hàng tiềm năng</span><b>${leads.rows.length}</b><small>${leads.rows.filter((x) => x.status === 'won').length} chốt đơn</small></div>` : ''}
      </div>
      <section class="ad-card"><div class="ad-card-head"><h3>Doanh thu theo ${days <= 92 ? 'ngày' : 'tháng'}</h3><button class="btn btn-light btn-sm" id="csv">${ic('file')} Xuất CSV</button></div><div id="ch-rev"></div></section>
      <div class="ad-cols">
        <section class="ad-card"><h3>Doanh thu theo danh mục</h3><div id="ch-cat"></div></section>
        <section class="ad-card"><h3>Doanh thu theo thương hiệu (top 10)</h3><div id="ch-brand"></div></section>
      </div>
      <div class="ad-cols">
        <section class="ad-card"><h3>Top 10 sản phẩm</h3>${table([
          { label: '#', render: (r) => top.indexOf(r) + 1, cls: 'num' }, { label: 'Sản phẩm', render: (r) => esc(r.label) },
          { label: 'SL', key: 'qty', cls: 'num' }, { label: 'Doanh thu', render: (r) => money(r.value), cls: 'num' }], top, { empty: 'Chưa có đơn hàng' })}</section>
        <section class="ad-card"><h3>Theo phương thức thanh toán</h3><div id="ch-pay"></div>
          ${showLeads ? `<h3 style="margin-top:20px">Chuyển đổi khách hàng tiềm năng</h3>${table([
          { label: 'Loại', key: 'type' }, { label: 'Số yêu cầu', key: 'total', cls: 'num' }, { label: 'Chốt đơn', key: 'won', cls: 'num' }, { label: 'Tỷ lệ', render: (r) => `${r.rate}%`, cls: 'num' }], leadTypes)}` : ''}</section>
      </div>
      <section class="ad-card" id="sources"><div class="ad-card-head"><h3>Hiệu quả theo nguồn khách</h3><small class="muted">Nguồn ghi nhận từ link quảng cáo (UTM, gclid, fbclid) và trang giới thiệu. Nhập chi phí quảng cáo của kỳ để tính ROAS.</small></div>
        ${table([
          { label: 'Nguồn / kênh', render: (r) => `<b>${esc(r.k)}</b>` },
          ...(showLeads ? [{ label: 'Lead', key: 'leads', cls: 'num' }] : []),
          { label: 'Đơn', key: 'orders', cls: 'num' },
          { label: 'Doanh thu', render: (r) => money(r.revenue), cls: 'num' },
          { label: 'Chi phí QC (₫)', render: (r) => (r.k.startsWith('Trực tiếp') ? '<span class="muted">—</span>' : `<input type="number" min="0" step="10000" class="ad-spend" data-src="${esc(r.k)}" value="${spend[r.k] || ''}" aria-label="Chi phí quảng cáo ${esc(r.k)}">`), cls: 'num' },
          { label: 'ROAS', render: (r) => `<span data-roas="${esc(r.k)}"></span>`, cls: 'num' },
          ...(showLeads ? [{ label: 'Chi phí / lead', render: (r) => `<span data-cpl="${esc(r.k)}"></span>`, cls: 'num' }] : []),
        ], sources, { empty: 'Chưa có dữ liệu trong kỳ' })}
        <p class="muted" style="margin-top:8px">ROAS = doanh thu ÷ chi phí quảng cáo (ROAS 5 nghĩa là 1 đồng quảng cáo mang về 5 đồng doanh thu). Chi phí nhập ở đây chỉ lưu trên trình duyệt này. Số liệu chi tiết theo chiến dịch xem thêm trong Google Analytics 4 / Meta Ads Manager.</p>
      </section>`;
    AD.chart.columns(el.querySelector('#ch-rev'), Object.entries(series).map(([k, v]) => ({ label: k.startsWith('T') ? `Tháng ${k.slice(1)}` : new Date(k).toLocaleDateString('vi-VN'), short: k.startsWith('T') ? k : k.slice(8) + '/' + k.slice(5, 7), value: v })), { labelEvery: days > 45 && days <= 92 ? 7 : days > 15 && days <= 92 ? 3 : 1, tableLabel: days <= 92 ? 'Ngày' : 'Tháng' });
    AD.chart.bars(el.querySelector('#ch-cat'), byCat.map((c) => ({ ...c, extra: `${c.qty} sản phẩm` })), { tableLabel: 'Danh mục' });
    AD.chart.bars(el.querySelector('#ch-brand'), byBrand.map((c) => ({ ...c, extra: `${c.qty} sản phẩm` })), { tableLabel: 'Thương hiệu' });
    AD.chart.bars(el.querySelector('#ch-pay'), byPay, { tableLabel: 'Thanh toán' });
    const calc = () => sources.forEach((r) => {
      const c = Number(spend[r.k] || 0);
      const roas = el.querySelector(`[data-roas="${CSS.escape(r.k)}"]`); const cpl = el.querySelector(`[data-cpl="${CSS.escape(r.k)}"]`);
      if (roas) roas.innerHTML = c > 0 ? `<b class="${r.revenue / c >= 3 ? 'txt-ok' : r.revenue / c < 1 ? 'txt-danger' : ''}">${(r.revenue / c).toFixed(1)}</b>` : '<span class="muted">—</span>';
      if (cpl) cpl.textContent = c > 0 && r.leads ? money(Math.round(c / r.leads)) : '—';
    });
    calc();
    el.querySelectorAll('.ad-spend').forEach((inp) => inp.addEventListener('input', () => {
      const v = Math.max(0, Number(inp.value) || 0);
      if (v) spend[inp.dataset.src] = v; else delete spend[inp.dataset.src];
      spendAll[pk] = spend;
      try { localStorage.setItem(SPEND_KEY, JSON.stringify(spendAll)); } catch { /* bỏ qua */ }
      calc();
    }));
    el.querySelector('#csv').onclick = () => AD.ui.csv(`doanh-thu-${pk}.csv`, [{ label: 'Thời gian', key: 'k' }, { label: 'Doanh thu', key: 'v' }], Object.entries(series).map(([k, v]) => ({ k, v })));
  };
})();
