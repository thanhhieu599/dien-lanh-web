import {useId,useState,type FormEvent} from 'react';
import {ad,dt,saveSetting} from '../services/runtime';
import {DataState,Head,useData,useNotice} from '../components/common';
import {Gallery} from '../components/fields';
import type {Row} from '../types';
const labels:Record<string,string>={benefits:'Cam kết bán hàng',title:'Tiêu đề',sub:'Mô tả phụ',desc:'Mô tả',cta:'Nút hành động',href:'Liên kết',story:'Giới thiệu thương hiệu',stats:'Số liệu',value:'Giá trị',label:'Nhãn',btn:'Nhãn nút',btnHref:'Liên kết nút',flash:'Flash Sale',endsAt:'Thời điểm kết thúc',mini:'Banner nhỏ',newsletter:'Đăng ký nhận tin',b2b:'Doanh nghiệp',points:'Lợi ích',priceRanges:'Khoảng lọc giá',bundles:'Gợi ý mua kèm',icon:'Biểu tượng',name:'Tên',image:'Ảnh',url:'Liên kết',logos:'Đối tác',certs:'Chứng nhận',reviews:'Đánh giá thực tế',google:'Google Business',rating:'Điểm đánh giá',count:'Số đánh giá',updated:'Ngày cập nhật',placeId:'Place ID',text:'Nội dung',source:'Nguồn',date:'Ngày',images:'Hình ảnh',link:'Liên kết'};
// Nhãn tiếng Việt cho từng khóa dữ liệu; khóa chưa có nhãn hiển thị nguyên tên
const more:Record<string,string>={link:'Chữ liên kết phụ',kicker:'Dòng nhỏ trên tiêu đề',linkHref:'Liên kết phụ',issuer:'Đơn vị cấp',salesPolicy:'Chính sách bán hàng',sku:'Mã SKU phụ kiện',note:'Ghi chú',subs:'Áp dụng cho loại (mã, cách nhau dấu phẩy)',minHp:'Công suất từ (HP)',maxHp:'Công suất đến (HP)',v:'Mã',min:'Từ (₫)',max:'Đến (₫)',points:'Lợi ích',endsAt:'Kết thúc (để trống = 0 giờ mỗi ngày)'};
const label=(key:string)=>more[key]||labels[key]||key;
// Mô tả ngắn hiện dưới tên mục
const hints:Record<string,string>={mini:'2 thẻ nhỏ cạnh banner trang chủ. Có thể chèn ảnh nền, chữ hiện đè lên ảnh.',story:'Khối giới thiệu thương hiệu trên trang chủ.',b2b:'Khối khách hàng doanh nghiệp trên trang chủ và trang Doanh nghiệp.',flash:'Tiêu đề và thời điểm kết thúc Flash Sale.',benefits:'Dải cam kết dưới banner.',salesPolicy:'Chính sách hiện ở trang sản phẩm.',newsletter:'Ô đăng ký nhận tin ở cuối trang.',priceRanges:'Các mức giá trong bộ lọc danh mục.',bundles:'Phụ kiện gợi ý mua kèm theo loại máy.',images:'Ảnh các vị trí trên trang Tầm nhìn & Sứ mệnh.',logos:'Logo đối tác, khách hàng tiêu biểu.',certs:'Giấy chứng nhận, chứng chỉ.',reviews:'Đánh giá thật của khách hàng.',google:'Thông tin hồ sơ Google Business.'};
const LONG=/^(desc|text|answer|content|excerpt)$/;
type Path=(string|number)[];
// Tên hiển thị của 1 dòng trong danh sách
function rowName(list:string,item:any,i:number){const name=item&&typeof item==='object'?item.title||item.name||item.label||item.sku:'';const base=list==='mini'?`Banner nhỏ ${i+1}`:`${label(list)} ${i+1}`;return name?`${base} · ${String(name).replace(/\n/g,' ')}`:base;}
function blank(sample:any,list:string):any{
 if(sample&&typeof sample==='object')return Object.fromEntries(Object.keys(sample).map(k=>[k,Array.isArray(sample[k])?[]:typeof sample[k]==='number'?0:typeof sample[k]==='boolean'?false:'']));
 if(typeof sample==='string'||sample===undefined&&list==='points')return '';
 return list==='logos'?{name:'',image:'',url:''}:list==='certs'?{title:'',issuer:'',image:''}:list==='reviews'?{name:'',rating:5,text:'',source:'Google',date:''}:'';
}
// Một ô nhập: ảnh, chọn biểu tượng, số, bật/tắt, chữ ngắn hoặc chữ dài
function Leaf({name,path,value,onChange,onPending}:{name:string;path:Path;value:any;onChange:(v:any)=>void;onPending:(n:number)=>void}){
 const id=useId();const key=String(path.at(-1));const text=label(name);
 if(/image$|^logo$/.test(key)||path[0]==='images'){const mini=path[1]==='mini';const slot=path[0]==='images'?(dt.visionSlots||[]).find((s:Row)=>s.key===key):null;
  return <div className="ar-field full ce-image"><label>{mini?'Ảnh nền thẻ':slot?slot.label:text}</label><Gallery value={value} onChange={onChange} folder={path[0]==='images'?'vision':path[0]==='home'?'home':'trust'} onPending={onPending}/><small>{mini?'Ảnh ngang khoảng 600 × 300 px, chủ thể đặt bên phải; chữ của thẻ hiện đè lên phía trái ảnh. Để trống = thẻ nền trắng như cũ.':slot?`${slot.hint} · ${slot.size}`:'JPG, PNG hoặc WebP, tối đa 10 MB.'}</small></div>;}
 if(key==='icon')return <div className="ar-field"><label htmlFor={id}>{text}</label><select id={id} value={value??''} onChange={e=>onChange(e.target.value)}>{[...new Set([value,...(dt.siteIcons||[])])].filter(Boolean).map((v:string)=><option key={v}>{v}</option>)}</select></div>;
 if(typeof value==='boolean')return <div className="ar-field"><label className="ar-check"><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/><span>{text}</span></label></div>;
 if(typeof value==='number'||value===null&&/rating|count|min|max|Hp$/.test(key))return <div className="ar-field"><label htmlFor={id}>{text}</label><input id={id} type="number" step="any" value={value??''} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/></div>;
 if(Array.isArray(value))return <div className="ar-field full"><label htmlFor={id}>{text}</label><input id={id} value={value.join(', ')} onChange={e=>onChange(e.target.value.split(',').map(v=>v.trim()).filter(Boolean))}/></div>;
 const str=String(value??'');const long=LONG.test(key)||str.includes('\n')||str.length>90;
 return <div className={`ar-field${long||str.length>50?' full':''}`}><label htmlFor={id}>{text}</label>{long?<textarea id={id} rows={Math.min(5,Math.max(2,str.split('\n').length+1))} value={str} onChange={e=>onChange(e.target.value)}/>:<input id={id} value={str} onChange={e=>onChange(e.target.value)}/>}</div>;
}
// Các trường của một đối tượng, xếp lưới 2 cột; đối tượng/danh sách con hiện thành tiêu đề phụ, không đóng khung
function Fields({value,path,onChange,onPending}:{value:Row;path:Path;onChange:(v:Row)=>void;onPending:(n:number)=>void}){
 const entries=Object.entries(value||{});// Mảng chữ ngắn trong 1 dòng danh sách (vd mã loại máy) nhập cách dấu phẩy; mảng chữ ở cấp mục (vd Lợi ích) hiện từng dòng vì nội dung có thể chứa dấu phẩy
 const inRow=typeof path.at(-1)==='number';const simple=entries.filter(([,v])=>!(v&&typeof v==='object')||inRow&&Array.isArray(v)&&v.every(x=>typeof x!=='object'));const nested=entries.filter(e=>!simple.includes(e));
 return <><div className="ar-grid ce-grid">{simple.map(([k,v])=><Leaf key={k} name={k} path={[...path,k]} value={v} onPending={onPending} onChange={next=>onChange({...value,[k]:next})}/>)}</div>
  {nested.map(([k,v])=><div className="ce-sub" key={k}><h3>{label(k)}</h3><Block value={v} path={[...path,k]} onPending={onPending} onChange={next=>onChange({...value,[k]:next})}/></div>)}</>;
}
// Danh sách: mỗi dòng ngăn bằng đường kẻ, nút sắp xếp/xóa nằm cùng hàng tiêu đề
function List({value,path,onChange,onPending}:{value:any[];path:Path;onChange:(v:any[])=>void;onPending:(n:number)=>void}){
 const list=String(path.at(-1));const move=(i:number,d:number)=>{const next=[...value];[next[i],next[i+d]]=[next[i+d],next[i]];onChange(next);};
 const tools=(i:number,name:string)=><div className="ce-tools"><button type="button" className="btn btn-light btn-icon" disabled={i===0} aria-label={`Đưa ${name} lên`} onClick={()=>move(i,-1)}>↑</button><button type="button" className="btn btn-light btn-icon" disabled={i===value.length-1} aria-label={`Đưa ${name} xuống`} onClick={()=>move(i,1)}>↓</button><button type="button" className="btn btn-light ce-del" aria-label={`Xóa ${name}`} onClick={()=>onChange(value.filter((_,j)=>j!==i))}>Xóa</button></div>;
 // Danh sách đơn giản (≤4 ô ngắn, không ảnh): hiện dạng bảng, mỗi mục 1 dòng
 const keys=value[0]&&typeof value[0]==='object'?Object.keys(value[0]):[];
 const compact=keys.length>0&&keys.length<=4&&value.every(item=>item&&typeof item==='object'&&Object.entries(item).every(([k,v])=>!/image$|^logo$/.test(k)&&(v==null||typeof v!=='object')&&String(v??'').length<=70&&!String(v??'').includes('\n')));
 if(compact){const cols={gridTemplateColumns:`${keys.map(k=>k==='icon'?'140px':'minmax(0,1fr)').join(' ')} 128px`};
  const cell=(item:Row,i:number,k:string)=>{const v=item[k];const set=(next:any)=>onChange(value.map((x,j)=>j===i?{...x,[k]:next}:x));const name=`${label(k)} ${i+1}`;
   if(k==='icon')return <select key={k} aria-label={name} value={v??''} onChange={e=>set(e.target.value)}>{[...new Set([v,...(dt.siteIcons||[])])].filter(Boolean).map((o:string)=><option key={o}>{o}</option>)}</select>;
   if(typeof v==='number'||v===null&&/rating|count|min|max|Hp$/.test(k))return <input key={k} type="number" step="any" aria-label={name} placeholder={label(k)} value={v??''} onChange={e=>set(e.target.value===''?null:Number(e.target.value))}/>;
   if(typeof v==='boolean')return <input key={k} type="checkbox" aria-label={name} checked={v} onChange={e=>set(e.target.checked)}/>;
   return <input key={k} aria-label={name} placeholder={label(k)} value={String(v??'')} onChange={e=>set(e.target.value)}/>;};
  return <div className="ce-list ce-table"><div className="ce-thead" style={cols} aria-hidden="true">{keys.map(k=><span key={k}>{label(k)}</span>)}<span/></div>
   {value.map((item,i)=><div className="ce-trow" style={cols} key={i}>{keys.map(k=>cell(item,i,k))}{tools(i,rowName(list,item,i))}</div>)}
   <button type="button" className="btn btn-light ce-add" onClick={()=>onChange([...value,blank(value[0],list)])}>+ Thêm {label(list).toLowerCase()}</button></div>;}
 return <div className="ce-list">{value.length===0&&<p className="ce-empty">Chưa có mục nào.</p>}
  {value.map((item,i)=>{const name=rowName(list,item,i);return item&&typeof item==='object'
   ?<div className="ce-row" key={i}><div className="ce-row-head"><b>{name}</b>{tools(i,name)}</div><Fields value={item} path={[...path,i]} onPending={onPending} onChange={next=>onChange(value.map((x,j)=>j===i?next:x))}/></div>
   :<div className="ce-row ce-row-inline" key={i}><input aria-label={name} value={String(item??'')} onChange={e=>onChange(value.map((x,j)=>j===i?e.target.value:x))}/>{tools(i,name)}</div>;})}
  <button type="button" className="btn btn-light ce-add" onClick={()=>onChange([...value,blank(value[0],list)])}>+ Thêm {list==='mini'?'banner nhỏ':label(list).toLowerCase()}</button></div>;
}
function Block({value,path,onChange,onPending}:{value:any;path:Path;onChange:(v:any)=>void;onPending:(n:number)=>void}){
 if(Array.isArray(value))return <List value={value} path={path} onChange={onChange} onPending={onPending}/>;
 if(value&&typeof value==='object')return <Fields value={value} path={path} onChange={onChange} onPending={onPending}/>;
 return <div className="ar-grid ce-grid"><Leaf name={String(path.at(-1))} path={path} value={value} onChange={onChange} onPending={onPending}/></div>;
}
// Các mục hiển thị ở cột trái: nội dung trang chủ/danh mục tách thành từng mục riêng
function sectionsOf(value:Row):{id:string;path:string[];title:string;group?:string}[]{
 const out:{id:string;path:string[];title:string;group?:string}[]=[];
 for(const [k,v] of Object.entries(value)){
  if((k==='home'||k==='catalog')&&v&&typeof v==='object'&&!Array.isArray(v))for(const sub of Object.keys(v))out.push({id:`${k}.${sub}`,path:[k,sub],title:label(sub),group:k==='home'?'Trang chủ':'Danh mục & phụ kiện'});
  else out.push({id:k,path:[k],title:label(k)});
 }
 return out;
}
const getIn=(obj:any,path:string[])=>path.reduce((o,k)=>o?.[k],obj);
const setIn=(obj:any,path:string[],v:any):any=>path.length?{...obj,[path[0]]:setIn(obj?.[path[0]],path.slice(1),v)}:v;
export function ContentPage({resource:key}:{resource:string}){
 for(const slot of dt.visionSlots||[])labels[slot.key]=`${slot.label} (${slot.size})`;
 const state=useData(async()=>{
  if(key==='content'){const [home,catalog]=await Promise.all([ad.db.get('settings','home'),ad.db.get('settings','catalog')]);return {home:dt.siteContent(home?.value||{}),catalog:{priceRanges:dt.priceRanges,bundles:dt.bundleRules,...catalog?.value}};}
  if(key==='vision'){const row=ad.db.mode==='demo'?JSON.parse(localStorage.getItem(dt.VISION_DEMO_KEY)||'null'):await ad.db.get('settings','vision');const images=row?.value?.images||row?.images||dt.visionImages();return {images:Object.fromEntries((dt.visionSlots||[]).map((slot:Row)=>[slot.key,images[slot.key]||'']))};}
  const row=ad.db.mode==='demo'?JSON.parse(localStorage.getItem(dt.TRUST_DEMO_KEY)||'null'):await ad.db.get('settings','trust');const source=row?.value||row||dt.trust||{};return {logos:[],certs:[],reviews:[],...source,google:{url:'',placeId:'',rating:0,count:0,updated:'',...source.google}};
 },[key]);
 return <DataState state={state}>{state.data&&<ContentEditor key={key} resource={key} initial={state.data}/>}</DataState>;
}
function ContentEditor({resource:key,initial}:{resource:string;initial:Row}){const [value,setValue]=useState<Row>(initial);const [busy,setBusy]=useState(false);const [pending,setPending]=useState(0);const notice=useNotice();const title=key==='content'?'Nội dung website':key==='vision'?'Trang Tầm nhìn':'Uy tín & đánh giá';
 async function submit(e:FormEvent){e.preventDefault();if(busy||pending)return;if(key==='trust'&&(Number(value.google?.rating)<0||Number(value.google?.rating)>5)){notice('Điểm Google phải từ 0 đến 5.',true);return;}setBusy(true);try{if(key==='content'){await saveSetting('home',value.home);await saveSetting('catalog',value.catalog);}else if(ad.db.mode==='demo'){localStorage.setItem(key==='vision'?dt.VISION_DEMO_KEY:dt.TRUST_DEMO_KEY,JSON.stringify(value));}else await saveSetting(key,value);notice('Đã lưu nội dung website.');}catch(err){notice(err instanceof Error?err.message:String(err),true);}finally{setBusy(false);}}
 const sections=sectionsOf(value);const [active,setActive]=useState(sections[0]?.id);const current=sections.find(x=>x.id===active)||sections[0];
 return <><Head title={title} subtitle="Chọn mục bên trái để chỉnh; dữ liệu dùng chung với website."/>
  <form className="ce-layout" onSubmit={submit}>
   {sections.length>1&&<nav className="ce-nav" aria-label="Các mục nội dung">{sections.map((x,i)=><div key={x.id}>{x.group&&x.group!==sections[i-1]?.group&&<span className="ce-nav-group">{x.group}</span>}<button type="button" className={x.id===current.id?'active':''} aria-current={x.id===current.id?'true':undefined} onClick={()=>setActive(x.id)}>{x.title}</button></div>)}</nav>}
   <div className="ce-main">
    <section className="ar-panel ce-section" aria-labelledby="ce-title"><fieldset disabled={busy}>
     <h2 id="ce-title" className="ce-title">{current.title}</h2>
     {hints[current.path.at(-1)!]&&<p className="ce-hint">{hints[current.path.at(-1)!]}</p>}
     <Block key={current.id} value={getIn(value,current.path)} path={current.path} onPending={n=>setPending(v=>v+n)} onChange={next=>setValue(prev=>setIn(prev,current.path,next))}/>
    </fieldset></section>
    <p className="ce-note">Chỉ nhập số liệu, chứng nhận và đánh giá có nguồn xác thực. Bỏ ảnh chỉ gỡ khỏi nội dung, không xóa file đang dùng ở nơi khác.</p>
    <div className="ar-form-foot ce-savebar"><span>Lưu áp dụng cho tất cả các mục{sections.length>1?' bên trái':''}.</span><button className="btn btn-primary" disabled={busy||pending>0} aria-busy={busy}>{pending?'Đang tải ảnh…':busy?'Đang lưu…':'Lưu nội dung'}</button></div>
   </div>
  </form></>;
}
