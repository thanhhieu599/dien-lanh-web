import {ad as AD,money} from './runtime';
import type {Row} from '../types';
const ymd=(x:Date)=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
const isAc=(i:Row)=>AD.product(i.product_id??i.id)?.cat==='may-lanh'||/máy lạnh|điều hòa/i.test(i.name||'');
  export const ACC = { misaDebitAcc: '131', misaCashAcc: '1111', misaBankAcc: '1121', misaRevenueAcc: '5111', misaServiceAcc: '5113', misaVatAcc: '33311', misaDiscountAcc: '5211', misaWarehouse: '' };
  export const VOUCHER_COLS = [
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
  export function allocate(total:number, weights:number[]) {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (!total || !sum) return weights.map(() => 0);
    let used = 0;
    // Phần dư làm tròn dồn vào dòng cuối CÓ trọng số (không để dòng phí lắp đặt / vận chuyển nhận chiết khấu ±1₫)
    const last = weights.reduce((k, w, i) => (w > 0 ? i : k), -1);
    return weights.map((w, i) => { if (i === last) return total - used; if (!w) return 0; const v = Math.round((total * w) / sum); used += v; return v; });
  }

  // Đơn hàng -> các dòng chứng từ bán hàng
  // Thuế suất của đơn: đơn tạo tại admin tự chọn thuế suất (và có thể "chưa gồm VAT"); đơn website theo cài đặt
  export const orderVat = (o:Row, cfg:Row) => (o.vat_rate != null && o.vat_rate !== '' ? Number(o.vat_rate) : Number(cfg.vatRate ?? 10));
  export function voucherLines(o:Row, cfg:Row):Row[] {
    const vat = orderVat(o, cfg);
    const r = vat > 0 ? vat / 100 : 0;
    const excluded = r > 0 && o.vat_included === false;
    const items = o.order_items || [];
    const lines:Row[] = items.map((i:Row) => ({
      code: i.sku || `SP${i.product_id}`, name: i.name, unit: isAc(i) ? 'Bộ' : 'Cái', qty: i.qty, price: Number(i.price), gross: Number(i.price) * i.qty, acc: cfg.misaRevenueAcc, goods: true,
    }));
    if (Number(o.install_fee) > 0) {
      // Chỉ đếm máy có tính phí lắp (máy "miễn phí lắp đặt" không tính)
      const n = items.filter((i:Row) => i.install && !AD.product(i.product_id)?.freeInstall).reduce((s:number, i:Row) => s + i.qty, 0);
      const qty = n && Number(o.install_fee) % n === 0 ? n : 1;
      lines.push({ code: 'DV-LAPDAT', name: 'Phí lắp đặt máy lạnh', unit: qty > 1 ? 'Bộ' : 'Lần', qty, price: Number(o.install_fee) / qty, gross: Number(o.install_fee), acc: cfg.misaServiceAcc, goods: false });
    }
    if (Number(o.shipping_fee) > 0) lines.push({ code: 'DV-VANCHUYEN', name: 'Phí vận chuyển', unit: 'Lần', qty: 1, price: Number(o.shipping_fee), gross: Number(o.shipping_fee), acc: cfg.misaServiceAcc, goods: false });
    // Giảm giá phân bổ theo giá trị hàng hóa (mã giảm giá áp trên tiền hàng)
    const goodsSum = lines.filter((l) => l.goods).reduce((s, l) => s + l.gross, 0);
    const disc = Number(o.discount) || 0;
    const ck = allocate(disc, lines.map((l) => (goodsSum >= disc ? (l.goods ? l.gross : 0) : l.gross)));
    const out = lines.map((l, i) => {
      // Giá chưa gồm VAT (đơn admin): đơn giá là giá trước thuế, thuế cộng thêm
      const unitNet = excluded ? l.price : r ? Math.round(l.price / (1 + r)) : l.price;
      const amount = unitNet * l.qty;
      const ckNet = excluded ? ck[i] : r ? Math.round(ck[i] / (1 + r)) : ck[i];
      const tax = vat > 0 ? (excluded ? Math.round((amount - ckNet) * r) : (l.gross - ck[i]) - (amount - ckNet)) : 0;
      return { ...l, unitNet, amount, ck: ckNet, ckRate: amount ? Math.round((ckNet / amount) * 10000) / 100 : 0, tax, total: amount - ckNet + tax };
    });
    // Làm tròn thuế từng dòng có thể lệch vài đồng so với tổng đơn: dồn phần lệch vào dòng cuối
    const diff = Number(o.total) - out.reduce((s, l) => s + l.total, 0);
    if (excluded && out.length && diff) { const last = out[out.length - 1]; last.tax += diff; last.total += diff; }
    return out;
  }

  function customerOf(o:Row) {
    const inv = o.invoice || {};
    if (inv.taxCode) return { code: `KH${String(inv.taxCode).replace(/\W/g, '')}`, name: inv.company || o.customer?.name, address: inv.address || '', tax: inv.taxCode, org: true };
    const s = o.shipping || {};
    return { code: `KL${String(o.phone || '').replace(/\D/g, '').replace(/^84/, '0')}`, name: [o.customer?.gender, o.customer?.name].filter(Boolean).join(' '),
      address: s.method === 'pickup' ? '' : [s.address, s.district, s.province].filter(Boolean).join(', '), tax: '', org: false };
  }

  function payInfo(o:Row, cfg:Row) {
    if (o.payment_status !== 'paid') return ['Chưa thu tiền', cfg.misaDebitAcc];
    return o.payment === 'cod' ? ['Thu tiền ngay - Tiền mặt', cfg.misaCashAcc] : ['Thu tiền ngay - Chuyển khoản', cfg.misaBankAcc];
  }

  export function buildMisa(orders:Row[], cfg:Row, opt:Row) {
    const vat = Number(cfg.vatRate ?? 10);
    const vatLabel = vat < 0 ? 'KCT' : `${vat}%`;
    const vouchers:any[][] = []; const customers = new Map<string,Row>(); const goods = new Map<string,Row>();
    let net = 0; let tax = 0; let total = 0;
    orders.forEach((o) => {
      const hist = (o.order_status_history || []).slice().sort((a:Row, b:Row) => String(a.created_at).localeCompare(String(b.created_at)));
      const date = (opt.docDate === 'done' && hist.filter((h:Row) => h.status === 'done').pop()?.created_at) || o.created_at;
      const day = ymd(new Date(date));
      const cu = customerOf(o);
      const [method, debit] = payInfo(o, cfg);
      customers.set(cu.code, { ...cu, phone: o.phone, email: o.invoice?.email || o.customer?.email || '' });
      const lines = voucherLines(o, cfg);
      lines.forEach((l) => {
        if (!goods.has(l.code)) goods.set(l.code, l);
        net += l.amount - l.ck; tax += l.tax; total += l.total;
        const ov = orderVat(o, cfg);
        vouchers.push([day, day, o.code, method, cu.code, cu.name, cu.address, cu.tax, o.phone, `Bán hàng theo đơn ${o.code}`,
          l.code, l.name, l.unit, l.qty, l.price, l.unitNet, l.amount, l.ckRate || '', l.ck || '', ov < 0 ? 'KCT' : `${ov}%`, l.tax,
          debit, l.acc, l.ck ? cfg.misaDiscountAcc || l.acc : '', ov > 0 ? cfg.misaVatAcc : '', l.goods ? cfg.misaWarehouse || '' : '',
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
