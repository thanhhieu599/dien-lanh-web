// Kết nối cơ sở dữ liệu Supabase (xem supabase/README.md).
// Để trống url/anonKey = chế độ DEMO: dữ liệu mẫu, đơn hàng lưu trên trình duyệt.
// anonKey là khóa công khai (an toàn khi để trên website); dữ liệu được bảo vệ bằng RLS.
// TUYỆT ĐỐI không dán service_role key vào đây.
window.DT = window.DT || {};

DT.BACKEND = {
  url: '',            // vd: 'https://abcdxyz.supabase.co'
  anonKey: '',        // Project Settings > API > anon public
  // Khách đăng nhập bằng số điện thoại; hệ thống ánh xạ thành email nội bộ <sđt>@<domain>
  phoneEmailDomain: 'sdt.trangthietbi.vn',
  cacheMinutes: 5,    // thời gian giữ catalog trong sessionStorage
};
