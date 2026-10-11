// Đo lường: Google Analytics 4 + Meta (Facebook) Pixel, nguồn khách (UTM) cho lead & đơn hàng.
//  - Mã đo lường nhập trong Quản trị › Cài đặt cửa hàng (ga4Id, metaPixelId); bản tĩnh không có database
//    thì đặt trong seo-config.js. Không có mã -> không tải script nào, không hiện hộp cookie.
//  - Hộp đồng ý cookie (Nghị định 13/2023): GA4 chạy chế độ đồng ý (Consent Mode v2) – chưa đồng ý thì
//    không ghi cookie; Meta Pixel chỉ tải sau khi khách bấm "Đồng ý".
//  - Sự kiện: view_item, add_to_cart, begin_checkout, purchase, generate_lead, search, contact (bấm gọi / Zalo)
//    gửi song song GA4 (tên chuẩn thương mại điện tử) và Pixel (ViewContent, AddToCart, InitiateCheckout,
//    Purchase, Lead, Search, Contact) -> GA4 / Ads Manager tính được doanh thu & ROAS theo chiến dịch.
//  - Nguồn khách (utm_*, gclid, fbclid, trang giới thiệu) lưu trên trình duyệt 30 ngày, gắn vào lead
//    và đơn hàng để xem trong Quản trị › Báo cáo › Hiệu quả theo nguồn (không phụ thuộc cookie quảng cáo).
window.DT = window.DT || {};

DT.analytics = (() => {
  const ATTR_KEY = 'dt_attr_v1';
  const CONSENT_KEY = 'dt_consent_v1';
  const SENT_KEY = 'dt_purchase_sent_v1';
  const DAYS = 30;
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* chế độ ẩn danh */ } },
  };

  // ---------------------------------------------------------------- Nguồn khách
  const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|coccoc|yandex|baidu)\./;
  const SOCIAL = { facebook: /(^|\.)(facebook|fb)\.com$|(^|\.)fb\.me$|messenger\.com$/, zalo: /(^|\.)zalo\.(me|vn)$|zaloapp\.com$/, youtube: /(^|\.)youtube\.com$|youtu\.be$/, tiktok: /(^|\.)tiktok\.com$/, instagram: /(^|\.)instagram\.com$/, linkedin: /(^|\.)linkedin\.com$|lnkd\.in$/ };
  function detect() {
    const q = new URLSearchParams(location.search);
    const v = (k) => (q.get(k) || '').trim().slice(0, 150);
    const a = { source: v('utm_source'), medium: v('utm_medium'), campaign: v('utm_campaign'), term: v('utm_term'), content: v('utm_content'), gclid: v('gclid'), fbclid: v('fbclid') };
    let host = '';
    try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch { /* bỏ qua */ }
    if (host && host === location.hostname.replace(/^www\./, '')) host = '';  // điều hướng nội bộ
    if (!a.source) {
      if (a.gclid) Object.assign(a, { source: 'google', medium: 'cpc' });
      else if (a.fbclid) Object.assign(a, { source: 'facebook', medium: a.medium || 'social' });
      else if (host) {
        const social = Object.keys(SOCIAL).find((k) => SOCIAL[k].test(host));
        const search = host.match(SEARCH);
        if (search) Object.assign(a, { source: search[2], medium: 'organic' });
        else if (social) Object.assign(a, { source: social, medium: 'social' });
        else Object.assign(a, { source: host, medium: 'referral' });
      }
    }
    if (!a.source) return null;   // truy cập trực tiếp: giữ nguồn trước đó
    if (!a.medium) a.medium = '(none)';
    a.referrer = host;
    a.landing = location.pathname.split('/').pop() || 'index.html';
    a.at = new Date().toISOString();
    Object.keys(a).forEach((k) => { if (!a[k]) delete a[k]; });
    return a;
  }
  // Lần truy cập có nguồn mới (quảng cáo, tìm kiếm, mạng xã hội) ghi đè; vào trực tiếp thì giữ nguồn cũ trong 30 ngày
  (() => {
    const now = detect();
    if (now) ls.set(ATTR_KEY, now);
  })();
  function attribution() {
    const a = ls.get(ATTR_KEY);
    if (!a || !a.at || Date.now() - new Date(a.at).getTime() > DAYS * 864e5) return null;
    const { at, ...rest } = a;
    return rest;
  }
  // Chuỗi ngắn gắn vào lead: "google / cpc / he-2026"
  const label = (a = attribution()) => (a ? [a.source, a.medium, a.campaign].filter(Boolean).join(' / ') : '');

  // ---------------------------------------------------------------- Cấu hình
  const ids = () => {
    const c = DT.config || {}; const s = DT.SEO || {};
    const ga = String(c.ga4Id || s.ga4Id || '').trim().toUpperCase();
    const px = String(c.metaPixelId || s.metaPixelId || '').trim();
    return { ga: /^G-[A-Z0-9]{4,20}$/.test(ga) ? ga : '', px: /^\d{6,20}$/.test(px) ? px : '' };
  };
  const askConsent = () => (DT.config?.cookieConsent ?? DT.SEO?.cookieConsent ?? true) !== false;
  const consent = () => (askConsent() ? ls.get(CONSENT_KEY)?.v || null : 'granted');

  let ready = false; let gaOn = false; let pxOn = false;
  const queue = [];

  function script(src) {
    const s = document.createElement('script');
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }
  function startGa(id) {
    if (gaOn) return;
    gaOn = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    const g = consent() === 'granted' ? 'granted' : 'denied';
    window.gtag('consent', 'default', { analytics_storage: g, ad_storage: g, ad_user_data: g, ad_personalization: g, wait_for_update: 500 });
    window.gtag('js', new Date());
    window.gtag('config', id, { currency: 'VND' });
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  }
  function startPixel(id) {
    if (pxOn || consent() !== 'granted') return;
    pxOn = true;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  // ---------------------------------------------------------------- Gửi sự kiện
  const PIXEL = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', generate_lead: 'Lead', search: 'Search', contact: 'Contact' };
  function send(name, ga, px, opts) {
    if (gaOn && window.gtag) window.gtag('event', name, ga);
    if (pxOn && window.fbq && PIXEL[name]) window.fbq('track', PIXEL[name], px, opts?.eventID ? { eventID: opts.eventID } : undefined);
    DT.analytics.log.push([name, ga]);
    document.dispatchEvent(new CustomEvent('dt:track', { detail: { name, ga, px } }));
  }
  function track(name, ga = {}, px = {}, opts) {
    if (!ready) { queue.push([name, ga, px, opts]); return; }
    if (!gaOn && !pxOn) return;
    send(name, ga, px, opts);
  }
  const item = (p, qty = 1) => ({
    item_id: p.sku || String(p.id), item_name: p.name, price: Number(p.price) || 0, quantity: qty,
    item_category: (DT.categories || []).find((c) => c.id === p.cat)?.name || p.cat || '',
  });

  const api = {
    log: [],
    attribution, label, consent,
    enabled: () => gaOn || pxOn,
    track,
    viewItem(p) {
      if (!p) return;
      track('view_item', { currency: 'VND', value: Number(p.price) || 0, items: [item(p)] },
        { content_ids: [p.sku || String(p.id)], content_name: p.name, content_type: 'product', value: Number(p.price) || 0, currency: 'VND' });
    },
    addToCart(p, qty = 1) {
      if (!p) return;
      track('add_to_cart', { currency: 'VND', value: (Number(p.price) || 0) * qty, items: [item(p, qty)] },
        { content_ids: [p.sku || String(p.id)], content_name: p.name, content_type: 'product', value: (Number(p.price) || 0) * qty, currency: 'VND' });
    },
    beginCheckout(t) {
      if (!t?.lines?.length) return;
      track('begin_checkout', { currency: 'VND', value: t.total, coupon: t.coupon?.code, items: t.lines.map((l) => item(l.product, l.qty)) },
        { content_ids: t.lines.map((l) => l.product.sku || String(l.id)), content_type: 'product', num_items: t.lines.reduce((s, l) => s + l.qty, 0), value: t.total, currency: 'VND' });
    },
    // Mỗi đơn chỉ ghi nhận 1 lần trên 1 trình duyệt (tải lại trang thành công không đếm trùng)
    purchase(o) {
      if (!o?.code) return false;
      const sent = ls.get(SENT_KEY) || [];
      if (sent.includes(o.code)) return false;
      if (!ready || (!gaOn && !pxOn)) { if (ready) return false; queue.push(['__purchase', o]); return true; }
      const items = (o.items || []).map((i) => { const p = DT.api?.productById?.(i.id) || {}; return { ...item({ ...p, ...i, sku: i.sku || p.sku }, i.qty), price: Number(i.price) || 0 }; });
      send('purchase', {
        transaction_id: o.code, currency: 'VND', value: Number(o.total) || 0, shipping: Number(o.shippingFee) || 0,
        coupon: o.coupon || undefined, payment_type: o.payment, items,
      }, { content_ids: items.map((i) => i.item_id), content_type: 'product', num_items: items.reduce((s, i) => s + i.quantity, 0), value: Number(o.total) || 0, currency: 'VND', order_id: o.code }, { eventID: o.code });
      ls.set(SENT_KEY, [o.code, ...sent].slice(0, 30));
      return true;
    },
    lead(type, data = {}) {
      const value = type === 'b2b-quote' ? 1 : 0;
      track('generate_lead', { lead_type: type, currency: 'VND', value, ...(data.service ? { service: data.service } : {}) },
        { content_name: type, content_category: data.service || data.projectType || '', currency: 'VND', value });
    },
    search(q) { if (q) track('search', { search_term: q }, { search_string: q }); },
    setConsent(v) {
      ls.set(CONSENT_KEY, { v, at: new Date().toISOString() });
      document.querySelector('.cookie-bar')?.remove();
      const { ga, px } = ids();
      if (gaOn && window.gtag) {
        const g = v === 'granted' ? 'granted' : 'denied';
        window.gtag('consent', 'update', { analytics_storage: g, ad_storage: g, ad_user_data: g, ad_personalization: g });
      }
      if (v === 'granted' && px) startPixel(px);
      if (v !== 'granted' && pxOn && window.fbq) window.fbq('consent', 'revoke');
      if (ga && !gaOn) startGa(ga);
    },
  };

  // ---------------------------------------------------------------- Hộp đồng ý cookie
  function banner() {
    if (!askConsent() || consent() || document.querySelector('.cookie-bar')) return;
    const policy = DT.api?.policyUrl ? DT.api.policyUrl('bao-mat') : 'chinh-sach.html?type=bao-mat';
    const el = document.createElement('div');
    el.className = 'cookie-bar';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Đồng ý sử dụng cookie');
    el.innerHTML = `<p>Chúng tôi dùng cookie để đo lường lượt truy cập và hiệu quả quảng cáo, giúp cải thiện dịch vụ. Bạn có thể từ chối mà vẫn mua hàng bình thường. <a class="link" href="${policy}">Chính sách bảo mật</a></p>
      <div class="cookie-btns"><button type="button" class="btn btn-light btn-sm" data-consent="denied">Từ chối</button><button type="button" class="btn btn-primary btn-sm" data-consent="granted">Đồng ý</button></div>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-consent]'); if (b) api.setConsent(b.dataset.consent); });
    document.body.appendChild(el);
  }

  function init() {
    if (ready) return;
    ready = true;
    const { ga, px } = ids();
    if (ga) startGa(ga);
    if (px) startPixel(px);
    if (ga || px) banner();
    queue.splice(0).forEach(([n, a, b, o]) => (n === '__purchase' ? api.purchase(a) : track(n, a, b, o)));
  }

  // Bấm gọi điện / Zalo / Messenger = khách liên hệ (đo được cả khách không điền form)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const method = href.startsWith('tel:') ? 'phone' : /zalo\.me/.test(href) ? 'zalo' : /m\.me\/|messenger\.com/.test(href) ? 'messenger' : '';
    if (method) track('contact', { method, link_url: href.slice(0, 100) }, { content_name: method });
  });

  return Object.assign(api, { init, ids });
})();

DT.track = DT.analytics.track;

// Gắn đo lường vào các hành động có sẵn (không phải sửa từng trang)
(() => {
  const A = DT.analytics;
  if (DT.store?.addToCart) {
    const add = DT.store.addToCart;
    DT.store.addToCart = (id, qty = 1, opts) => {
      const ok = add(id, qty, opts);
      if (ok) A.addToCart(DT.api.productById(id), qty);
      return ok;
    };
  }
  if (DT.saveLead) {
    const save = DT.saveLead;
    DT.saveLead = async (type, data = {}) => {
      const src = A.label();
      const lead = await save(type, src && !data.src ? { ...data, src } : data);
      A.lead(type, data);
      return lead;
    };
  }
  DT.onReady(() => {
    A.init();
    const page = document.body.dataset.page;
    if (page === 'search') A.search((DT.u.param('q') || '').trim());
    if (page === 'checkout') A.beginCheckout(DT.store.totals());
    if (page === 'success') A.purchase(DT.store.findOrder(DT.u.param('code') || ''));
  });
})();
