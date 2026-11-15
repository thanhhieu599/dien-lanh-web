// Nhóm khách hàng: danh sách nhóm (settings 'customer_groups', mặc định DT.CUSTOMER_GROUPS) và thao tác thêm / sửa / xóa.
// Xóa nhóm do máy chủ xử lý trong 1 giao dịch: khách của nhóm về "Khách bán lẻ", mã giảm giá bỏ nhóm đó.
import {ad,dt} from './runtime';
import type {Row} from '../types';
export type CustomerGroup={id:string;name:string;color:string;desc?:string;locked?:boolean};
export async function loadGroups():Promise<CustomerGroup[]>{const row=await ad.db.get('settings','customer_groups').catch(()=>null);const list=row?.value?.groups;return Array.isArray(list)&&list.length?list:(dt.CUSTOMER_GROUPS||[]);}
export const groupOf=(c:Row):string=>dt.customerGroupOf(c);
type Db=typeof ad.db&{customerGroup?:(a:Row)=>Promise<CustomerGroup[]>};
export function groupOp(args:Row):Promise<CustomerGroup[]>{const db=ad.db as Db;return db.mode==='mysql'?db.rpc('customer_group',args):db.customerGroup!(args);}
export function GroupBadge({group}:{group?:CustomerGroup}){return group?<span className="cg-badge" style={{'--c':group.color} as React.CSSProperties}>{group.name}</span>:null;}
