import {dt} from '../services/runtime';
import {Media} from './common';
import {PagedList} from './collections';
import type {Row} from '../types';
export function TrustSection(){
 // Quản trị › Uy tín & đánh giá › Chứng nhận: tắt cả mục (showCerts=false) hoặc từng chứng nhận (show=false) thì không hiện ở đâu trên web
 const trust=dt.trust || {};const certs:Row[]=trust.showCerts===false?[]:(trust.certs || []).filter((c:Row)=>c&&c.show!==false);
 if(!certs.length)return null;
 return <section className="section section-box trust-section" aria-label="Chứng nhận và năng lực">
  {certs.length>0&&<div className="tr-block"><h3>Chứng nhận & năng lực</h3><PagedList items={certs} className="tr-certs" label="Chứng nhận" renderItem={(p,i)=><figure className="tr-cert" key={i}><span className="tr-cert-img"><Media src={p.image} alt={p.title} placeholder="Ảnh giấy chứng nhận"/></span><figcaption><b>{p.title}</b>{(p.issuer||p.year)&&<small>{[p.issuer,p.year].filter(Boolean).join(' • ')}</small>}</figcaption></figure>}/></div>}
 </section>;
}
