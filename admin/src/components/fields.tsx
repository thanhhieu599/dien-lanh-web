import {useId,useState,type ReactNode} from 'react';
import {Combo} from './combo';
import {ad,imageFile,safeUrl} from '../services/runtime';
import {Image,useNotice} from './common';
import {RichEditor} from './editor';
import type {FieldSpec,Row} from '../types';
export function Field({label,children,help,error}:{label:string;children:ReactNode;help?:string;error?:string}){return <div className="ar-field"><label>{label}{children}</label>{help&&<small>{help}</small>}{error&&<small className="ar-error" role="alert">{error}</small>}</div>;}
export function KeyValues({value,onChange,arrays=false}:{value:Row;onChange:(v:Row)=>void;arrays?:boolean}){
 const [rows,setRows]=useState<{id:string;k:string;v:string}[]>(()=>Object.entries(value||{}).map(([k,v])=>({id:crypto.randomUUID(),k,v:Array.isArray(v)?v.join(', '):String(v)})));
 function update(next:typeof rows){setRows(next);onChange(Object.fromEntries(next.filter(r=>r.k.trim()).map(r=>[r.k.trim(),arrays?r.v.split(',').map(s=>s.trim()).filter(Boolean):r.v])));}
 return <div className="ar-repeat">{rows.map((r,i)=><div className="ar-kv" key={r.id}><input aria-label={`Tên thuộc tính ${i+1}`} value={r.k} onChange={e=>update(rows.map((x,j)=>j===i?{...x,k:e.target.value}:x))}/><input aria-label={`Giá trị thuộc tính ${i+1}`} value={r.v} onChange={e=>update(rows.map((x,j)=>j===i?{...x,v:e.target.value}:x))}/><button type="button" className="btn btn-light" aria-label={`Xóa thuộc tính ${i+1}`} onClick={()=>update(rows.filter((_,j)=>j!==i))}>Xóa</button></div>)}<button type="button" className="btn btn-light" onClick={()=>update([...rows,{id:crypto.randomUUID(),k:'',v:''}])}>Thêm thuộc tính</button></div>;
}
export function Gallery({value,onChange,multiple=false,folder='media',limit=10,onPending}:{value:any;onChange:(v:any)=>void;multiple?:boolean;folder?:string;limit?:number;onPending?:(delta:number)=>void}){
 const urls:string[]=multiple?(Array.isArray(value)?value:[]):value?[value]:[];const [busy,setBusy]=useState(false);const [url,setUrl]=useState('');const notice=useNotice();
 const commit=(next:string[])=>onChange(multiple?next:next[0]||'');
 return <div className="ar-gallery"><div className="ar-gallery-list">{urls.map((src,i)=><div key={i}><Image src={src} alt={`Ảnh ${i+1}`}/><div className="ar-actions"><button type="button" className="btn btn-light" disabled={i===0||busy} aria-label={`Đưa ảnh ${i+1} lên trước`} onClick={()=>{const next=[...urls];[next[i-1],next[i]]=[next[i],next[i-1]];commit(next);}}>↑</button><button type="button" className="btn btn-light" disabled={busy} aria-label={`Bỏ ảnh ${i+1}`} onClick={()=>commit(urls.filter((_,j)=>i!==j))}>Bỏ ảnh</button></div></div>)}</div><label className="ar-upload">{busy?'Đang tải ảnh…':'Tải ảnh lên'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple={multiple} disabled={busy||urls.length>=(multiple?limit:1)} aria-label="Tải ảnh lên" onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;setBusy(true);onPending?.(1);const next=[...urls];try{for(const file of files.slice(0,(multiple?limit:1)-urls.length))next.push(await imageFile(file,folder));}catch(err){notice(err instanceof Error?err.message:String(err),true);}finally{commit(next);setBusy(false);onPending?.(-1);}}}/></label><div className="ar-actions"><input type="url" aria-label="Đường dẫn ảnh" placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)}/><button type="button" className="btn btn-light" disabled={busy||!url||urls.length>=(multiple?limit:1)} onClick={()=>{if(!/^https?:\/\//.test(url)||!safeUrl(url)){notice('Nhập đường dẫn ảnh http hoặc https hợp lệ.',true);return;}commit([...urls,url.trim()]);setUrl('');}}>Thêm từ URL</button></div><small>Ảnh tối đa 10 MB; được thu nhỏ và nén trước khi lưu. Bỏ ảnh chỉ gỡ khỏi nội dung hiện tại.</small></div>;
}
export function JsonInput({value,onChange,label}:{value:any;onChange:(v:any)=>void;label:string}){const [text,setText]=useState(()=>JSON.stringify(value??{},null,2));return <textarea aria-label={label} rows={8} value={text} onChange={e=>{const v=e.target.value;setText(v);try{const parsed=JSON.parse(v);e.target.setCustomValidity('');onChange(parsed);}catch{e.target.setCustomValidity('JSON chưa hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy.');}}}/>;}
function ListInput({value,onChange,separator,attrs,rows}:{value:any;onChange:(v:string[])=>void;separator:string;attrs:Row;rows:number}){const [draft,setDraft]=useState(()=>Array.isArray(value)?value.join(separator===','?', ':'\n'):String(value||''));return <textarea {...attrs} rows={rows} value={draft} onChange={e=>{setDraft(e.target.value);onChange(e.target.value.split(separator).map(v=>v.trim()).filter(Boolean));}}/>;}
export function EditorField({field:f,value,row,onChange,error,editing=false,onPending}:{field:FieldSpec;value:any;row:Row;onChange:(v:any)=>void;error?:string;editing?:boolean;onPending?:(n:number)=>void}){
 const id=useId();const disabled=!!f.readonly || !!(editing&&f.readonlyOnEdit) || f.type==='readonly';
 const opts=typeof f.options==='function'?f.options({values:row,editing}):f.options||[];
 let control:ReactNode;
 const attrs={id,name:f.key,disabled,required:!!f.required,'aria-invalid':!!error,'aria-describedby':error?`${id}-error`:f.help?`${id}-help`:undefined};
 if(f.type==='bool')return <div className={`ar-field ${f.col||''}`}><label className="ar-check"><input {...attrs} type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)}/><span>{f.label}</span></label>{f.help&&<small>{f.help}</small>}</div>;
 if(f.type==='select'&&f.free)control=<Combo id={id} name={f.key} value={value==null?'':String(value)} options={opts} disabled={disabled} required={!!f.required} onChange={onChange}/>;
 else if(f.type==='select')control=<select {...attrs} value={value??''} onChange={e=>onChange(e.target.value)}><option value="">Chọn…</option>{opts.map((o:any)=>{const [v,l]=Array.isArray(o)?o:[o,o];return <option value={v} key={v}>{l}</option>;})}</select>;
 else if(['lines','tags'].includes(f.type||''))control=<ListInput attrs={attrs} rows={f.rows||3} value={value} onChange={onChange} separator={f.type==='tags'?',':'\n'}/>;
 else if(f.type==='html')control=<RichEditor id={id} label={f.label||f.key} rows={f.rows||12} value={value} onChange={onChange}/>;
 else if(f.type==='textarea')control=<textarea {...attrs} rows={f.rows||3} value={Array.isArray(value)?value.join('\n'):value??''} onChange={e=>onChange(e.target.value)}/>;
 else if(f.type==='kv')control=<KeyValues value={value} onChange={onChange} arrays={f.key==='options'}/>;
 else if(f.type==='json')control=<JsonInput value={value} onChange={onChange} label={f.label||f.key}/>;
 else if(['image','gallery'].includes(f.type||''))control=<Gallery value={value} onChange={onChange} folder={f.folder} multiple={f.type==='gallery'} limit={f.max} onPending={onPending}/>;
 else control=<input {...attrs} placeholder={f.placeholder} type={['number','money'].includes(f.type||'')?'number':f.type==='datetime'?'datetime-local':f.type==='date'?'date':'text'} step={f.step||(['number','money'].includes(f.type||'')?'any':undefined)} value={f.type==='datetime'&&value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):value??''} onChange={e=>onChange(['number','money'].includes(f.type||'')?(e.target.value===''?null:Number(e.target.value)):f.type==='datetime'?(e.target.value?new Date(e.target.value).toISOString():null):e.target.value)}/>;
 return <div className={`ar-field ${f.col||''}`} data-field={f.key}><label htmlFor={['kv','json','image','gallery'].includes(f.type||'')?undefined:id}>{f.label||f.key}{f.required?' *':''}</label>{control}{f.help&&<small id={`${id}-help`}>{f.help}</small>}{error&&<small id={`${id}-error`} className="ar-error" role="alert">{error}</small>}</div>;
}
// Sản phẩm thuộc danh mục / thương hiệu: tìm để thêm (kết quả chỉ hiện khi gõ), danh sách đã chọn sắp xếp được.
// bare = hiện trong khung có sẵn (trang danh mục), không tự bọc khung riêng.
export function ProductMembership({row,onChange,kind,bare=false}:{row:Row;onChange:(v:Row)=>void;kind:'categories'|'brands';bare?:boolean}){
 const products:Row[]=ad.cache.products||[];const field=kind==='brands'?'brand':'cat';const [q,setQ]=useState('');const [limit,setLimit]=useState(10);
 const ids:any[]=Array.isArray(row.product_ids)?row.product_ids:products.filter(p=>String(p[field])===String(row.id)&&!(row.excluded_product_ids||[]).map(String).includes(String(p.id))).map(p=>p.id);
 const selected=ids.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean) as Row[];
 const options=q.trim()?products.filter(p=>!ids.map(String).includes(String(p.id))&&`${p.name} ${p.sku}`.toLowerCase().includes(q.trim().toLowerCase())):[];
 function commit(next:any[]){onChange({product_ids:next,...(kind==='categories'?{excluded_product_ids:products.filter(p=>p.cat===row.id&&!next.map(String).includes(String(p.id))).map(p=>p.id)}:{})});}
 const move=(i:number,d:number)=>{const next=[...ids];[next[i+d],next[i]]=[next[i],next[i+d]];commit(next);};
 const body=<div className="pm">
  <div className="pm-add"><label>Thêm sản phẩm<input type="search" value={q} placeholder="Gõ tên hoặc mã SKU để tìm…" onChange={e=>{setQ(e.target.value);setLimit(10);}} aria-label="Tìm sản phẩm"/></label>
   {q.trim()&&<div className="pm-results">{options.length?options.slice(0,limit).map(p=><div key={p.id} className="pm-row"><span>{p.name}<small>{p.sku}</small></span><button type="button" className="btn btn-light" onClick={()=>commit([...ids,p.id])}>Thêm</button></div>):<p className="ce-empty">Không tìm thấy sản phẩm phù hợp.</p>}
    {options.length>limit&&<button type="button" className="btn btn-light" onClick={()=>setLimit(v=>v+10)}>Xem thêm sản phẩm</button>}</div>}
  </div>
  <p className="pm-count">{selected.length} sản phẩm đang hiển thị · dùng ↑ ↓ để sắp xếp thứ tự trên website</p>
  {selected.length?<ol className="pm-list">{selected.map((p,i)=><li key={p.id} className="pm-row"><span><b>{i+1}.</b> {p.name}<small>{p.sku}</small></span><div className="ce-tools"><button type="button" className="btn btn-light btn-icon" aria-label={`Đưa ${p.sku} lên`} disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" className="btn btn-light btn-icon" aria-label={`Đưa ${p.sku} xuống`} disabled={i===ids.length-1} onClick={()=>move(i,1)}>↓</button><button type="button" className="btn btn-light ce-del" onClick={()=>commit(ids.filter(id=>String(id)!==String(p.id)))}>Bỏ</button></div></li>)}</ol>:<p className="ce-empty">Chưa có sản phẩm nào.</p>}
 </div>;
 return bare?body:<section className="ar-panel"><h2>Sản phẩm trong {kind==='brands'?'thương hiệu':'danh mục'}</h2>{body}</section>;
}

// Ô ảnh dạng thẻ (trang Tầm nhìn…): xem trước đúng tỉ lệ, tải ảnh / dán link / bỏ ảnh gọn trong 1 hàng nút
export function ImageSlot({label,hint,size,value,onChange,folder='media',onPending}:{label:string;hint?:string;size?:string;value:any;onChange:(v:string)=>void;folder?:string;onPending?:(delta:number)=>void}){
 const [busy,setBusy]=useState(false);const [link,setLink]=useState<string|null>(null);const notice=useNotice();const id=useId();
 const src=typeof value==='string'?value:'';
 async function upload(file?:File){if(!file)return;setBusy(true);onPending?.(1);try{onChange(await imageFile(file,folder));}catch(err){notice(err instanceof Error?err.message:String(err),true);}finally{setBusy(false);onPending?.(-1);}}
 function addLink(){const u=(link||'').trim();if(!/^https?:\/\//.test(u)||!safeUrl(u)){notice('Nhập đường dẫn ảnh http hoặc https hợp lệ.',true);return;}onChange(u);setLink(null);}
 return <div className="ar-slot">
  <div className="ar-slot-preview">{src?<Image src={src} alt={label}/>:<span>{busy?'Đang tải ảnh…':'Chưa có ảnh'}</span>}</div>
  <div className="ar-slot-body">
   <strong>{label}</strong>
   {(hint||size)&&<small>{[hint,size].filter(Boolean).join(' · ')}</small>}
   {link!==null?<div className="ar-slot-link"><input type="url" aria-label={`Đường dẫn ảnh ${label}`} placeholder="https://…" value={link} autoFocus onChange={e=>setLink(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addLink();}if(e.key==='Escape')setLink(null);}}/><button type="button" className="btn btn-primary btn-sm" onClick={addLink}>Dùng</button><button type="button" className="btn btn-light btn-sm" onClick={()=>setLink(null)}>Hủy</button></div>
   :<div className="ar-slot-actions">
    <label className="btn btn-light btn-sm" htmlFor={id} aria-disabled={busy}>{src?'Đổi ảnh':'Tải ảnh'}</label>
    <input id={id} className="ar-slot-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={`Tải ảnh ${label}`} disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';upload(f);}}/>
    <button type="button" className="btn btn-light btn-sm" disabled={busy} onClick={()=>setLink('')}>Dán link</button>
    {src&&<button type="button" className="btn btn-light btn-sm ar-slot-remove" disabled={busy} aria-label={`Bỏ ảnh ${label}`} onClick={()=>onChange('')}>Bỏ ảnh</button>}
   </div>}
  </div>
 </div>;
}
