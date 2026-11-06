import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dt, formValues, money, safeUrl, toast } from '../services/runtime';
import { useShop } from '../hooks/useShop';
import {MegaMenu,uniqueCategories} from '../components/navigation';
import type {Row} from '../types';
import {PagedList} from '../components/collections';
import { Icon, Picture, ShopLink, Rich } from '../components/common';

export function ShopLayout({children}:{children:ReactNode}) {
  const state = useShop(); const navigate = useNavigate(); const location = useLocation();
  const [drawer,setDrawer] = useState(false); const [query,setQuery] = useState(''); const [focused,setFocused] = useState(false);
  const [chat,setChat] = useState(false); const [sending,setSending] = useState(false);
  const [backToTop,setBackToTop]=useState(false);
  const drawerRef=useRef<HTMLDivElement>(null);
  const config = dt.config; const content = dt.siteContent();
  const suggestions=query.trim().length>1?dt.api.suggest(query.trim(),5):[];
  const suggestionsTotal=query.trim().length>1?dt.api.list({q:query.trim()}).total:0;
  const suggestionsOpen=focused && query.trim().length>1;
  function currentPage(href:string){
    const target=href.split('?')[0].replace('.html','');const path=location.pathname;
    if(target==='index')return path==='/' || path==='/index.html';
    if(target==='danh-muc')return /^\/(danh-muc|sp|san-pham|thuong-hieu)/.test(path);
    if(target==='gioi-thieu')return /^\/(gioi-thieu|tam-nhin|he-thong|chinh-sach)/.test(path);
    if(target==='tin-tuc')return /^\/(tin-tuc|bai-viet|hoi-dap)/.test(path);
    if(target==='bao-gia-du-an')return /^\/(bao-gia-du-an|du-an)/.test(path);
    return path===`/${target}.html`;
  }
  useEffect(()=>{setDrawer(false);setFocused(false);window.scrollTo(0,0);},[location.pathname]);
  useEffect(()=>{setDrawer(false);setFocused(false);},[location.search]);
  useEffect(()=>{
    const scroll=()=>setBackToTop(window.scrollY>500);
    scroll();window.addEventListener('scroll',scroll,{passive:true});
    return ()=>window.removeEventListener('scroll',scroll);
  },[]);
  useEffect(()=>{document.body.style.overflow=drawer?'hidden':'';return ()=>{document.body.style.overflow='';};},[drawer]);
  useEffect(()=>{
    if(!drawer)return;
    const previous=document.activeElement as HTMLElement|null;
    drawerRef.current?.querySelector<HTMLButtonElement>('.drawer-x')?.focus();
    function keyboard(event:KeyboardEvent){
      if(event.key==='Escape'){event.preventDefault();setDrawer(false);}
      if(event.key==='Tab'){
        const controls=Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a,button,summary') || []).filter(el=>el.getClientRects().length>0);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    }
    document.addEventListener('keydown',keyboard);
    return ()=>{document.removeEventListener('keydown',keyboard);previous?.focus();};
  },[drawer]);
  const categories=uniqueCategories();
  const menus:Row[] = [
    {title:'TRANG CHỦ',href:'index.html'},
    {title:'SẢN PHẨM',href:'tim-kiem.html',items:[...categories.map(c=>({title:c.name,icon:c.icon,href:dt.api.catUrl(c.id),items:c.subs.filter(s=>dt.products.some(p=>p.cat===c.id&&p.sub===s.id)).map(s=>({title:s.name,href:dt.api.catUrl(c.id,s.id)}))})),{title:'Thương hiệu',href:'thuong-hieu.html'}]},
    {title:'KHUYẾN MÃI',href:'khuyen-mai.html'},
    {title:'DỊCH VỤ',href:'dich-vu.html',items:[...dt.services.map(s=>({title:s.name,icon:s.icon,href:`dich-vu.html#${s.id}`})),{title:'Tính công suất máy lạnh',href:'tinh-cong-suat-may-lanh.html'}]},
    {title:'DOANH NGHIỆP',href:'bao-gia-du-an.html',items:[{title:'Báo giá dự án',href:'bao-gia-du-an.html'},{title:'Dự án tiêu biểu',href:'du-an.html'}]},
    {title:'TIN TỨC',href:'tin-tuc.html',items:[{title:'Tin tức',href:'tin-tuc.html'},{title:'Hỏi đáp',href:'hoi-dap.html'}]},
    {title:'GIỚI THIỆU',href:'gioi-thieu.html',items:[{title:'Về công ty',href:'gioi-thieu.html'},{title:'Tầm nhìn & Sứ mệnh',href:'tam-nhin-su-menh.html'},{title:'Hệ thống cửa hàng',href:'he-thong-cua-hang.html'},{title:'Chính sách',href:'chinh-sach.html'}]},
    {title:'LIÊN HỆ',href:'lien-he.html'},
  ];
  const logo = <ShopLink href="index.html" className="logo" aria-label={`${config.name} - Trang chủ`}><span className="logo-mark"><Icon name="snow"/></span><span className="logo-text"><b>LOGO</b><small>{String(config.name || 'Tên thương hiệu').toLocaleUpperCase('vi-VN')}</small></span></ShopLink>;
  async function newsletter(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=formValues(form);
    try { await dt.saveLead('newsletter',data); toast('Đã đăng ký nhận tin'); form.reset(); } catch(error) {toast(String(error),true);}
  }
  async function callback(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=formValues(form);
    if(!dt.u.validPhone(data.phone)) {toast('Số điện thoại không hợp lệ',true);return;}
    setSending(true);try {await dt.saveLead('contact',data);toast('Đã nhận yêu cầu. Chuyên viên sẽ liên hệ với bạn.');form.reset();}catch(e){toast(String(e),true);}finally{setSending(false);}
  }
  return <>
    <a className="skip-link" href="#main">Đến nội dung chính</a>
    <div id="site-header"><div className="topbar"><div className="container"><div className="topbar-left"><ShopLink href="thuong-hieu.html"><Icon name="tag"/> Thương hiệu</ShopLink></div><nav className="topbar-right"><ShopLink href="tra-cuu-don-hang.html"><Icon name="truck"/> Tra cứu đơn hàng</ShopLink><ShopLink href="he-thong-cua-hang.html"><Icon name="pin"/> Hệ thống cửa hàng</ShopLink><ShopLink href="bao-gia-du-an.html" className="b2b-link"><Icon name="building"/> Khách hàng doanh nghiệp</ShopLink></nav></div></div>
    <header className="header"><div className="container header-main"><button className="burger" aria-expanded={drawer} aria-controls="mobile-menu" aria-label="Mở menu" onClick={()=>setDrawer(true)}><Icon name="menu"/></button>{logo}<div className="cat-toggle"><button className="cat-btn" type="button" aria-haspopup="true"><Icon name="menu"/><span>Danh mục</span></button><div className="cat-drop"><MegaMenu/></div></div>
      <form className="search" role="search" onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}} onKeyDown={e=>{if(e.key==='Escape')setFocused(false);}} onSubmit={e=>{e.preventDefault();navigate(`/tim-kiem.html?q=${encodeURIComponent(query.trim())}`);setFocused(false);}}><input type="search" name="q" aria-label="Tìm kiếm sản phẩm" aria-controls="search-suggestions" aria-expanded={suggestionsOpen} placeholder="Bạn tìm máy lạnh, tủ lạnh, máy giặt…" value={query} onChange={e=>setQuery(e.target.value)}/><button aria-label="Tìm kiếm"><Icon name="search"/></button>
        {suggestionsOpen && <div id="search-suggestions" className="suggest show" role="region" aria-label="Sản phẩm gợi ý">{suggestions.length?suggestions.map((p:any)=><ShopLink href={dt.api.url(p)} key={p.id} className="react-suggestion"><Picture product={p}/><span>{p.name}<b>{money(p.price)}</b></span></ShopLink>):<p className="search-empty">Chưa tìm thấy sản phẩm. Thử tên hoặc mã sản phẩm khác.</p>}{suggestionsTotal>5&&<ShopLink className="suggest-more" href={`tim-kiem.html?q=${encodeURIComponent(query.trim())}`}>Xem thêm →</ShopLink>}</div>}
      </form>
      <a className="h-action h-hotline" href={`tel:${dt.u.tel(config.hotline)}`}><Icon name="headset"/><span><small>Tư vấn miễn phí</small><b>{config.hotline}</b></span></a>
      <ShopLink href="tai-khoan.html" aria-label="Tài khoản" className="h-action"><Icon name="user"/><span><small>Tài khoản</small><b id="h-user">{state.user?.name || 'Đăng nhập'}</b></span></ShopLink>
      <ShopLink href="gio-hang.html" aria-label="Giỏ hàng" className="h-action h-cart"><Icon name="cart"/><em className={`badge ${dt.store.cartCount()>0?'show':''}`} id="cart-count">{dt.store.cartCount()}</em><span><small>Giỏ hàng</small><b>Của bạn</b></span></ShopLink>
    </div><nav className="mainnav" aria-label="Menu chính"><div className="container"><ul>{menus.map(menu=><li key={menu.title} className={menu.items?'has-sub':''}><ShopLink href={menu.href} className={`${currentPage(menu.href)?'active':''} ${menu.href==='khuyen-mai.html'?'hot':''}`} aria-current={currentPage(menu.href)?'page':undefined}>{menu.title}{menu.items && <Icon name="down"/>}</ShopLink>{menu.items && <div className="mm-sub">{menu.items.map((item:any)=><div className={item.items?.length?'mm-has-sub':''} key={item.title}><ShopLink href={item.href}>{item.icon&&<Icon name={item.icon}/>}<span>{item.title}</span>{item.items?.length>0&&<Icon name="right"/>}</ShopLink>{item.items?.length>0 && <div className="mm-level2">{item.items.map((sub:any)=><ShopLink href={sub.href} key={sub.title}>{sub.title}</ShopLink>)}</div>}</div>)}</div>}</li>)}</ul></div></nav></header></div>
    {drawer && <div className="drawer open" role="dialog" aria-modal="true" aria-label="Danh mục" onClick={()=>setDrawer(false)}><div ref={drawerRef} id="mobile-menu" className="drawer-panel" onClick={e=>e.stopPropagation()}><div className="drawer-head">{logo}<button className="drawer-x" onClick={()=>setDrawer(false)} aria-label="Đóng menu">×</button></div><div className="drawer-user">{state.user?<><Icon name="user"/> Xin chào, <b>{state.user.name}</b></>:<ShopLink className="btn btn-primary btn-sm" href="tai-khoan.html">Đăng nhập / Đăng ký</ShopLink>}</div><div className="drawer-body"><ShopLink className="drawer-vision" href="tam-nhin-su-menh.html"><span><small>Về {config.name}</small><b>Tầm nhìn &amp; Sứ mệnh</b></span><Icon name="right"/></ShopLink>{menus.map(menu=><details key={menu.title} open={!menu.items}><summary><ShopLink href={menu.href} aria-current={currentPage(menu.href)?'page':undefined}>{menu.title}</ShopLink>{menu.items && <Icon name="down"/>}</summary>{menu.items?.map((item:any)=><ShopLink href={item.href} key={item.title}>{item.title}</ShopLink>)}</details>)}<ShopLink href="yeu-thich.html">Yêu thích</ShopLink><ShopLink href="so-sanh.html">So sánh</ShopLink></div></div></div>}
    {dt.backend.offline && <div role="alert" className="react-notice">Chưa kết nối được máy chủ dữ liệu. Giá đang hiển thị là dữ liệu dự phòng; vui lòng thử lại trước khi đặt hàng.</div>}
    <main id="main" tabIndex={-1}>{children}</main>
    <div id="site-footer"><section className="benefits"><div className="container">{content.benefits.filter((b:any)=>b.title).map((b:any,i:number)=><div className="benefit" key={i}><Icon name={b.icon || 'check'}/><div><b><Rich html={dt.siteText(b.title)}/></b><small><Rich html={dt.siteText(b.sub)}/></small></div></div>)}</div></section>
    <section className="newsletter"><div className="container"><div><h3><Rich as="span" html={dt.siteText(content.newsletter.title)}/></h3><p><Rich as="span" html={dt.siteText(content.newsletter.sub)}/></p></div><form className="newsletter-form" onSubmit={newsletter}><input type="email" name="email" required aria-label="Email nhận tin" placeholder="Nhập email của bạn"/><button className="btn btn-accent">Đăng ký</button></form></div></section>
    <footer className="footer"><div className="container footer-grid"><div className="footer-col footer-about">{logo}<p>{config.slogan}. Chuyên cung cấp máy lạnh, tủ lạnh, máy giặt, thiết bị điện lạnh dân dụng &amp; công nghiệp chính hãng cho gia đình và doanh nghiệp.</p><ul className="contact-list"><li><Icon name="phone"/><a href={`tel:${dt.u.tel(config.hotline)}`}>Hotline: {config.hotline}</a></li>{config.hotlineB2B && <li><Icon name="building"/>Doanh nghiệp: <a href={`tel:${dt.u.tel(config.hotlineB2B)}`}>{config.hotlineB2B}</a></li>}<li><Icon name="mail"/><a href={`mailto:${config.email}`}>{config.email}</a></li><li><Icon name="clock"/>{config.workingHours}</li></ul></div><div className="footer-col"><h4>Hỗ trợ khách hàng</h4><PagedList items={[...Object.entries(dt.policies).map(([key,p]:any)=>({key,title:p.title,href:dt.api.policyUrl(key)})),{key:'faq',title:'Hỏi đáp thường gặp',href:'hoi-dap.html'}]} label="Hỗ trợ khách hàng" renderItem={p=><ShopLink key={p.key} href={p.href}>{p.title}</ShopLink>}/></div><div className="footer-col"><h4>Về {config.name}</h4><PagedList items={[{title:'Giới thiệu công ty',href:'gioi-thieu.html'},{title:'Tầm nhìn & Sứ mệnh',href:'tam-nhin-su-menh.html'},{title:'Dự án tiêu biểu',href:'du-an.html'},{title:'Hệ thống cửa hàng',href:'he-thong-cua-hang.html'},{title:'Giải pháp doanh nghiệp',href:'bao-gia-du-an.html'},{title:'Dịch vụ điện lạnh',href:'dich-vu.html'},{title:'Tin tức - Tư vấn',href:'tin-tuc.html'},{title:'Liên hệ - Góp ý',href:'lien-he.html'}]} label="Thông tin công ty" renderItem={m=><ShopLink href={m.href} key={m.href}>{m.title}</ShopLink>}/></div><div className="footer-col"><h4>Thanh toán</h4><div className="pay-logos"><span>COD</span><span>VietQR</span></div><h4>Kết nối với chúng tôi</h4><div className="socials">{[['Facebook',config.facebook],['Zalo',config.zalo],['YouTube',config.youtube]].filter(([,url])=>safeUrl(url)).map(([name,url])=><a key={name} href={safeUrl(url)} target="_blank" rel="noopener noreferrer" aria-label={name}>{name==='Facebook'?'f':name==='YouTube'?'▶':name}</a>)}</div></div></div><div className="footer-bottom"><div className="container"><p>© {new Date().getFullYear()} {config.company}. MST: {config.taxCode}. Địa chỉ: {config.address}.</p><p>Giá và khuyến mãi có thể thay đổi theo thời điểm.</p></div></div></footer></div>
    <nav className="mnav"><ShopLink href="index.html" aria-current={currentPage('index.html')?'page':undefined}><Icon name="home"/>Trang chủ</ShopLink><button onClick={()=>setDrawer(true)}><Icon name="grid"/>Danh mục</button><ShopLink href="khuyen-mai.html" aria-current={currentPage('khuyen-mai.html')?'page':undefined}><Icon name="percent"/>Khuyến mãi</ShopLink><ShopLink href="gio-hang.html" aria-current={currentPage('gio-hang.html')?'page':undefined}><Icon name="cart"/>Giỏ hàng ({dt.store.cartCount()})</ShopLink><ShopLink href="tai-khoan.html" aria-current={currentPage('tai-khoan.html')?'page':undefined}><Icon name="user"/>Tài khoản</ShopLink></nav>
    <div className="floating"><button className="fl-zalo" aria-label="Mở tư vấn" onClick={()=>setChat(!chat)}><Icon name="chat"/></button><a className="fl-phone" href={`tel:${dt.u.tel(config.hotline)}`} aria-label="Gọi hotline"><Icon name="phone"/></a><button className={`fl-top ${backToTop?'show':''}`} aria-label="Lên đầu trang" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><Icon name="up"/></button></div>
    {chat && <aside className="react-chat"><button className="icon-btn" onClick={()=>setChat(false)} aria-label="Đóng tư vấn">×</button><h2>Chúng tôi có thể giúp gì?</h2>{safeUrl(config.zalo) && <a className="btn btn-outline" href={safeUrl(config.zalo)}>Chat Zalo</a>}<form onSubmit={callback}><label>Họ tên<input name="name" required/></label><label>Số điện thoại<input name="phone" type="tel" required/></label><label>Nhu cầu<textarea name="message" required/></label><label className="check"><input type="checkbox" required/> Đồng ý được liên hệ tư vấn</label><button className="btn btn-primary" disabled={sending}>Yêu cầu gọi lại</button></form></aside>}
    {state.compare.length>0 && <div className="compare-bar show"><div className="container"><span>Đã chọn {state.compare.length} sản phẩm</span><ShopLink href="so-sanh.html" className="btn btn-primary">So sánh ngay</ShopLink><button className="btn" onClick={()=>dt.store.clearCompare()}>Xóa tất cả</button></div></div>}
  </>;
}
