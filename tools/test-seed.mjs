// Fixtures riêng cho MySQL: khóa ổn định, không có tài khoản đăng nhập/mật khẩu mẫu.
export function buildTestSeed(source, dt, clock = new Date()) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const count = 15;
  const list = fn => Array.from({length: count}, (_, i) => fn(i));
  const day = offset => new Date(clock.getTime() + offset * 86400000).toISOString();
  const key = i => String(i + 1).padStart(2, '0');
  const stamp = (row, i = 0) => ({...row, test_fixture: true, created_at: day(-i), updated_at: day(-i)});
  const result = {};
  const primary = {coupons:'code', posts:'slug', projects:'slug', policies:'key'};
  for (const table of ['categories','brands','products','coupons','posts','projects','faqs','banners','stores','services','policies']) {
    result[table] = list(i => {
      const row = clone(source[table][i % source[table].length]);
      const pk = primary[table] || 'id';
      row[pk] = table === 'products' ? 910001 + i : table === 'coupons' ? `TEST${key(i)}` : `test-${table}-${key(i)}`;
      for (const field of ['name','title','question']) if (row[field]) row[field] = `[TEST ${key(i)}] ${row[field]}`;
      row.sort = 100 + i;
      if ('active' in row) row.active = i !== 14;
      if ('published' in row) row.published = i !== 14;
      if (table === 'brands') row.slug = row.id;
      if (table === 'products') {
        row.sku = `TEST-SP-${key(i)}`;
        row.slug = `test-san-pham-${key(i)}`;
        const templateCategory = source.categories.findIndex(c => c.id === row.cat);
        const templateBrand = source.brands.findIndex(b => b.id === row.brand);
        row.cat = result.categories[Math.max(0, templateCategory) % count].id;
        row.brand = result.brands[Math.max(0, templateBrand) % count].id;
        row.stock = i === 14 ? 0 : i === 13 ? 3 : 30 + i;
        row.sold = 5 + i;
        row.flash_sale = i % 3 === 0;
      }
      if (table === 'coupons') {
        row.type = ['fixed','percent','ship'][i % 3];
        row.value = row.type === 'percent' ? 10 : row.type === 'fixed' ? 100000 : 0;
        row.min = 0; row.max = 200000; row.used_count = 0; row.usage_limit = 50;
        row.starts_at = day(-30); row.ends_at = day(i === 13 ? -1 : 30);
        row.description = `[TEST] Mã ${key(i)}: ${row.type}`;
      }
      if (table === 'policies') row.body = '<p>[TEST] Nội dung chính sách dùng để thử thao tác quản trị.</p>';
      if (table === 'stores') { row.phone = `09099000${key(i)}`; row.email = `store${key(i)}@example.test`; }
      return stamp(row, i);
    });
  }
  const names = ['Nguyễn An','Trần Bình','Lê Chi','Phạm Dũng','Hoàng Hà','Vũ Hạnh','Đặng Hùng','Bùi Khánh','Đỗ Lan','Hồ Linh','Ngô Minh','Dương Nam','Lý Ngọc','Đinh Phúc','Mai Thanh'];
  result.profiles = list(i => stamp({id:`test-profile-${key(i)}`, name:`[TEST] ${names[i]}`, phone:`09099000${key(i)}`, email:`customer${key(i)}@example.test`, role:'customer', addresses:[{name:names[i],phone:`09099000${key(i)}`,address:`${10+i} Đường mẫu`,district:'Bình Thạnh',province:'TP. Hồ Chí Minh',default:true}]}, i));
  result.crm_customers = result.profiles.map((p,i) => stamp({id:`test-customer-${key(i)}`,profile_id:p.id,name:p.name,phone:p.phone,email:p.email,addresses:p.addresses,tags:i % 3 === 0 ? ['TEST','VIP'] : ['TEST'],note:'Hồ sơ mẫu để kiểm tra CRM',marketing_opt_in:i % 2 === 0}, i));
  result.orders = []; result.order_items = []; result.order_status_history = []; result.payments = [];
  const statuses = ['done','done','done','done','done','pending','confirmed','shipping','installing','cancelled','pending','confirmed','shipping','installing','done'];
  for (let i = 0; i < count; i++) {
    const customer = result.crm_customers[i], product = result.products[i];
    const id = `test-order-${key(i)}`, status = statuses[i];
    const qty = i % 3 + 1, subtotal = product.price * qty;
    const shippingFee = i % 2 ? 50000 : 0, installFee = i % 3 ? 300000 : 0, discount = i % 4 === 0 ? Math.min(100000, subtotal) : 0;
    const total = subtotal + shippingFee + installFee - discount;
    const paymentStatus = status === 'done' ? 'paid' : status === 'cancelled' ? 'refunded' : 'unpaid';
    // Các đơn hoàn tất nằm trong tháng hiện tại để báo cáo MISA mặc định có dữ liệu.
    const createdAt = day(-Math.min(i % 5, Number(clock.toISOString().slice(8,10)) - 1));
    const payment = i % 2 ? 'bank' : 'cod';
    result.orders.push({...stamp({id,code:`TEST-DH-${key(i)}`,status,phone:customer.phone,customer_id:customer.id,user_id:customer.profile_id,customer:{name:customer.name,phone:customer.phone,email:customer.email},shipping:{method:'delivery',...customer.addresses[0],date:createdAt.slice(0,10),slot:'09:00–12:00'},payment,payment_status:paymentStatus,subtotal,shipping_fee:shippingFee,install_fee:installFee,discount,total,coupon:null,note:'[TEST] Đơn hàng giả lập',staff_note:'Dùng thử lọc, chuyển trạng thái và xuất báo cáo',maintenance_optin:true,invoice:i % 3 === 0 ? {company:`[TEST] Công ty mẫu ${key(i)}`,taxCode:'',address:customer.addresses[0].address} : null,attribution:{source:'test',medium:'fixture',campaign:'admin-test'}},i),created_at:createdAt,updated_at:createdAt});
    result.order_items.push(stamp({id:`test-item-${key(i)}`,order_id:id,product_id:product.id,sku:product.sku,name:product.name,price:product.price,qty,install:installFee>0,options:{}}, i));
    result.order_status_history.push({...stamp({id:`test-history-${key(i)}`,order_id:id,status,note:'[TEST] Trạng thái khi nạp dữ liệu mẫu',changed_by:null},i),created_at:createdAt});
    result.payments.push(stamp({id:`test-payment-${key(i)}`,order_id:id,txn_ref:`TEST-TXN-${key(i)}`,provider:payment,amount:total,status:paymentStatus==='paid'?'paid':paymentStatus==='refunded'?'refunded':'pending'},i));
  }
  result.leads = list(i => stamp({id:`test-lead-${key(i)}`,code:`TEST-LEAD-${key(i)}`,type:['b2b-quote','service','contact','newsletter'][i%4],status:['new','contacted','quoted','won','lost','spam'][i%6],name:result.profiles[i].name,phone:result.profiles[i].phone,email:result.profiles[i].email,company:i%2?`[TEST] Công ty ${key(i)}`:'',assigned_to:null,staff_note:'[TEST] Yêu cầu chăm sóc',notes:[{text:'Đã tiếp nhận yêu cầu thử nghiệm',by:'Dữ liệu mẫu',created_at:day(-i)}],data:{message:`[TEST] Cần tư vấn lắp đặt ${i+1} máy lạnh`,address:`${10+i} Đường mẫu`,quantity:i+1},source_url:'/frontend/lien-he.html'},i));
  result.reviews = list(i => stamp({id:`test-review-${key(i)}`,product_id:result.products[i].id,user_id:result.profiles[i].id,name:result.profiles[i].name,phone:result.profiles[i].phone,rating:i%5+1,text:`[TEST ${key(i)}] ${['Lắp đặt đúng hẹn, máy chạy êm.','Cần hỗ trợ thêm về hướng dẫn sử dụng.','Đóng gói cẩn thận, tư vấn rõ ràng.'][i%3]}`,status:['pending','approved','rejected'][i%3],verified:i%2===0},i));
  result.notifications = Array.from({length:20},(_,i) => stamp({id:`test-notification-${key(i)}`,order_id:result.orders[i%count].id,event:i<10?'maintenance_reminder':'order_created',status:['pending','processing','failed','skipped'][i%4],next_at:day(i-5),data:{name:result.profiles[i%count].name,phone:result.profiles[i%count].phone,orderCode:result.orders[i%count].code,cycle:1},results:{test:true,note:'[TEST] Mô phỏng hàng đợi; chưa gửi thông báo',booked:i%3===0}},i));
  result.cart_reminders = list(i => stamp({id:`test-cart-${key(i)}`,phone:result.profiles[i].phone,user_id:result.profiles[i].id,status:'pending',items:[{id:result.products[i].id,qty:1}],next_at:day(i)},i));
  result.settings = [
    ...clone(source.settings),
    {key:'home',value:clone(dt.siteContentDefaults)},
    {key:'catalog',value:{priceRanges:clone(dt.priceRanges),bundles:clone(dt.bundleRules)}},
    {key:'vision',value:{images:Object.fromEntries(dt.visionSlots.map(slot=>[slot.key,'']))}},
    {key:'trust',value:{logos:list(i=>({name:`[TEST] Đối tác ${key(i)}`,image:'',url:''})),certs:list(i=>({title:`[TEST] Chứng nhận giả lập ${key(i)}`,issuer:'Dữ liệu thử nghiệm',image:''})),reviews:result.reviews.map(r=>({name:r.name,rating:r.rating,text:r.text,source:'TEST',date:r.created_at.slice(0,10)})),google:{url:'',placeId:'',rating:0,count:0,updated:''}}},
  ].map(row=>stamp(row));
  return result;
}
