import {useState} from 'react';
import {dt} from '../services/runtime';
import {Icon,ShopLink} from './common';
export function uniqueCategories(){return dt.categories.filter((c,index,all)=>all.findIndex(other=>dt.u.norm(other.short || other.name.replace(/\[TEST[^\]]*\]\s*/gi,''))===dt.u.norm(c.short || c.name.replace(/\[TEST[^\]]*\]\s*/gi,'')))===index);}
export function MegaMenu(){
 const categories=uniqueCategories();const [active,setActive]=useState(categories[0]?.id);
 return <div className="mega"><ul className="mega-list">{categories.map(c=><li className={active===c.id?'active':''} key={c.id} onMouseEnter={()=>setActive(c.id)} onFocus={()=>setActive(c.id)}><ShopLink href={dt.api.catUrl(c.id)}><Icon name={c.icon}/><span>{c.name}</span><Icon name="right"/></ShopLink></li>)}</ul><div className="mega-panels">{categories.map(c=><div className={`mega-panel ${active===c.id?'active':''}`} key={c.id}><div className="mega-col"><h4>Loại sản phẩm</h4>{c.subs.map(s=><ShopLink key={s.id} href={dt.api.catUrl(c.id,s.id)}>{s.name}</ShopLink>)}</div>{c.filters[0]&&<div className="mega-col"><h4>{c.filters[0].label}</h4>{c.filters[0].options.slice(0,5).map((o:string)=><ShopLink key={o} href={`danh-muc.html?cat=${c.id}&${c.filters[0].key}=${encodeURIComponent(o)}`}>{o}</ShopLink>)}</div>}<div className="mega-col"><h4>Thương hiệu</h4><div className="mega-brands">{dt.brands.filter(b=>dt.products.some(p=>p.cat===c.id&&p.brand===b.id)).slice(0,5).map(b=><ShopLink key={b.id} href={`danh-muc.html?cat=${c.id}&brand=${b.id}`}>{b.name}</ShopLink>)}</div></div></div>)}</div></div>;
}
