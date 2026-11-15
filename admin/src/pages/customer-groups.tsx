// Quản trị › Nhóm khách hàng: các phân khúc (Bán lẻ, Tiềm năng, Thân thiết, VIP… và nhóm tự tạo) kèm số khách, doanh số;
// dùng để lọc khách, xuất danh sách chạy chiến dịch và giới hạn mã giảm giá theo nhóm.
import {useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {ad,money,downloadCSV} from '../services/runtime';
import {Action,DataState,Head,Modal,Panel,useData,useNotice} from '../components/common';
import {groupOf,groupOp,loadGroups,type CustomerGroup} from '../services/customer-groups';
import type {Row} from '../types';
const COLORS=['#64748b','#0ea5e9','#16a34a','#d97706','#dc2626','#7c3aed','#db2777','#0d9488'];
export function CustomerGroupsPage(){
 const [edit,setEdit]=useState<Partial<CustomerGroup>|null>(null);const [rev,setRev]=useState(0);const notice=useNotice();const admin=ad.me?.role==='admin';
 const state=useData(async()=>{const [groups,cs,coupons]=await Promise.all([loadGroups(),ad.db.list('crm_customer_summary',{limit:50000}),ad.db.list('coupons',{limit:50000}).catch(()=>({rows:[]}))]);return {groups,customers:cs.rows as Row[],coupons:coupons.rows as Row[]};},[rev]);
 const d=state.data;
 const stats=(id:string)=>{const list=(d?.customers||[]).filter(c=>groupOf(c)===id);const spent=list.reduce((s,c)=>s+Number(c.total_spent||0),0);return {list,count:list.length,spent,avg:list.length?spent/list.length:0,coupons:(d?.coupons||[]).filter(cp=>(cp.customer_groups||[]).includes(`group:${id}`)||id==='vip'&&(cp.customer_groups||[]).includes('vip')).length};};
 return <><Head title="Nhóm khách hàng" subtitle="Phân khúc khách để chạy ưu đãi, chiến dịch chăm sóc. Mỗi khách thuộc 1 nhóm; khách mới mặc định là Khách bán lẻ.">{admin&&<button className="btn btn-primary" onClick={()=>setEdit({color:COLORS[4]})}>Thêm nhóm</button>}</Head>
 <DataState state={state}>{d&&<div className="cg-grid">{d.groups.map(g=>{const s=stats(g.id);return <Panel key={g.id}><div className="cg-card" style={{'--c':g.color} as React.CSSProperties}>
  <div className="cg-head"><span className="cg-dot"/><div><h2>{g.name}</h2>{g.desc&&<p>{g.desc}</p>}</div>{g.locked&&<span className="cg-lock">Mặc định</span>}</div>
  <dl className="cg-stats"><div><dt>Khách hàng</dt><dd>{s.count}</dd></div><div><dt>Tổng chi tiêu</dt><dd>{money(s.spent)}</dd></div><div><dt>TB / khách</dt><dd>{money(s.avg)}</dd></div><div><dt>Mã giảm giá</dt><dd>{s.coupons}</dd></div></dl>
  <div className="ar-actions"><Link className="btn btn-light" to={`/customers?group=${encodeURIComponent(g.id)}`}>Xem khách</Link>
   <button className="btn btn-light" disabled={!s.count} onClick={()=>downloadCSV(`nhom-${g.id}.csv`,[{label:'Tên',key:'name'},{label:'Điện thoại',key:'phone'},{label:'Email',key:'email'},{label:'Số đơn',key:'order_count'},{label:'Đã chi tiêu',key:'total_spent'},{label:'Nhãn',value:(r:Row)=>(r.tags||[]).join(', ')}],s.list)}>Xuất danh sách</button>
   {admin&&<button className="btn btn-light" onClick={()=>setEdit(g)}>Sửa</button>}
   {admin&&!g.locked&&<Action className="btn btn-light cg-del" confirm={`Xóa nhóm "${g.name}"? ${s.count} khách sẽ chuyển về Khách bán lẻ${s.coupons?`, ${s.coupons} mã giảm giá bỏ áp dụng cho nhóm này`:''}.`} run={async()=>{await groupOp({p_op:'delete',p_id:g.id});notice(`Đã xóa nhóm ${g.name}.`);setRev(v=>v+1);}}>Xóa</Action>}
  </div></div></Panel>;})}</div>}</DataState>
 {edit&&<GroupEditor group={edit} close={()=>setEdit(null)} saved={()=>{setEdit(null);setRev(v=>v+1);}}/>}
 </>;
}
function GroupEditor({group,close,saved}:{group:Partial<CustomerGroup>;close:()=>void;saved:()=>void}){
 const [color,setColor]=useState(group.color||COLORS[0]);const [busy,setBusy]=useState(false);const notice=useNotice();
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);try{await groupOp({p_op:'save',p_group:{id:group.id,name:v.name,desc:v.desc,color}});notice('Đã lưu nhóm khách hàng.');saved();}catch(err){notice(err instanceof Error?err.message:String(err),true);}finally{setBusy(false);}}
 return <Modal title={group.id?'Sửa nhóm khách hàng':'Thêm nhóm khách hàng'} close={close}><form className="ar-grid" onSubmit={submit}>
  <label className="full">Tên nhóm<input name="name" required maxLength={60} defaultValue={group.name||''} placeholder="VD: Khách doanh nghiệp, Đại lý cấp 2…"/></label>
  <label className="full">Mô tả (ai thuộc nhóm này)<input name="desc" maxLength={200} defaultValue={group.desc||''}/></label>
  <div className="full"><span className="cg-label">Màu nhãn</span><div className="cg-colors">{COLORS.map(c=><button type="button" key={c} aria-label={`Màu ${c}`} aria-pressed={color===c} className={color===c?'on':''} style={{background:c}} onClick={()=>setColor(c)}/>)}</div></div>
  <button className="btn btn-primary" disabled={busy}>{busy?'Đang lưu…':'Lưu nhóm'}</button></form></Modal>;
}
