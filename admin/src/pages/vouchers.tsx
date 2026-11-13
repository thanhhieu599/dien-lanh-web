// Phiếu nhập kho và Phiếu xuất kho (bố cục theo mẫu 01-VT / 02-VT), có logo công ty; in A4 trắng – đen.
//  /voucher/nhap/<id đơn nhập>   : phiếu nhập kho của đơn nhập hàng đã nhập kho
//  /voucher/xuat/<id phiếu xuất> : phiếu xuất kho (hàng hỏng, mẫu, quà tặng, nội bộ, trả NCC)
//  /voucher/ban/<id đơn hàng>    : phiếu xuất kho bán hàng theo đơn của khách
import {Link, useLocation} from 'react-router-dom';
import {ad, dt} from '../services/runtime';
import {EXPORT_REASONS, moneyWords} from '../services/inventory';
import {DataState, Head, useData} from '../components/common';
import {DocLogo} from '../components/doc-logo';
import type {Row} from '../types';

const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');
const parts = (iso?: string | null) => { const d = iso ? new Date(iso) : new Date(); return `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`; };
// Tài khoản Nợ theo lý do xuất (Có 156 - hàng hóa)
const EXPORT_DEBIT: Record<string, string> = {damaged: '632', sample: '641', gift: '641', internal: '642', return_supplier: '331', other: '632', sale: '632'};

export type VoucherLine = {name: string; sku: string; unit: string; docQty: number; qty: number | null; price: number; amount: number};
export interface Voucher {
  type: 'in' | 'out'; no: string; date: string | null; debit: string; credit: string; ready: boolean; notReady?: string;
  person: string; personAddress: string; department?: string; reason: string; basis: string; lines: VoucherLine[]; total: number; back: string;
}

// Phân bổ chiết khấu đơn + chi phí nhập vào giá nhập kho (khớp cách máy chủ tính giá vốn); dòng cuối nhận phần làm tròn
export function purchaseVoucherLines(po: Row): {lines: VoucherLine[]; total: number} {
  const items: Row[] = po.items || [];
  const goods = Math.max(1, Number(po.goods) || 0), extra = (Number(po.costs_total) || 0) - (Number(po.discount) || 0);
  const total = Math.max(0, (Number(po.goods) || 0) + extra);
  let used = 0;
  const lines = items.map((l, i) => {
    const net = l.qty * l.price - (l.discount || 0);
    const amount = i === items.length - 1 ? total - used : Math.round(net + (extra * net) / goods);
    used += amount;
    return {name: l.name, sku: l.sku, unit: l.unit || 'Cái', docQty: l.qty, qty: l.qty, price: l.qty ? amount / l.qty : 0, amount};
  });
  return {lines, total};
}

async function loadVoucher(kind: string, id: string): Promise<Voucher> {
  const productOf = (pid: unknown) => (ad.cache.products || []).find((p: Row) => String(p.id) === String(pid)) || dt.api?.productById?.(pid);
  if (kind === 'nhap') {
    const po = await ad.db.get('purchase_orders', id);
    if (!po) throw new Error('Không tìm thấy đơn nhập hàng.');
    const sup = po.supplier_id != null ? await ad.db.get('suppliers', po.supplier_id) : null;
    const {lines, total} = purchaseVoucherLines(po);
    return {type: 'in', no: `PNK${String(po.code).replace(/^PON/, '')}`, date: po.received_at, debit: '156', credit: Number(po.paid) >= Number(po.total) ? '331, 112' : '331', ready: !!po.received && po.status !== 'cancelled', notReady: po.status === 'cancelled' ? 'Đơn nhập đã hủy.' : 'Đơn chưa nhập kho: bấm "Nhập kho" ở đơn nhập rồi in phiếu.',
      person: po.supplier_name || sup?.name || '', personAddress: sup?.address || '', reason: 'Nhập mua hàng hóa', basis: `Đơn nhập hàng số ${po.code} ngày ${new Date(po.created_at).toLocaleDateString('vi-VN')}${po.note ? ` – ${po.note}` : ''}`, lines, total, back: `/purchases/${po.id}`};
  }
  if (kind === 'xuat') {
    const doc = await ad.db.get('stock_exports', id);
    if (!doc) throw new Error('Không tìm thấy phiếu xuất.');
    const done = doc.status === 'done';
    const lines = (doc.items || []).map((l: Row) => { const price = Number(done ? l.cost : productOf(l.product_id)?.cost_price) || 0; return {name: l.name, sku: l.sku, unit: l.unit || 'Cái', docQty: l.qty, qty: done ? l.qty : null, price, amount: price * l.qty}; });
    return {type: 'out', no: doc.code, date: doc.done_at || doc.created_at, debit: EXPORT_DEBIT[doc.reason] || '632', credit: '156', ready: done, notReady: 'Phiếu chưa xuất kho (nháp): bấm "Xuất kho" rồi in phiếu.',
      person: doc.receiver || '', personAddress: '', department: doc.reason === 'internal' ? 'Nội bộ' : 'Kho hàng', reason: [EXPORT_REASONS.find(([k]) => k === doc.reason)?.[1] ?? doc.reason, doc.note].filter(Boolean).join(' – '), basis: '', lines, total: lines.reduce((s: number, l: VoucherLine) => s + l.amount, 0), back: `/stock-exports/${doc.id}`};
  }
  if (kind === 'ban') {
    const o = await ad.db.get('orders', id, '*,order_items(*)');
    if (!o) throw new Error('Không tìm thấy đơn hàng.');
    // Dòng tự nhập (không có trong kho) không đưa vào phiếu xuất kho
    const lines = (o.order_items || o.items || []).filter((i: Row) => (i.product_id ?? i.id) != null).map((i: Row) => { const p = productOf(i.product_id ?? i.id); const price = Number(p?.cost_price) || 0; return {name: i.name, sku: i.sku || p?.sku || '', unit: i.unit || p?.unit || 'Cái', docQty: Number(i.qty), qty: Number(i.qty), price, amount: price * Number(i.qty)}; });
    return {type: 'out', department: 'Bán hàng', no: `PXK-${o.code}`, date: o.created_at, debit: '632', credit: '156', ready: o.status !== 'cancelled', notReady: 'Đơn đã hủy: không lập phiếu xuất kho.',
      person: o.customer?.name || '', personAddress: o.shipping?.method === 'pickup' ? `Nhận tại cửa hàng ${o.shipping.store || ''}` : [o.shipping?.address, o.shipping?.district, o.shipping?.province].filter(Boolean).join(', '), reason: `Xuất bán hàng theo đơn ${o.code}`, basis: o.invoice_no ? `Hóa đơn bán hàng số ${o.invoice_no}` : '', lines, total: lines.reduce((s: number, l: VoucherLine) => s + l.amount, 0), back: `/orders/${encodeURIComponent(o.id)}`};
  }
  throw new Error('Loại phiếu không hợp lệ.');
}

export function VoucherPage() {
  const [, , kind = '', raw = ''] = useLocation().pathname.split('/');
  const id = decodeURIComponent(raw);
  const state = useData(async () => {
    const [v, setting] = await Promise.all([loadVoucher(kind, id), ad.db.get('settings', 'store')]);
    return {v, cfg: {...dt.config, ...(setting?.value || {})}};
  }, [kind, id]);
  return <DataState state={state}>{state.data && (() => {
    const {v, cfg} = state.data;
    const isIn = v.type === 'in';
    const title = isIn ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';
    const signs = isIn ? [['Người lập phiếu', '(Ký, họ tên)'], ['Người giao hàng', '(Ký, họ tên)'], ['Thủ kho', '(Ký, họ tên)'], ['Kế toán trưởng', '(Hoặc bộ phận có nhu cầu nhập) (Ký, họ tên)']]
      : [['Người lập phiếu', '(Ký, họ tên)'], ['Người nhận hàng', '(Ký, họ tên)'], ['Thủ kho', '(Ký, họ tên)'], ['Kế toán trưởng', '(Hoặc bộ phận có nhu cầu nhập) (Ký, họ tên)'], ['Giám đốc', '(Ký, họ tên)']];
    return <>
      <Head title={`${isIn ? 'Phiếu nhập kho' : 'Phiếu xuất kho'} ${v.no}`} subtitle={isIn ? 'Phiếu nhập kho hàng hóa' : 'Phiếu xuất kho hàng hóa'}>
        <Link className="btn btn-light" to={v.back}>Quay lại</Link>
        <button type="button" id="vc-print" className="btn btn-primary" disabled={!v.ready} onClick={() => window.print()}>In phiếu</button>
      </Head>
      {!v.ready && <p className="ar-notice" role="alert">{v.notReady}</p>}
      <article className="doc-sheet vc-sheet" aria-label={title}>
        <div className="vc-top">
          <DocLogo cfg={cfg}/>
          <div className="vc-unit"><p>Đơn vị: <b>{cfg.company || cfg.name}</b></p><p>Bộ phận: {isIn ? 'Kho hàng' : v.department}</p><p>Địa chỉ: {cfg.address}</p>{cfg.taxCode && <p>Mã số thuế: {cfg.taxCode}</p>}</div>
        </div>
        <div className="vc-title"><div/><div><h2>{title}</h2><i>{parts(v.date)}</i><p>Số: <b className="vc-no">{v.no}</b></p></div><div/></div>
        <div className="vc-info">
          <p>- Họ và tên người {isIn ? 'giao' : 'nhận'} hàng: <span>{v.person || ' '.repeat(40)}</span></p>
          {!isIn && <p>- Địa chỉ (bộ phận): <span>{v.personAddress || ' '.repeat(40)}</span></p>}
          {isIn ? <p>- Theo: <span>{v.basis}</span></p> : <p>- Lý do xuất kho: <span>{v.reason}</span></p>}
          {!isIn && v.basis && <p>- Chứng từ kèm theo: <span>{v.basis}</span></p>}
          <p>- {isIn ? 'Nhập' : 'Xuất'} tại kho (ngăn lô): <span>{cfg.warehouseName || 'Kho hàng hóa'}{cfg.misaWarehouse ? ` (${cfg.misaWarehouse})` : ''}</span> Địa điểm: <span>{cfg.warehouseAddress || cfg.address}</span></p>
        </div>
        <table className="vc-table"><thead>
          <tr><th rowSpan={2}>STT</th><th rowSpan={2}>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th><th rowSpan={2}>Mã số</th><th rowSpan={2}>Đơn vị tính</th><th colSpan={2}>Số lượng</th><th rowSpan={2}>Đơn giá</th><th rowSpan={2}>Thành tiền</th></tr>
          <tr><th>{isIn ? 'Theo chứng từ' : 'Yêu cầu'}</th><th>{isIn ? 'Thực nhập' : 'Thực xuất'}</th></tr>
          <tr className="vc-letters"><th>A</th><th>B</th><th>C</th><th>D</th><th>1</th><th>2</th><th>3</th><th>4</th></tr>
        </thead><tbody>{v.lines.map((l, i) => <tr key={i}><td className="c">{i + 1}</td><td>{l.name}</td><td className="c">{l.sku}</td><td className="c">{l.unit}</td><td className="r">{l.docQty}</td><td className="r">{l.qty ?? ''}</td><td className="r">{vnd(l.price)}</td><td className="r">{vnd(l.amount)}</td></tr>)}</tbody>
          <tfoot><tr><td/><td className="c">Cộng</td><td className="c">x</td><td className="c">x</td><td className="r">{v.lines.reduce((s, l) => s + l.docQty, 0)}</td><td className="r">{v.ready ? v.lines.reduce((s, l) => s + (l.qty || 0), 0) : ''}</td><td className="c">x</td><td className="r vc-total">{vnd(v.total)}</td></tr></tfoot>
        </table>
        <div className="vc-after"><p>- Tổng số tiền (viết bằng chữ): <i className="vc-words">{moneyWords(v.total)}</i></p><p>- Số chứng từ gốc kèm theo: {v.basis ? '01' : ' '.repeat(20)}</p></div>
        <p className="vc-date">{parts(v.date)}</p>
        <div className="vc-signs" style={{'--n': signs.length} as Row}>{signs.map(([t, h], i) => <div key={t}><b>{t}</b><i>{h}</i><p className="vc-name"/></div>)}</div>
        <p className="vc-note"><b>Ghi chú:</b> Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.</p>
      </article>
    </>;
  })()}</DataState>;
}
