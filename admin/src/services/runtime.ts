import type {Admin,Row} from '../types';
declare const __BUILD_VERSION__:string;
export let ad:Admin;
export let dt:Row;
export const adminBase=new URL('./',document.baseURI);
export const websiteBase=new URL('../frontend/',adminBase);
async function script(path:string){await new Promise<void>((resolve,reject)=>{const el=document.createElement('script');const url=new URL(path,adminBase);url.searchParams.set('v',__BUILD_VERSION__);el.src=url.href;el.dataset.adminRuntime=path;el.onload=()=>resolve();el.onerror=()=>reject(new Error(`Không tải được ${path}`));document.head.append(el);});}
export async function bootstrap(){
 for(const file of ['data/catalog','data/content','seo-config','backend-config','core/utils','components/icons','core/rows','core/api','components/art'])await script(`../frontend/assets/js/${file}.js`);
 dt=window.DT;window.AD={cache:{},me:null} as Admin;ad=window.AD;
 ad.today=()=>today();
 // Keep resource definitions and database contracts; none of the legacy page/UI renderers are loaded.
 ad.ui={esc:dt.u.esc,money:(v:any)=>money(v),d:(v:any)=>date(v),badge:(_map:any,key:string)=>key,thumb:()=>''};
 await script('assets/js/db.js');
 // A failed authenticated write must return the user to login just like a failed read.
 for(const method of ['list','get','insert','update','remove','saveBrand','rpc','upload'] as const){
  const original=ad.db[method];
  if(typeof original==='function')(ad.db as Row)[method]=async(...args:any[])=>{
   try{return await (original as Function).apply(ad.db,args);}
   catch(error){if((error as Row)?.expired)window.dispatchEvent(new Event('admin-session-expired'));throw error;}
  };
 }
 Object.assign(ad.PK,{crm_customers:'id',crm_customer_summary:'id',crm_customer_products:'id'});
 await script('assets/js/resources.js');await script('assets/js/xlsx.js');
 ad.PAY_STATUS={unpaid:['Chưa thanh toán'],partial:['Thanh toán một phần'],paid:['Đã thanh toán'],refunded:['Đã hoàn tiền']};
 ad.resources.banners.fields.push({key:'sub',label:'Mô tả banner',col:'full'},{key:'cta',label:'Nhãn nút hành động',col:'half'});
 const bannerTitle=ad.resources.banners.fields.find(f=>f.key==='title');if(bannerTitle)bannerTitle.help='Tiêu đề hiển thị trên banner React và mô tả ảnh.';
 ad.resources.coupons.fields.push(
  {key:'scope',label:'Phạm vi sản phẩm',type:'select',options:[['all','Tất cả sản phẩm'],['categories','Danh mục đã chọn'],['products','Sản phẩm đã chọn']],def:'all',col:'half'},
  {key:'condition_type',label:'Điều kiện áp dụng',type:'select',options:[['none','Không có điều kiện'],['order_min','Tổng đơn tối thiểu'],['eligible_min','Giá trị hàng đủ điều kiện'],['eligible_qty','Số sản phẩm đủ điều kiện']],def:'none',col:'half'},
  {key:'condition_value',label:'Giá trị điều kiện (tiền hoặc số lượng)',type:'number',def:0,col:'half'},
  {key:'combine_discounts',label:'Cho phép giảm trên hàng đang khuyến mãi',type:'bool',def:true,col:'half'},
  {key:'once_per_customer',label:'Mỗi số điện thoại chỉ dùng một lần',type:'bool',def:false,col:'half'},
 );
 ad.loadCache=loadCache;
 ad.product=(id:any)=>ad.cache.productMap?.get(String(id)) || dt.api.productById(Number(id));
}
export async function loadCache(){
 // Sales/accounts must not fetch resources outside their server-side permissions.
 const role=ad.me?.role;if(role==='sales'){ad.cache={};return;}
 const tables=role==='accountant'?['categories','brands','products']:['categories','brands','services','products','maintenance_contracts'];
 const results=await Promise.all(tables.map(table=>ad.db.list(table,{limit:5000,order:table==='products'?'id.desc':table==='maintenance_contracts'?'name.asc':'sort.asc'})));
 ad.cache={...ad.cache,...Object.fromEntries(tables.map((t,i)=>[t,results[i].rows]))};
 ad.cache.productMap=new Map((ad.cache.products || []).map((p:Row)=>[String(p.id),{...p,...dt.rows.product.toView(p)}]));dt.brands=ad.cache.brands || dt.brands;
}
export const money=(value:any)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(value)||0);
export const date=(value:any)=>value?new Date(value).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'—';
// Dòng mốc thời gian: tạo lúc / sửa lần cuối, kèm người thao tác nếu có
export const stamp=(row:any)=>{if(!row)return '';const by=(n:any)=>n?` bởi ${n}`:'';const parts=[];if(row.created_at)parts.push(`Tạo ${date(row.created_at)}${by(row.created_by_name)}`);if(row.updated_at&&row.updated_at!==row.created_at)parts.push(`Sửa lần cuối ${date(row.updated_at)}${by(row.updated_by_name)}`);return parts.join(' · ');};
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function localDay(value:string,add=0){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d+add).toISOString();}
export function safeUrl(value:unknown){if(typeof value!=='string')return '';if(/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value))return value;return dt.u.safeUrl(value);}
export async function saveSetting(key:string,value:Row){const old=await ad.db.get('settings',key);return old?ad.db.update('settings',key,{value}):ad.db.insert('settings',{key,value});}
export function downloadCSV(filename:string,columns:{label:string;key?:string;value?:(r:Row)=>unknown}[],rows:Row[]){
 const quote=(v:unknown)=>{let s=typeof v==='object'?JSON.stringify(v):String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const content=[columns.map(c=>quote(c.label)).join(','),...rows.map(r=>columns.map(c=>quote(c.value?c.value(r):r[c.key!])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function imageFile(file:File,folder='media'){
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.');if(file.size>10*1024*1024)throw new Error('Ảnh tối đa 10 MB.');
 const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không đọc được ảnh.')),'image/webp',0.85));
 if(ad.db.mode==='mysql')return ad.db.upload!(`${folder}/${crypto.randomUUID()}.webp`,blob);
 return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});}finally{bitmap.close();}
}
