// Vận hành: Lịch bảo trì định kỳ (nhắc khách vệ sinh máy lạnh) & Xuất Excel MISA cho kế toán
window.AD = window.AD || {};
AD.pages = AD.pages || {};

(() => {
  const { esc, money, d, ic, table, run, toast } = AD.ui;
  const supa = () => AD.db.mode === 'supabase';
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  const localDay = (s, add = 0) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd + add); };
  const isAc = (i) => DT.api.productById(i.product_id ?? i.id)?.cat === 'may-lanh' || /máy lạnh|điều hòa/i.test(i.name || '');
  const store = async () => (await AD.db.get('settings', 'store'))?.value || {};
  const tel = (p) => (p ? `<a href="tel:${esc(p)}">${esc(p)}</a> · <a href="https://zalo.me/${esc(String(p).replace(/^0/, '84'))}" target="_blank" rel="noopener">Zalo</a>` : '');

  // ======================================================================= Lịch bảo trì
  // Database: hàng đợi notifications (event = maintenance_reminder), xếp khi đơn máy lạnh "Hoàn thành" + khách đồng ý.
  // Demo: tính từ đơn đã hoàn thành có tick nhắc bảo trì (không gửi thật).
  async function demoSchedule() {
    const cfg = await store();
    const months = Math.min(24, Math.max(1, parseInt(cfg.maintenanceMonths, 10) || 6));
    const cycles = Math.min(10, Math.max(1, parseInt(cfg.maintenanceCycles, 10) || 4));
    const { rows } = await AD.db.list('orders', { filters: [['status', 'eq', 'done'], ['maintenance_optin', 'eq', true]], limit: 5000 });
    const now = Date.now();
    return rows.flatMap((o) => {
      const ac = (o.order_items || []).filter(isAc);
      if (!ac.length) return [];
      const doneAt = new Date((o.order_status_history || []).filter((h) => h.status === 'done').pop()?.created_at || o.updated_at || o.created_at);
      return Array.from({ length: cycles }, (_, k) => {
        const due = new Date(doneAt.getFullYear(), doneAt.getMonth() + months * (k + 1), doneAt.getDate(), 9);
        return {
          id: `${o.code}-${k + 1}`, order_id: o.id, next_at: due.toISOString(), status: due.getTime() <= now ? 'done' : 'pending', results: {},
          data: { cycle: k + 1, months: months * (k + 1), phone: o.phone, name: o.customer?.name, gender: o.customer?.gender, email: o.customer?.email,
            units: ac.reduce((s, i) => s + i.qty, 0), items: ac.map((i) => `${i.qty} x ${i.name}`).join('; '), orderCode: o.code },
        };
      });
    });
  }
  const CHANNELS = ['email_customer', 'zns_customer', 'zalo_staff', 'telegram_staff', 'email_staff'];
  // Trạng thái hiển thị của 1 lần nhắc
  function stateOf(r) {
    if (r.results?.booked) return 'booked';
    if (r.results?.cancelled) return 'cancelled';
    if (r.status === 'pending' || r.status === 'processing') return 'upcoming';
    if (r.status === 'failed') return 'failed';
    return CHANNELS.some((c) => r.results?.[c]?.ok) ? 'sent' : 'due';
  }
  const STATE = {
    upcoming: ['Chờ đến hạn', 'info'], sent: ['Đã gửi nhắc', 'ok'], due: ['Đến hạn – gọi khách', 'warn'],
    booked: ['Khách đã đặt lịch', 'ok'], cancelled: ['Đã hủy nhắc', 'muted'], failed: ['Gửi lỗi', 'danger'],
  };
  const REASON = { order_cancelled: 'đơn đã hủy', opt_out: 'khách không muốn nhận', order_reopened: 'đơn chưa hoàn thành', staff: 'nhân viên bỏ' };

  async function scheduleRows() {
    if (!supa()) return demoSchedule();
    return (await AD.db.list('notifications', { filters: [['event', 'eq', 'maintenance_reminder']], order: 'next_at.asc', limit: 5000 })).rows;
  }

  // Tóm tắt lịch nhắc của 1 đơn (trang chi tiết đơn)
  AD.maintenanceOf = async (o) => {
    try {
      const rows = supa()
        ? (await AD.db.list('notifications', { filters: [['event', 'eq', 'maintenance_reminder'], ['order_id', 'eq', o.id]], order: 'next_at.asc', limit: 20 })).rows
        : (await demoSchedule()).filter((r) => String(r.order_id) === String(o.id));
      if (!rows.length) return null;
      const next = rows.find((r) => stateOf(r) === 'upcoming');
      const booked = rows.filter((r) => stateOf(r) === 'booked').length;
      return `Lịch nhắc: ${rows.length} lần${next ? ` • lần tới ${d(next.next_at)}` : ' • không còn lần nhắc nào đang chờ'}${booked ? ` • khách đã đặt lịch ${booked} lần` : ''}`;
    } catch { return null; }
  }

  AD.pages.maintenance = async (params, el) => {
    const tab = params.tab || 'upcoming';
    const all = await scheduleRows();
    const now = Date.now();
    const in30 = all.filter((r) => stateOf(r) === 'upcoming' && new Date(r.next_at) - now <= 30 * 864e5).length;
    const reached = all.filter((r) => ['sent', 'due', 'booked'].includes(stateOf(r)));
    const booked = all.filter((r) => stateOf(r) === 'booked').length;
    const customers = new Set(all.filter((r) => stateOf(r) !== 'cancelled').map((r) => r.data?.phone)).size;
    const q = DT.u.norm(params.q || '');
    const TABS = { upcoming: 'Sắp tới', reached: 'Đã đến hạn', booked: 'Khách đã đặt lịch', cancelled: 'Đã hủy', all: 'Tất cả' };
    const rows = all.filter((r) => {
      const st = stateOf(r);
      const okTab = tab === 'all' || (tab === 'reached' ? ['sent', 'due', 'failed'].includes(st) : st === tab);
      return okTab && (!q || DT.u.norm(`${r.data?.name || ''} ${r.data?.phone || ''} ${r.data?.orderCode || ''}`).includes(q));
    });
    if (tab !== 'upcoming') rows.reverse();
    el.innerHTML = `<div class="ad-head"><div><h1>Lịch bảo trì định kỳ</h1><small class="muted">Nhắc khách vệ sinh máy lạnh theo chu kỳ – nguồn doanh thu dịch vụ lặp lại</small></div>
        <div class="ad-head-actions"><button class="btn btn-light" id="csv">${ic('file')} Xuất CSV</button></div></div>
      ${supa() ? '' : `<div class="ad-alert">${ic('alert')}<div><b>Bản demo:</b> lịch được tính từ các đơn <b>Hoàn thành</b> có tick "Nhắc bảo trì". Khi kết nối Supabase, hệ thống tự gửi email / Zalo ZNS cho khách và báo nhân viên đúng ngày.</div></div>`}
      <div class="kpis">
        <div class="kpi"><span>Đến hạn trong 30 ngày</span><b>${in30}</b><small>lần nhắc</small></div>
        <div class="kpi"><span>Khách đang theo dõi</span><b>${customers}</b><small>số điện thoại</small></div>
        <div class="kpi"><span>Đã nhắc</span><b>${reached.length}</b><small>lần</small></div>
        <div class="kpi"><span>Khách quay lại đặt lịch</span><b>${booked}</b><small>${reached.length ? `${Math.round((booked / reached.length) * 100)}% số lần nhắc` : '&nbsp;'}</small></div>
      </div>
      <div class="ad-tabs">${Object.entries(TABS).map(([k, l]) => `<a href="#/maintenance?tab=${k}" class="${tab === k ? 'active' : ''}">${l}</a>`).join('')}</div>
      <form class="ad-toolbar" id="tb"><input type="hidden" name="tab" value="${esc(tab)}"><input name="q" type="search" placeholder="Tên, SĐT, mã đơn…" value="${esc(params.q || '')}"><button class="btn btn-light">${ic('search')} Lọc</button></form>
      <div id="list">${table([
        { label: 'Ngày nhắc', render: (r) => `<b>${d(r.next_at)}</b><small>Lần ${r.data?.cycle || 1} • ${r.data?.months || ''} tháng sau lắp</small>` },
        { label: 'Khách hàng', render: (r) => `${esc([r.data?.gender, r.data?.name].filter(Boolean).join(' '))}<small>${tel(r.data?.phone)}</small>` },
        { label: 'Máy lạnh', render: (r) => `<span class="clamp">${esc(r.data?.items || '')}</span>` },
        { label: 'Đơn', render: (r) => (r.order_id ? `<a href="#/orders/${encodeURIComponent(r.order_id)}">${esc(r.data?.orderCode || r.order_id)}</a>` : esc(r.data?.orderCode || '')) },
        { label: 'Trạng thái', render: (r) => { const st = stateOf(r); const why = st === 'cancelled' ? REASON[r.results.cancelled.reason] : st === 'booked' ? `lead ${r.results.booked.lead || ''}` : ''; return `<span class="st st-${STATE[st][1]}">${STATE[st][0]}</span>${why ? `<small>${esc(why)}</small>` : ''}`; } },
        { label: '', cls: 'actions', render: (r) => {
          if (!supa() || !AD.isOps()) return '';
          const st = stateOf(r);
          if (st === 'upcoming') return `<button class="btn btn-sm btn-light" data-now="${r.id}">Gửi ngay</button><button class="btn btn-sm btn-light txt-danger" data-skip="${r.id}">Bỏ nhắc</button>`;
          if (st === 'cancelled' && r.results.cancelled.reason === 'staff' && new Date(r.next_at) > now) return `<button class="btn btn-sm btn-light" data-unskip="${r.id}">Bật lại</button>`;
          return '';
        } },
      ], rows, { empty: tab === 'upcoming' ? 'Chưa có lịch nhắc. Lịch tự xếp khi đơn có máy lạnh chuyển sang "Hoàn thành" và khách đồng ý nhận nhắc.' : 'Không có dữ liệu' })}</div>
      <details class="ad-card ad-help"><summary>${ic('alert')} Cách hoạt động & cài đặt</summary><ol>
        <li>Khi đặt hàng có máy lạnh, khách tick <b>"Nhắc tôi lịch vệ sinh máy lạnh định kỳ"</b> (không tick sẵn, đúng Nghị định 13/2023). Nhân viên cũng bật được trong chi tiết đơn khi khách đồng ý qua điện thoại.</li>
        <li>Đơn chuyển sang <b>Hoàn thành</b> → hệ thống xếp lịch nhắc sau ${'6, 12, 18, 24'} tháng (đổi chu kỳ ở Cài đặt cửa hàng › Nhắc bảo trì định kỳ).</li>
        <li>Đúng ngày (9h sáng): gửi email có nút <b>Đặt lịch vệ sinh</b>, Zalo ZNS (nếu đăng ký mẫu <code>ZNS_TEMPLATE_MAINT</code>) và báo nhân viên gọi chăm sóc.</li>
        <li>Khách đặt lịch dịch vụ (cùng số điện thoại) → ghi nhận <b>Khách đã đặt lịch</b>, bỏ lời nhắc sắp đến hạn. Hủy đơn → tự hủy nhắc.</li>
      </ol></details>`;
    AD.bindToolbar(el.querySelector('#tb'), 'maintenance', params);
    const act = (sel, fn, msg) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => { if (await run(b, () => fn(b), msg)) { AD.refreshBadges(); AD.route(); } }));
    act('[data-now]', (b) => AD.db.update('notifications', b.dataset.now, { next_at: new Date().toISOString() }), 'Đã đưa vào hàng đợi gửi (trong vòng 1 phút)');
    act('[data-skip]', (b) => AD.db.rpc('maintenance_skip', { p_id: Number(b.dataset.skip), p_skip: true }), 'Đã bỏ lần nhắc này');
    act('[data-unskip]', (b) => AD.db.rpc('maintenance_skip', { p_id: Number(b.dataset.unskip), p_skip: false }), 'Đã bật lại');
    el.querySelector('#csv').onclick = () => AD.ui.csv(`lich-bao-tri-${ymd(new Date())}.csv`, [
      { label: 'Ngày nhắc', value: (r) => d(r.next_at) }, { label: 'Lần', value: (r) => r.data?.cycle }, { label: 'Khách hàng', value: (r) => r.data?.name },
      { label: 'SĐT', value: (r) => r.data?.phone }, { label: 'Email', value: (r) => r.data?.email }, { label: 'Máy lạnh', value: (r) => r.data?.items },
      { label: 'Mã đơn', value: (r) => r.data?.orderCode }, { label: 'Trạng thái', value: (r) => STATE[stateOf(r)][0] },
    ], rows);
  };

  // ======================================================================= Xuất Excel MISA
  // Giá trên website đã gồm VAT -> tách đơn giá trước thuế & tiền thuế. Tổng mỗi chứng từ = tổng tiền đơn hàng.
  const ACC = { misaDebitAcc: '131', misaCashAcc: '1111', misaBankAcc: '1121', misaRevenueAcc: '5111', misaServiceAcc: '5113', misaVatAcc: '33311', misaDiscountAcc: '5211', misaWarehouse: '' };
  const VOUCHER_COLS = [
    { label: 'Ngày hạch toán (*)', type: 'date', width: 14 }, { label: 'Ngày chứng từ (*)', type: 'date', width: 14 }, { label: 'Số chứng từ (*)', width: 16 },
    { label: 'Phương thức thanh toán', width: 26 }, { label: 'Mã khách hàng', width: 18 }, { label: 'Tên khách hàng', width: 30 }, { label: 'Địa chỉ', width: 36 },
    { label: 'Mã số thuế', width: 14 }, { label: 'Điện thoại', width: 13 }, { label: 'Diễn giải', width: 36 },
    { label: 'Mã hàng (*)', width: 14 }, { label: 'Tên hàng', width: 40 }, { label: 'ĐVT', width: 7 }, { label: 'Số lượng', type: 'number', width: 9 },
    { label: 'Đơn giá sau thuế', type: 'money', width: 15 }, { label: 'Đơn giá', type: 'money', width: 14 }, { label: 'Thành tiền', type: 'money', width: 15 },
    { label: 'Tỷ lệ CK (%)', type: 'number', width: 10 }, { label: 'Tiền chiết khấu', type: 'money', width: 14 }, { label: '% thuế GTGT', width: 10 },
    { label: 'Tiền thuế GTGT', type: 'money', width: 14 }, { label: 'TK Nợ/TK tiền (*)', width: 12 }, { label: 'TK Doanh thu/Có (*)', width: 12 },
    { label: 'TK chiết khấu', width: 12 }, { label: 'TK thuế GTGT', width: 12 }, { label: 'Kho', width: 10 },
    { label: 'Tổng thanh toán đơn (đối chiếu)', type: 'money', width: 16 }, { label: 'Trạng thái thanh toán', width: 18 },
  ];

  // Chia tiền theo tỷ lệ, tổng các phần đúng bằng tổng (dư làm tròn dồn vào phần cuối)
  function allocate(total, weights) {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (!total || !sum) return weights.map(() => 0);
    let used = 0;
    return weights.map((w, i) => { if (i === weights.length - 1) return total - used; const v = Math.round((total * w) / sum); used += v; return v; });
  }

  // Đơn hàng -> các dòng chứng từ bán hàng
  function voucherLines(o, cfg) {
    const vat = Number(cfg.vatRate ?? 10);
    const r = vat > 0 ? vat / 100 : 0;
    const items = o.order_items || [];
    const lines = items.map((i) => ({
      code: i.sku || `SP${i.product_id}`, name: i.name, unit: isAc(i) ? 'Bộ' : 'Cái', qty: i.qty, price: Number(i.price), gross: Number(i.price) * i.qty, acc: cfg.misaRevenueAcc, goods: true,
    }));
    if (Number(o.install_fee) > 0) {
      const n = items.filter((i) => i.install).reduce((s, i) => s + i.qty, 0);
      const qty = n && Number(o.install_fee) % n === 0 ? n : 1;
      lines.push({ code: 'DV-LAPDAT', name: 'Phí lắp đặt máy lạnh', unit: qty > 1 ? 'Bộ' : 'Lần', qty, price: Number(o.install_fee) / qty, gross: Number(o.install_fee), acc: cfg.misaServiceAcc, goods: false });
    }
    if (Number(o.shipping_fee) > 0) lines.push({ code: 'DV-VANCHUYEN', name: 'Phí vận chuyển', unit: 'Lần', qty: 1, price: Number(o.shipping_fee), gross: Number(o.shipping_fee), acc: cfg.misaServiceAcc, goods: false });
    // Giảm giá phân bổ theo giá trị hàng hóa (mã giảm giá áp trên tiền hàng)
    const goodsSum = lines.filter((l) => l.goods).reduce((s, l) => s + l.gross, 0);
    const disc = Number(o.discount) || 0;
    const ck = allocate(disc, lines.map((l) => (goodsSum >= disc ? (l.goods ? l.gross : 0) : l.gross)));
    return lines.map((l, i) => {
      const unitNet = r ? Math.round(l.price / (1 + r)) : l.price;
      const amount = unitNet * l.qty;
      const ckNet = r ? Math.round(ck[i] / (1 + r)) : ck[i];
      const tax = vat > 0 ? (l.gross - ck[i]) - (amount - ckNet) : 0;
      return { ...l, unitNet, amount, ck: ckNet, ckRate: amount ? Math.round((ckNet / amount) * 10000) / 100 : 0, tax, total: amount - ckNet + tax };
    });
  }

  function customerOf(o) {
    const inv = o.invoice || {};
    if (inv.taxCode) return { code: `KH${String(inv.taxCode).replace(/\W/g, '')}`, name: inv.company || o.customer?.name, address: inv.address || '', tax: inv.taxCode, org: true };
    const s = o.shipping || {};
    return { code: `KL${String(o.phone || '').replace(/\D/g, '').replace(/^84/, '0')}`, name: [o.customer?.gender, o.customer?.name].filter(Boolean).join(' '),
      address: s.method === 'pickup' ? '' : [s.address, s.district, s.province].filter(Boolean).join(', '), tax: '', org: false };
  }

  function payInfo(o, cfg) {
    if (o.payment_status !== 'paid') return ['Chưa thu tiền', cfg.misaDebitAcc];
    return o.payment === 'cod' ? ['Thu tiền ngay - Tiền mặt', cfg.misaCashAcc] : ['Thu tiền ngay - Chuyển khoản', cfg.misaBankAcc];
  }

  function buildMisa(orders, cfg, opt) {
    const vat = Number(cfg.vatRate ?? 10);
    const vatLabel = vat < 0 ? 'KCT' : `${vat}%`;
    const vouchers = []; const customers = new Map(); const goods = new Map();
    let net = 0; let tax = 0; let total = 0;
    orders.forEach((o) => {
      const date = (opt.docDate === 'done' && (o.order_status_history || []).filter((h) => h.status === 'done').pop()?.created_at) || o.created_at;
      const day = ymd(new Date(date));
      const cu = customerOf(o);
      const [method, debit] = payInfo(o, cfg);
      customers.set(cu.code, { ...cu, phone: o.phone, email: o.invoice?.email || o.customer?.email || '' });
      const lines = voucherLines(o, cfg);
      lines.forEach((l) => {
        if (!goods.has(l.code)) goods.set(l.code, l);
        net += l.amount - l.ck; tax += l.tax; total += l.total;
        vouchers.push([day, day, o.code, method, cu.code, cu.name, cu.address, cu.tax, o.phone, `Bán hàng theo đơn ${o.code}`,
          l.code, l.name, l.unit, l.qty, l.price, l.unitNet, l.amount, l.ckRate || '', l.ck || '', vatLabel, l.tax,
          debit, l.acc, l.ck ? cfg.misaDiscountAcc || l.acc : '', vat > 0 ? cfg.misaVatAcc : '', l.goods ? cfg.misaWarehouse || '' : '',
          Number(o.total), AD.PAY_STATUS[o.payment_status]?.[0] || o.payment_status]);
      });
    });
    const sheets = [
      { name: 'Chung tu ban hang', columns: VOUCHER_COLS, rows: vouchers },
      { name: 'Khach hang', columns: [{ label: 'Mã khách hàng (*)', width: 18 }, { label: 'Tên khách hàng (*)', width: 32 }, { label: 'Là tổ chức/cá nhân', width: 16 }, { label: 'Địa chỉ', width: 40 }, { label: 'Mã số thuế', width: 14 }, { label: 'Điện thoại', width: 13 }, { label: 'Email', width: 26 }],
        rows: [...customers.values()].map((c) => [c.code, c.name, c.org ? 'Tổ chức' : 'Cá nhân', c.address, c.tax, c.phone, c.email]) },
      { name: 'Vat tu hang hoa', columns: [{ label: 'Mã (*)', width: 14 }, { label: 'Tên (*)', width: 42 }, { label: 'Tính chất', width: 16 }, { label: 'ĐVT chính', width: 9 }, { label: 'Thuế suất GTGT', width: 12 }, { label: 'TK kho', width: 9 }, { label: 'TK doanh thu', width: 12 }, { label: 'Đơn giá bán (gồm VAT)', type: 'money', width: 16 }],
        rows: [...goods.values()].map((g) => [g.code, g.name, g.goods ? 'Vật tư hàng hóa' : 'Dịch vụ', g.unit, vatLabel, g.goods ? '1561' : '', g.acc, g.price]) },
      { name: 'Huong dan', columns: [{ label: 'Hướng dẫn nhập khẩu vào MISA', width: 120 }], rows: [
        [`Xuất từ website lúc ${new Date().toLocaleString('vi-VN')} • ${orders.length} đơn • Doanh thu chưa thuế ${money(net)} • Thuế GTGT ${money(tax)} • Tổng thanh toán ${money(total)}`],
        ['1. Nhập sheet "Khach hang" trước: MISA › Danh mục › Khách hàng › Nhập khẩu từ Excel (bỏ qua khách đã có).'],
        ['2. Nhập sheet "Vat tu hang hoa": Danh mục › Vật tư hàng hóa › Nhập khẩu từ Excel (bỏ qua mã đã có).'],
        ['3. Nhập sheet "Chung tu ban hang": Bán hàng › Nhập khẩu từ Excel › chọn mẫu Chứng từ bán hàng; ở bước Ghép cột, chọn cột tương ứng (lần đầu lưu lại cách ghép để dùng các lần sau).'],
        ['4. Mỗi đơn hàng là 1 chứng từ (Số chứng từ = mã đơn), mỗi sản phẩm / phí là 1 dòng. Giá website đã gồm VAT: Đơn giá = giá trước thuế; Tiền thuế GTGT đã làm tròn để tổng chứng từ khớp đúng tổng tiền đơn hàng.'],
        ['5. Kiểm tra tài khoản (131/1111/1121, 5111/5113, 33311, 5211) và thuế suất theo chế độ kế toán của doanh nghiệp (TT200 hoặc TT133) trước khi ghi sổ.'],
        ['6. Cột "Tổng thanh toán đơn (đối chiếu)" và "Trạng thái thanh toán" chỉ để đối chiếu, không cần ghép khi nhập.'],
      ] },
    ];
    return { sheets, summary: { orders: orders.length, lines: vouchers.length, net, tax, total, expect: orders.reduce((s, o) => s + Number(o.total), 0) } };
  }
  AD.misa = { voucherLines, buildMisa, allocate };

  AD.pages.misa = async (params, el) => {
    const cfg0 = await store();
    const today = new Date();
    const from = params.from || ymd(new Date(today.getFullYear(), today.getMonth(), 1));
    const to = params.to || ymd(today);
    const scope = params.scope || 'done';
    const docDate = params.date || 'done';
    const cfg = { ...ACC, ...Object.fromEntries(Object.entries(cfg0).filter(([k, v]) => k in ACC && v)), vatRate: params.vat ?? cfg0.vatRate ?? 10 };
    const SCOPES = { done: 'Đơn đã hoàn thành (khuyến nghị)', paid: 'Đơn đã thanh toán (chưa hủy)', valid: 'Tất cả đơn trừ đơn đã hủy' };
    el.innerHTML = `<div class="ad-head"><div><h1>Xuất Excel MISA</h1><small class="muted">Chứng từ bán hàng, danh mục khách hàng, hàng hóa – kế toán nhập khẩu vào MISA, không phải gõ tay</small></div></div>
      <form class="ad-card ad-form" id="mf" novalidate><div class="ad-grid">
        <div class="ad-field quarter"><label>Từ ngày (ngày đặt hàng)</label><input type="date" name="from" value="${esc(from)}" required></div>
        <div class="ad-field quarter"><label>Đến ngày</label><input type="date" name="to" value="${esc(to)}" required></div>
        <div class="ad-field quarter"><label>Đơn hàng</label><select name="scope">${Object.entries(SCOPES).map(([k, l]) => `<option value="${k}" ${scope === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="ad-field quarter"><label>Ngày chứng từ</label><select name="date"><option value="done" ${docDate === 'done' ? 'selected' : ''}>Ngày hoàn thành đơn</option><option value="created" ${docDate === 'created' ? 'selected' : ''}>Ngày đặt hàng</option></select></div>
        <div class="ad-field quarter"><label>Thuế suất GTGT</label><select name="vat">${[['10', '10%'], ['8', '8%'], ['5', '5%'], ['0', '0%'], ['-1', 'Không chịu thuế']].map(([k, l]) => `<option value="${k}" ${String(cfg.vatRate) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="ad-field full"><small class="help">Tài khoản: công nợ ${esc(cfg.misaDebitAcc)} • tiền mặt ${esc(cfg.misaCashAcc)} • ngân hàng ${esc(cfg.misaBankAcc)} • doanh thu ${esc(cfg.misaRevenueAcc)} / dịch vụ ${esc(cfg.misaServiceAcc)} • thuế ${esc(cfg.misaVatAcc)} • chiết khấu ${esc(cfg.misaDiscountAcc || '(trừ thẳng doanh thu)')}${cfg.misaWarehouse ? ` • kho ${esc(cfg.misaWarehouse)}` : ''}. ${AD.me.role === 'admin' ? '<a href="#/settings">Đổi trong Cài đặt cửa hàng</a>' : 'Quản trị viên đổi trong Cài đặt cửa hàng.'}</small></div>
      </div><div class="ad-form-foot"><button class="btn btn-light" name="preview">${ic('search')} Xem trước</button><button type="button" class="btn btn-primary" id="dl">${ic('file')} Tải file Excel (.xlsx)</button></div></form>
      <div id="pv"><div class="ad-loading">Đang tải…</div></div>`;
    const form = el.querySelector('#mf');
    const read = () => ({ from: form.from.value, to: form.to.value, scope: form.scope.value, date: form.date.value, vat: form.vat.value });
    form.addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/misa?${new URLSearchParams(read())}`; });
    form.querySelectorAll('select').forEach((s) => s.addEventListener('change', () => form.requestSubmit()));

    async function load() {
      const p = read();
      if (!p.from || !p.to || p.from > p.to) throw new Error('Khoảng ngày không hợp lệ');
      const filters = [['created_at', 'gte', localDay(p.from).toISOString()], ['created_at', 'lt', localDay(p.to, 1).toISOString()], ['status', 'neq', 'cancelled']];
      if (p.scope === 'done') filters.push(['status', 'eq', 'done']);
      if (p.scope === 'paid') filters.push(['payment_status', 'eq', 'paid']);
      const { rows } = await AD.db.list('orders', { select: '*,order_items(*),order_status_history(*)', filters, order: 'created_at.asc', limit: 5000 });
      return buildMisa(rows, { ...cfg, vatRate: Number(p.vat) }, { docDate: p.date });
    }
    const pv = el.querySelector('#pv');
    let built;
    try { built = await load(); } catch (e) { pv.innerHTML = `<div class="ad-empty">${ic('alert')}<p>${esc(e.message)}</p></div>`; return; }
    const s = built.summary;
    const vs = built.sheets[0];
    pv.innerHTML = `<div class="kpis">
        <div class="kpi"><span>Số chứng từ (đơn)</span><b>${s.orders}</b><small>${s.lines} dòng hàng</small></div>
        <div class="kpi"><span>Doanh thu chưa thuế</span><b>${money(s.net)}</b><small>sau chiết khấu</small></div>
        <div class="kpi"><span>Thuế GTGT</span><b>${money(s.tax)}</b><small>&nbsp;</small></div>
        <div class="kpi"><span>Tổng thanh toán</span><b>${money(s.total)}</b><small class="${s.total === s.expect ? 'txt-ok' : 'txt-danger'}">${s.total === s.expect ? '✓ Khớp tổng tiền đơn hàng' : `Lệch ${money(s.total - s.expect)}`}</small></div>
      </div>
      <section class="ad-card"><div class="ad-card-head"><h3>Xem trước chứng từ bán hàng</h3><small class="muted">${s.lines > 30 ? `30 / ${s.lines} dòng đầu` : `${s.lines} dòng`}</small></div>
      ${table([0, 2, 5, 10, 11, 13, 15, 16, 18, 20, 21, 22].map((i) => ({ label: VOUCHER_COLS[i].label.replace(' (*)', ''), cls: VOUCHER_COLS[i].type === 'money' || VOUCHER_COLS[i].type === 'number' ? 'num' : '',
        render: (r) => (VOUCHER_COLS[i].type === 'date' ? d(r[i]) : VOUCHER_COLS[i].type === 'money' ? (r[i] === '' ? '' : money(r[i])) : esc(r[i])) })), vs.rows.slice(0, 30), { empty: 'Không có đơn hàng phù hợp trong khoảng ngày này' })}</section>
      <details class="ad-card ad-help"><summary>${ic('file')} Hướng dẫn nhập vào MISA</summary><ol>${built.sheets[3].rows.slice(1).map((r) => `<li>${esc(String(r[0]).replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>
        <p class="muted">Mẫu nhập khẩu có thể khác nhau giữa MISA SME (2019 – 2024) và MISA AMIS. Lần đầu, kế toán đối chiếu tên cột với mẫu của phiên bản đang dùng và lưu cách ghép cột.</p></details>`;
    el.querySelector('#dl').onclick = async () => {
      if (!s.orders) { toast('Không có đơn hàng nào để xuất', 'error'); return; }
      AD.xlsx.download(`MISA-ban-hang-${form.from.value}-den-${form.to.value}.xlsx`, built.sheets);
      toast(`Đã xuất ${s.orders} chứng từ`);
    };
  };
})();
