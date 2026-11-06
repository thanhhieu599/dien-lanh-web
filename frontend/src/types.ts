export type Row = Record<string, any>;
export interface Product {
  id: number; sku: string; slug: string; name: string; cat: string; sub: string; brand: string;
  price: number; oldPrice: number | null; stock: number; sold: number; rating: number; reviews: number;
  badges: string[]; images: string[]; attrs: Record<string, string>; specs: Record<string, string>;
  highlights: string[]; options: Record<string, string[]>; short: string; description: string;
  warranty: string; gift?:string; freeInstall: boolean; flashSale: boolean; createdAt: string;
}
export interface Category { id: string; name: string; short: string; icon: string; image?:string; subs: {id:string;name:string}[]; filters: Row[]; product_ids?: number[]; }
export interface ShopState { cart: Row[]; wishlist: number[]; compare: number[]; viewed: number[]; user: Row | null; orders: Row[]; }
export interface Runtime extends Row {
  products: Product[]; categories: Category[]; brands: Row[]; config: Row; posts: Row[];
  projects: Row[]; faqs: Row[]; services: Row[]; stores: Row[]; banners: Row[];
  api: Row; store: Row; backend: Row; u: Row;
}
declare global { interface Window { DT: Runtime; } }
