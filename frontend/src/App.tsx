import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ShopLayout } from './layouts/ShopLayout';
import { Empty } from './components/common';
import { dt } from './services/runtime';

const Home = lazy(()=>import('./pages/catalog').then(m=>({default:m.HomePage})));
const Listing = lazy(()=>import('./pages/catalog').then(m=>({default:m.ListingPage})));
const Product = lazy(()=>import('./pages/catalog').then(m=>({default:m.ProductPage})));
const Cart = lazy(()=>import('./pages/commerce').then(m=>({default:m.CartPage})));
const Checkout = lazy(()=>import('./pages/commerce').then(m=>({default:m.CheckoutPage})));
const Tracking = lazy(()=>import('./pages/commerce').then(m=>({default:m.TrackingPage})));
const Success = lazy(()=>import('./pages/commerce').then(m=>({default:m.SuccessPage})));
const Collection = lazy(()=>import('./pages/commerce').then(m=>({default:m.CollectionPage})));
const Account = lazy(()=>import('./pages/account').then(m=>({default:m.AccountPage})));
const Contact = lazy(()=>import('./pages/content').then(m=>({default:m.ContactPage})));
const Quote = lazy(()=>import('./pages/content').then(m=>({default:m.QuotePage})));
const Services = lazy(()=>import('./pages/content').then(m=>({default:m.ServicesPage})));
const Stores = lazy(()=>import('./pages/content').then(m=>({default:m.StoresPage})));
const Policy = lazy(()=>import('./pages/content').then(m=>({default:m.PolicyPage})));
const About = lazy(()=>import('./pages/content').then(m=>({default:m.AboutPage})));
const Brands = lazy(()=>import('./pages/content').then(m=>({default:m.BrandsPage})));
const Blog = lazy(()=>import('./pages/content').then(m=>({default:m.BlogPage})));
const Faq = lazy(()=>import('./pages/content').then(m=>({default:m.FaqPage})));
const Projects = lazy(()=>import('./pages/content').then(m=>({default:m.ProjectsPage})));
const Calculator = lazy(()=>import('./pages/calculator').then(m=>({default:m.CalculatorPage})));

class PageBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error(error);}
  render(){return this.state.failed?<Empty title="Không hiển thị được trang"><p>Vui lòng tải lại hoặc liên hệ cửa hàng.</p></Empty>:this.props.children;}
}
function CurrentPage() {
  const {pathname,search}=useLocation();const query=new URLSearchParams(search);const path=decodeURIComponent(pathname).replace(/^\//,'') || 'index.html';
  const segments=path.split('/');const slug=segments.at(-1)?.replace(/\.html$/,'');
  useEffect(()=>{
    document.documentElement.dataset.frontend='react';
    document.documentElement.dataset.reactReady='true';
    const pages:Record<string,string>={'index':'home','danh-muc':'category','tim-kiem':'search','khuyen-mai':'khuyen-mai','san-pham':'product','sp':'product','gio-hang':'cart','thanh-toan':'checkout','tai-khoan':'account','yeu-thich':'wishlist','so-sanh':'compare','lien-he':'contact','dich-vu':'services','bao-gia-du-an':'b2b','he-thong-cua-hang':'stores','chinh-sach':'policy','gioi-thieu':'about','tam-nhin-su-menh':'vision','thuong-hieu':'brands','tin-tuc':'blog','bai-viet':'article','hoi-dap':'faq','du-an':'projects','du-an-chi-tiet':'project','tinh-cong-suat-may-lanh':'calculator','tra-cuu-don-hang':'track','dat-hang-thanh-cong':'success'};
    document.body.dataset.page=segments[0]==='tin-tuc'&&segments.length>1?'article':segments[0]==='du-an'&&segments.length>1?'project':pages[segments[0].replace(/\.html$/,'')] || 'page';
    document.getElementById('root')?.setAttribute('aria-busy','false');
    for(const key of Object.keys(document.body.dataset))if(key.startsWith('q'))delete document.body.dataset[key];
    if(segments[0]==='sp')document.body.dataset.qId=String(dt.products.find(p=>p.slug===slug)?.id || '');
    if(segments[0]==='danh-muc'){document.body.dataset.qCat=segments[1].replace(/\.html$/,'');if(segments[2])document.body.dataset.qSub=slug;}
    if(['tin-tuc','du-an'].includes(segments[0]) && segments.length>1)document.body.dataset.qSlug=slug;
  },[pathname,slug]);
  if(segments[0]==='sp' && segments.length===2)return <Product slug={slug}/>;
  if(segments[0]==='danh-muc' && segments.length>1)return <Listing mode="category" categoryId={segments[1].replace(/\.html$/,'')} subId={segments.length>2?slug:undefined}/>;
  if(segments[0]==='tin-tuc' && segments.length===2)return <Blog slug={slug}/>;
  if(segments[0]==='du-an' && segments.length===2)return <Projects slug={slug}/>;
  if(segments[0]==='thuong-hieu' && segments.length===2)return <Brands id={slug}/>;
  if(segments[0]==='chinh-sach' && segments.length===2)return <Policy type={slug || ''}/>;
  switch(path){
    case 'index.html':return <Home/>;
    case 'danh-muc.html':return <Listing mode="category"/>;
    case 'tim-kiem.html':return <Listing mode="search"/>;
    case 'khuyen-mai.html':return <Listing mode="sale"/>;
    case 'san-pham.html':return <Product key={query.get('id') || query.get('slug')} id={query.get('id') || undefined} slug={query.get('slug') || undefined}/>;
    case 'gio-hang.html':return <Cart/>;
    case 'thanh-toan.html':return <Checkout/>;
    case 'dat-hang-thanh-cong.html':return <Success code={query.get('code') || ''}/>;
    case 'tra-cuu-don-hang.html':return <Tracking code={query.get('code') || ''}/>;
    case 'tai-khoan.html':return <Account/>;
    case 'yeu-thich.html':return <Collection/>;
    case 'so-sanh.html':return <Collection compare/>;
    case 'lien-he.html':return <Contact/>;
    case 'bao-gia-du-an.html':return <Quote productId={query.get('product') || dt.products.find(p=>p.sku===query.get('sku'))?.id.toString()}/>;
    case 'dich-vu.html':return <Services/>;
    case 'he-thong-cua-hang.html':return <Stores/>;
    case 'chinh-sach.html':return <Policy type={query.get('type') || ''}/>;
    case 'gioi-thieu.html':return <About/>;
    case 'tam-nhin-su-menh.html':return <About vision/>;
    case 'thuong-hieu.html':return <Brands id={query.get('id') || undefined}/>;
    case 'tin-tuc.html':return <Blog/>;
    case 'bai-viet.html':return <Blog slug={query.get('slug') || ''}/>;
    case 'hoi-dap.html':return <Faq/>;
    case 'du-an.html':return <Projects/>;
    case 'du-an-chi-tiet.html':return <Projects slug={query.get('slug') || ''}/>;
    case 'tinh-cong-suat-may-lanh.html':return <Calculator/>;
    default:return <div className="container"><h1>Không tìm thấy trang</h1><Empty title="Trang bạn tìm không tồn tại"/></div>;
  }
}
export function App(){const location=useLocation();return <ShopLayout><PageBoundary key={location.pathname}><Suspense fallback={<div className="container react-loading" role="status">Đang tải trang…</div>}><CurrentPage key={location.pathname}/></Suspense></PageBoundary></ShopLayout>;}
