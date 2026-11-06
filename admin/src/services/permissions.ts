import type { User } from '../types';
export const roles:Record<string,{label:string;home:string}>= {
 admin:{label:'Quản trị viên',home:'dashboard'},staff:{label:'Nhân viên vận hành',home:'dashboard'},sales:{label:'Nhân viên kinh doanh',home:'leads'},accountant:{label:'Kế toán',home:'orders'},
};
export const navigation=[
 {title:'Tổng quan',items:[['dashboard','home','Tổng quan']]},
 {title:'Bán hàng',items:[['orders','cart','Đơn hàng'],['leads','chat','Khách hàng tiềm năng'],['customers','user','Khách hàng'],['maintenance','wrench','Lịch bảo trì']]},
 {title:'Sản phẩm',items:[['products','box','Sản phẩm'],['categories','grid','Danh mục'],['brands','tag','Thương hiệu'],['reviews','star','Đánh giá']]},
 {title:'Marketing',items:[['coupons','percent','Mã giảm giá'],['banners','zap','Banner'],['posts','file','Bài viết'],['vision','eye','Trang Tầm nhìn'],['projects','building','Dự án tiêu biểu'],['faqs','chat','Hỏi đáp (FAQ)'],['trust','shield','Uy tín & đánh giá'],['content','file','Nội dung website']]},
 {title:'Phân tích',items:[['reports','grid','Báo cáo'],['notifications','mail','Nhật ký thông báo'],['misa','file','Xuất Excel MISA']]},
 {title:'Cấu hình',items:[['settings','tool','Cài đặt cửa hàng'],['stores','pin','Cửa hàng'],['services','wrench','Dịch vụ'],['policies','shield','Chính sách']]},
];
export const adminOnly=['settings','vision','trust','content','policies'];
export function allowed(user:User|null,key:string){if(!user || !roles[user.role])return false;if(user.role==='admin')return true;if(user.role==='staff')return !adminOnly.includes(key);return (user.role==='sales'?['leads']:['orders','reports','misa']).includes(key);}
export const operational=(user:User|null)=>!!user && ['admin','staff'].includes(user.role);
