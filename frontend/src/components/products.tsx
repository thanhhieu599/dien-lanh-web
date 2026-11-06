import { useState } from 'react';
import { dt, money, toast } from '../services/runtime';
import { useShop } from '../hooks/useShop';
import { Empty, Icon, Modal, Picture, ShopLink,Stars } from './common';
import type { Product } from '../types';
import {ITEMS_PER_PAGE,PagedList} from './collections';

export function AddToCart({product, qty = 1, options = {}, children = 'Thêm vào giỏ', className = 'btn btn-primary'}:{product:Product;qty?:number;options?:Record<string,string>;children?:React.ReactNode;className?:string}) {
  const groups = dt.api.optionGroups(product);
  if (groups.some((g:any)=>!g.values.includes(options[g.name]))) return <ShopLink className={className} href={dt.api.url(product)}>Chọn thuộc tính</ShopLink>;
  return <button type="button" className={className} data-action="add-cart" disabled={product.stock <= 0} onClick={()=>{if(dt.store.addToCart(product.id,qty,{options}))toast('Đã thêm vào giỏ hàng');}}><Icon name="cart"/>{product.stock <= 0 ? 'Hết hàng' : children}</button>;
}
export function ProductCard({product:p,flash=false}:{product:Product;flash?:boolean}) {
  const state = useShop();
  const [quick,setQuick] = useState(false);
  const pct = dt.u.discount(p);
  const chips=[p.attrs.capacity,p.attrs.tech==='Inverter'?'Inverter':null,p.attrs.volume,p.attrs.weight].filter(Boolean).slice(0,2);
  const badges:Record<string,[string,string]>={hot:['Bán chạy','hot'],bestseller:['Best seller','hot'],new:['Mới','new'],premium:['Cao cấp','premium'],project:['Dự án','b2b'],b2b:['Giá sỉ','b2b']};
  const badge=p.badges.map(b=>badges[b]).find(Boolean);
  return <article className="pcard" data-id={p.id}>
    <div className="pcard-media"><ShopLink href={dt.api.url(p)} className="pcard-img"><Picture product={p}/></ShopLink>
      <div className="pcard-labels">{!!pct && <span className="lbl lbl-sale">-{pct}%</span>}</div>{badge&&<span className={`lbl lbl-${badge[1]} pcard-badge`}>{badge[0]}</span>}
      <div className="pcard-actions">
        <button className={`icon-btn ${state.wishlist.includes(p.id)?'active':''}`} aria-label="Yêu thích" aria-pressed={state.wishlist.includes(p.id)} onClick={()=>dt.store.toggleWishlist(p.id)}><Icon name="heart"/></button>
        <button className={`icon-btn ${state.compare.includes(p.id)?'active':''}`} aria-label="So sánh" aria-pressed={state.compare.includes(p.id)} onClick={()=>{dt.store.toggleCompare(p.id);}}><Icon name="compare"/></button>
        <button className="icon-btn" aria-label="Xem nhanh" onClick={()=>setQuick(true)}><Icon name="eye"/></button>
      </div>
    </div>
    <div className="pcard-body">{chips.length>0&&<div className="pcard-chips">{chips.map(c=><span key={c}>{c}</span>)}</div>}
      <h3 className="pcard-name"><ShopLink href={dt.api.url(p)}>{p.name}</ShopLink></h3>
      <div className="pcard-price"><strong>{money(p.price)}</strong>{!!p.oldPrice && <del>{money(p.oldPrice)}</del>}</div>
      <div className="pcard-meta"><Stars rating={p.rating}/><span>{p.rating}</span><span className="dot">•</span><span>Đã bán {p.sold>=1000?(p.sold/1000).toFixed(1)+'k':p.sold}</span></div>
      {flash&&<div className="flash-bar"><span style={{width:`${Math.max(12,Math.min(95,Math.round(20/(p.stock+20)*100)))}%`}}/><em>{p.stock<10?`Chỉ còn ${p.stock} sản phẩm`:'Đã bán 20'}</em></div>}
      <AddToCart product={p} className="btn btn-outline btn-block btn-sm pcard-buy"/>
    </div>
    {quick && <Modal title={p.name} close={()=>setQuick(false)}><Picture product={p}/><p className="price">{money(p.price)}</p><p>{p.short}</p><ShopLink href={dt.api.url(p)} className="btn btn-primary">Xem chi tiết</ShopLink></Modal>}
  </article>;
}
export function ProductGrid({products,flash=false}:{products:Product[];flash?:boolean}) {
  return products.length ? <ProductResults key={products.map(p=>p.id).join(',')} products={products} flash={flash}/> : <Empty title="Không tìm thấy sản phẩm phù hợp"><p>Thử thay đổi bộ lọc hoặc tìm kiếm khác.</p></Empty>;
}
export const PRODUCTS_PER_PAGE = ITEMS_PER_PAGE;
function ProductResults({products,flash}:{products:Product[];flash:boolean}) {
  return <div className="product-results"><PagedList items={products} className="pgrid" label="Sản phẩm" renderItem={p=><ProductCard key={p.id} product={p} flash={flash}/>}/></div>;
}
export function CategorySection({category:c}:{category:import('../types').Category}) {
 const [sub,setSub]=useState('');const products=dt.api.list({cat:c.id,sub,sort:'category'}).items;
 return <section className="section section-box" data-block={c.id}><div className="section-head"><h2>{c.name}</h2><div className="tabs"><button type="button" className={`tab ${!sub?'active':''}`} aria-pressed={!sub} onClick={()=>setSub('')}>Nổi bật</button>{c.subs.map(s=><button type="button" className={`tab ${sub===s.id?'active':''}`} aria-pressed={sub===s.id} key={s.id} onClick={()=>setSub(s.id)}>{s.name.replace(/^(Máy lạnh|Máy giặt|Tủ lạnh) /,'')}</button>)}</div><ShopLink className="link" href={dt.api.catUrl(c.id,sub||undefined)}>Xem tất cả<Icon name="right"/></ShopLink></div><div className="block-body"><ProductGrid products={products}/></div></section>;
}
export function ProductSection({title,products,href}:{title:string;products:Product[];href?:string}) {
  return <section className="section section-box"><div className="section-head"><h2>{title}</h2>{href&&<ShopLink className="link" href={href}>Xem tất cả<Icon name="right"/></ShopLink>}</div><ProductGrid products={products}/></section>;
}
