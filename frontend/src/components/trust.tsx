import {dt,safeUrl} from '../services/runtime';
import {Media} from './common';
import {PagedList} from './collections';
import type {Row} from '../types';
export function TrustSection(){
 const trust=dt.trust || {};const logos:Row[]=trust.logos || [],certs:Row[]=trust.certs || [];
 if(!logos.length&&!certs.length)return null;
 return <section className="section section-box trust-section" aria-label="Đối tác và chứng nhận">
  {logos.length>0&&<div className="tr-block"><h3>Khách hàng & đối tác tin tưởng</h3><PagedList items={logos} className="tr-logos" label="Đối tác" renderItem={(p,i)=>{const inner=p.image?<Media src={p.image} alt={p.name}/>:<b>{p.name}</b>;return safeUrl(p.url)?<a className="tr-logo" href={safeUrl(p.url)} target="_blank" rel="noopener noreferrer" key={i}>{inner}</a>:<span className="tr-logo" key={i}>{inner}</span>;}}/></div>}
  {certs.length>0&&<div className="tr-block"><h3>Chứng nhận & năng lực</h3><PagedList items={certs} className="tr-certs" label="Chứng nhận" renderItem={(p,i)=><figure className="tr-cert" key={i}><span className="tr-cert-img"><Media src={p.image} alt={p.title} placeholder="Ảnh giấy chứng nhận"/></span><figcaption><b>{p.title}</b>{(p.issuer||p.year)&&<small>{[p.issuer,p.year].filter(Boolean).join(' • ')}</small>}</figcaption></figure>}/></div>}
 </section>;
}
