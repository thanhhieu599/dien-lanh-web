// Bảo trì: tổng quan thống kê, khách đăng ký, lịch sử & chi phí, lịch nhắc.
import {useMemo,useState,type FormEvent} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ad,downloadCSV,loadCache,money,today} from '../services/runtime';
import {Action,DataState,Head,Table,useData,useNotice} from '../components/common';
import {NotificationsPage} from './operations';
import {CYCLES,SOURCES,STATUS,addMonths,contractViews,contractsFromOrders,maintenanceStats,type ContractView} from '../services/maintenance';
import type {Row} from '../types';

const TABS:[string,string][]=[['overview','Tổng quan'],['customers','Khách đăng ký'],['visits','Lịch sử & chi phí'],['reminders','Lịch nhắc']];
const PERIODS:[string,string][]=[['3','3 tháng'],['6','6 tháng'],['12','12 tháng'],['ytd','Từ đầu năm'],['all','Toàn bộ']];
const cycleLabel=(m:unknown)=>CYCLES.find(([k])=>k===String(m))?.[1]||`${m} tháng`;
const dueText=(c:Row)=>c.daysLeft==null?'—':c.daysLeft<0?`Quá hạn ${-c.daysLeft} ngày`:c.daysLeft===0?'Hôm nay':`Còn ${c.daysLeft} ngày`;

function range(period:string,visits:Row[]){
 const to=today();
 if(period==='ytd')return {from:`${to.slice(0,4)}-01-01`,to};
 if(period==='all')return {from:visits.map(v=>v.date).sort()[0]||to,to};
 return {from:addMonths(`${to.slice(0,7)}-01`,-(Number(period)||12)+1),to};
}

export function MaintenancePage(){
 const [params,setParams]=useSearchParams();const tab=params.get('tab')||'overview';const period=params.get('period')||'12';
 const state=useData(async()=>{const [c,v]=await Promise.all([ad.db.list('maintenance_contracts',{limit:50000,order:'name.asc'}),ad.db.list('maintenance_visits',{limit:50000,order:'date.desc'})]);return {contracts:c.rows,visits:v.rows};},[params.get('r')]);
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);next.set(key,value);setParams(next);};
 const reload=()=>set('r',String(Date.now()));
 return <><Head title="Bảo trì" subtitle="Khách đăng ký bảo trì định kỳ, chi phí từng lần và thống kê doanh thu bảo trì.">
   <Link className="btn btn-light" to="/maintenance_contracts/new">+ Khách bảo trì</Link>
   <Link className="btn btn-primary" to="/maintenance_visits/new">+ Ghi nhận bảo trì</Link>
  </Head>
  <nav className="mt-tabs" aria-label="Các phần bảo trì">{TABS.map(([k,l])=><button type="button" key={k} className={tab===k?'active':''} aria-current={tab===k?'page':undefined} onClick={()=>set('tab',k)}>{l}</button>)}</nav>
  {tab==='reminders'?<NotificationsPage maintenance embedded/>:<DataState state={state}>{state.data&&(
   tab==='customers'?<Customers contracts={state.data.contracts} visits={state.data.visits}/>:
   tab==='visits'?<Visits contracts={state.data.contracts} visits={state.data.visits} period={period} onPeriod={p=>set('period',p)}/>:
   <Overview contracts={state.data.contracts} visits={state.data.visits} period={period} onPeriod={p=>set('period',p)} onChange={reload}/>)}</DataState>}
 </>;
}

function PeriodPicker({period,onPeriod}:{period:string;onPeriod:(p:string)=>void}){
 return <div className="mt-period" role="group" aria-label="Khoảng thời gian">{PERIODS.map(([k,l])=><button type="button" key={k} className={period===k?'active':''} aria-pressed={period===k} onClick={()=>onPeriod(k)}>{l}</button>)}</div>;
}

function Overview({contracts,visits,period,onPeriod,onChange}:{contracts:Row[];visits:Row[];period:string;onPeriod:(p:string)=>void;onChange:()=>void}){
 const notice=useNotice();const {from,to}=range(period,visits);
 const s=useMemo(()=>maintenanceStats(contracts,visits,{from,to}),[contracts,visits,from,to]);
 const imports=useData(async()=>{const o=await ad.db.list('orders',{filters:[['maintenance_optin','eq',true],['status','eq','done']],limit:50000,select:'*,order_items(*)'});return contractsFromOrders(o.rows,contracts);},[contracts.length]);
 const max=Math.max(1,...s.months.map(m=>m.revenue));const due=[...s.overdue,...s.soon];
 const kpis:[string,string,string?][]=[
  ['Khách đang bảo trì',String(s.active),`${s.customers} khách đã đăng ký · ${s.units} thiết bị`],
  ['Doanh thu bảo trì',money(s.revenue),`${s.visits} lần bảo trì trong kỳ`],
  ['Đã thu / chưa thu',money(s.paid),s.unpaid?`Còn ${money(s.unpaid)} chưa thu`:'Đã thu đủ'],
  ['Chi tiêu TB / khách',money(s.avgPerCustomer),`TB ${money(s.avgPerVisit)} / lần`],
  ['Doanh thu dự kiến 12 tháng',money(s.expectedYear),'Phí/lần × số lần/năm của khách đang bảo trì'],
  ['Cần bảo trì',String(due.length),`${s.overdue.length} quá hạn · ${s.soon.length} trong 30 ngày`],
  ['Khách mới trong kỳ',String(s.newInPeriod),'Theo ngày bảo trì đầu tiên'],
  ['Tỷ lệ giữ chân',`${s.retention}%`,'Khách cũ vẫn còn bảo trì'],
 ];
 return <>
  <div className="mt-bar"><PeriodPicker period={period} onPeriod={onPeriod}/><span className="mt-range">{from.split('-').reverse().join('/')} – {to.split('-').reverse().join('/')}</span>
   <Action run={async()=>{downloadCSV(`bao-tri-${from}-${to}.csv`,[{label:'Khách hàng',key:'name'},{label:'Điện thoại',key:'phone'},{label:'Công ty',key:'company'},{label:'Thiết bị',key:'units'},{label:'Chu kỳ (tháng)',key:'cycle_months'},{label:'Trạng thái',value:r=>STATUS[r.status]||r.status},{label:'Lần gần nhất',key:'lastVisit'},{label:'Hạn tiếp theo',key:'nextDue'},{label:'Số lần',key:'visits'},{label:'Tổng chi tiêu',key:'spend'},{label:'Chưa thu',key:'unpaid'}],contractViews(contracts,visits));notice('Đã xuất danh sách khách bảo trì');}}>Xuất CSV</Action></div>
  <div className="ar-kpis mt-kpis">{kpis.map(([l,v,sub])=><div key={l}><span>{l}</span><strong>{v}</strong>{sub&&<small>{sub}</small>}</div>)}</div>
  {!!imports.data?.length&&<div className="ar-notice mt-import"><span>{imports.data.length} khách đã chọn "nhắc bảo trì" khi đặt hàng nhưng chưa có trong danh sách bảo trì.</span>
   <Action className="btn btn-primary" run={async()=>{for(const row of imports.data!)await ad.db.insert('maintenance_contracts',row);await loadCache();notice(`Đã thêm ${imports.data!.length} khách bảo trì từ đơn hàng`);onChange();}}>Thêm vào danh sách</Action></div>}
  <div className="mt-grid">
   <section className="ar-panel mt-span"><h2>Doanh thu bảo trì theo tháng</h2>
    {s.revenue?<div className="ar-chart mt-chart" role="img" aria-label="Biểu đồ doanh thu bảo trì theo tháng">{s.months.map(m=><div key={m.key} title={`${m.label}: ${money(m.revenue)} · ${m.visits} lần`}><span style={{height:`${m.revenue/max*100}%`}}/><small>{m.label}</small></div>)}</div>:<p className="mt-empty">Chưa có lần bảo trì nào trong kỳ.</p>}
    {s.revenue>0&&<details className="mt-table-toggle"><summary>Xem bảng số liệu</summary><Table rowKey="key" rows={s.months} columns={[{label:'Tháng',key:'label'},{label:'Số lần',key:'visits'},{label:'Doanh thu',render:r=>money(r.revenue)}]}/></details>}
   </section>
   <section className="ar-panel mt-span"><h2>Cần bảo trì <small>quá hạn và trong 30 ngày tới</small></h2>
    {due.length?<Table rows={due} columns={[
     {label:'Khách hàng',render:r=><Link to={`/maintenance_contracts/${r.id}`}>{r.name}<small>{r.phone}</small></Link>},
     {label:'Thiết bị',render:r=>`${r.units||0} · ${cycleLabel(r.cycle_months)}`},
     {label:'Lần gần nhất',render:r=>r.lastVisit?r.lastVisit.split('-').reverse().join('/'):'Chưa có'},
     {label:'Hạn',render:r=><span className={`mt-due ${r.due}`}>{dueText(r)}</span>},
     {label:'',render:r=><QuickVisit contract={r as ContractView} onDone={onChange}/>},
    ]}/>:<p className="mt-empty">Không có khách nào cần bảo trì trong 30 ngày tới.</p>}
   </section>
   <section className="ar-panel"><h2>Top khách chi tiêu</h2>
    {s.top.length?<ol className="mt-rank">{s.top.map(c=><li key={c.id}><Link to={`/maintenance_contracts/${c.id}`}>{c.name}</Link><b>{money(c.spend)}</b></li>)}</ol>:<p className="mt-empty">Chưa có chi tiêu trong kỳ.</p>}
   </section>
   <section className="ar-panel"><h2>Theo nguồn khách</h2>
    <ul className="mt-share">{s.bySource.map(x=><li key={x.key}><span>{x.label}</span><b>{x.count} khách</b><small>{money(x.revenue)}</small></li>)}</ul>
    <h2 className="mt-h2">Theo chu kỳ</h2>
    <ul className="mt-share">{s.byCycle.map(x=><li key={x.key}><span>{x.label}</span><b>{x.count} khách</b><i style={{width:`${x.count/Math.max(1,s.customers)*100}%`}}/></li>)}</ul>
   </section>
  </div>
 </>;
}

// Ghi nhận nhanh 1 lần bảo trì ngay trong danh sách cần bảo trì
function QuickVisit({contract,onDone}:{contract:ContractView;onDone:()=>void}){
 const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const notice=useNotice();
 if(!open)return <button type="button" className="btn btn-light mt-quick" onClick={()=>setOpen(true)}>Ghi nhận</button>;
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);
  try{await ad.db.insert('maintenance_visits',{contract_id:contract.id,date:String(f.get('date')),status:'done',units:contract.units||null,technician:String(f.get('technician')||''),work:'',amount:Number(f.get('amount'))||0,payment:String(f.get('payment')),paid:f.get('paid')==='on',note:''});
   notice(`Đã ghi nhận bảo trì cho ${contract.name}`);onDone();}catch(err){notice(err instanceof Error?err.message:String(err),true);}finally{setBusy(false);}}
 return <form className="mt-quick-form" onSubmit={submit} aria-label={`Ghi nhận bảo trì ${contract.name}`}>
  <input name="date" type="date" required defaultValue={today()} aria-label="Ngày bảo trì"/>
  <input name="amount" type="number" min={0} step={1000} required defaultValue={contract.fee_per_visit||0} aria-label="Chi phí (₫)"/>
  <input name="technician" placeholder="Kỹ thuật viên" aria-label="Kỹ thuật viên"/>
  <select name="payment" aria-label="Thanh toán"><option value="cod">Tiền mặt</option><option value="bank">Chuyển khoản</option></select>
  <label className="ar-check"><input name="paid" type="checkbox"/>Đã thu</label>
  <button className="btn btn-primary" disabled={busy}>{busy?'Đang lưu…':'Lưu'}</button><button type="button" className="btn btn-light" onClick={()=>setOpen(false)}>Hủy</button>
 </form>;
}

function Customers({contracts,visits}:{contracts:Row[];visits:Row[]}){
 const [q,setQ]=useState('');const [status,setStatus]=useState('active');const [due,setDue]=useState('');
 const rows=contractViews(contracts,visits).filter(c=>(!status||c.status===status)&&(!due||c.due===due)&&(!q||`${c.name} ${c.phone} ${c.company||''} ${c.address||''}`.toLowerCase().includes(q.toLowerCase())))
  .sort((a,b)=>(a.daysLeft??1e9)-(b.daysLeft??1e9));
 return <section className="ar-panel">
  <div className="mt-filters">
   <label>Tìm khách<input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Tên, SĐT, công ty, địa chỉ…"/></label>
   <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(STATUS).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
   <label>Hạn bảo trì<select value={due} onChange={e=>setDue(e.target.value)}><option value="">Tất cả</option><option value="overdue">Quá hạn</option><option value="soon">Trong 30 ngày</option><option value="ok">Còn xa</option></select></label>
   <span className="mt-count">{rows.length} khách</span>
  </div>
  <Table rows={rows} columns={[
   {label:'Khách hàng',render:r=><Link to={`/maintenance_contracts/${r.id}`}>{r.name}<small>{[r.phone,r.company].filter(Boolean).join(' · ')}</small></Link>},
   {label:'Thiết bị',render:r=>`${r.units||0} · ${cycleLabel(r.cycle_months)}`},
   {label:'Nguồn',render:r=>SOURCES[r.source]||r.source||'—'},
   {label:'Lần gần nhất',render:r=>r.lastVisit?r.lastVisit.split('-').reverse().join('/'):'Chưa có'},
   {label:'Hạn tiếp theo',render:r=>r.nextDue?<span className={`mt-due ${r.due}`}>{r.nextDue.split('-').reverse().join('/')} · {dueText(r)}</span>:'—'},
   {label:'Số lần',key:'visits'},
   {label:'Tổng chi tiêu',render:r=><b>{money(r.spend)}</b>},
   {label:'Chưa thu',render:r=>r.unpaid?<span className="mt-due overdue">{money(r.unpaid)}</span>:'—'},
   {label:'Trạng thái',render:r=>STATUS[r.status]||r.status},
  ]}/>
 </section>;
}

function Visits({contracts,visits,period,onPeriod}:{contracts:Row[];visits:Row[];period:string;onPeriod:(p:string)=>void}){
 const [paid,setPaid]=useState('');const {from,to}=range(period,visits);
 const name=(id:unknown)=>contracts.find(c=>String(c.id)===String(id))?.name||'—';
 const rows=visits.filter(v=>v.date>=from&&v.date<=to&&(!paid||String(!!v.paid)===paid));
 const done=rows.filter(v=>(v.status||'done')==='done');const total=done.reduce((s,v)=>s+(Number(v.amount)||0),0);const unpaid=done.filter(v=>!v.paid).reduce((s,v)=>s+(Number(v.amount)||0),0);
 return <section className="ar-panel">
  <div className="mt-filters"><PeriodPicker period={period} onPeriod={onPeriod}/>
   <label>Thanh toán<select value={paid} onChange={e=>setPaid(e.target.value)}><option value="">Tất cả</option><option value="true">Đã thu</option><option value="false">Chưa thu</option></select></label>
   <span className="mt-count">{done.length} lần · {money(total)}{unpaid?` · chưa thu ${money(unpaid)}`:''}</span>
   <button type="button" className="btn btn-light" onClick={()=>downloadCSV(`lan-bao-tri-${from}-${to}.csv`,[{label:'Ngày',key:'date'},{label:'Khách hàng',value:r=>name(r.contract_id)},{label:'Trạng thái',key:'status'},{label:'Thiết bị',key:'units'},{label:'Kỹ thuật viên',key:'technician'},{label:'Công việc',key:'work'},{label:'Chi phí',key:'amount'},{label:'Thanh toán',value:r=>r.payment==='bank'?'Chuyển khoản':'Tiền mặt'},{label:'Đã thu',value:r=>r.paid?'Có':'Chưa'}],rows)}>Xuất CSV</button>
  </div>
  <Table rows={rows} columns={[
   {label:'Ngày',render:r=><Link to={`/maintenance_visits/${r.id}`}>{String(r.date).split('-').reverse().join('/')}</Link>},
   {label:'Khách hàng',render:r=><Link to={`/maintenance_contracts/${r.contract_id}`}>{name(r.contract_id)}</Link>},
   {label:'Trạng thái',render:r=>({done:'Đã bảo trì',scheduled:'Đã hẹn',cancelled:'Đã hủy'} as Row)[r.status||'done']},
   {label:'Kỹ thuật viên',render:r=>r.technician||'—'},
   {label:'Chi phí',render:r=><b>{money(r.amount)}</b>},
   {label:'Thanh toán',render:r=>`${r.payment==='bank'?'Chuyển khoản':'Tiền mặt'} · ${r.paid?'Đã thu':'Chưa thu'}`},
  ]}/>
 </section>;
}
