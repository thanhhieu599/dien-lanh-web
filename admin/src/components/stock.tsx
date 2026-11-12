// Thành phần dùng chung của Kho hàng: ô tìm sản phẩm để thêm vào chứng từ, bảng lịch sử kho.
import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ad, date, money} from '../services/runtime';
import {MOVE_TYPES} from '../services/inventory';
import {DataState, Table, useData} from './common';
import type {Row} from '../types';

// Tìm theo tên / SKU / mã vạch; Enter chọn dòng đầu (dùng được với máy quét mã vạch)
export function ProductPicker({onPick, exclude = [], label = 'Thêm sản phẩm'}: {onPick: (p: Row) => void; exclude?: unknown[]; label?: string}) {
  const [q, setQ] = useState('');
  const products: Row[] = ad.cache.products || [];
  const skip = new Set(exclude.map(String));
  const hits = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return products.filter((p) => !skip.has(String(p.id)) && `${p.name} ${p.sku} ${p.barcode || ''}`.toLowerCase().includes(k)).slice(0, 8);
  }, [q, products, exclude.join(',')]);
  const pick = (p: Row) => { onPick(p); setQ(''); };
  return <div className="inv-picker">
    <label><span>{label}</span><input type="search" value={q} placeholder="Tìm theo tên, mã SKU hoặc quét mã vạch…" onChange={(e) => setQ(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (hits[0]) pick(hits[0]); } }}/></label>
    {hits.length > 0 && <ul className="inv-hits" role="listbox" aria-label="Kết quả tìm sản phẩm">{hits.map((p) =>
      <li key={p.id}><button type="button" onClick={() => pick(p)}><b>{p.name}</b><small>{p.sku}{p.barcode ? ` · ${p.barcode}` : ''} · Tồn: {Number(p.stock) || 0} {p.unit || ''}</small></button></li>)}
    </ul>}
    {q.trim() && !hits.length && <p className="inv-muted">Không tìm thấy sản phẩm phù hợp.</p>}
  </div>;
}

export function MovesTable({rows}: {rows: Row[]}) {
  return <Table rows={rows} columns={[
    {label: 'Thời gian', render: (r) => date(r.created_at)},
    {label: 'Sản phẩm', render: (r) => <><Link to={`/products/${encodeURIComponent(r.product_id)}`}>{r.name}</Link><small>{r.sku}</small></>},
    {label: 'Loại', render: (r) => MOVE_TYPES[r.type] || r.type},
    {label: 'Chứng từ', render: (r) => r.ref || '—'},
    {label: 'Thay đổi', render: (r) => <b className={r.change > 0 ? 'inv-plus' : 'inv-minus'}>{r.change > 0 ? '+' : ''}{r.change}</b>},
    {label: 'Tồn trước → sau', render: (r) => `${r.before} → ${r.after}`},
    {label: 'Giá vốn', render: (r) => money(r.cost)},
    {label: 'Người thực hiện', render: (r) => <>{r.user_name || '—'}<small>{r.note}</small></>},
  ]}/>;
}

// Trong trang sửa sản phẩm: 10 lần thay đổi tồn gần nhất
export function ProductStockHistory({productId}: {productId: unknown}) {
  const state = useData(async () => productId ? (await ad.db.list('stock_moves', {filters: [['product_id', 'eq', productId]], order: 'id.desc', limit: 10})).rows : [], [String(productId)]);
  if (!productId) return <p className="inv-muted">Lịch sử kho hiện sau khi lưu sản phẩm.</p>;
  return <div className="inv-history">
    <div className="inv-row-head"><h3>Lịch sử kho gần đây</h3><Link to={`/stock-history?product=${encodeURIComponent(String(productId))}`}>Xem tất cả</Link></div>
    <DataState state={state}>{state.data && <MovesTable rows={state.data}/>}</DataState>
  </div>;
}
