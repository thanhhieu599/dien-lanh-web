import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { dt, safeUrl, safeImage, siteBase } from '../services/runtime';
import type { Product,Row } from '../types';

export function ShopLink({href, children, ...props}: {href:string;children:ReactNode;[key:string]:any}) {
  const safe = safeUrl(href);
  if (!safe) return <span {...props}>{children}</span>;
  const url = new URL(safe, siteBase);
  if (safe.startsWith('#') || url.origin !== siteBase.origin || !url.pathname.startsWith(siteBase.pathname)) return <a href={safe.startsWith('#')?location.pathname+location.search+safe:safe} {...props}>{children}</a>;
  return <Link to={'/' + url.pathname.slice(siteBase.pathname.length) + url.search + url.hash} {...props}>{children}</Link>;
}
export function Icon({name}: {name:string}) { return <svg className="ic react-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:dt.ICONS[name] || ''}}/>; }
export function Stars({rating}:{rating:number}){const value=Math.max(0,Math.min(5,Number(rating)||0));return <span className="stars" aria-label={`${value} trên 5 sao`}>{Array.from({length:5},(_,i)=><span key={i} className={i<Math.floor(value)?'on':i===Math.floor(value)&&value%1>=.5?'half':''} aria-hidden="true">★</span>)}</span>;}
export function Rich({html, className = '',as:Tag='div'}: {html:unknown;className?:string;as?:'div'|'span'}) {
  return <Tag className={className} style={Tag==='span'?{font:'inherit',color:'inherit',margin:0}:undefined} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(String(html || ''))}}/>;
}
export function Picture({product, index = 0}: {product:Product;index?:number}) {
  const src = product.images?.[index] || product.images?.[0];
  return <Media src={src} alt={product.name} placeholder="Hình ảnh sản phẩm"/>;
}
export function Media({src,alt,placeholder='Hình ảnh'}:{src?:unknown;alt:string;placeholder?:string}) {
  const image=safeImage(src);const [failed,setFailed]=useState('');
  return image && failed!==image ? <img src={image} alt={alt} loading="lazy" onError={()=>setFailed(image)}/> : <Placeholder label={placeholder}/>;
}
export function ContentCard({href,title,excerpt,image,meta}:{href:string;title:string;excerpt?:string;image?:unknown;meta?:ReactNode}) {
  return <article className="news-card"><ShopLink className="news-img" href={href}><Media src={image} alt={title}/></ShopLink><div className="news-body"><h3><ShopLink href={href}>{title}</ShopLink></h3>{excerpt && <p>{excerpt}</p>}{meta && <small className="news-meta">{meta}</small>}</div></article>;
}
export function Placeholder({label = 'Hình ảnh'}:{label?:string}) {
  return <div className="react-placeholder"><svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label}><rect width="400" height="400" rx="24" fill="#f2f4f7"/><rect x="16" y="16" width="368" height="368" rx="18" fill="#f9fafb" stroke="#d0d5dd" strokeWidth="2" strokeDasharray="10 8"/><g fill="none" stroke="#98a2b3" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><rect x="130" y="120" width="140" height="110" rx="14"/><circle cx="168" cy="155" r="12"/><path d="M138 222l42-42 30 30 22-22 34 34"/></g><text x="200" y="285" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontSize="22" fontWeight="700" fill="#667085">{label}</text></svg></div>;
}
export function Empty({title, children, heading=2}:{title:string;children?:ReactNode;heading?:1|2}) {
  const Heading=heading===1?'h1':'h2';
  return <div className="empty"><Icon name="search"/><Heading>{title}</Heading>{children}<ShopLink href="index.html" className="btn btn-primary">Tiếp tục mua sắm</ShopLink></div>;
}
export function Breadcrumb({items}:{items:{label:string;href?:string}[]}) {
  return <nav className="breadcrumb" aria-label="Đường dẫn"><div className="container"><ShopLink href="index.html">Trang chủ</ShopLink>{items.map((i,index)=><span className="breadcrumb-part" key={index}><Icon name="right"/>{i.href ? <ShopLink href={i.href}>{i.label}</ShopLink> : <span>{i.label}</span>}</span>)}</div></nav>;
}
export function ProjectCard({project:p}:{project:Row}) {
 const href=dt.SEO?.prettyUrls?`du-an/${p.slug}.html`:`du-an-chi-tiet.html?slug=${p.slug}`;
 return <article className="pj-card"><ShopLink className="pj-img" href={href}><Media src={p.afterImage || p.beforeImage} alt={p.title} placeholder="Ảnh công trình"/>{p.beforeImage&&p.afterImage&&<span className="pj-ba">Trước / Sau</span>}</ShopLink><div className="pj-body"><span className="pj-ind">{p.industry || 'Dự án'}{p.year&&` • ${p.year}`}</span><h3><ShopLink href={href}>{p.title}</ShopLink></h3>{p.location&&<p className="pj-loc"><Icon name="pin"/>{p.location}</p>}<ul className="pj-facts">{[p.units?`${p.units} máy`:'',p.capacity,p.duration].filter(Boolean).map((fact,i)=><li key={i}>{fact}</li>)}</ul></div></article>;
}
export function useMeta(title: string, description = '', canonical?: string) {
  useEffect(()=>{dt.u.setMeta({title,description:description || `${title} tại ${dt.config.name}. ${dt.config.slogan}`,canonical:canonical || location.href});},[title,description,canonical]);
}
export function useJsonLd(type:string, data:Record<string,unknown>) {
  const encoded = JSON.stringify({'@context':'https://schema.org','@type':type,...data}).replace(/</g,'\\u003c');
  useEffect(()=> {
    const script = document.head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-ld="${type}"]`) || document.createElement('script'); script.type='application/ld+json'; script.dataset.ld=type;
    script.textContent=encoded; document.head.append(script);
    return ()=>script.remove();
  },[encoded,type]);
}
export function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=dialog.current!;const previous=document.activeElement as HTMLElement|null;el.showModal();return ()=>{el.close();previous?.focus();};},[]);
  return <dialog ref={dialog} aria-label={title} className="react-dialog" onCancel={close} onClick={e=>{if(e.target===dialog.current)close();}}><button className="icon-btn react-dialog-close" aria-label="Đóng" onClick={close}>×</button><h2>{title}</h2>{children}</dialog>;
}
