// Bảo trì › Lịch nhắc: danh sách gọi chăm sóc khách đến hạn bảo trì. Nhân viên tự gọi / nhắn Zalo,
// đánh dấu đã hẹn lịch hoặc bỏ qua (bắt buộc ghi lý do). Mọi thao tác lưu kèm người làm + thời gian, không xóa được.
import {useMemo,useState,type FormEvent} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ad,dt,loadCache,today} from '../services/runtime';
import {Action,DataState,useData,useNotice} from '../components/common';
import {callList,filterCalls,type CallFilter,type CallRow} from '../services/maintenance';
import type {Row} from '../types';
import {QuickVisit} from './maintenance';

type Db=typeof ad.db&{maintenanceCall?:(args:Row)=>Promise<Row>};
function maintenanceCall(args:Row):Promise<Row>{const db=ad.db as Db;return db.mode==='mysql'?db.rpc('maintenance_call',args):db.maintenanceCall!(args);}
const FILTERS:[CallFilter,string][]=[['todo','Cần gọi'],['overdue','Quá hạn'],['week','Trong 7 ngày tới'],['month','Tháng này'],['booked','Đã hẹn'],['skipped','Đã bỏ qua'],['all','Tất cả']];
const ACTIONS:Record<string,string>={called:'Đã gọi',booked:'Hẹn lịch',skipped:'Bỏ qua',reset:'Mở lại'};
const vnDate=(d?:string|null)=>d?d.slice(0,10).split('-').reverse().join('/'):'—';
const zaloPhone=(p:string)=>{const d=p.replace(/\D/g,'');return d.startsWith('84')?'0'+d.slice(2):d;};
function DueTag({r}:{r:CallRow}){
 if(r.status==='booked')return <span className="mc-tag mc-booked">Hẹn {vnDate(r.bookedDate)}</span>;
 if(r.status==='skipped')return <span className="mc-tag mc-skip">Đã bỏ qua</span>;
 return <span className={`mc-tag ${r.daysLeft<0?'mc-over':r.daysLeft<=7?'mc-soon':'mc-ok'}`}>{r.daysLeft<0?`Quá hạn ${-r.daysLeft} ngày`:r.daysLeft===0?'Hôm nay':`Còn ${r.daysLeft} ngày`}</span>;
}

export function MaintenanceCalls({contracts,visits,onChange}:{contracts:Row[];visits:Row[];onChange:()=>void}){
 const [params,setParams]=useSearchParams();const f=(params.get('f')||'todo') as CallFilter;const q=(params.get('q')||'').trim();
 const notice=useNotice();const [rev,setRev]=useState(0);
 const state=useData(async()=>{const [o,c]=await Promise.all([
   ad.db.list('orders',{filters:[['maintenance_optin','eq',true],['status','eq','done']],limit:50000,select:'*,order_items(*)'}),
   ad.db.list('maintenance_calls',{limit:50000})]);return {orders:o.rows,calls:c.rows};},[rev,contracts.length,visits.length]);
 // Chỉ đơn có máy lạnh / điều hòa mới cần bảo trì định kỳ
 const acOrders=useMemo(()=>(state.data?.orders||[]).filter((o:Row)=>(o.order_items||[]).some((i:Row)=>ad.product(i.product_id)?.cat==='may-lanh'||/máy lạnh|điều hòa|điều hoà/i.test(String(i.name||'')))),[state.data]);
 const all=useMemo(()=>state.data?callList(contracts,visits,acOrders,state.data.calls,today()):[],[state.data,acOrders,contracts,visits]);
 const shown=filterCalls(all,f,today()).filter(r=>!q||dt.u.norm(`${r.name} ${r.phone} ${r.order}`).includes(dt.u.norm(q)));
 const set=(k:string,v:string)=>{const n=new URLSearchParams(params);if(v)n.set(k,v);else n.delete(k);setParams(n);};
 const refresh=()=>setRev(v=>v+1);
 async function act(r:CallRow,action:string,extra:Row={}){await maintenanceCall({p_key:r.key,p_action:action,...extra});refresh();}
 // Khách từ đơn hàng: đưa vào danh sách bảo trì, chuyển luôn trạng thái hẹn / bỏ qua sang lịch mới (lịch cũ vẫn lưu)
 async function adopt(r:CallRow){
  const saved=await ad.db.insert('maintenance_contracts',r.source!);await loadCache();
  if(r.status!=='open')await maintenanceCall({p_key:`c:${saved.id}:${r.due}`,p_action:r.status,p_date:r.bookedDate||'',p_note:r.note||`Chuyển từ đơn ${r.order}`});
  notice(`Đã thêm ${r.name} vào danh sách bảo trì.`);onChange();
 }
 return <DataState state={state}>{state.data&&<>
  <div className="mc-bar">
   <div className="mc-chips" role="tablist" aria-label="Lọc lịch nhắc">{FILTERS.map(([k,l])=><button type="button" role="tab" key={k} aria-selected={f===k} className={f===k?'on':''} onClick={()=>set('f',k==='todo'?'':k)}>{l}<b>{filterCalls(all,k,today()).length}</b></button>)}</div>
   <input className="mc-search" type="search" placeholder="Tìm tên, số điện thoại, mã đơn…" defaultValue={q} aria-label="Tìm khách" onChange={e=>set('q',e.target.value)}/>
  </div>
  {!shown.length?<div className="ar-empty"><p>{f==='todo'?'Không có khách cần gọi trong 7 ngày tới.':'Không có lịch nhắc phù hợp.'}</p></div>:
  <div className="mc-list">{shown.map(r=><CallItem key={r.key} r={r} act={act} adopt={adopt} onVisit={()=>{refresh();onChange();}}/>)}</div>}
  <p className="mc-foot">Lịch tính tự động từ khách bảo trì đang hoạt động (lần gần nhất + chu kỳ) và đơn máy lạnh đã hoàn thành có chọn nhắc bảo trì. Ghi nhận bảo trì xong, khách tự chuyển sang lần tiếp theo.</p>
 </>}</DataState>;
}

function CallItem({r,act,adopt,onVisit}:{r:CallRow;act:(r:CallRow,a:string,x?:Row)=>Promise<void>;adopt:(r:CallRow)=>Promise<void>;onVisit:()=>void}){
 const [mode,setMode]=useState<''|'book'|'skip'>('');const [busy,setBusy]=useState(false);const notice=useNotice();
 const last=r.history.at(-1);const phone=zaloPhone(r.phone);
 async function run(fn:()=>Promise<void>,msg:string){if(busy)return;setBusy(true);try{await fn();notice(msg);setMode('');}catch(e){notice(e instanceof Error?e.message:String(e),true);}finally{setBusy(false);}}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget)) as Row;
  run(()=>act(r,mode==='book'?'booked':'skipped',{p_date:v.date||'',p_note:v.note||''}),mode==='book'?`Đã ghi lịch hẹn ${vnDate(v.date)} cho ${r.name}.`:`Đã bỏ qua lần nhắc của ${r.name}.`);}
 const logCall=()=>{act(r,'called').catch(()=>{});};
 return <article className={`mc-item mc-${r.status}`} aria-label={r.name}>
  <div className="mc-who">
   <b>{r.name}</b>
   <a href={`tel:${dt.u.tel(r.phone)}`} onClick={logCall}>{r.phone}</a>
   <small>{r.devices||`${r.units} thiết bị`}</small>
  </div>
  <div className="mc-when">
   <DueTag r={r}/>
   <span>Lần bảo trì thứ <b>{r.cycleNo}</b> · hạn {vnDate(r.due)}</span>
   <small>{r.kind==='order'?<>Từ đơn <Link to={`/orders?q=${encodeURIComponent(r.order)}`}>{r.order}</Link> · chưa vào danh sách bảo trì</>:r.contract?.lastVisit?`Bảo trì gần nhất ${vnDate(r.contract.lastVisit)}`:'Chưa bảo trì lần nào'}</small>
  </div>
  <div className="mc-log">
   {r.calls>0&&<span>Đã gọi {r.calls} lần</span>}
   {last?<small>{ACTIONS[last.action]||last.action} · {vnDate(last.at)}{last.by?` · ${last.by}`:''}{last.note?` · “${last.note}”`:''}</small>:<small>Chưa liên hệ</small>}
  </div>
  <div className="mc-acts">
   <a className="btn btn-light" href={`tel:${dt.u.tel(r.phone)}`} onClick={logCall}>Gọi</a>
   <a className="btn btn-light mc-zalo" href={`https://zalo.me/${phone}`} target="_blank" rel="noopener noreferrer" onClick={logCall}>Zalo</a>
   {r.status==='open'&&<><button type="button" className="btn btn-primary" onClick={()=>setMode(mode==='book'?'':'book')}>Đã hẹn lịch</button><button type="button" className="btn btn-light" onClick={()=>setMode(mode==='skip'?'':'skip')}>Bỏ qua lần này</button></>}
   {r.status!=='open'&&<Action className="btn btn-light" confirm={r.status==='booked'?'Hủy lịch hẹn này?':'Mở lại lần nhắc này?'} run={()=>act(r,'reset')}>{r.status==='booked'?'Hủy hẹn':'Mở lại'}</Action>}
   {r.status==='booked'&&(r.kind==='contract'&&r.contract?<QuickVisit contract={r.contract} onDone={onVisit}/>:<Action className="btn btn-primary" run={()=>adopt(r)}>Thêm vào khách bảo trì</Action>)}
   {r.status==='open'&&r.kind==='order'&&<Action className="btn btn-light" run={()=>adopt(r)}>Thêm vào khách bảo trì</Action>}
  </div>
  {mode&&<form className="mc-form" onSubmit={submit}>
   {mode==='book'&&<label>Ngày hẹn<input name="date" type="date" required min={today()} defaultValue={r.due<today()?today():r.due}/></label>}
   <label className="mc-note">{mode==='book'?'Ghi chú (giờ hẹn, số máy, địa chỉ…)':'Lý do bỏ qua'}<input name="note" required={mode==='skip'} maxLength={500} placeholder={mode==='skip'?'VD: khách đi vắng, đã tự vệ sinh, không nghe máy 3 lần…':''}/></label>
   <button className="btn btn-primary" disabled={busy}>{busy?'Đang lưu…':'Lưu'}</button><button type="button" className="btn btn-light" onClick={()=>setMode('')}>Hủy</button>
  </form>}
 </article>;
}
