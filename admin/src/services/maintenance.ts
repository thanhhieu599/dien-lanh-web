// Thống kê bảo trì: khách đăng ký (maintenance_contracts) + các lần bảo trì có chi phí (maintenance_visits).
// Hàm thuần, không phụ thuộc trình duyệt, để kiểm thử bằng node (tests/unit/maintenance.test.mjs).
import type {Row} from '../types';

export const CYCLES:[string,string][]=[['1','Hàng tháng'],['2','2 tháng/lần'],['3','3 tháng/lần'],['4','4 tháng/lần'],['6','6 tháng/lần'],['12','12 tháng/lần']];
export const STATUS:Record<string,string>={active:'Đang bảo trì',paused:'Tạm dừng',ended:'Đã kết thúc'};
export const SOURCES:Record<string,string>={order:'Đơn hàng website',website:'Form website',phone:'Gọi điện / Zalo',referral:'Giới thiệu',contract:'Hợp đồng doanh nghiệp',manual:'Nhập tay'};

// Ngày dạng YYYY-MM-DD (giờ địa phương) để so sánh chuỗi an toàn
export const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function addMonths(date:string,months:number){
 const [y,m,d]=date.split('-').map(Number);const last=new Date(y,m-1+months+1,0).getDate();
 return ymd(new Date(y,m-1+months,Math.min(d,last)));
}
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);

export interface ContractView extends Row {
 lastVisit:string|null;nextDue:string|null;daysLeft:number|null;
 visits:number;spend:number;unpaid:number;due:'overdue'|'soon'|'ok'|'none';
}
// Gắn số liệu cho từng khách: lần bảo trì gần nhất, hạn tiếp theo, tổng chi tiêu
export function contractViews(contracts:Row[],visits:Row[],today=ymd(new Date())):ContractView[]{
 return contracts.map(c=>{
  const own=visits.filter(v=>String(v.contract_id)===String(c.id));
  const done=own.filter(v=>(v.status||'done')==='done');
  const lastVisit=done.map(v=>v.date).sort().at(-1)||null;
  const cycle=Number(c.cycle_months)||6;
  const nextDue=c.status==='active'&&c.start_date?(lastVisit?addMonths(lastVisit,cycle):c.start_date):null;
  const daysLeft=nextDue?daysBetween(today,nextDue):null;
  return {...c,lastVisit,nextDue,daysLeft,visits:done.length,
   spend:done.reduce((s,v)=>s+(Number(v.amount)||0),0),
   unpaid:done.filter(v=>!v.paid).reduce((s,v)=>s+(Number(v.amount)||0),0),
   due:daysLeft==null?'none':daysLeft<0?'overdue':daysLeft<=30?'soon':'ok'};
 });
}

export interface MaintenanceStats {
 customers:number;active:number;paused:number;ended:number;units:number;
 revenue:number;paid:number;unpaid:number;visits:number;avgPerCustomer:number;avgPerVisit:number;
 expectedYear:number;retention:number;newInPeriod:number;
 overdue:ContractView[];soon:ContractView[];top:ContractView[];
 months:{key:string;label:string;revenue:number;visits:number}[];
 byCycle:{key:string;label:string;count:number}[];bySource:{key:string;label:string;count:number;revenue:number}[];
}
// Thống kê trong khoảng [from, to] (YYYY-MM-DD). Doanh thu chỉ tính lần bảo trì đã làm (status done).
export function maintenanceStats(contracts:Row[],visits:Row[],{from,to,today=ymd(new Date())}:{from:string;to:string;today?:string}):MaintenanceStats{
 const views=contractViews(contracts,visits,today);
 const inRange=visits.filter(v=>(v.status||'done')==='done'&&v.date>=from&&v.date<=to);
 const revenue=inRange.reduce((s,v)=>s+(Number(v.amount)||0),0);
 const paid=inRange.filter(v=>v.paid).reduce((s,v)=>s+(Number(v.amount)||0),0);
 const spenders=new Set(inRange.map(v=>String(v.contract_id)));
 const active=views.filter(c=>c.status==='active');
 // Doanh thu dự kiến 12 tháng tới: phí mỗi lần × số lần/năm của khách đang bảo trì
 const expectedYear=active.reduce((s,c)=>s+(Number(c.fee_per_visit)||0)*Math.round(12/(Number(c.cycle_months)||6)),0);
 // Giữ chân: khách đăng ký trước kỳ vẫn còn bảo trì / tổng khách đăng ký trước kỳ
 const before=views.filter(c=>(c.start_date||'')<from);
 const retention=before.length?Math.round(before.filter(c=>c.status==='active').length/before.length*100):100;
 // Doanh thu theo tháng trong kỳ
 const months:MaintenanceStats['months']=[];
 for(let key=from.slice(0,7);key<=to.slice(0,7);){
  const list=inRange.filter(v=>v.date.slice(0,7)===key);
  months.push({key,label:`${key.slice(5)}/${key.slice(2,4)}`,revenue:list.reduce((s,v)=>s+(Number(v.amount)||0),0),visits:list.length});
  key=addMonths(`${key}-01`,1).slice(0,7);
  if(months.length>36)break;
 }
 const spendIn=(id:unknown)=>inRange.filter(v=>String(v.contract_id)===String(id)).reduce((s,v)=>s+(Number(v.amount)||0),0);
 const top=views.map(c=>({...c,spend:spendIn(c.id)})).filter(c=>c.spend>0).sort((a,b)=>b.spend-a.spend).slice(0,10);
 const count=(list:ContractView[],key:(c:ContractView)=>string)=>list.reduce<Record<string,number>>((m,c)=>{const k=key(c);m[k]=(m[k]||0)+1;return m;},{});
 const cycles=count(views,c=>String(c.cycle_months||6));
 const sources=count(views,c=>c.source||'manual');
 return {
  customers:views.length,active:active.length,paused:views.filter(c=>c.status==='paused').length,ended:views.filter(c=>c.status==='ended').length,
  units:active.reduce((s,c)=>s+(Number(c.units)||0),0),
  revenue,paid,unpaid:revenue-paid,visits:inRange.length,
  avgPerCustomer:spenders.size?Math.round(revenue/spenders.size):0,avgPerVisit:inRange.length?Math.round(revenue/inRange.length):0,
  expectedYear,retention,newInPeriod:views.filter(c=>c.start_date>=from&&c.start_date<=to).length,
  overdue:active.filter(c=>c.due==='overdue').sort((a,b)=>a.daysLeft!-b.daysLeft!),
  soon:active.filter(c=>c.due==='soon').sort((a,b)=>a.daysLeft!-b.daysLeft!),
  top,months,
  byCycle:CYCLES.filter(([k])=>cycles[k]).map(([key,label])=>({key,label,count:cycles[key]})),
  bySource:Object.entries(sources).map(([key,n])=>({key,label:SOURCES[key]||key,count:n,revenue:views.filter(c=>(c.source||'manual')===key).reduce((s,c)=>s+spendIn(c.id),0)})).sort((a,b)=>b.revenue-a.revenue||b.count-a.count),
 };
}

// Khách đã chọn "nhắc bảo trì" khi đặt hàng nhưng chưa có trong danh sách bảo trì
export function contractsFromOrders(orders:Row[],contracts:Row[],today=ymd(new Date())):Row[]{
 const phones=new Set(contracts.map(c=>String(c.phone||'')));const seen=new Set<string>();
 return orders.filter(o=>o.maintenance_optin&&o.status==='done').flatMap(o=>{
  const phone=String(o.phone||o.customer?.phone||'').replace(/\D/g,'');
  if(!phone||phones.has(phone)||seen.has(phone))return [];seen.add(phone);
  const items=(o.order_items||o.items||[]) as Row[];
  return [{name:o.customer_name||o.customer?.name||'Khách hàng',phone,address:[o.shipping?.address,o.shipping?.district,o.shipping?.province].filter(Boolean).join(', '),
   devices:items.map(i=>`${i.qty||1} × ${i.name}`).join('; '),units:items.reduce((s,i)=>s+(Number(i.qty)||1),0)||1,
   cycle_months:6,start_date:addMonths(String(o.done_at||o.updated_at||o.created_at||today).slice(0,10),6),fee_per_visit:0,
   status:'active',source:'order',order_code:o.code||'',note:''}];
 });
}
