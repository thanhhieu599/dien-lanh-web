// Kho hàng: Quản lý kho, Nhập hàng (đơn nhập từ nhà cung cấp), Kiểm hàng (cân bằng kho), Xuất kho, Lịch sử kho.
import {useMemo, useState, type ReactNode} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {ad, date, downloadCSV, loadCache, money, today} from '../services/runtime';
import {EXPORT_REASONS, LEVEL_LABEL, MOVE_TYPES, PURCHASE_STATUS, incomingMap, invOp, purchaseTotals, reservedMap, stockLevel} from '../services/inventory';
import {Action, DataState, Head, Panel, Table, useData, useNotice} from '../components/common';
import {MovesTable, ProductPicker} from '../components/stock';
import type {Row} from '../types';

const PAGE = 30;
const num = (v: unknown) => Number(v) || 0;
const productOf = (id: unknown) => (ad.cache.products || []).find((p: Row) => String(p.id) === String(id));
const canWrite = () => ['admin', 'staff'].includes(ad.me?.role || '');

function Tabs({items, value, onChange, label}: {items: [string, ReactNode][]; value: string; onChange: (v: string) => void; label: string}) {
  return <nav className="mt-tabs" aria-label={label}>{items.map(([k, l]) => <button type="button" key={k} className={value === k ? 'active' : ''} aria-current={value === k ? 'page' : undefined} onClick={() => onChange(k)}>{l}</button>)}</nav>;
}
function Paged<T>({rows, render}: {rows: T[]; render: (rows: T[]) => ReactNode}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages);
  return <>{render(rows.slice((p - 1) * PAGE, p * PAGE))}
    {rows.length > PAGE && <nav className="ar-pager" aria-label="Phân trang"><span>{rows.length} dòng · Trang {p}/{pages}</span><button className="btn btn-light" disabled={p <= 1} onClick={() => setPage(p - 1)}>Trước</button><button className="btn btn-light" disabled={p >= pages} onClick={() => setPage(p + 1)}>Sau</button></nav>}
  </>;
}
const Status = ({value, label}: {value: string; label: string}) => <span className={`ar-badge ${['done', 'balanced', 'ok', 'received'].includes(value) ? 'positive' : ['cancelled', 'out'].includes(value) ? 'negative' : value === 'low' || value === 'draft' ? 'warn' : ''}`}>{label}</span>;

export function InventoryPage({resource}: {resource: string}) {
  const location = useLocation();
  const id = decodeURIComponent(location.pathname.split('/')[2] || '');
  if (resource === 'purchases') return id ? <PurchaseDoc id={id}/> : <PurchaseList/>;
  if (resource === 'stocktakes') return id ? <AdjustmentDoc id={id}/> : <AdjustmentList/>;
  if (resource === 'stock-exports') return id ? <ExportDoc id={id}/> : <ExportList/>;
  if (resource === 'stock-history') return <HistoryPage/>;
  return <StockPage/>;
}

/* ------------------------------------------------------------------ Quản lý kho */
function StockPage() {
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [brand, setBrand] = useState(''); const [level, setLevel] = useState('');
  const state = useData(async () => {
    await loadCache();
    const [orders, pos] = await Promise.all([ad.db.list('orders', {select: '*,order_items(*)', limit: 5000}), ad.db.list('purchase_orders', {limit: 5000})]);
    const reserved = reservedMap(orders.rows), incoming = incomingMap(pos.rows);
    return (ad.cache.products as Row[]).map((p): Row => {
      const r = reserved.get(String(p.id)) || 0;
      return {...p, available: num(p.stock), reserved: r, onhand: num(p.stock) + r, incoming: incoming.get(String(p.id)) || 0, value: (num(p.stock) + r) * num(p.cost_price), level: stockLevel(p)};
    });
  }, []);
  const rows = useMemo(() => (state.data || []).filter((p) => {
    const k = q.trim().toLowerCase();
    return (!k || `${p.name} ${p.sku} ${p.barcode || ''}`.toLowerCase().includes(k)) && (!cat || p.cat === cat) && (!brand || p.brand === brand) && (!level || p.level === level);
  }), [state.data, q, cat, brand, level]);
  const all = state.data || [];
  const sum = (key: string, list = all) => list.reduce((s, p) => s + num(p[key]), 0);
  return <><Head title="Quản lý kho" subtitle="Tồn kho, hàng đang giao dịch, hàng đang về và giá trị tồn của từng sản phẩm.">
    {canWrite() && <><Link className="btn btn-light" to="/stocktakes/new">Kiểm hàng</Link><Link className="btn btn-light" to="/stock-exports/new">Xuất kho</Link><Link className="btn btn-primary" to="/purchases/new">+ Nhập hàng</Link></>}
  </Head>
  <DataState state={state}>{state.data && <>
    <div className="ar-kpis">
      <div><span>Sản phẩm</span><strong>{all.length}</strong></div>
      <div><span>Tổng tồn kho</span><strong>{sum('onhand').toLocaleString('vi-VN')}</strong></div>
      <div><span>Giá trị tồn (giá vốn)</span><strong>{money(sum('value'))}</strong></div>
      <button type="button" className="ar-kpi-btn" onClick={() => setLevel(level === 'low' ? '' : 'low')}><span>Sắp hết hàng</span><strong className="inv-warn">{all.filter((p) => p.level === 'low').length}</strong></button>
      <button type="button" className="ar-kpi-btn" onClick={() => setLevel(level === 'out' ? '' : 'out')}><span>Hết hàng</span><strong className="inv-minus">{all.filter((p) => p.level === 'out').length}</strong></button>
    </div>
    <div className="ar-toolbar">
      <label><span>Tìm kiếm</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên, mã SKU, mã vạch…"/></label>
      <label><span>Danh mục</span><select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Tất cả</option>{(ad.cache.categories || []).map((c: Row) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label><span>Thương hiệu</span><select value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Tất cả</option>{(ad.cache.brands || []).map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label><span>Trạng thái</span><select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Tất cả</option><option value="ok">Còn hàng</option><option value="low">Sắp hết</option><option value="out">Hết hàng</option></select></label>
      <button type="button" className="btn btn-light" onClick={() => downloadCSV('ton-kho.csv', [{label: 'SKU', key: 'sku'}, {label: 'Tên', key: 'name'}, {label: 'Tồn kho', key: 'onhand'}, {label: 'Có thể bán', key: 'available'}, {label: 'Đang giao dịch', key: 'reserved'}, {label: 'Hàng đang về', key: 'incoming'}, {label: 'Giá vốn', key: 'cost_price'}, {label: 'Giá trị tồn', key: 'value'}, {label: 'Trạng thái', value: (r) => LEVEL_LABEL[r.level as 'ok']}], rows)}>Xuất CSV</button>
    </div>
    <Panel><Paged rows={rows} render={(page) => <Table rows={page} columns={[
      {label: 'Sản phẩm', render: (p) => <><Link to={`/products/${encodeURIComponent(p.id)}`}>{p.name}</Link><small>{p.sku}{p.location ? ` · ${p.location}` : ''}</small></>},
      {label: 'Tồn kho', render: (p) => <b>{p.onhand}</b>},
      {label: 'Có thể bán', render: (p) => p.available},
      {label: 'Đang giao dịch', render: (p) => p.reserved || 0},
      {label: 'Hàng đang về', render: (p) => p.incoming || 0},
      {label: 'Giá vốn', render: (p) => money(p.cost_price)},
      {label: 'Giá trị tồn', render: (p) => money(p.value)},
      {label: 'Trạng thái', render: (p) => <Status value={p.level} label={LEVEL_LABEL[p.level as 'ok']}/>},
      {label: '', render: (p) => <Link to={`/stock-history?product=${encodeURIComponent(p.id)}`}>Lịch sử</Link>},
    ]}/>}/></Panel>
  </>}</DataState></>;
}

/* ------------------------------------------------------------------ Nhập hàng */
function PurchaseList() {
  const [params, setParams] = useSearchParams(); const tab = params.get('tab') || 'all'; const [q, setQ] = useState('');
  const state = useData(async () => (await ad.db.list('purchase_orders', {order: 'id.desc', limit: 5000})).rows, []);
  const rows = (state.data || []).filter((p) => (tab === 'all' || p.status === tab) && (!q.trim() || `${p.code} ${p.supplier_name}`.toLowerCase().includes(q.trim().toLowerCase())));
  const debt = (state.data || []).filter((p) => p.received && p.status !== 'cancelled').reduce((s, p) => s + p.total - num(p.paid), 0);
  return <><Head title="Nhập hàng" subtitle="Đơn nhập hàng từ nhà cung cấp: nhập kho, giá vốn và công nợ phải trả.">
    <Link className="btn btn-light" to="/suppliers">Nhà cung cấp</Link>
    {canWrite() && <Link className="btn btn-primary" to="/purchases/new">+ Tạo đơn nhập hàng</Link>}
  </Head>
  <Tabs label="Lọc đơn nhập" value={tab} onChange={(v) => setParams(v === 'all' ? {} : {tab: v})} items={[['all', 'Tất cả'], ['ordered', 'Đang giao dịch'], ['done', 'Hoàn thành'], ['cancelled', 'Đã hủy']]}/>
  <div className="ar-toolbar"><label><span>Tìm kiếm</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã đơn nhập, nhà cung cấp…"/></label><p className="inv-note">Còn phải trả nhà cung cấp: <b className="inv-minus">{money(debt)}</b></p></div>
  <DataState state={state}>{state.data && <Panel><Paged rows={rows} render={(page) => <Table rows={page} columns={[
    {label: 'Mã đơn nhập', render: (p) => <><Link to={`/purchases/${p.id}`}>{p.code}</Link><small>{date(p.created_at)}</small></>},
    {label: 'Trạng thái', render: (p) => <Status value={p.status} label={PURCHASE_STATUS[p.status] || p.status}/>},
    {label: 'Nhập kho', render: (p) => <Status value={p.received ? 'received' : 'draft'} label={p.received ? 'Đã nhập' : 'Chưa nhập'}/>},
    {label: 'Nhà cung cấp', key: 'supplier_name'},
    {label: 'Nhân viên tạo', key: 'created_by'},
    {label: 'Giá trị đơn', render: (p) => money(p.total)},
    {label: 'Còn phải trả', render: (p) => p.status === 'cancelled' ? '—' : <span className={p.total - num(p.paid) > 0 ? 'inv-minus' : ''}>{money(p.total - num(p.paid))}</span>},
  ]}/>}/></Panel>}</DataState></>;
}

function PurchaseDoc({id}: {id: string}) {
  const [params] = useSearchParams();
  const state = useData(async () => { await loadCache(); const doc = id === 'new' ? null : await ad.db.get('purchase_orders', id); if (id !== 'new' && !doc) throw new Error('Không tìm thấy đơn nhập.'); return {doc}; }, [id, params.get('r'), params.get('edit')]);
  return <DataState state={state}>{state.data && (!state.data.doc || params.get('edit') ? <PurchaseForm key={String(state.data.doc?.id ?? 'new')} doc={state.data.doc}/> : <PurchaseView key={`${state.data.doc.id}-${state.data.doc.paid}-${state.data.doc.status}`} doc={state.data.doc}/>)}</DataState>;
}

function PurchaseForm({doc}: {doc: Row | null}) {
  const navigate = useNavigate(); const notice = useNotice();
  const suppliersState = useData(async () => (await ad.db.list('suppliers', {order: 'name.asc', limit: 5000})).rows.filter((s) => s.active !== false || String(s.id) === String(doc?.supplier_id)), []);
  const [supplierId, setSupplierId] = useState(String(doc?.supplier_id ?? ''));
  const [items, setItems] = useState<Row[]>(() => (doc?.items || []).map((l: Row) => ({...l})));
  const [discount, setDiscount] = useState(num(doc?.discount));
  const [costs, setCosts] = useState<Row[]>(doc?.costs || []);
  const [expected, setExpected] = useState(doc?.expected_date || '');
  const [note, setNote] = useState(doc?.note || '');
  const [pay, setPay] = useState({amount: 0, method: 'bank'});
  const [error, setError] = useState('');
  const totals = purchaseTotals(items, discount, costs);
  const supplier = (suppliersState.data || []).find((s) => String(s.id) === supplierId);
  const setLine = (i: number, patch: Row) => setItems(items.map((l, k) => (k === i ? {...l, ...patch} : l)));
  async function save(receive: boolean) {
    setError('');
    if (!supplierId) { setError('Vui lòng chọn nhà cung cấp.'); return; }
    if (!items.length) { setError('Đơn nhập chưa có sản phẩm.'); return; }
    if (pay.amount > totals.total) { setError('Số tiền thanh toán vượt tổng đơn.'); return; }
    const po = await invOp('purchase_save', {p_id: doc?.id, supplier_id: supplierId, items: items.map((l) => ({product_id: l.product_id, qty: num(l.qty), price: num(l.price), discount: num(l.discount), tax_rate: num(l.tax_rate)})), discount, costs, expected_date: expected, note, receive, payment: pay.amount > 0 ? pay : null});
    await loadCache();
    notice(receive ? `Đã tạo đơn ${po.code} và nhập kho.` : `Đã lưu đơn ${po.code}.`);
    navigate(`/purchases/${po.id}`);
  }
  return <><Head title={doc ? `Sửa đơn ${doc.code}` : 'Tạo đơn nhập hàng'} subtitle="Chọn nhà cung cấp, thêm sản phẩm và số lượng. Nhập kho sẽ cộng tồn và tính lại giá vốn.">
    <Link className="btn btn-light" to={doc ? `/purchases/${doc.id}` : '/purchases'}>Thoát</Link>
    <Action run={() => save(false)}>{doc ? 'Lưu thay đổi' : 'Tạo & chưa nhập'}</Action>
    <Action className="btn btn-primary" id="po-receive" run={() => save(true)}>{doc ? 'Lưu & nhập kho' : 'Tạo & nhập hàng'}</Action>
  </Head>
  {error && <p className="ar-error ad-error" role="alert">{error}</p>}
  <div className="inv-cols">
    <Panel title="Nhà cung cấp"><DataState state={suppliersState}>{suppliersState.data && <>
      <label className="inv-field"><span>Chọn nhà cung cấp</span><select name="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">— Chọn —</option>{suppliersState.data.map((s) => <option key={s.id} value={s.id}>{s.name}{s.phone ? ` · ${s.phone}` : ''}</option>)}</select></label>
      {supplier ? <div className="inv-supplier"><b>{supplier.name}</b><span>{[supplier.phone, supplier.tax_code && `MST ${supplier.tax_code}`].filter(Boolean).join(' · ')}</span><span>{supplier.address}</span><span>Công nợ hiện tại: <b className="inv-minus">{money(supplier.debt)}</b></span></div>
        : <p className="inv-muted">Chưa có nhà cung cấp? <Link to="/suppliers/new">Thêm nhà cung cấp</Link></p>}
    </>}</DataState></Panel>
    <Panel title="Thông tin đơn nhập">
      <label className="inv-field"><span>Ngày hẹn giao</span><input type="date" value={expected || ''} onChange={(e) => setExpected(e.target.value)}/></label>
      <label className="inv-field"><span>Ghi chú đơn</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Hàng tặng gói riêng"/></label>
    </Panel>
  </div>
  <Panel title="Sản phẩm nhập">
    <ProductPicker exclude={items.map((l) => l.product_id)} onPick={(p) => setItems([...items, {product_id: p.id, name: p.name, sku: p.sku, unit: p.unit || 'Cái', qty: 1, price: num(p.import_price) || num(p.cost_price), discount: 0, tax_rate: 0}])}/>
    {items.length ? <div className="ar-table-scroll"><table className="ar-table inv-lines"><thead><tr><th>#</th><th>Sản phẩm</th><th>Đơn vị</th><th>SL nhập</th><th>Đơn giá</th><th>Chiết khấu</th><th>Thuế %</th><th>Thành tiền</th><th/></tr></thead><tbody>
      {items.map((l, i) => <tr key={l.product_id}>
        <td>{i + 1}</td><td><b>{l.name}</b><small>{l.sku}</small></td><td>{l.unit}</td>
        <td><input aria-label={`Số lượng ${l.name}`} type="number" min={1} step={1} value={l.qty} onChange={(e) => setLine(i, {qty: e.target.value === '' ? '' : Number(e.target.value)})}/></td>
        <td><input aria-label={`Đơn giá ${l.name}`} type="number" min={0} step={1000} value={l.price} onChange={(e) => setLine(i, {price: Number(e.target.value)})}/></td>
        <td><input aria-label={`Chiết khấu ${l.name}`} type="number" min={0} step={1000} value={l.discount} onChange={(e) => setLine(i, {discount: Number(e.target.value)})}/></td>
        <td><select aria-label={`Thuế ${l.name}`} value={l.tax_rate} onChange={(e) => setLine(i, {tax_rate: Number(e.target.value)})}>{[0, 5, 8, 10].map((r) => <option key={r} value={r}>{r}%</option>)}</select></td>
        <td>{money(num(l.qty) * num(l.price) - num(l.discount))}</td>
        <td><button type="button" className="btn btn-light" aria-label={`Bỏ ${l.name}`} onClick={() => setItems(items.filter((_, k) => k !== i))}>×</button></td>
      </tr>)}</tbody></table></div> : <p className="inv-muted">Đơn nhập chưa có sản phẩm nào. Tìm sản phẩm ở ô phía trên để thêm.</p>}
    <div className="inv-totals">
      <div><span>Số lượng</span><b>{totals.qty}</b></div>
      <div><span>Tổng tiền hàng</span><b>{money(totals.goods)}</b></div>
      <div><span>Chiết khấu đơn</span><input aria-label="Chiết khấu đơn" type="number" min={0} step={1000} value={discount} onChange={(e) => setDiscount(Number(e.target.value))}/></div>
      {costs.map((c, i) => <div key={i}><input aria-label={`Tên chi phí ${i + 1}`} value={c.name} onChange={(e) => setCosts(costs.map((x, k) => (k === i ? {...x, name: e.target.value} : x)))}/><input aria-label={`Chi phí ${i + 1}`} type="number" min={0} step={1000} value={c.amount} onChange={(e) => setCosts(costs.map((x, k) => (k === i ? {...x, amount: Number(e.target.value)} : x)))}/><button type="button" className="btn btn-light" onClick={() => setCosts(costs.filter((_, k) => k !== i))} aria-label="Bỏ chi phí">×</button></div>)}
      <div><button type="button" className="inv-link" onClick={() => setCosts([...costs, {name: 'Phí vận chuyển', amount: 0}])}>+ Thêm chi phí nhập hàng</button></div>
      <div><span>Thuế</span><b>{money(totals.tax)}</b></div>
      <div className="inv-total"><span>Tiền cần trả NCC</span><b>{money(totals.total)}</b></div>
      {!doc?.paid && <div><span>Thanh toán ngay</span><select aria-label="Phương thức thanh toán" value={pay.method} onChange={(e) => setPay({...pay, method: e.target.value})}><option value="bank">Chuyển khoản</option><option value="cash">Tiền mặt</option></select><input aria-label="Số tiền thanh toán ngay" type="number" min={0} step={1000} value={pay.amount} onChange={(e) => setPay({...pay, amount: Number(e.target.value)})}/></div>}
      <div><span>Còn phải trả</span><b className="inv-minus">{money(totals.total - num(doc?.paid) - pay.amount)}</b></div>
    </div>
  </Panel></>;
}

function PurchaseView({doc}: {doc: Row}) {
  const navigate = useNavigate(); const notice = useNotice();
  const [pay, setPay] = useState({amount: Math.max(0, doc.total - num(doc.paid)), method: 'bank', note: ''});
  const reload = () => navigate(`/purchases/${doc.id}?r=${Date.now()}`, {replace: true});
  const left = doc.total - num(doc.paid);
  const step = doc.status === 'done' ? 3 : doc.received ? 2 : 1;
  return <><Head title={`Đơn nhập ${doc.code}`} subtitle={`Tạo lúc ${date(doc.created_at)} · ${doc.created_by || ''}`}>
    <Link className="btn btn-light" to="/purchases">Quay lại</Link>
    {doc.received && doc.status !== 'cancelled' && <Link className="btn btn-light" to={`/voucher/nhap/${doc.id}`}>Phiếu nhập kho</Link>}
    {canWrite() && !doc.received && doc.status !== 'cancelled' && <>
      <Link className="btn btn-light" to={`/purchases/${doc.id}?edit=1`}>Sửa đơn</Link>
      {!num(doc.paid) && <Action confirm="Hủy đơn nhập này?" run={async () => { await invOp('purchase_cancel', {p_id: doc.id}); notice('Đã hủy đơn nhập.'); reload(); }}>Hủy đơn</Action>}
      <Action className="btn btn-primary" id="po-receive" run={async () => { await invOp('purchase_receive', {p_id: doc.id}); await loadCache(); notice('Đã nhập kho, tồn kho và giá vốn đã cập nhật.'); reload(); }}>Nhập kho</Action>
    </>}
  </Head>
  <div className="inv-steps" aria-label="Tiến trình đơn nhập">{['Tạo đơn', 'Nhập kho', 'Hoàn thành'].map((s, i) => <span key={s} className={doc.status === 'cancelled' ? '' : i < step ? 'done' : ''}><b>{i + 1}</b>{s}<small>{i === 0 ? date(doc.created_at) : i === 1 && doc.received ? date(doc.received_at) : ''}</small></span>)}
    <Status value={doc.status} label={PURCHASE_STATUS[doc.status] || doc.status}/></div>
  <div className="inv-cols">
    <Panel title="Nhà cung cấp"><div className="inv-supplier"><Link to={`/suppliers/${doc.supplier_id}`}><b>{doc.supplier_name}</b></Link></div></Panel>
    <Panel title="Thông tin đơn nhập"><dl className="inv-dl">
      <div><dt>Nhập kho</dt><dd>{doc.received ? `Đã nhập · ${date(doc.received_at)} · ${doc.received_by || ''}` : 'Chưa nhập'}</dd></div>
      <div><dt>Ngày hẹn giao</dt><dd>{doc.expected_date || '—'}</dd></div>
      <div><dt>Ghi chú</dt><dd>{doc.note || '—'}</dd></div>
    </dl></Panel>
  </div>
  <Panel title={left > 0 && doc.status !== 'cancelled' ? 'Đơn nhập chưa thanh toán đủ' : 'Thanh toán'}>
    <div className="inv-pay"><span>Tiền cần trả NCC: <b>{money(doc.total)}</b></span><span>Đã trả: <b>{money(doc.paid)}</b></span><span>Còn phải trả: <b className={left > 0 ? 'inv-minus' : ''}>{money(left)}</b></span></div>
    {(doc.payments || []).length > 0 && <Table rows={doc.payments.map((p: Row, i: number) => ({...p, id: i}))} columns={[{label: 'Thời gian', render: (p) => date(p.at)}, {label: 'Hình thức', render: (p) => (p.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản')}, {label: 'Số tiền', render: (p) => money(p.amount)}, {label: 'Người ghi nhận', key: 'by'}, {label: 'Ghi chú', key: 'note'}]}/>}
    {left > 0 && doc.status !== 'cancelled' && ['admin', 'staff', 'accountant'].includes(ad.me?.role || '') && <div className="inv-payform">
      <select aria-label="Hình thức thanh toán" value={pay.method} onChange={(e) => setPay({...pay, method: e.target.value})}><option value="bank">Chuyển khoản</option><option value="cash">Tiền mặt</option></select>
      <input aria-label="Số tiền thanh toán" type="number" min={0} step={1000} value={pay.amount} onChange={(e) => setPay({...pay, amount: Number(e.target.value)})}/>
      <input aria-label="Ghi chú thanh toán" placeholder="Ghi chú (số UNC, phiếu chi…)" value={pay.note} onChange={(e) => setPay({...pay, note: e.target.value})}/>
      <Action className="btn btn-primary" id="po-pay" run={async () => { await invOp('purchase_pay', {p_id: doc.id, ...pay}); notice('Đã ghi nhận thanh toán cho nhà cung cấp.'); reload(); }}>Thanh toán</Action>
    </div>}
  </Panel>
  <Panel title="Thông tin sản phẩm"><Table rows={doc.items.map((l: Row, i: number) => ({...l, id: i}))} columns={[
    {label: 'STT', render: (l) => l.id + 1}, {label: 'Sản phẩm', render: (l) => <><Link to={`/products/${encodeURIComponent(l.product_id)}`}>{l.name}</Link><small>{l.sku}</small></>},
    {label: 'Đơn vị', key: 'unit'}, {label: 'SL nhập', key: 'qty'}, {label: 'Đơn giá', render: (l) => money(l.price)}, {label: 'Chiết khấu', render: (l) => money(l.discount)}, {label: 'Thuế', render: (l) => `${l.tax_rate}%`}, {label: 'Thành tiền', render: (l) => money(l.qty * l.price - l.discount)},
  ]}/>
    <div className="inv-totals">
      <div><span>Số lượng</span><b>{doc.qty}</b></div><div><span>Tổng tiền hàng</span><b>{money(doc.goods)}</b></div><div><span>Chiết khấu</span><b>{money(doc.discount)}</b></div>
      {(doc.costs || []).map((c: Row, i: number) => <div key={i}><span>{c.name}</span><b>{money(c.amount)}</b></div>)}
      <div><span>Thuế</span><b>{money(doc.tax)}</b></div><div className="inv-total"><span>Tiền cần trả</span><b>{money(doc.total)}</b></div>
    </div>
  </Panel></>;
}

/* ------------------------------------------------------------------ Kiểm hàng */
function AdjustmentList() {
  const state = useData(async () => (await ad.db.list('stock_adjustments', {order: 'id.desc', limit: 5000})).rows, []);
  return <><Head title="Kiểm hàng" subtitle="Đếm hàng thực tế, so với tồn trên hệ thống và cân bằng kho.">{canWrite() && <Link className="btn btn-primary" to="/stocktakes/new">+ Tạo phiếu kiểm</Link>}</Head>
    <DataState state={state}>{state.data && <Panel><Paged rows={state.data} render={(page) => <Table rows={page} columns={[
      {label: 'Mã phiếu kiểm', render: (d) => <Link to={`/stocktakes/${d.id}`}>{d.code}</Link>},
      {label: 'Trạng thái', render: (d) => <Status value={d.status} label={d.status === 'balanced' ? 'Đã cân bằng' : 'Đang kiểm'}/>},
      {label: 'Ngày tạo', render: (d) => date(d.created_at)}, {label: 'Ngày cân bằng', render: (d) => date(d.balanced_at)},
      {label: 'Nhân viên tạo', key: 'created_by'}, {label: 'Nhân viên kiểm', key: 'checker'}, {label: 'Nhân viên cân bằng', render: (d) => d.balanced_by || '—'},
      {label: 'Sản phẩm lệch', render: (d) => (d.items || []).filter((l: Row) => l.diff).length}, {label: 'Ghi chú', render: (d) => d.note || '—'},
    ]}/>}/></Panel>}</DataState></>;
}

function AdjustmentDoc({id}: {id: string}) {
  const navigate = useNavigate(); const notice = useNotice(); const [params] = useSearchParams();
  const state = useData(async () => { await loadCache(); const doc = id === 'new' ? null : await ad.db.get('stock_adjustments', id); if (id !== 'new' && !doc) throw new Error('Không tìm thấy phiếu kiểm.'); return {doc}; }, [id, params.get('r')]);
  const doc = state.data?.doc;
  const [items, setItems] = useState<Row[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [cat, setCat] = useState('');
  const lines: Row[] = items ?? (doc?.items || []).map((l: Row) => ({...l}));
  const readonly = doc?.status === 'balanced' || !canWrite();
  const live = (l: Row) => (readonly ? num(l.system) : num(productOf(l.product_id)?.stock));
  const diffOf = (l: Row) => (l.actual === '' || l.actual == null ? null : num(l.actual) - live(l));
  const shown = lines.filter((l) => filter === 'all' || (filter === 'todo' ? diffOf(l) == null : filter === 'match' ? diffOf(l) === 0 : diffOf(l) != null && diffOf(l) !== 0));
  const addProducts = (ps: Row[]) => setItems([...lines, ...ps.filter((p) => !lines.some((l) => String(l.product_id) === String(p.id))).map((p) => ({product_id: p.id, name: p.name, sku: p.sku, unit: p.unit || 'Cái', actual: '', reason: ''}))]);
  const setLine = (pid: unknown, patch: Row) => setItems(lines.map((l) => (String(l.product_id) === String(pid) ? {...l, ...patch} : l)));
  async function save(balance: boolean) {
    if (!lines.length) throw new Error('Phiếu kiểm chưa có sản phẩm.');
    if (lines.some((l) => l.actual === '' || l.actual == null)) throw new Error('Còn sản phẩm chưa nhập tồn thực tế (xem tab "Chưa kiểm").');
    if (balance && !window.confirm('Cân bằng kho: tồn kho các sản phẩm sẽ đổi bằng số thực tế. Tiếp tục?')) return;
    const res = await invOp('adjustment_save', {p_id: doc?.id, items: lines.map((l) => ({product_id: l.product_id, actual: num(l.actual), reason: l.reason})), note: note ?? doc?.note ?? '', balance});
    await loadCache(); notice(balance ? `Đã cân bằng kho theo phiếu ${res.code}.` : `Đã lưu phiếu ${res.code}.`);
    setItems(null); setNote(null); navigate(`/stocktakes/${res.id}?r=${Date.now()}`, {replace: true});
  }
  return <DataState state={state}>{state.data && <><Head title={doc ? `Phiếu kiểm ${doc.code}` : 'Tạo phiếu kiểm hàng'} subtitle={doc?.status === 'balanced' ? `Đã cân bằng ${date(doc.balanced_at)} · ${doc.balanced_by}` : 'Nhập số đếm thực tế; hệ thống tự tính lệch so với tồn kho.'}>
    <Link className="btn btn-light" to="/stocktakes">Thoát</Link>
    {!readonly && <><Action run={() => save(false)}>{doc ? 'Lưu phiếu' : 'Tạo phiếu kiểm'}</Action><Action className="btn btn-primary" id="adj-balance" run={() => save(true)}>Cân bằng kho</Action></>}
    {doc?.status === 'draft' && canWrite() && <Action confirm="Xóa phiếu kiểm nháp này?" run={async () => { await invOp('delete_draft', {p_id: doc.id, p_kind: 'adjustment'}); navigate('/stocktakes'); }}>Xóa phiếu</Action>}
  </Head>
  <Panel title="Thông tin phiếu"><label className="inv-field"><span>Ghi chú</span><input value={note ?? doc?.note ?? ''} readOnly={readonly} onChange={(e) => setNote(e.target.value)} placeholder={`VD: Kiểm hàng ngày ${today()}`}/></label></Panel>
  <Panel>
    {!readonly && <div className="inv-cols"><ProductPicker exclude={lines.map((l) => l.product_id)} onPick={(p) => addProducts([p])}/>
      <label className="inv-field"><span>Thêm cả danh mục</span><span className="inv-inline"><select aria-label="Danh mục cần kiểm" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">— Chọn danh mục —</option>{(ad.cache.categories || []).map((c: Row) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" className="btn btn-light" disabled={!cat} onClick={() => addProducts((ad.cache.products || []).filter((p: Row) => p.cat === cat))}>Thêm</button></span></label></div>}
    <Tabs label="Lọc dòng kiểm" value={filter} onChange={setFilter} items={[['all', `Tất cả (${lines.length})`], ['todo', `Chưa kiểm (${lines.filter((l) => diffOf(l) == null).length})`], ['match', `Khớp (${lines.filter((l) => diffOf(l) === 0).length})`], ['diff', `Lệch (${lines.filter((l) => diffOf(l)).length})`]]}/>
    {shown.length ? <div className="ar-table-scroll"><table className="ar-table inv-lines"><thead><tr><th>Sản phẩm</th><th>Đơn vị</th><th>Tồn hệ thống</th><th>Tồn thực tế</th><th>Lệch</th><th>Lý do</th>{!readonly && <th/>}</tr></thead><tbody>
      {shown.map((l) => { const d = diffOf(l); return <tr key={l.product_id}>
        <td><b>{l.name}</b><small>{l.sku}</small></td><td>{l.unit}</td><td>{live(l)}</td>
        <td>{readonly ? l.actual : <input aria-label={`Tồn thực tế ${l.name}`} type="number" min={0} step={1} value={l.actual} onChange={(e) => setLine(l.product_id, {actual: e.target.value === '' ? '' : Number(e.target.value)})}/>}</td>
        <td><b className={d ? (d > 0 ? 'inv-plus' : 'inv-minus') : ''}>{d == null ? '—' : d > 0 ? `+${d}` : d}</b></td>
        <td>{readonly ? l.reason || '—' : <input aria-label={`Lý do ${l.name}`} list="adj-reasons" value={l.reason || ''} onChange={(e) => setLine(l.product_id, {reason: e.target.value})}/>}</td>
        {!readonly && <td><button type="button" className="btn btn-light" aria-label={`Bỏ ${l.name}`} onClick={() => setItems(lines.filter((x) => x !== l))}>×</button></td>}
      </tr>; })}</tbody></table></div> : <p className="inv-muted">Phiếu kiểm chưa có sản phẩm phù hợp.</p>}
    <datalist id="adj-reasons"><option value="Hư hỏng"/><option value="Thất thoát"/><option value="Nhập thiếu / thừa"/><option value="Bán chưa ghi nhận"/><option value="Khác"/></datalist>
  </Panel></>}</DataState>;
}

/* ------------------------------------------------------------------ Xuất kho */
const reasonLabel = (r: string) => EXPORT_REASONS.find(([k]) => k === r)?.[1] || r;
function ExportList() {
  const state = useData(async () => (await ad.db.list('stock_exports', {order: 'id.desc', limit: 5000})).rows, []);
  return <><Head title="Xuất kho" subtitle="Xuất hàng không qua đơn bán: hàng hỏng, hàng mẫu, quà tặng doanh nghiệp, dùng nội bộ, trả nhà cung cấp.">{canWrite() && <Link className="btn btn-primary" to="/stock-exports/new">+ Tạo phiếu xuất</Link>}</Head>
    <DataState state={state}>{state.data && <Panel><Paged rows={state.data} render={(page) => <Table rows={page} columns={[
      {label: 'Mã phiếu', render: (d) => <Link to={`/stock-exports/${d.id}`}>{d.code}</Link>},
      {label: 'Trạng thái', render: (d) => <Status value={d.status} label={d.status === 'done' ? 'Đã xuất' : 'Nháp'}/>},
      {label: 'Lý do', render: (d) => reasonLabel(d.reason)}, {label: 'Người nhận', render: (d) => d.receiver || '—'},
      {label: 'Số lượng', render: (d) => (d.items || []).reduce((s: number, l: Row) => s + num(l.qty), 0)},
      {label: 'Giá trị (giá vốn)', render: (d) => (d.status === 'done' ? money(d.value) : '—')},
      {label: 'Ngày tạo', render: (d) => date(d.created_at)}, {label: 'Nhân viên', key: 'created_by'},
    ]}/>}/></Panel>}</DataState></>;
}
function ExportDoc({id}: {id: string}) {
  const navigate = useNavigate(); const notice = useNotice(); const [params] = useSearchParams();
  const state = useData(async () => { await loadCache(); const doc = id === 'new' ? null : await ad.db.get('stock_exports', id); if (id !== 'new' && !doc) throw new Error('Không tìm thấy phiếu xuất.'); return {doc}; }, [id, params.get('r')]);
  const doc = state.data?.doc;
  const [form, setForm] = useState<Row | null>(null);
  const f: Row = form ?? {reason: doc?.reason || '', receiver: doc?.receiver || '', note: doc?.note || '', items: (doc?.items || []).map((l: Row) => ({...l}))};
  const set = (patch: Row) => setForm({...f, ...patch});
  const readonly = doc?.status === 'done' || !canWrite();
  async function save(confirm: boolean) {
    if (!f.reason) throw new Error('Vui lòng chọn lý do xuất.');
    if (!f.items.length) throw new Error('Phiếu xuất chưa có sản phẩm.');
    const res = await invOp('export_save', {p_id: doc?.id, reason: f.reason, receiver: f.receiver, note: f.note, items: f.items.map((l: Row) => ({product_id: l.product_id, qty: num(l.qty), note: l.note || ''})), confirm});
    await loadCache(); notice(confirm ? `Đã xuất kho theo phiếu ${res.code}.` : `Đã lưu phiếu ${res.code}.`);
    setForm(null); navigate(`/stock-exports/${res.id}?r=${Date.now()}`, {replace: true});
  }
  return <DataState state={state}>{state.data && <><Head title={doc ? `Phiếu xuất ${doc.code}` : 'Tạo phiếu xuất kho'} subtitle={doc?.status === 'done' ? `Đã xuất ${date(doc.done_at)} · ${doc.done_by} · Giá trị ${money(doc.value)}` : 'Hàng ra khỏi kho không qua đơn bán.'}>
    <Link className="btn btn-light" to="/stock-exports">Thoát</Link>
    {doc?.status === 'done' && <Link className="btn btn-light" to={`/voucher/xuat/${doc.id}`}>In phiếu xuất kho</Link>}
    {!readonly && <><Action run={() => save(false)}>Lưu nháp</Action><Action className="btn btn-primary" id="exp-confirm" confirm="Xuất kho: trừ tồn kho các sản phẩm trong phiếu?" run={() => save(true)}>Xuất kho</Action></>}
    {doc?.status === 'draft' && canWrite() && <Action confirm="Xóa phiếu nháp này?" run={async () => { await invOp('delete_draft', {p_id: doc.id, p_kind: 'export'}); navigate('/stock-exports'); }}>Xóa phiếu</Action>}
  </Head>
  <Panel title="Thông tin phiếu"><div className="ar-grid">
    <label><span>Lý do xuất *</span><select name="reason" value={f.reason} disabled={readonly} onChange={(e) => set({reason: e.target.value})}><option value="">— Chọn —</option>{EXPORT_REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
    <label><span>Người nhận / bộ phận</span><input value={f.receiver} readOnly={readonly} onChange={(e) => set({receiver: e.target.value})}/></label>
    <label className="full"><span>Ghi chú</span><input value={f.note} readOnly={readonly} onChange={(e) => set({note: e.target.value})}/></label>
  </div></Panel>
  <Panel title="Sản phẩm xuất">
    {!readonly && <ProductPicker exclude={f.items.map((l: Row) => l.product_id)} onPick={(p) => set({items: [...f.items, {product_id: p.id, name: p.name, sku: p.sku, unit: p.unit || 'Cái', qty: 1, note: ''}]})}/>}
    {f.items.length ? <div className="ar-table-scroll"><table className="ar-table inv-lines"><thead><tr><th>Sản phẩm</th><th>Đơn vị</th><th>Có thể bán</th><th>SL xuất</th><th>Ghi chú</th>{!readonly && <th/>}</tr></thead><tbody>
      {f.items.map((l: Row, i: number) => <tr key={l.product_id}>
        <td><b>{l.name}</b><small>{l.sku}</small></td><td>{l.unit}</td><td>{num(productOf(l.product_id)?.stock)}</td>
        <td>{readonly ? l.qty : <input aria-label={`Số lượng xuất ${l.name}`} type="number" min={1} step={1} value={l.qty} onChange={(e) => set({items: f.items.map((x: Row, k: number) => (k === i ? {...x, qty: e.target.value === '' ? '' : Number(e.target.value)} : x))})}/>}</td>
        <td>{readonly ? l.note || '—' : <input aria-label={`Ghi chú ${l.name}`} value={l.note || ''} onChange={(e) => set({items: f.items.map((x: Row, k: number) => (k === i ? {...x, note: e.target.value} : x))})}/>}</td>
        {!readonly && <td><button type="button" className="btn btn-light" aria-label={`Bỏ ${l.name}`} onClick={() => set({items: f.items.filter((_: Row, k: number) => k !== i)})}>×</button></td>}
      </tr>)}</tbody></table></div> : <p className="inv-muted">Phiếu xuất chưa có sản phẩm.</p>}
  </Panel></>}</DataState>;
}

/* ------------------------------------------------------------------ Lịch sử kho */
function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const product = params.get('product') || ''; const type = params.get('type') || ''; const q = params.get('q') || '';
  const state = useData(async () => { await loadCache(); return (await ad.db.list('stock_moves', {order: 'id.desc', limit: 10000, filters: product ? [['product_id', 'eq', product]] : []})).rows; }, [product]);
  const rows = (state.data || []).filter((m) => (!type || m.type === type) && (!q || `${m.name} ${m.sku} ${m.ref}`.toLowerCase().includes(q.toLowerCase())));
  const set = (k: string, v: string) => { const next = new URLSearchParams(params); v ? next.set(k, v) : next.delete(k); setParams(next); };
  const p = product ? productOf(product) : null;
  return <><Head title="Lịch sử kho" subtitle={p ? `Sản phẩm: ${p.name} · Tồn hiện tại ${num(p.stock)}` : 'Mọi lần nhập, xuất, bán, hủy đơn, kiểm hàng: ai làm, lúc nào, tồn trước → sau.'}>
    {product && <button type="button" className="btn btn-light" onClick={() => set('product', '')}>Xem tất cả sản phẩm</button>}
    <button type="button" className="btn btn-light" onClick={() => downloadCSV('lich-su-kho.csv', [{label: 'Thời gian', key: 'created_at'}, {label: 'SKU', key: 'sku'}, {label: 'Sản phẩm', key: 'name'}, {label: 'Loại', value: (r) => MOVE_TYPES[r.type] || r.type}, {label: 'Chứng từ', key: 'ref'}, {label: 'Thay đổi', key: 'change'}, {label: 'Tồn trước', key: 'before'}, {label: 'Tồn sau', key: 'after'}, {label: 'Giá vốn', key: 'cost'}, {label: 'Người thực hiện', key: 'user_name'}, {label: 'Ghi chú', key: 'note'}], rows)}>Xuất CSV</button>
  </Head>
  <div className="ar-toolbar">
    <label><span>Tìm kiếm</span><input type="search" defaultValue={q} onChange={(e) => set('q', e.target.value)} placeholder="Sản phẩm, SKU, mã chứng từ…"/></label>
    <label><span>Loại</span><select value={type} onChange={(e) => set('type', e.target.value)}><option value="">Tất cả</option>{Object.entries(MOVE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
  </div>
  <DataState state={state}>{state.data && <Panel><Paged rows={rows} render={(page) => <MovesTable rows={page}/>}/></Panel>}</DataState></>;
}
