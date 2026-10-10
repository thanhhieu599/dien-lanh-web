// Biểu đồ cột SVG một chuỗi số liệu: cột ≤24px, đầu bo 4px, lưới mảnh, tooltip khi rê chuột, kèm bảng số liệu.
window.AD = window.AD || {};

AD.chart = (() => {
  const COLOR = 'var(--chart-1)';
  const compact = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)} tỷ` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)} tr` : n >= 1e3 ? `${+(n / 1e3).toFixed(0)}K` : String(n));
  const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p / 2) * 2 * p; };
  // Cột: đầu trên bo tròn, chân vuông trên đường gốc
  const colPath = (x, y, w, h) => { const r = Math.min(4, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
  const barPath = (x, y, w, h) => { const r = Math.min(4, h / 2, w); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };

  function tooltip(root) {
    const tip = root.querySelector('.ch-tip');
    root.addEventListener('mousemove', (e) => {
      const t = e.target.closest('[data-tip]');
      if (!t) { tip.hidden = true; return; }
      tip.innerHTML = t.dataset.tip;
      tip.hidden = false;
      const b = root.getBoundingClientRect();
      const x = Math.min(e.clientX - b.left + 12, b.width - tip.offsetWidth - 4);
      tip.style.left = `${Math.max(4, x)}px`;
      tip.style.top = `${e.clientY - b.top - tip.offsetHeight - 10}px`;
    });
    root.addEventListener('mouseleave', () => { tip.hidden = true; });
  }

  // data: [{label, value, tip?}]
  function columns(el, data, { format = AD.ui.money, height = 240, labelEvery = 1, tableLabel = 'Nhãn' } = {}) {
    const W = Math.max(320, el.clientWidth || 640); const H = height; const L = 56; const B = 26; const T = 10;
    const max = niceMax(Math.max(...data.map((d) => d.value), 0));
    const slot = (W - L - 8) / Math.max(1, data.length);
    const bw = Math.min(24, slot * 0.6);
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => max * k);
    el.innerHTML = `<div class="ch"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Biểu đồ cột">
      ${ticks.map((t) => `<line x1="${L}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}" class="ch-grid"/><text x="${L - 8}" y="${y(t) + 4}" class="ch-axis" text-anchor="end">${compact(t)}</text>`).join('')}
      ${data.map((d, i) => {
        const x = L + slot * i + (slot - bw) / 2; const h = (H - T - B) - (y(d.value) - T);
        const tip = d.tip || `<b>${DT.u.esc(d.label)}</b><br>${format(d.value)}`;
        return `<g data-tip="${DT.u.esc(tip)}"><rect x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent"/>
          ${d.value > 0 ? `<path d="${colPath(x, y(d.value), bw, Math.max(h, 1))}" fill="${COLOR}" class="ch-bar"/>` : ''}
          ${i % labelEvery === 0 ? `<text x="${L + slot * i + slot / 2}" y="${H - 8}" class="ch-axis" text-anchor="middle">${DT.u.esc(d.short || d.label)}</text>` : ''}</g>`;
      }).join('')}
      <line x1="${L}" x2="${W - 4}" y1="${H - B}" y2="${H - B}" class="ch-base"/>
    </svg><div class="ch-tip" hidden></div></div>
    <details class="ch-table"><summary>Xem bảng số liệu</summary>${AD.ui.table([{ label: tableLabel, key: 'label' }, { label: 'Giá trị', render: (d) => format(d.value), cls: 'num' }], data)}</details>`;
    tooltip(el.querySelector('.ch'));
  }

  // Thanh ngang (xếp hạng): data [{label, value}]
  function bars(el, data, { format = AD.ui.money, tableLabel = 'Nhãn' } = {}) {
    if (!data.length) { el.innerHTML = '<div class="ad-empty"><p>Chưa có dữ liệu</p></div>'; return; }
    const W = Math.max(320, el.clientWidth || 520); const row = 34; const L = Math.min(170, W * 0.38); const R = 96;
    const H = data.length * row + 4;
    const max = Math.max(...data.map((d) => d.value), 1);
    const bh = 18;
    el.innerHTML = `<div class="ch"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Biểu đồ thanh">
      <line x1="${L}" x2="${L}" y1="0" y2="${H}" class="ch-base"/>
      ${data.map((d, i) => {
        const w = ((W - L - R) * d.value) / max; const yy = i * row + (row - bh) / 2;
        return `<g data-tip="${DT.u.esc(`<b>${DT.u.esc(d.label)}</b><br>${format(d.value)}${d.extra ? `<br>${d.extra}` : ''}`)}">
          <rect x="0" y="${i * row}" width="${W}" height="${row}" fill="transparent"/>
          <text x="${L - 8}" y="${yy + 13}" class="ch-label" text-anchor="end">${DT.u.esc(d.label.length > 26 ? d.label.slice(0, 25) + '…' : d.label)}</text>
          ${d.value > 0 ? `<path d="${barPath(L, yy, Math.max(w, 2), bh)}" fill="${COLOR}"/>` : ''}
          <text x="${L + Math.max(w, 2) + 6}" y="${yy + 13}" class="ch-value">${format(d.value)}</text></g>`;
      }).join('')}
    </svg><div class="ch-tip" hidden></div></div>
    <details class="ch-table"><summary>Xem bảng số liệu</summary>${AD.ui.table([{ label: tableLabel, key: 'label' }, { label: 'Giá trị', render: (d) => format(d.value), cls: 'num' }], data)}</details>`;
    tooltip(el.querySelector('.ch'));
  }

  return { columns, bars, compact };
})();
