import {useId,useRef,useState,type ReactNode} from 'react';
import {Icon} from './common';

export const ITEMS_PER_PAGE=5;
export function MoreButton({onClick,controls}:{onClick:()=>void;controls?:string}) {
 return <div className="collection-more"><button type="button" className="btn btn-primary" aria-controls={controls} onClick={onClick}>Xem thêm<Icon name="right"/></button></div>;
}
export function PagedList<T>({items,renderItem,className='',label='Danh sách',initialIndex=0}:{items:T[];renderItem:(item:T,index:number)=>ReactNode;className?:string;label?:string;initialIndex?:number}) {
 const identity=items.map((item:any)=>item?.id ?? item?.slug ?? item?.key ?? item?.name ?? item?.title ?? String(item)).join('|');
 return <CollectionPage key={identity+':'+initialIndex} items={items} renderItem={renderItem} className={className} label={label} initialIndex={initialIndex}/>;
}
function CollectionPage<T>({items,renderItem,className,label,initialIndex}:{items:T[];renderItem:(item:T,index:number)=>ReactNode;className:string;label:string;initialIndex:number}) {
 const [page,setPage]=useState(Math.max(0,Math.floor(initialIndex/ITEMS_PER_PAGE)));
 const id=useId(),list=useRef<HTMLDivElement>(null);
 const current=Math.min(page,Math.max(0,Math.ceil(items.length/ITEMS_PER_PAGE)-1));
 const start=current*ITEMS_PER_PAGE;
 function next(){setPage((current+1)%Math.ceil(items.length/ITEMS_PER_PAGE));requestAnimationFrame(()=>{list.current?.focus({preventScroll:true});list.current?.scrollIntoView({block:'nearest',behavior:'instant'});});}
 return <div className="paged-list" data-collection={label} data-collection-size={items.length}>
  <div id={id} ref={list} className={className} role="group" tabIndex={-1} aria-label={label} data-collection-items>{items.slice(start,start+ITEMS_PER_PAGE).map((item,index)=>renderItem(item,start+index))}</div>
  {items.length>ITEMS_PER_PAGE&&<MoreButton controls={id} onClick={next}/>}
 </div>;
}
