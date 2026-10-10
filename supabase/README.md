# Cơ sở dữ liệu – Supabase (PostgreSQL)

Website là trang tĩnh (GitHub Pages) nên dùng **Supabase** làm backend: PostgreSQL + đăng nhập + REST API, trang web gọi thẳng vào database, dữ liệu được bảo vệ bằng **Row Level Security (RLS)**.

```
Trình duyệt khách ──(anon key công khai)──► Supabase REST/Auth ──► PostgreSQL (RLS + hàm nghiệp vụ)
Trang quản trị (giai đoạn 3) ──(tài khoản role staff/admin)──┘
```

## Cấu trúc

| File | Nội dung |
|---|---|
| `migrations/20261010000001_schema.sql` | 16 bảng: sản phẩm, danh mục, thương hiệu, đơn hàng, khách hàng, đánh giá, lead, mã giảm giá, nội dung... |
| `migrations/20261010000002_functions.sql` | Hàm nghiệp vụ: `place_order`, `track_order`, `cancel_order`, `my_orders`, `validate_coupon`, `submit_lead` + trigger bảo vệ |
| `migrations/20261010000003_security.sql` | RLS & phân quyền |
| `seed.sql` | Dữ liệu ban đầu (71 sản phẩm, bài viết, cửa hàng, mã giảm giá) – sinh bằng `node tools/build-seed.mjs` |
| `tests/` | Bộ kiểm thử chạy trên PostgreSQL cục bộ (`tests/run-local.sh`) |

## Cài đặt (khoảng 15 phút)

1. **Tạo project**: vào https://supabase.com → *New project* → Region **Southeast Asia (Singapore)** → lưu lại mật khẩu database.
2. **Tạo bảng**: mở *SQL Editor* → *New query* → dán và chạy **lần lượt** nội dung 3 file trong `migrations/` (theo thứ tự số), sau đó chạy `seed.sql`.
   - Hoặc dùng Supabase CLI: `supabase link --project-ref <ref>` rồi `supabase db push` và chạy `seed.sql`.
3. **Cấu hình đăng nhập**: *Authentication → Sign In / Providers → Email*: bật Email, **tắt "Confirm email"**.
   Khách đăng nhập bằng **số điện thoại + mật khẩu**; hệ thống tự ánh xạ thành email nội bộ `<sđt>@sdt.trangthietbi.vn` nên không gửi email xác nhận.
4. *Authentication → URL Configuration*: **Site URL** = `https://thanhhieu599.github.io/dien-lanh-web/` (hoặc tên miền riêng).
5. **Kết nối website**: *Project Settings → API* → copy **Project URL** và khóa **anon public**, dán vào `frontend/assets/js/backend-config.js`:
   ```js
   DT.BACKEND = { url: 'https://xxxx.supabase.co', anonKey: 'eyJhbGciOi...', ... }
   ```
   Commit & push → GitHub Pages cập nhật sau 1–2 phút. **Không bao giờ** dán `service_role` key vào website.
6. **Tạo tài khoản quản trị**: đăng ký tài khoản trên website, rồi chạy trong SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where phone = '09xxxxxxxx';
   ```
7. **Trước khi chạy thật**:
   ```sql
   -- Xóa số liệu đánh giá / đã bán mẫu
   update public.products set rating = 5, reviews = 0, sold = 0;
   -- Cập nhật thông tin doanh nghiệp (hotline, MST, phí ship, phí lắp đặt...)
   update public.settings set value = value || '{"hotline":"1900 xxxx","taxCode":"03xxxxxxxx"}' where key = 'store';
   ```

Để trống `url`/`anonKey` thì website chạy **chế độ demo** (dữ liệu mẫu, lưu trên trình duyệt) như trước.

## Phân quyền (đã kiểm thử)

| Đối tượng | Được phép |
|---|---|
| Khách vãng lai | Xem catalog, nội dung, mã giảm giá công khai; đặt hàng, tra cứu/hủy đơn **bằng mã đơn + đúng SĐT**; gửi form; gửi đánh giá (chờ duyệt) |
| Khách đăng nhập | Thêm: xem/sửa hồ sơ & sổ địa chỉ của mình, xem **chỉ đơn của mình** |
| `staff` | Đọc/ghi sản phẩm, đơn hàng, lead, đánh giá, nội dung |
| `admin` | Toàn quyền, kể cả cấu hình cửa hàng, phân quyền, xóa dữ liệu |

Bảo vệ nghiệp vụ:
- **Giá luôn tính lại trên server** trong `place_order()`: trình duyệt chỉ gửi mã sản phẩm + số lượng; giá, phí lắp đặt, phí ship, mã giảm giá đều lấy từ database.
- Khách không thể tự nâng quyền, tự duyệt đánh giá, đọc lead/đơn của người khác.
- Chống spam: tối đa 5 đơn và 5 form / số điện thoại / 10 phút.
- Đặt hàng tự trừ tồn kho, hủy đơn tự hoàn kho; mọi thay đổi trạng thái đơn được ghi lịch sử (`order_status_history`).

## Vận hành hằng ngày (trước khi có trang quản trị)

Dùng *Table Editor* của Supabase để xem/sửa trực tiếp, hoặc các truy vấn sau trong *SQL Editor*:

```sql
-- Đơn mới cần xác nhận
select code, created_at, customer->>'name' as khach, phone, total, payment, shipping->>'method' as nhan_hang
from orders where status = 'pending' order by created_at desc;

-- Xác nhận / chuyển trạng thái đơn (pending → confirmed → shipping → installing → done)
update orders set status = 'confirmed', staff_note = 'Đã gọi xác nhận' where code = 'DT2610xxxxxx';

-- Lead mới: báo giá dự án, đặt lịch dịch vụ, liên hệ
select code, type, created_at, name, phone, company, data from leads where status = 'new' order by created_at desc;

-- Doanh thu theo tháng (đơn không hủy)
select date_trunc('month', created_at) as thang, count(*) so_don, sum(total) doanh_thu
from orders where status <> 'cancelled' group by 1 order by 1 desc;

-- Duyệt đánh giá
update reviews set status = 'approved' where id = 123;

-- Đổi giá / tồn kho
update products set price = 9990000, old_price = 11900000, stock = 20 where sku = 'DT1001';
```

Thay đổi sản phẩm hiển thị trên website sau tối đa `cacheMinutes` (mặc định 5 phút) với khách đang mở trang.

## Lưu ý gói dịch vụ

- **Free**: 500 MB database, đủ cho giai đoạn đầu; project **tạm dừng sau 7 ngày không có truy cập**, không có backup tự động.
- **Pro (~25 USD/tháng)**: backup hằng ngày, không tạm dừng – nên nâng cấp khi bắt đầu nhận đơn thật.
- Tự backup: *Database → Backups* hoặc `pg_dump` định kỳ.

## Chạy kiểm thử cục bộ

```bash
# Cần PostgreSQL 15+
PGHOST=localhost PGUSER=postgres ./supabase/tests/run-local.sh
# Kết quả mong đợi: OK 1 … OK 9
```
