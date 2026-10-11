// Thành phần giao diện quản trị: định dạng, nhãn trạng thái, bảng, form tự sinh, modal, CSV.
window.AD = window.AD || {};

AD.ORDER_STATUS = {
  pending: ['Chờ xác nhận', 'warn'], confirmed: ['Đã xác nhận', 'info'], shipping: ['Đang giao', 'info'],
  installing: ['Đang lắp đặt', 'info'], done: ['Hoàn thành', 'ok'], cancelled: ['Đã hủy', 'muted'],
};
AD.PAY_STATUS = { unpaid: ['Chưa thanh toán', 'warn'], partial: ['Thanh toán một phần', 'warn'], paid: ['Đã thanh toán', 'ok'], refunded: ['Đã hoàn tiền', 'muted'] };
AD.PAYMENT = { cod: 'COD', bank: 'Chuyển khoản', card: 'Thẻ (VNPay)', wallet: 'Ví MoMo', installment: 'Trả góp' };
AD.PAY_PROVIDER = { vnpay: 'VNPay', momo: 'MoMo', bank: 'Chuyển khoản (SePay)' };
AD.TXN_STATUS = { pending: ['Đang chờ', 'warn'], paid: ['Thành công', 'ok'], failed: ['Thất bại', 'muted'], expired: ['Hết hạn', 'muted'] };
// Ngày hôm nay theo giờ máy (Việt Nam), dạng YYYY-MM-DD (toISOString() là giờ UTC: 0h-7h sáng bị lùi 1 ngày)
AD.today = () => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
// Sản phẩm theo id: ưu tiên dữ liệu database (kể cả sản phẩm tạo trong quản trị), không có thì catalog mẫu
AD.product = (id) => AD.cache?.productMap?.get(String(id)) || DT.api.productById(Number(id)) || null;
AD.NOTIFY_EVENT = { order_new: 'Đơn mới', order_status: 'Đổi trạng thái đơn', order_paid: 'Thanh toán', lead_new: 'Khách hàng tiềm năng', cart_reminder: 'Nhắc giỏ hàng bỏ dở', maintenance_reminder: 'Nhắc bảo trì định kỳ' };
AD.NOTIFY_STATUS = { pending: ['Chờ gửi', 'warn'], processing: ['Đang gửi', 'info'], done: ['Đã gửi', 'ok'], failed: ['Lỗi', 'danger'] };
AD.NOTIFY_CHANNEL = { zalo_staff: 'Zalo nhân viên', telegram_staff: 'Telegram', email_staff: 'Email nhân viên', email_customer: 'Email khách', zns_customer: 'Zalo ZNS khách' };
AD.LEAD_STATUS = {
  new: ['Mới', 'warn'], contacted: ['Đã liên hệ', 'info'], quoted: ['Đã báo giá', 'info'],
  won: ['Chốt đơn', 'ok'], lost: ['Thất bại', 'muted'], spam: ['Spam', 'muted'],
};
AD.LEAD_TYPE = { 'b2b-quote': 'Báo giá dự án', service: 'Đặt lịch dịch vụ', contact: 'Liên hệ', newsletter: 'Nhận tin' };
AD.REVIEW_STATUS = { pending: ['Chờ duyệt', 'warn'], approved: ['Đã duyệt', 'ok'], rejected: ['Từ chối', 'muted'] };

AD.ui = (() => {
  const esc = DT.u.esc;
  const money = (n) => (n == null || n === '' ? '-' : DT.u.money(Number(n)));
  const dt = (s) => (s ? new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '-');
  const d = (s) => (s ? new Date(s).toLocaleDateString('vi-VN') : '-');
  const badge = (map, k) => { const [l, c] = map[k] || [k, 'muted']; return `<span class="st st-${c}">${esc(l)}</span>`; };
  const ic = (n) => DT.icon(n);

  // ---------- Modal / xác nhận
  function modal(html, { wide = false, onClose } = {}) {
    closeModal();
    const el = document.createElement('div');
    el.className = 'ad-modal-wrap';
    el.innerHTML = `<div class="ad-modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="ad-x" data-close aria-label="Đóng">${ic('close')}</button>${html}</div>`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) { closeModal(); onClose?.(); } });
    document.body.appendChild(el);
    return el.querySelector('.ad-modal');
  }
  const closeModal = () => document.querySelectorAll('.ad-modal-wrap').forEach((m) => m.remove());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  function confirm(msg, { ok = 'Đồng ý', danger = false } = {}) {
    return new Promise((resolve) => {
      const m = modal(`<h3>Xác nhận</h3><p>${msg}</p><div class="ad-actions"><button class="btn btn-light" data-close>Hủy</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cf-ok">${ok}</button></div>`, { onClose: () => resolve(false) });
      m.querySelector('#cf-ok').onclick = () => { closeModal(); resolve(true); };
    });
  }
  const toast = (m, t) => DT.u.toast(m, t);  // DT.u.toast tự hiển thị dạng chữ

  // Chạy thao tác async, khóa nút, báo lỗi
  async function run(btn, fn, okMsg) {
    if (btn) { if (btn.disabled) return; btn.disabled = true; }
    // Trả về kết quả, hoặc undefined nếu lỗi (đã báo lỗi cho người dùng)
    try { const r = await fn(); if (okMsg) toast(okMsg); return r === undefined ? true : r; } catch (e) { if (!AD.handleError?.(e)) toast(e.message, 'error'); return undefined; } finally { if (btn) btn.disabled = false; }
  }

  // ---------- Bảng
  function table(columns, rows, { rowHref, empty = 'Chưa có dữ liệu' } = {}) {
    if (!rows.length) return `<div class="ad-empty">${ic('search')}<p>${empty}</p></div>`;
    return `<div class="ad-table-wrap"><table class="ad-table"><thead><tr>${columns.map((c) => `<th class="${c.cls || ''}">${c.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr ${rowHref ? `data-href="${rowHref(r)}" class="clickable"` : ''}>${columns.map((c) => `<td class="${c.cls || ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(r[c.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a,button,input,select,label')) location.hash = tr.dataset.href;
  });

  function pager(page, total, size) {
    const pages = Math.max(1, Math.ceil(total / size));
    return `<div class="ad-pager"><span>${total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} / ${total}` : '0 kết quả'}</span>
      <button class="btn btn-light btn-sm" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${ic('left')}</button>
      <span>Trang ${page}/${pages}</span>
      <button class="btn btn-light btn-sm" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>${ic('right')}</button></div>`;
  }

  // ---------- Form tự sinh theo cấu hình trường
  // type: text | textarea | html | number | money | bool | select | json | lines | tags | kv | datetime | date | readonly | image | gallery | custom
  function field(f, v, ctx = {}) {
    const id = `f-${f.key}`;
    const req = f.required ? ' <span class="req">*</span>' : '';
    const help = f.help ? `<small class="help">${f.help}</small>` : '';
    const dis = f.readonly || (f.readonlyOnEdit && ctx.editing) ? 'disabled' : '';
    const opts = typeof f.options === 'function' ? f.options(ctx) : f.options || [];
    let input;
    switch (f.type) {
      case 'textarea': case 'html':
        input = `<textarea id="${id}" name="${f.key}" rows="${f.rows || (f.type === 'html' ? 10 : 3)}" ${dis}>${esc(v ?? '')}</textarea>`; break;
      case 'number': case 'money':
        input = `<input id="${id}" name="${f.key}" type="number" step="${f.step || (f.type === 'money' ? 1000 : 'any')}" value="${v ?? ''}" ${dis}>`; break;
      case 'bool':
        return `<label class="ad-check ${f.col || ''}"><input type="checkbox" name="${f.key}" ${v ? 'checked' : ''} ${dis}> <span>${f.label}</span>${help}</label>`;
      case 'select':
        input = `<select id="${id}" name="${f.key}" ${dis}>${f.required ? '' : '<option value="">-- Chọn --</option>'}${opts.map((o) => {
          const [ov, ol] = Array.isArray(o) ? o : [o, o];
          return `<option value="${esc(ov)}" ${String(v ?? '') === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`;
        }).join('')}</select>`; break;
      case 'json':
        input = `<textarea id="${id}" name="${f.key}" rows="${f.rows || 6}" class="mono" ${dis}>${esc(JSON.stringify(v ?? f.empty ?? {}, null, 2))}</textarea>`; break;
      case 'lines':
        input = `<textarea id="${id}" name="${f.key}" rows="${f.rows || 4}" ${dis}>${esc((v || []).join('\n'))}</textarea>`; break;
      case 'tags':
        input = `<input id="${id}" name="${f.key}" value="${esc((v || []).join(', '))}" ${dis}>`; break;
      case 'kv':
        input = `<div class="ad-kv" data-kv="${f.key}">${Object.entries(v || {}).map(([k, x]) => kvRow(k, x)).join('')}${kvRow('', '')}</div>
          <button type="button" class="btn btn-light btn-sm" data-kv-add="${f.key}">${ic('plus')} Thêm dòng</button>`; break;
      case 'datetime':
        input = `<input id="${id}" name="${f.key}" type="datetime-local" value="${v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}" ${dis}>`; break;
      case 'date':
        input = `<input id="${id}" name="${f.key}" type="date" value="${v ? String(v).slice(0, 10) : ''}" ${dis}>`; break;
      case 'readonly':
        input = `<div class="ad-ro">${f.render ? f.render(v, ctx) : esc(v ?? '-')}</div>`; break;
      case 'image':
        input = imageInput(f.key, v, f.folder || 'media', dis); break;
      case 'gallery':
        input = galleryInput(f.key, (v || []).filter((x) => x && !String(x).startsWith('art:')), f.folder || 'media', f.max || 10); break;
      case 'custom':
        input = f.render(v, ctx); break;
      default:
        input = `<input id="${id}" name="${f.key}" value="${esc(v ?? '')}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${dis}>`;
    }
    return `<div class="ad-field ${f.col || ''}" data-field="${f.key}"><label for="${id}">${f.label}${req}</label>${input}${help}<div class="err"></div></div>`;
  }
  // Ô ảnh: tải ảnh lên (tự nén) hoặc dán link; giá trị lưu ở input ẩn name=key
  function imageInput(key, v, folder, dis = '') {
    return `<div class="ad-img" data-img-field="${esc(key)}" data-folder="${esc(folder)}">
      <span class="ad-img-prev">${v ? `<img src="${esc(v)}" alt="">` : `${ic('plus')}<small>Chưa có ảnh</small>`}</span>
      <span class="ad-img-act"><input type="hidden" name="${esc(key)}" value="${esc(v || '')}">
        <button type="button" class="btn btn-light btn-sm" data-img-pick ${dis}>${ic('plus')} ${v ? 'Thay ảnh' : 'Tải ảnh lên'}</button>
        ${v ? `<button type="button" class="btn btn-light btn-sm" data-img-clear ${dis}>${ic('trash')} Xóa</button>` : ''}
        <input type="file" accept="image/*" hidden></span>
    </div>`;
  }
  async function imagePicked(box, file) {
    box.classList.add('busy');
    try {
      const url = await AD.media.upload(file, box.dataset.folder);
      box.outerHTML = imageInput(box.dataset.imgField, url, box.dataset.folder);
    } catch (e) { if (!AD.handleError?.(e)) toast(e.message, 'error'); box.classList.remove('busy'); }
  }
  document.addEventListener('click', (e) => {
    const box = e.target.closest('[data-img-field]');
    if (!box) return;
    if (e.target.closest('[data-img-pick]')) box.querySelector('input[type=file]').click();
    if (e.target.closest('[data-img-clear]')) box.outerHTML = imageInput(box.dataset.imgField, '', box.dataset.folder);
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-img-field] input[type=file]');
    if (input?.files?.[0]) imagePicked(input.closest('[data-img-field]'), input.files[0]);
  });
  // Thư viện nhiều ảnh (ảnh sản phẩm): tải nhiều ảnh cùng lúc (tự nén), kéo thả, sắp xếp, xóa, dán link.
  // Ảnh đầu tiên là ảnh chính. Giá trị (mảng link) lưu ở input ẩn name=key dạng JSON.
  function galleryInput(key, list, folder, max) {
    return `<div class="ad-gal" data-gal="${esc(key)}" data-folder="${esc(folder)}" data-max="${max}">
      <input type="hidden" name="${esc(key)}" value="${esc(JSON.stringify(list))}">
      <div class="ad-gal-list">${list.map((u, i) => `<figure class="ad-gal-item" data-i="${i}">
          <img src="${esc(u)}" alt="Ảnh ${i + 1}" loading="lazy">${i === 0 ? '<span class="ad-gal-main">Ảnh chính</span>' : ''}
          <figcaption>
            <button type="button" class="btn btn-light btn-sm" data-gal-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Đưa lên trước" title="Đưa lên trước">${ic('left')}</button>
            <button type="button" class="btn btn-light btn-sm" data-gal-move="1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Đưa ra sau" title="Đưa ra sau">${ic('right')}</button>
            <button type="button" class="btn btn-light btn-sm txt-danger" data-gal-del aria-label="Xóa ảnh" title="Xóa ảnh">${ic('trash')}</button>
          </figcaption></figure>`).join('')}
        ${list.length < max ? `<button type="button" class="ad-gal-add" data-gal-pick>${ic('plus')}<b>Tải ảnh lên</b><small>Chọn hoặc kéo thả nhiều ảnh<br>JPG, PNG, WEBP – tự nén</small></button>` : ''}
      </div>
      <div class="ad-gal-url"><input type="url" placeholder="Hoặc dán link ảnh (https://…)" data-gal-url aria-label="Link ảnh"><button type="button" class="btn btn-light btn-sm" data-gal-addurl>${ic('plus')} Thêm link</button></div>
      <small class="help">${list.length}/${max} ảnh. Ảnh đầu tiên là ảnh chính (hiện ở danh sách, giỏ hàng, chia sẻ Zalo/Facebook). Nên dùng ảnh nền trắng, vuông, ≥ 800px.</small>
      <input type="file" accept="image/*" multiple hidden>
    </div>`;
  }
  const galList = (box) => { try { return JSON.parse(box.querySelector('input[type=hidden]').value || '[]'); } catch { return []; } };
  const galSet = (box, list) => { box.outerHTML = galleryInput(box.dataset.gal, list, box.dataset.folder, Number(box.dataset.max)); };
  async function galUpload(box, files) {
    const max = Number(box.dataset.max);
    const list = galList(box);
    const imgs = [...files].filter((f) => /^image\//.test(f.type));
    if (!imgs.length) { toast('Chỉ nhận file ảnh (JPG, PNG, WEBP)', 'error'); return; }
    const room = max - list.length;
    if (room <= 0) { toast(`Tối đa ${max} ảnh`, 'error'); return; }
    if (imgs.length > room) toast(`Chỉ thêm được ${room} ảnh nữa (tối đa ${max})`, 'error');
    const key = box.dataset.gal; const form = box.closest('form');
    box.classList.add('busy');
    const add = box.querySelector('[data-gal-pick] b');
    let done = 0;
    for (const f of imgs.slice(0, room)) {
      if (add) add.textContent = `Đang tải ${done + 1}/${Math.min(imgs.length, room)}…`;
      try { list.push(await AD.media.upload(f, box.dataset.folder, AD.db.mode === 'supabase' ? { max: 1600, quality: 0.85 } : { max: 900, quality: 0.72 })); done++; }
      catch (e) { if (AD.handleError?.(e)) return; toast(`${f.name}: ${e.message}`, 'error'); }
    }
    galSet(form?.querySelector(`[data-gal="${key}"]`) || box, list);
    if (done) toast(`Đã tải lên ${done} ảnh`);
  }
  document.addEventListener('click', (e) => {
    const box = e.target.closest('[data-gal]');
    if (!box || box.classList.contains('busy')) return;
    const list = galList(box);
    if (e.target.closest('[data-gal-pick]')) box.querySelector('input[type=file]').click();
    const mv = e.target.closest('[data-gal-move]');
    if (mv) {
      const i = Number(mv.closest('[data-i]').dataset.i); const j = i + Number(mv.dataset.galMove);
      if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; galSet(box, list); }
    }
    const del = e.target.closest('[data-gal-del]');
    if (del) { list.splice(Number(del.closest('[data-i]').dataset.i), 1); galSet(box, list); }
    if (e.target.closest('[data-gal-addurl]')) {
      const u = box.querySelector('[data-gal-url]').value.trim();
      if (!/^https?:\/\/\S+$/i.test(u)) { toast('Link ảnh phải bắt đầu bằng http:// hoặc https://', 'error'); return; }
      if (list.length >= Number(box.dataset.max)) { toast(`Tối đa ${box.dataset.max} ảnh`, 'error'); return; }
      if (list.includes(u)) { toast('Ảnh này đã có', 'error'); return; }
      galSet(box, [...list, u]);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-gal-url]')) { e.preventDefault(); e.target.closest('[data-gal]').querySelector('[data-gal-addurl]').click(); }
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-gal] input[type=file]');
    if (input?.files?.length) galUpload(input.closest('[data-gal]'), input.files);
  });
  ['dragover', 'dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
    const box = e.target.closest?.('[data-gal]');
    if (!box) return;
    e.preventDefault();
    box.classList.toggle('drag', ev === 'dragover');
    if (ev === 'drop' && e.dataTransfer?.files?.length && !box.classList.contains('busy')) galUpload(box, e.dataTransfer.files);
  }));

  const kvRow = (k, v) => `<div class="kv-row"><input placeholder="Tên thông số" value="${esc(k)}" data-k><input placeholder="Giá trị" value="${esc(v)}" data-v><button type="button" class="btn btn-light btn-sm" data-kv-del aria-label="Xóa">${ic('trash')}</button></div>`;
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-kv-add]');
    if (add) document.querySelector(`[data-kv="${add.dataset.kvAdd}"]`).insertAdjacentHTML('beforeend', kvRow('', ''));
    const del = e.target.closest('[data-kv-del]');
    if (del) del.closest('.kv-row').remove();
  });

  // Đọc form -> object theo kiểu trường; trả về null nếu lỗi
  function read(form, fields, ctx = {}) {
    const out = {};
    let ok = true;
    form.querySelectorAll('.ad-field.invalid').forEach((x) => x.classList.remove('invalid'));
    const fail = (key, msg) => { ok = false; const el = form.querySelector(`[data-field="${key}"]`); if (el) { el.classList.add('invalid'); el.querySelector('.err').textContent = msg; } };
    for (const f of fields) {
      if (f.readonly || f.type === 'readonly' || (f.readonlyOnEdit && ctx.editing)) continue;
      const el = form.elements[f.key];
      let v;
      switch (f.type) {
        case 'bool': v = !!el?.checked; break;
        case 'number': case 'money': v = el.value === '' ? null : Number(el.value); break;
        case 'lines': v = el.value.split('\n').map((s) => s.trim()).filter(Boolean); break;
        case 'tags': v = el.value.split(',').map((s) => s.trim()).filter(Boolean); break;
        case 'json':
          try { v = JSON.parse(el.value || 'null') ?? f.empty ?? {}; } catch { fail(f.key, 'JSON không hợp lệ'); continue; } break;
        case 'kv':
          v = {};
          form.querySelectorAll(`[data-kv="${f.key}"] .kv-row`).forEach((r) => { const k = r.querySelector('[data-k]').value.trim(); if (k) v[k] = r.querySelector('[data-v]').value.trim(); });
          break;
        case 'datetime': v = el.value ? new Date(el.value).toISOString() : null; break;
        case 'custom': v = f.read ? f.read(form, ctx) : undefined; break;
        case 'gallery': try { v = JSON.parse(el.value || '[]'); } catch { v = []; } break;
        default: v = el ? el.value.trim() : undefined; if (v === '' && !f.required) v = f.keepEmpty ? '' : null;
      }
      // Cột bắt buộc trong database có giá trị mặc định (thứ tự = 0, đã bán = 0…): bỏ trống thì dùng mặc định
      if ((v === null || v === '') && f.def !== undefined) v = f.def;
      if (f.required && (v === null || v === '' || v === undefined)) { fail(f.key, 'Bắt buộc'); continue; }
      if ((f.type === 'number' || f.type === 'money') && v != null && !Number.isFinite(v)) { fail(f.key, 'Số không hợp lệ'); continue; }
      if (f.validate) { const m = f.validate(v, out); if (m) { fail(f.key, m); continue; } }
      if (v !== undefined) out[f.key] = v;
    }
    return ok ? out : null;
  }

  // ---------- CSV
  function csv(filename, columns, rows) {
    // Ô bắt đầu bằng = + - @ (dữ liệu khách nhập) -> thêm ' để Excel không chạy như công thức
    const cell = (v) => { let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); if (/^[=+\-@\t\r]/.test(s) && typeof v !== 'number') s = `'${s}`; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const text = '﻿' + [columns.map((c) => c.label).join(','), ...rows.map((r) => columns.map((c) => cell(c.value ? c.value(r) : r[c.key])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Ảnh nhỏ sản phẩm (ảnh thật hoặc ảnh minh họa SVG)
  function thumb(row) {
    if (!row) return '';
    const p = { ...row, oldPrice: row.old_price, art: row.art || { type: 'generic', color: 'white' }, images: row.images?.length ? row.images : ['art:0'] };
    return `<span class="ad-thumb">${DT.productImage(p, 0)}</span>`;
  }

  return { esc, money, dt, d, badge, ic, modal, closeModal, confirm, toast, run, table, pager, field, read, csv, thumb, imageInput };
})();

// Ảnh: nén ngay trên trình duyệt (WebP, giới hạn cạnh dài) rồi lưu
//  - Supabase: Storage bucket công khai 'media' -> link công khai
//  - Demo: data URL (lưu cùng dữ liệu demo trên trình duyệt)
AD.media = (() => {
  async function compress(file, max, quality) {
    const bmp = await createImageBitmap(file).catch(() => { throw new Error('File không phải ảnh hợp lệ (dùng JPG, PNG, WEBP)'); });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = (type) => new Promise((ok) => c.toBlob(ok, type, quality));
    const webp = await blob('image/webp');
    return webp?.type === 'image/webp' ? webp : blob('image/jpeg');
  }
  const toDataUrl = (blob) => new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(blob); });
  async function upload(file, folder = 'media', { max, quality } = {}) {
    const supa = AD.db.mode === 'supabase';
    const blob = await compress(file, max || (supa ? 2000 : 1200), quality || (supa ? 0.85 : 0.75));
    if (!supa) return toDataUrl(blob);
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const name = `${String(folder).replace(/[^a-z0-9-]/gi, '')}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    return AD.db.upload(name, blob);
  }
  return { compress, toDataUrl, upload };
})();
