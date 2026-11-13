// Hóa đơn bán hàng (in A4) từ đơn hàng: thông tin người bán / người mua, bảng hàng hóa,
// tiền trước thuế, thuế GTGT, tổng thanh toán, số tiền bằng chữ, chữ ký.
// Giá bán trên website đã gồm VAT: tách thuế theo thuế suất trong Cài đặt cửa hàng.
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {ad, dt, money} from '../services/runtime';
import {issueInvoice, moneyWords} from '../services/inventory';
import {Action, DataState, Head, useData, useNotice} from '../components/common';
import {DocLogo} from '../components/doc-logo';
import type {Row} from '../types';

const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');
const dayParts = (iso?: string) => { const d = iso ? new Date(iso) : new Date(); return {d: String(d.getDate()).padStart(2, '0'), m: String(d.getMonth() + 1).padStart(2, '0'), y: d.getFullYear()}; };

// Tách dòng hóa đơn: giá chưa thuế từng dòng; chênh lệch làm tròn dồn vào dòng cuối để tổng khớp đơn hàng
export function invoiceLines(order: Row, vatRate: number) {
  const items: Row[] = (order.order_items || order.items || []).map((i: Row) => ({name: i.name + (i.options && Object.keys(i.options).length ? ` (${Object.values(i.options).join(', ')})` : ''), sku: i.sku || '', unit: i.unit || dt.api?.productById?.(i.product_id ?? i.id)?.unit || 'Cái', qty: Number(i.qty) || 0, gross: (Number(i.price) || 0) * (Number(i.qty) || 0)}));
  if (Number(order.install_fee || order.install)) items.push({name: 'Phí lắp đặt', sku: '', unit: 'Lần', qty: 1, gross: Number(order.install_fee || order.install)});
  if (Number(order.discount)) items.push({name: `Chiết khấu thương mại${order.coupon ? ` (mã ${order.coupon})` : ''}`, sku: '', unit: '', qty: 0, gross: -Number(order.discount)});
  // Đơn tạo tại quản trị có phí giao hàng riêng
  if (Number(order.shipping_fee)) items.splice(items.length - (Number(order.discount) ? 1 : 0), 0, {name: 'Phí giao hàng', sku: '', unit: 'Lần', qty: 1, gross: Number(order.shipping_fee)});
  const total = Number(order.total) || items.reduce((s, l) => s + l.gross, 0);
  // Giá chưa gồm VAT (đơn tạo tại quản trị): giá dòng đã là giá chưa thuế, thuế cộng thêm
  if (order.vat_included === false && vatRate > 0) {
    const pre = total - Number(order.vat_amount || 0);
    return {lines: items.map((l): Row => ({...l, amount: l.gross, price: l.qty ? l.gross / l.qty : 0})), pre, vat: total - pre, total};
  }
  const pre = Math.round(total / (1 + vatRate / 100));
  let used = 0;
  const lines = items.map((l, i): Row => {
    const amount = i === items.length - 1 ? pre - used : Math.round(l.gross / (1 + vatRate / 100));
    used += amount;
    return {...l, amount, price: l.qty ? amount / l.qty : 0};
  });
  return {lines, pre, vat: total - pre, total};
}

export function InvoicePage() {
  const id = decodeURIComponent(useLocation().pathname.split('/')[2] || '');
  const navigate = useNavigate(); const notice = useNotice();
  const state = useData(async () => {
    const [order, setting] = await Promise.all([ad.db.get('orders', id, '*,order_items(*)'), ad.db.get('settings', 'store')]);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    return {order, cfg: {...dt.config, ...(setting?.value || {})}};
  }, [id, useLocation().search]);
  return <DataState state={state}>{state.data && (() => {
    const {order: o, cfg} = state.data;
    // Đơn tạo tại quản trị có thuế suất riêng; đơn website dùng thuế suất trong Cài đặt cửa hàng
    const rawRate = Number(o.vat_rate ?? cfg.vatRate ?? 10);
    const rate = Math.max(0, rawRate);
    const {lines, pre, vat, total} = invoiceLines(o, rate);
    const inv = o.invoice || {};
    const when = dayParts(o.invoiced_at);
    const address = [o.shipping?.address, o.shipping?.district, o.shipping?.province].filter(Boolean).join(', ');
    return <>
      <Head title={`Hóa đơn bán hàng · Đơn ${o.code}`} subtitle={o.invoice_no ? `Số ${o.invoice_no} · lập ${new Date(o.invoiced_at).toLocaleString('vi-VN')}` : 'Chưa cấp số hóa đơn. Cấp số một lần, in lại bao nhiêu lần cũng giữ nguyên số.'}>
        <Link className="btn btn-light" to={`/orders/${encodeURIComponent(o.id)}`}>Quay lại đơn</Link>
        {!o.invoice_no && o.status !== 'cancelled' && <Action className="btn btn-primary" id="inv-issue" run={async () => { await issueInvoice(o.id); notice('Đã cấp số hóa đơn.'); navigate(`/invoice/${encodeURIComponent(o.id)}?r=${Date.now()}`, {replace: true}); }}>Cấp số hóa đơn</Action>}
        <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!o.invoice_no}>In hóa đơn</button>
      </Head>
      {o.status === 'cancelled' && <p className="ar-notice" role="alert">Đơn đã hủy: không xuất hóa đơn.</p>}
      <article className="inv-sheet doc-sheet" aria-label="Hóa đơn bán hàng">
        <header className="inv-sheet-head">
          <DocLogo cfg={cfg}/>
          <div><b className="inv-seller">{cfg.company || cfg.name}</b>
            <p>Mã số thuế: <b>{cfg.taxCode || '—'}</b></p><p>Địa chỉ: {cfg.address}</p><p>Điện thoại: {cfg.hotline}{cfg.email ? ` · Email: ${cfg.email}` : ''}</p>
            {cfg.bankAccount && <p>Số tài khoản: {cfg.bankAccount} – {cfg.bankName}</p>}</div>
          <div className="inv-meta"><p>Ký hiệu: <b>{cfg.invoiceSeries || '1C26TKL'}</b></p><p>Số: <b className="inv-no">{o.invoice_no || '(chưa cấp)'}</b></p><p>Đơn hàng: {o.code}</p></div>
        </header>
        <h2 className="inv-title">HÓA ĐƠN BÁN HÀNG</h2>
        <p className="inv-date">Ngày {when.d} tháng {when.m} năm {when.y}</p>
        <dl className="inv-buyer">
          <div><dt>Họ tên người mua hàng:</dt><dd>{o.customer?.name || '—'}</dd></div>
          <div><dt>Tên đơn vị:</dt><dd>{inv.company || inv.companyName || '—'}</dd></div>
          <div><dt>Mã số thuế:</dt><dd>{inv.taxCode || inv.tax_code || '—'}</dd></div>
          <div><dt>Địa chỉ:</dt><dd>{inv.address || address || '—'}</dd></div>
          <div><dt>Hình thức thanh toán:</dt><dd>{o.payment === 'bank' ? 'Chuyển khoản' : 'Tiền mặt (COD)'}{o.payment_status === 'paid' ? ' – đã thanh toán' : ''}</dd></div>
        </dl>
        <table className="inv-table"><thead><tr><th>STT</th><th>Tên hàng hóa, dịch vụ</th><th>Đơn vị tính</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
          <tr className="inv-colno"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6 = 4 × 5</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.name}{l.sku && <small> · {l.sku}</small>}</td><td>{l.unit}</td><td>{l.qty || ''}</td><td>{l.qty ? vnd(l.price) : ''}</td><td>{vnd(l.amount)}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan={5}>Cộng tiền hàng (chưa thuế GTGT)</td><td>{vnd(pre)}</td></tr>
            <tr><td colSpan={5}>Thuế suất GTGT: {rawRate < 0 ? 'Không chịu thuế' : `${rate}%`} – Tiền thuế GTGT</td><td>{vnd(vat)}</td></tr>
            <tr className="inv-grand"><td colSpan={5}>Tổng cộng tiền thanh toán</td><td>{vnd(total)}</td></tr>
          </tfoot>
        </table>
        <p className="inv-words">Số tiền viết bằng chữ: <i>{moneyWords(total)}</i>.</p>
        <div className="inv-signs"><div><b>Người mua hàng</b><small>(Ký, ghi rõ họ tên)</small></div><div><b>Người bán hàng</b><small>(Ký, đóng dấu, ghi rõ họ tên)</small></div></div>
        <p className="inv-foot">{cfg.invoiceNote || 'Hóa đơn bán hàng do cửa hàng lập từ đơn hàng. Hóa đơn GTGT điện tử (nếu có) được phát hành riêng qua nhà cung cấp hóa đơn điện tử.'}</p>
      </article>
      <p className="inv-muted">Tổng thanh toán: {money(total)} · {rawRate < 0 ? 'Hàng không chịu thuế GTGT.' : o.vat_included === false ? `Đã cộng thuế GTGT ${rate}%.` : `Giá bán đã gồm VAT ${rate}%.`}</p>
    </>;
  })()}</DataState>;
}
