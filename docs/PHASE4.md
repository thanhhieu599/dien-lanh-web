# Giai đoạn 4: Thanh toán online, SEO pre-render, thông báo Email/Zalo tự động

Tài liệu này hướng dẫn **bật từng tính năng**. Phần nào chưa cấu hình thì website vẫn chạy bình thường: khách vẫn đặt hàng, nhân viên gọi hướng dẫn thanh toán như trước.

## 1. Đã làm gì, mang lại gì

| Hạng mục | Khách hàng thấy | Doanh nghiệp được |
|---|---|---|
| **Chuyển khoản VietQR + SePay** | Mã QR có sẵn số tiền & nội dung (mã đơn), quét bằng app ngân hàng bất kỳ | Tiền vào tài khoản là đơn **tự chuyển "Đã thanh toán"** trong 1–2 phút, không phải dò sao kê. Chuyển thiếu → báo "thanh toán một phần" |
| **Thẻ ATM / Visa / Master / JCB qua VNPay** | Đặt hàng xong chuyển thẳng sang cổng VNPay; quay về trang kết quả | Đơn tự cập nhật đã thanh toán (IPN), lưu mã giao dịch để đối soát |
| **Ví MoMo** | Quét QR bằng app MoMo | Như VNPay. Đơn trên 50 triệu tự gợi ý VNPay / chuyển khoản (hạn mức ví) |
| **Thanh toán lại** | Hủy / lỗi giữa chừng → nút "Thanh toán lại" ở trang kết quả, trang đơn hàng, trang tra cứu | Không mất đơn vì khách lỡ tay đóng cổng thanh toán |
| **Thông báo nhân viên** (Zalo Bot, Telegram, Email) | – | Có đơn mới / tiền về / khách hủy / yêu cầu báo giá B2B → nhân viên nhận tin trên Zalo **trong 1 phút**, kèm link mở đơn trong trang quản trị |
| **Thông báo khách** (Email, Zalo ZNS) | Email xác nhận đơn (kèm QR chuyển khoản), email biên nhận thanh toán, email/ZNS khi đơn được xác nhận, đang giao, hoàn thành | Giảm cuộc gọi hỏi "đơn tới đâu rồi", tăng uy tín |
| **SEO pre-render** | Trang tải ra nội dung ngay | Mỗi sản phẩm / danh mục / bài viết có **trang HTML riêng, link đẹp** (`sp/may-lanh-inverter-1-hp.html`), đủ tiêu đề, mô tả, giá, thông số, dữ liệu có cấu trúc (Product, Article, Breadcrumb, Store) → Google, Cốc Cốc, Zalo/Facebook (xem trước link có ảnh) và các công cụ AI (ChatGPT, Perplexity, Gemini) đọc được mà **không cần chạy JavaScript**. Có `sitemap.xml`, `robots.txt`, `llms.txt` |

Khuyến nghị kinh doanh:
- **Khách doanh nghiệp (đơn lớn)**: ưu tiên chuyển khoản VietQR. Không mất phí % như cổng thẻ, có SePay thì xác nhận tự động như cổng online.
- **Khách lẻ**: bật thêm VNPay (thẻ) và MoMo (ví) để không mất khách quen trả online. Phí giao dịch theo hợp đồng ký với VNPay / MoMo, nên đàm phán theo doanh số dự kiến.
- **Thông báo**: bật **Zalo Bot cho nhân viên** trước (miễn phí, nhanh nhất), rồi đến **email khách** (Resend có gói miễn phí). **ZNS** tính phí theo tin và cần mẫu được Zalo duyệt, nên bật sau.

## 2. Kiến trúc

```
Khách ── website tĩnh (GitHub Pages) ──► Supabase: PostgreSQL + REST (RLS)
                │                              │  trigger ghi sự kiện vào bảng notifications
                │                              ▼
                ├─► Edge Function "payments" ◄── VNPay IPN / MoMo IPN / SePay webhook (kiểm chữ ký)
                │        │ tạo link thanh toán (ký HMAC bằng khóa bí mật, khóa chỉ nằm trên máy chủ)
                │        ▼
                └── VNPay / MoMo ──(khách trả tiền)──► quay về ket-qua-thanh-toan.html

pg_cron (mỗi phút) ──► Edge Function "notify" ──► Zalo Bot · Telegram · Email (Resend) · Zalo ZNS
                         đọc hàng đợi, gửi, lỗi thì tự thử lại 6 lần (2 → 64 phút), không gửi trùng

GitHub Actions (mỗi lần push + 6 giờ/lần) ──► tools/prerender.mjs ──► GitHub Pages
```

| Thành phần | File |
|---|---|
| Database: bảng `payments`, `notifications`, `integration_tokens`, hàm `payment_start / payment_confirm / payment_bank_transfer`, trigger thông báo | `supabase/migrations/20261012000001_payments_notify.sql` |
| Edge Function thanh toán | `supabase/functions/payments/` (VNPay 2.1.0, MoMo v2, SePay) |
| Edge Function thông báo | `supabase/functions/notify/` + `_shared/channels.ts` |
| Lịch gửi thông báo | `supabase/setup/cron.sql` |
| Website: thanh toán | `frontend/assets/js/core/payments.js`, `ket-qua-thanh-toan.html` |
| Website: SEO | `frontend/assets/js/seo-config.js`, `tools/prerender.mjs`, `.github/workflows/deploy.yml` |
| Quản trị | Đơn hàng → mục "Giao dịch thanh toán"; menu **Nhật ký thông báo**; Cài đặt → **Tài khoản nhận chuyển khoản** |

## 3. Cài đặt từng bước

### Bước 1: Cập nhật database (5 phút)

Supabase → *SQL Editor* → dán và chạy lần lượt `supabase/migrations/20261012000001_payments_notify.sql` rồi `20261013000001_fixes.sql`.
(Dùng CLI: `supabase db push`.)

### Bước 2: Tài khoản nhận chuyển khoản (2 phút)

Trang quản trị → **Cài đặt cửa hàng** → mục *Tài khoản nhận chuyển khoản*: ngân hàng, **mã BIN** (Vietcombank 970436, Techcombank 970407, MB 970422, ACB 970416, BIDV 970418, VietinBank 970415, VPBank 970432), số tài khoản, tên chủ tài khoản (không dấu). Lưu là mã QR trên website và email đổi theo.

### Bước 3: Deploy Edge Functions (10 phút)

Cài [Supabase CLI](https://supabase.com/docs/guides/cli) trên máy tính, rồi trong thư mục repo:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>          # mã project, phần đầu https://<PROJECT_REF>.supabase.co
supabase functions deploy payments --no-verify-jwt
supabase functions deploy notify --no-verify-jwt
```

`--no-verify-jwt` là bắt buộc: VNPay, MoMo, SePay, pg_cron gọi vào không có JWT của Supabase. Mỗi function tự kiểm tra **chữ ký HMAC** (VNPay/MoMo) hoặc **khóa bí mật** (SePay, notify).

### Bước 4: Khai báo khóa bí mật

Đặt bằng `supabase secrets set TEN=giatri` (hoặc *Dashboard → Edge Functions → Secrets*). Chỉ khai báo kênh nào dùng. **Không** dán các khóa này vào website hay commit lên GitHub.

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `SITE_URL` | Có | Địa chỉ website, vd `https://thanhhieu599.github.io/dien-lanh-web/frontend/` (cổng trả khách về `ket-qua-thanh-toan.html` tại đây) |
| `ADMIN_URL` | Không | Mặc định suy ra từ `SITE_URL` (`.../admin/`) |
| **VNPay** | | |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Để bật VNPay | Mã website & chuỗi bí mật VNPay cấp |
| `VNPAY_URL` | Khi chạy thật | Mặc định sandbox `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`; chạy thật dùng URL VNPay cấp trong hợp đồng |
| **MoMo** | | |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | Để bật MoMo | Lấy tại trang doanh nghiệp MoMo |
| `MOMO_ENDPOINT` | Khi chạy thật | Mặc định `https://test-payment.momo.vn`; chạy thật `https://payment.momo.vn` |
| `MOMO_REQUEST_TYPE` | Không | `captureWallet` (mặc định, quét QR ví MoMo) hoặc `payWithMethod` |
| **SePay** | | |
| `SEPAY_API_KEY` | Để tự xác nhận chuyển khoản | Khóa tự đặt, khai báo giống hệt bên SePay |
| **Thông báo** | | |
| `NOTIFY_SECRET` | Có | Chuỗi ngẫu nhiên dài (vd `openssl rand -hex 24`), dùng trong `cron.sql` |
| `ZALO_BOT_TOKEN`, `ZALO_BOT_CHAT_IDS` | Zalo nhân viên | Token bot; danh sách chat_id cách nhau dấu phẩy |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS` | Không | Kênh dự phòng |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email | vd `EMAIL_FROM="D&T Điện Lạnh <don-hang@trangthietbi.vn>"` |
| `STAFF_EMAILS` | Email nhân viên | vd `sales@trangthietbi.vn,ceo@trangthietbi.vn` |
| `EMAIL_REPLY_TO` | Không | Địa chỉ nhận khi khách bấm "Trả lời" email xác nhận |
| `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_REFRESH_TOKEN` | ZNS | App Zalo liên kết OA; refresh token lần đầu (hệ thống tự làm mới, lưu trong database) |
| `ZNS_TEMPLATE_ORDER`, `ZNS_TEMPLATE_STATUS`, `ZNS_TEMPLATE_PAID` | ZNS | ID mẫu đã duyệt: xác nhận đơn / đổi trạng thái / đã thanh toán (để trống mẫu nào thì không gửi mẫu đó) |
| `ZNS_TEMPLATE_CART`, `ZNS_PARAMS_CART` | ZNS | (Tùy chọn) mẫu nhắc giỏ hàng bỏ dở; tham số mặc định `customer_name,total` (có thêm `product_name`, `item_count`). Để trống = chỉ nhắc qua email + báo nhân viên gọi |
| `ZNS_PARAMS` | Không | Tên tham số gửi vào mẫu, mặc định `customer_name,order_code,order_date,total,status`. Có thêm: `payment_status`, `payment_method` |

### Bước 5: Cổng VNPay

1. Đăng ký tài khoản thử nghiệm: https://sandbox.vnpayment.vn/devreg/ → nhận `vnp_TmnCode`, `vnp_HashSecret` qua email.
2. **IPN URL** (VNPay gọi về khi khách trả tiền xong): `https://<PROJECT_REF>.supabase.co/functions/v1/payments/vnpay-ipn`. Gửi URL này cho VNPay (sandbox) hoặc khai báo trong trang quản trị merchant (thật).
3. Đặt secrets `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`. Mở website → đặt đơn chọn "Thẻ ATM / Visa…" → sang trang VNPay sandbox, thanh toán bằng thẻ test ngân hàng NCB (thông tin thẻ test VNPay gửi kèm email đăng ký / trang tài liệu sandbox).
4. Ký hợp đồng chạy thật → đổi `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`.

### Bước 6: Ví MoMo

1. Đăng ký doanh nghiệp tại https://business.momo.vn → nhận `partnerCode`, `accessKey`, `secretKey` (môi trường test & thật).
2. Đặt các secrets `MOMO_*`. IPN URL được gửi tự động kèm mỗi giao dịch (`.../functions/v1/payments/momo-ipn`), không cần khai báo.

### Bước 7: Tự xác nhận chuyển khoản (SePay)

1. Đăng ký https://sepay.vn, liên kết tài khoản ngân hàng nhận tiền (đúng tài khoản ở Bước 2).
2. *Webhooks → Thêm webhook*: URL `https://<PROJECT_REF>.supabase.co/functions/v1/payments/sepay`, sự kiện **Tiền vào**, xác thực **API Key** = giá trị `SEPAY_API_KEY`.
3. Thử: chuyển 1 khoản nhỏ với nội dung là một mã đơn `DT…` → đơn chuyển "Thanh toán một phần"/"Đã thanh toán", nhân viên nhận tin Zalo.

Nội dung chuyển khoản chỉ cần **chứa** mã đơn (ngân hàng thêm chữ trước/sau vẫn nhận ra). Khách chuyển nhiều lần thì cộng dồn.

### Bước 8: Thông báo cho nhân viên qua Zalo Bot (miễn phí)

1. Vào https://bot.zaloplatforms.com bằng tài khoản Zalo của công ty → tạo bot → lấy **token** dạng `123456789:abc...`.
2. Từng nhân viên (sales, kho, kế toán) mở bot trên Zalo và nhắn một tin bất kỳ.
3. Lấy chat_id:
   ```bash
   curl -s -X POST https://bot-api.zaloplatforms.com/bot<TOKEN>/getUpdates
   ```
   Trong kết quả, mỗi tin có `"chat": {"id": "..."}`. Ghép các id: `ZALO_BOT_CHAT_IDS=id1,id2`.
4. Đặt `ZALO_BOT_TOKEN`, `ZALO_BOT_CHAT_IDS`.

### Bước 9: Email (Resend)

1. Đăng ký https://resend.com → *Domains* → thêm `trangthietbi.vn`, khai báo các bản ghi DNS (SPF, DKIM) Resend đưa ra tại nơi quản lý tên miền. Domain có xác thực thì email ít vào spam.
2. *API Keys* → tạo khóa → `RESEND_API_KEY`. Đặt `EMAIL_FROM`, `STAFF_EMAILS`.

### Bước 10: Zalo ZNS cho khách (tùy chọn, tính phí theo tin)

1. Cần **Zalo Official Account đã xác thực** và ứng dụng tại https://developers.zalo.me liên kết với OA, cấp quyền gửi ZNS.
2. Đăng ký mẫu tin trong *ZBS Template* (Zalo duyệt 1–2 ngày làm việc). Đặt tên tham số trong mẫu trùng với `ZNS_PARAMS`, ví dụ mẫu xác nhận đơn:
   > Cảm ơn <customer_name> đã đặt hàng tại D&T Điện Lạnh. Mã đơn <order_code> ngày <order_date>, tổng tiền <total>. Trạng thái: <status>.
3. Lấy refresh token lần đầu (công cụ *API Explorer* của Zalo, chọn OA) → `ZALO_OA_REFRESH_TOKEN`. Hệ thống tự đổi access token (sống 25 giờ) và lưu refresh token mới vào bảng `integration_tokens`.
4. Đặt `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZNS_TEMPLATE_*`.

### Bước 11: Bật lịch gửi thông báo

Mở `supabase/setup/cron.sql`, thay `<PROJECT_REF>` và `<NOTIFY_SECRET>`, chạy trong SQL Editor (một lần). Kiểm tra các kênh:

```bash
curl -s -X POST https://<PROJECT_REF>.supabase.co/functions/v1/notify/test -H "x-notify-secret: <NOTIFY_SECRET>"
# {"channels":{...},"results":{"zalo_staff":"ok","email_staff":"ok"}}
```

Theo dõi trong trang quản trị → **Nhật ký thông báo** (kênh lỗi hiện đỏ, di chuột xem lý do, bấm "Gửi lại").

### Bước 12: Đăng website bản SEO

1. GitHub → repo → *Settings → Pages → Build and deployment → Source* = **GitHub Actions** (thay cho "Deploy from a branch").
2. Push lên `main` (hoặc *Actions → Deploy website → Run workflow*). Workflow dựng ~120 trang (khoảng 3–5 phút kể cả cài đặt), tự kiểm tra bằng trình duyệt rồi mới đăng.
3. Website tự build lại **6 giờ/lần** để cập nhật giá, tồn kho, sản phẩm mới từ Supabase. Sửa giá cần lên ngay thì bấm *Run workflow*. Sản phẩm mới thêm chưa kịp build vẫn mở được (tự chuyển về trang động).
4. Có tên miền riêng: sửa `siteUrl` trong `frontend/assets/js/seo-config.js` **và** đặt biến *Settings → Secrets and variables → Actions → Variables* `SITE_URL`.
5. Google Search Console (https://search.google.com/search-console): thêm website, gửi sitemap `.../frontend/sitemap.xml`. Làm tương tự với Bing Webmaster Tools (Bing cấp dữ liệu cho nhiều công cụ AI).

Lưu ý: GitHub tự tắt lịch chạy định kỳ nếu repo không có commit nào trong 60 ngày → vào tab *Actions* bật lại.

## 4. Vận hành hằng ngày

- **Đơn thanh toán online**: cột "Thanh toán" trong danh sách đơn hiện *Đã thanh toán*; mở đơn xem mục **Giao dịch thanh toán** (cổng, mã giao dịch, thời điểm) để đối soát với sao kê VNPay/MoMo/ngân hàng.
- **Khách hủy đơn đã thanh toán**: website không cho khách tự hủy (yêu cầu gọi hotline). Nhân viên hủy trong trang quản trị → hoàn tiền thủ công trên cổng VNPay/MoMo hoặc chuyển khoản lại → đổi trạng thái thanh toán sang *Đã hoàn tiền*. Hệ thống nhắc qua Zalo khi đơn đã trả tiền bị hủy.
- **Chuyển khoản thiếu**: đơn ở trạng thái *Thanh toán một phần*, nhân viên nhận tin "CHUYỂN KHOẢN THIẾU".
- **Đổi trạng thái đơn** trong quản trị → khách tự nhận email/ZNS (xác nhận, đang giao, đang lắp đặt, hoàn thành, đã hủy).

## 5. Kiểm thử

```bash
# Database (PostgreSQL 15+): 20 nhóm kiểm thử
PGHOST=localhost PGUSER=postgres ./supabase/tests/run-local.sh

# Edge Functions: chữ ký VNPay/MoMo đối chiếu với code mẫu chính thức, IPN, SePay, hàng đợi thông báo (16 bài)
PGHOST=localhost PGUSER=postgres ./supabase/functions/tests/run.sh

# Trình duyệt thật: đặt hàng → VNPay/MoMo/chuyển khoản → kết quả (24 kiểm tra)
npm install && PGHOST=localhost PGUSER=postgres node --experimental-strip-types tests/browser/payments.test.ts

# Website & quản trị trên database thật (REST/đăng nhập giả lập Supabase, RLS thật): mọi luồng mua hàng, tài khoản,
# form, đơn hàng, CRM, sản phẩm, phân quyền nhân viên/quản trị, báo cáo >1000 đơn, hết phiên đăng nhập
PGHOST=localhost PGUSER=postgres node --experimental-strip-types tests/browser/site.test.ts
PGHOST=localhost PGUSER=postgres node --experimental-strip-types tests/browser/admin.test.ts
# Chế độ demo + giao diện điện thoại
node tests/browser/demo.test.mjs

# Bản build SEO
npm run build && node tests/browser/prerender.test.mjs dist
```

Workflow `.github/workflows/test.yml` chạy toàn bộ kiểm thử trên GitHub mỗi lần push.

## 6. Bảo mật

- Khóa VNPay/MoMo/SePay/Zalo/Resend chỉ nằm trong *Supabase Secrets*, không có trên website.
- Mọi kết quả thanh toán đều kiểm chữ ký HMAC (SHA512 với VNPay, SHA256 với MoMo) và **so số tiền với database** trước khi ghi nhận; IPN gửi lặp không ghi trùng.
- Website (khóa anon) không gọi được các hàm thanh toán / hàng đợi; chỉ Edge Function (service_role) gọi được. Bảng token Zalo chỉ service_role đọc được.
- Khách tra cứu / thanh toán lại phải có đúng **mã đơn + số điện thoại**.


## Công cụ tăng chuyển đổi (bổ sung)

| Tính năng | Ở đâu | Dữ liệu đi về đâu |
|---|---|---|
| **Nhận báo giá doanh nghiệp** | Nút trên trang sản phẩm, link "nhận báo giá riêng", ô "Khách hàng doanh nghiệp"; giỏ hàng từ 3 sản phẩm / 30 triệu: báo giá cả giỏ | Lead loại "Báo giá dự án (B2B)" kèm mã SP + số lượng → CRM + thông báo nhân viên |
| **Khung chat** | Nút chat nổi mọi trang: Zalo, Messenger (Quản trị › Cài đặt › Link Messenger), gọi hotline, để lại số gọi lại | Lead "Liên hệ" (nhu cầu, trang đang xem). Ngoài giờ (Cài đặt › Giờ mở / đóng cửa) tự hẹn "gọi lại trước 9h sáng mai" |
| **Tính công suất máy lạnh** | `tinh-cong-suat-may-lanh.html` (link ở danh mục máy lạnh, trang SP máy lạnh, chân trang, menu điện thoại) | Gợi ý HP + sản phẩm; form khảo sát → lead "Dịch vụ" kèm kết quả tính. Có FAQ (dữ liệu có cấu trúc) cho SEO |
| **Combo mua kèm** | Trang SP máy lạnh: ống đồng / giá đỡ / ống thoát nước theo công suất; giỏ hàng: gợi ý phụ kiện còn thiếu | Quy tắc ở `DT.bundleRules` (frontend/assets/js/data/content.js) theo mã SKU |
| **Nhắc giỏ hàng bỏ dở** | Trang thanh toán (chỉ khi đã kết nối Supabase): khách tick "Nhắc tôi…" + nhập SĐT | Hàng đợi `notifications` sự kiện `cart_reminder`, gửi sau 2 giờ: email khách (nếu có), ZNS (nếu có mẫu), báo nhân viên gọi chốt đơn. Khách đặt hàng → tự hủy |

Lưu ý: tin nhắn trả lời tự động **trong Zalo OA / Facebook Messenger** cài trong trang quản lý của Zalo OA / Meta Business Suite (Tin nhắn tự động / Trả lời ngoài giờ), không nằm trong mã nguồn website.
