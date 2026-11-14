// Bộ lọc khoảng thời gian dùng chung cho các trang số liệu / báo cáo.
// Nút hiển thị "dd/mm/yyyy – dd/mm/yyyy", bấm mở danh sách mốc nhanh + tự chọn ngày.
// Giá trị lưu trên URL (?from=YYYY-MM-DD&to=YYYY-MM-DD) để tải lại trang / gửi link vẫn giữ kỳ đang xem.
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';

export type Range={from:string;to:string};
const pad=(n:number)=>String(n).padStart(2,'0');
export const ymd=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return ymd(d);};
export const showDate=(v:string)=>v?v.split('-').reverse().join('/'):'';
export const daysBetween=(r:Range)=>Math.round((new Date(r.to+'T00:00:00').getTime()-new Date(r.from+'T00:00:00').getTime())/864e5)+1;
// Kỳ liền trước cùng độ dài (để so sánh tăng / giảm)
export function previousRange(r:Range):Range{const n=daysBetween(r);const f=new Date(r.from+'T00:00:00');const to=new Date(f);to.setDate(f.getDate()-1);const from=new Date(f);from.setDate(f.getDate()-n);return {from:ymd(from),to:ymd(to)};}

export const PRESETS:[string,string,()=>Range][]=[
 ['today','Hôm nay',()=>({from:day(),to:day()})],
 ['yesterday','Hôm qua',()=>({from:day(-1),to:day(-1)})],
 ['7d','7 ngày qua',()=>({from:day(-6),to:day()})],
 ['30d','30 ngày qua',()=>({from:day(-29),to:day()})],
 ['90d','90 ngày qua',()=>({from:day(-89),to:day()})],
 ['month','Tháng này',()=>{const d=new Date();return {from:ymd(new Date(d.getFullYear(),d.getMonth(),1)),to:day()};}],
 ['lastmonth','Tháng trước',()=>{const d=new Date();return {from:ymd(new Date(d.getFullYear(),d.getMonth()-1,1)),to:ymd(new Date(d.getFullYear(),d.getMonth(),0))};}],
 ['quarter','Quý này',()=>{const d=new Date();return {from:ymd(new Date(d.getFullYear(),Math.floor(d.getMonth()/3)*3,1)),to:day()};}],
 ['year','Năm nay',()=>({from:`${new Date().getFullYear()}-01-01`,to:day()})],
 ['lastyear','Năm trước',()=>{const y=new Date().getFullYear()-1;return {from:`${y}-01-01`,to:`${y}-12-31`};}],
];
export const ALL:Range={from:'',to:''};

// Đọc khoảng thời gian từ URL; chưa chọn thì dùng mặc định (mốc nhanh hoặc "toàn bộ thời gian")
export function useRange(fallback:string|null='30d'):[Range,(r:Range)=>void]{
 const [params,setParams]=useSearchParams();
 const preset=PRESETS.find(([k])=>k===fallback)?.[2]();
 const value:Range=params.has('from')||params.has('to')?{from:params.get('from')||'',to:params.get('to')||''}:preset||ALL;
 const set=(r:Range)=>{const next=new URLSearchParams(params);next.set('from',r.from);next.set('to',r.to);next.delete('page');setParams(next);};
 return [value,set];
}
// Bản ghi có nằm trong khoảng (so theo ngày giờ địa phương)
export function inRange(value:any,r:Range){if(!r.from&&!r.to)return true;if(!value)return false;const d=ymd(new Date(value));return (!r.from||d>=r.from)&&(!r.to||d<=r.to);}

export function DateRange({value,onChange,allowAll=false}:{value:Range;onChange:(r:Range)=>void;allowAll?:boolean}){
 const [open,setOpen]=useState(false);const [draft,setDraft]=useState(value);const [error,setError]=useState('');const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;setDraft(value);setError('');const close=(e:MouseEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false);};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',close);document.addEventListener('keydown',esc);return ()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',esc);};},[open]);
 const active=PRESETS.find(([,,fn])=>{const r=fn();return r.from===value.from&&r.to===value.to;});
 const label=!value.from&&!value.to?'Toàn bộ thời gian':`${showDate(value.from)||'…'} – ${showDate(value.to)||'…'}`;
 const pick=(r:Range)=>{onChange(r);setOpen(false);};
 const apply=()=>{if(!draft.from||!draft.to){setError('Chọn đủ từ ngày và đến ngày.');return;}if(draft.from>draft.to){setError('Từ ngày phải trước hoặc bằng đến ngày.');return;}pick(draft);};
 return <div className="ar-range" ref={box}>
  <button type="button" className="ar-range-btn" aria-haspopup="dialog" aria-expanded={open} aria-label={`Khoảng thời gian: ${label}`} onClick={()=>setOpen(!open)}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
   <span>{label}</span>{active&&<small>{active[1]}</small>}<b aria-hidden="true">▾</b>
  </button>
  {open&&<div className="ar-range-pop" role="dialog" aria-label="Chọn khoảng thời gian">
   <ul>{allowAll&&<li><button type="button" className={!value.from&&!value.to?'active':''} onClick={()=>pick(ALL)}>Toàn bộ thời gian</button></li>}{PRESETS.map(([k,l,fn])=><li key={k}><button type="button" className={active?.[0]===k?'active':''} onClick={()=>pick(fn())}>{l}</button></li>)}</ul>
   <div className="ar-range-custom"><strong>Tùy chọn</strong>
    <label>Từ ngày<input type="date" value={draft.from} max={draft.to||undefined} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
    <label>Đến ngày<input type="date" value={draft.to} min={draft.from||undefined} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
    {error&&<p className="ar-range-error" role="alert">{error}</p>}
    <div className="ar-actions"><button type="button" className="btn btn-light" onClick={()=>setOpen(false)}>Hủy</button><button type="button" className="btn btn-primary" onClick={apply}>Áp dụng</button></div>
   </div>
  </div>}
 </div>;
}

// Tỷ lệ thay đổi so với kỳ trước: ▲ 12,5% / ▼ 3% / — khi kỳ trước bằng 0
export function Delta({now,prev}:{now:number;prev:number}){if(!prev)return now?<em className="ar-delta up">Mới phát sinh so với kỳ trước</em>:<em className="ar-delta">Không đổi so với kỳ trước</em>;const p=(now-prev)/prev*100;return <em className={`ar-delta ${p>0?'up':p<0?'down':''}`}>{p>0?'▲':p<0?'▼':''} {Math.abs(p).toLocaleString('vi-VN',{maximumFractionDigits:1})}% so với kỳ trước</em>;}
