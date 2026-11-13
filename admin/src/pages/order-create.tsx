// Tạo đơn hàng tại quản trị: khách có sẵn (tìm theo tên / SĐT) hoặc nhập mới, sản phẩm trong hệ thống
// (trừ kho khi tạo) hoặc dòng tự nhập; tự chỉnh đơn giá, phí lắp đặt, phí giao hàng, chiết khấu, thuế GTGT.
import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ad, money} from '../services/runtime';
import {loadCache} from '../services/runtime';
import {adminOrderTotals, createOrder, VAT_RATES, type OrderLine} from '../services/orders';
import {Action, Head, Panel, useNotice} from '../components/common';
import {ProductPicker} from '../components/stock';
import type {Row} from '../types';

const num = (v: unknown) => Number(v) || 0;
let seq = 0;
const lineKey = () => `l${Date.now()}-${seq++}`;
type Customer = {name: string; phone: string; email: string; address: string; district: string; province: string};
const emptyCustomer: Customer = {name: '', phone: '', email: '', address: '', district: '', province: ''};

function CustomerSearch({onPick}: {onPick: (c: Row) => void}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Row[]>([]);
  useEffect(() => {
    const k = q.trim();
    if (k.length < 2) { setHits([]); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const {rows} = await ad.db.list('crm_customers', {search: {q: k, cols: ['name', 'phone', 'email']}, limit: 8});
        if (live) setHits(rows);
      } catch { if (live) setHits([]); }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return <div className="inv-picker">
    <label><span>Chọn khách hàng có sẵn</span><input type="search" value={q} placeholder="Tìm theo tên, số điện thoại hoặc email…" onChange={(e) => setQ(e.target.value)}/></label>
    {hits.length > 0 && <ul className="inv-hits" role="listbox" aria-label="Kết quả tìm khách hàng">{hits.map((c) =>
      <li key={c.id}><button type="button" onClick={() => { onPick(c); setQ(''); setHits([]); }}><b>{c.name || c.phone}</b><small>{[c.phone, c.email].filter(Boolean).join(' · ')}</small></button></li>)}
    </ul>}
    {q.trim().length >= 2 && !hits.length && <p className="inv-muted">Không thấy khách phù hợp, nhập thông tin khách mới bên dưới.</p>}
  </div>;
}

export function OrderCreate() {
  const navigate = useNavigate(); const notice = useNotice();
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [method, setMethod] = useState<'delivery' | 'pickup'>('pickup');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [install, setInstall] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(10);
  const [vatIncluded, setVatIncluded] = useState(true);
  const [payment, setPayment] = useState('cod');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [status, setStatus] = useState('confirmed');
  const [note, setNote] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [wantInvoice, setWantInvoice] = useState(false);
  const [invoice, setInvoice] = useState({company: '', taxCode: '', address: '', email: ''});
  const [error, setError] = useState('');
  const t = adminOrderTotals(lines, num(install), num(shipping), num(discount), vatRate, vatIncluded);
  const setC = (patch: Partial<Customer>) => setCustomer({...customer, ...patch});
  const setLine = (i: number, patch: Partial<OrderLine>) => setLines(lines.map((l, k) => (k === i ? {...l, ...patch} : l)));
  function pickCustomer(c: Row) {
    const a: Row = (c.addresses || [])[0] || {};
    setCustomer({name: c.name || '', phone: c.phone || '', email: c.email || '', address: a.address || '', district: a.district || '', province: a.province || ''});
    if (a.address) setMethod('delivery');
  }
  function addProduct(p: Row) {
    setLines([...lines, {key: lineKey(), product_id: p.id, name: p.name, sku: p.sku || '', unit: p.unit || 'Cái', qty: 1, price: num(p.price), stock: num(p.stock)}]);
  }
  async function submit() {
    setError('');
    try {
      if (!lines.length) throw new Error('Đơn hàng chưa có sản phẩm. Chọn sản phẩm có sẵn hoặc thêm dòng tự nhập.');
      const order = await createOrder({
        p_customer: {name: customer.name.trim(), phone: customer.phone.trim(), email: customer.email.trim()},
        p_shipping: method === 'delivery' ? {method, address: customer.address.trim(), district: customer.district.trim(), province: customer.province.trim()} : {method},
        p_items: lines.map((l) => ({product_id: l.product_id, name: l.name.trim(), sku: l.sku.trim(), unit: l.unit.trim(), qty: Math.round(num(l.qty)), price: Math.round(num(l.price))})),
        p_install_fee: num(install), p_shipping_fee: num(shipping), p_discount: num(discount),
        p_vat_rate: vatRate, p_vat_included: vatIncluded, p_payment: payment, p_payment_status: paymentStatus, p_status: status,
        p_note: note, p_staff_note: staffNote, p_invoice: wantInvoice ? invoice : null,
      });
      await loadCache();
      notice(`Đã tạo đơn ${order.code}.`);
      navigate(`/orders/${encodeURIComponent(order.id)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); throw e;
    }
  }
  return <><Head title="Tạo đơn hàng" subtitle="Chọn khách hàng và sản phẩm có sẵn hoặc tự nhập; chỉnh giá, phí, chiết khấu và thuế GTGT. Sản phẩm trong hệ thống được trừ kho khi tạo đơn.">
    <Link className="btn btn-light" to="/orders">Thoát</Link>
    <Action className="btn btn-primary" id="order-create" run={submit}>Tạo đơn hàng</Action>
  </Head>
  {error && <p className="ar-error ad-error" role="alert">{error}</p>}
  <div className="inv-cols">
    <Panel title="Khách hàng">
      <CustomerSearch onPick={pickCustomer}/>
      <div className="ar-grid">
        <label>Tên khách hàng *<input name="c_name" value={customer.name} onChange={(e) => setC({name: e.target.value})}/></label>
        <label>Số điện thoại *<input name="c_phone" inputMode="tel" value={customer.phone} onChange={(e) => setC({phone: e.target.value})}/></label>
        <label className="full">Email<input name="c_email" type="email" value={customer.email} onChange={(e) => setC({email: e.target.value})}/></label>
        <label className="full">Hình thức nhận hàng<select name="c_method" value={method} onChange={(e) => setMethod(e.target.value as 'delivery' | 'pickup')}><option value="pickup">Nhận tại cửa hàng</option><option value="delivery">Giao tận nơi</option></select></label>
        {method === 'delivery' && <>
          <label className="full">Địa chỉ giao hàng *<input name="c_address" value={customer.address} onChange={(e) => setC({address: e.target.value})}/></label>
          <label>Quận / Huyện<input name="c_district" value={customer.district} onChange={(e) => setC({district: e.target.value})}/></label>
          <label>Tỉnh / Thành phố<input name="c_province" value={customer.province} onChange={(e) => setC({province: e.target.value})}/></label>
        </>}
      </div>
    </Panel>
    <Panel title="Thanh toán & xử lý">
      <div className="ar-grid">
        <label>Phương thức<select name="payment" value={payment} onChange={(e) => setPayment(e.target.value)}><option value="cod">COD / tiền mặt</option><option value="bank">Chuyển khoản</option></select></label>
        <label>Tình trạng thanh toán<select name="payment_status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}><option value="unpaid">Chưa thanh toán</option><option value="partial">Thanh toán một phần</option><option value="paid">Đã thanh toán</option></select></label>
        <label>Trạng thái đơn<select name="status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã xác nhận</option></select></label>
        <label className="full">Ghi chú của khách<textarea name="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)}/></label>
        <label className="full">Ghi chú nội bộ<textarea name="staff_note" rows={2} value={staffNote} onChange={(e) => setStaffNote(e.target.value)}/></label>
        <label className="ar-check full"><input type="checkbox" checked={wantInvoice} onChange={(e) => setWantInvoice(e.target.checked)}/>Khách lấy hóa đơn công ty</label>
        {wantInvoice && <>
          <label className="full">Tên đơn vị<input name="inv_company" value={invoice.company} onChange={(e) => setInvoice({...invoice, company: e.target.value})}/></label>
          <label>Mã số thuế<input name="inv_tax" value={invoice.taxCode} onChange={(e) => setInvoice({...invoice, taxCode: e.target.value})}/></label>
          <label>Email nhận hóa đơn<input name="inv_email" type="email" value={invoice.email} onChange={(e) => setInvoice({...invoice, email: e.target.value})}/></label>
          <label className="full">Địa chỉ đơn vị<input name="inv_address" value={invoice.address} onChange={(e) => setInvoice({...invoice, address: e.target.value})}/></label>
        </>}
      </div>
    </Panel>
  </div>
  <Panel title="Sản phẩm">
    <ProductPicker label="Thêm sản phẩm có sẵn" exclude={lines.map((l) => l.product_id).filter((v) => v != null)} onPick={addProduct}/>
    <p><button type="button" className="inv-link" id="order-add-custom" onClick={() => setLines([...lines, {key: lineKey(), product_id: null, name: '', sku: '', unit: 'Cái', qty: 1, price: 0}])}>+ Thêm dòng tự nhập (hàng ngoài hệ thống, dịch vụ, vật tư…)</button></p>
    {lines.length ? <div className="ar-table-scroll"><table className="ar-table inv-lines order-lines"><thead><tr><th>#</th><th>Tên sản phẩm / dịch vụ</th><th>Mã SKU</th><th>Đơn vị</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th/></tr></thead><tbody>
      {lines.map((l, i) => <tr key={l.key}>
        <td>{i + 1}</td>
        <td><input aria-label={`Tên dòng ${i + 1}`} value={l.name} placeholder="Tên hàng hóa / dịch vụ" onChange={(e) => setLine(i, {name: e.target.value})}/>{l.product_id != null ? <small>Trong kho: {l.stock ?? 0}{num(l.qty) > num(l.stock) ? ' · không đủ hàng' : ''}</small> : <small>Dòng tự nhập · không trừ kho</small>}</td>
        <td><input aria-label={`SKU dòng ${i + 1}`} value={l.sku} onChange={(e) => setLine(i, {sku: e.target.value})}/></td>
        <td><input aria-label={`Đơn vị dòng ${i + 1}`} value={l.unit} onChange={(e) => setLine(i, {unit: e.target.value})}/></td>
        <td><input aria-label={`Số lượng dòng ${i + 1}`} type="number" min={1} step={1} value={l.qty} onChange={(e) => setLine(i, {qty: e.target.value === '' ? ('' as unknown as number) : Number(e.target.value)})}/></td>
        <td><input aria-label={`Đơn giá dòng ${i + 1}`} type="number" min={0} step={1000} value={l.price} onChange={(e) => setLine(i, {price: e.target.value === '' ? ('' as unknown as number) : Number(e.target.value)})}/></td>
        <td>{money(num(l.qty) * num(l.price))}</td>
        <td><button type="button" className="btn btn-light" aria-label={`Bỏ dòng ${i + 1}`} onClick={() => setLines(lines.filter((_, k) => k !== i))}>×</button></td>
      </tr>)}</tbody></table></div> : <p className="inv-muted">Chưa có sản phẩm. Tìm sản phẩm ở ô phía trên hoặc thêm dòng tự nhập.</p>}
    <div className="inv-totals">
      <div><span>Tổng tiền hàng</span><b>{money(t.goods)}</b></div>
      <div><span>Phí lắp đặt</span><input aria-label="Phí lắp đặt" type="number" min={0} step={1000} value={install} onChange={(e) => setInstall(Number(e.target.value))}/></div>
      <div><span>Phí giao hàng</span><input aria-label="Phí giao hàng" type="number" min={0} step={1000} value={shipping} onChange={(e) => setShipping(Number(e.target.value))}/></div>
      <div><span>Chiết khấu</span><input aria-label="Chiết khấu" type="number" min={0} step={1000} value={discount} onChange={(e) => setDiscount(Number(e.target.value))}/></div>
      <div><span>Thuế GTGT</span><select aria-label="Thuế suất GTGT" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>{VAT_RATES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></div>
      {vatRate > 0 && <div><span>Cách tính thuế</span><select aria-label="Cách tính thuế" value={vatIncluded ? 'in' : 'out'} onChange={(e) => setVatIncluded(e.target.value === 'in')}><option value="in">Giá đã gồm VAT</option><option value="out">Chưa gồm VAT (cộng thêm)</option></select></div>}
      <div><span>Tiền thuế GTGT{vatIncluded && vatRate > 0 ? ' (đã gồm trong giá)' : ''}</span><b>{money(t.vat)}</b></div>
      <div className="inv-total"><span>Tổng thanh toán</span><b id="order-total">{money(t.total)}</b></div>
    </div>
  </Panel></>;
}
