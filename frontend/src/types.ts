export type Row = Record<string, any>;
export interface Product {
  id: number;
  sku: string;
  slug: string;
  name: string;
  cat: string;
  sub: string;
  sub2?: string;
  brand: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  sold: number;
  rating: number;
  reviews: number;
  badges: string[];
  images: string[];
  attrs: Record<string, string>;
  specs: Record<string, string>;
  highlights: string[];
  options: Record<string, string[]>;
  short: string;
  description: string;
  warranty: string;
  technology?: string;
  origin?: string;
  gift?: string;
  freeInstall: boolean;
  flashSale: boolean;
  createdAt: string;
  installment?: boolean;
  productTags: string[];
  requiresShipping: boolean;
  weight: number;
  weightUnit: string;
  art: Row;
}
export interface SubGroup {
  id: string;
  name: string;
  items?: { id: string; name: string }[];
}
export interface Category {
  id: string;
  name: string;
  short: string;
  icon: string;
  image?: string;
  /** Ảnh quảng cáo dọc ở cột đầu dải sản phẩm trang chủ */
  promo_image?: string;
  promo_title?: string;
  promo_href?: string;
  subs: SubGroup[];
  filters: Row[];
  product_ids?: number[];
}
export interface ShopState {
  cart: Row[];
  wishlist: number[];
  compare: number[];
  viewed: number[];
  user: Row | null;
  orders: Row[];
}
export interface Runtime extends Row {
  products: Product[];
  categories: Category[];
  brands: Row[];
  config: Row;
  posts: Row[];
  projects: Row[];
  faqs: Row[];
  services: Row[];
  stores: Row[];
  banners: Row[];
  api: Row;
  store: Row;
  backend: Row;
  u: Row;
}
declare global {
  interface Window {
    DT: Runtime;
  }
}
