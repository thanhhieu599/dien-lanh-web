// Ảnh minh họa sản phẩm dạng SVG (thay thế ảnh thật ở giai đoạn 1).
// Khi admin upload ảnh thật, product.images chứa URL và hàm này trả về <img>.
window.DT = window.DT || {};

(() => {
  let uid = 0;
  const COLORS = {
    white: { a: '#ffffff', b: '#e9eef5', line: '#c7d0dc', dark: '#8a96a8' },
    silver: { a: '#f1f3f6', b: '#c9d0d9', line: '#aab4c1', dark: '#6b7686' },
    black: { a: '#4a505b', b: '#1f232a', line: '#15181d', dark: '#9aa3b2' },
    gold: { a: '#f3e7cf', b: '#cdb487', line: '#b39a6c', dark: '#7d6a45' },
  };

  function shape(type, c, g, brand) {
    const label = (x, y, size = 13, fill = c.dark) =>
      `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${size}" letter-spacing="1.5" fill="${fill}">${brand}</text>`;
    const body = `fill="url(#${g})" stroke="${c.line}" stroke-width="2"`;
    const breeze = (y) => [0, 1, 2].map((i) => `<path d="M${120 + i * 55} ${y} q 15 25 0 50" fill="none" stroke="#7cc4ff" stroke-width="5" stroke-linecap="round" opacity="${0.9 - i * 0.2}"/>`).join('');
    switch (type) {
      case 'ac':
        return `<rect x="40" y="130" width="320" height="105" rx="26" ${body}/>
          <rect x="62" y="208" width="276" height="12" rx="6" fill="${c.line}" opacity=".55"/>
          <circle cx="330" cy="165" r="4" fill="#22c55e"/>${label(200, 170, 15)}${breeze(250)}`;
      case 'ac-cassette':
        return `<rect x="70" y="70" width="260" height="260" rx="22" ${body}/>
          <rect x="130" y="130" width="140" height="140" rx="10" fill="none" stroke="${c.line}" stroke-width="2"/>
          ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="140" y1="${145 + i * 22}" x2="260" y2="${145 + i * 22}" stroke="${c.line}" stroke-width="3"/>`).join('')}
          <rect x="95" y="88" width="210" height="16" rx="6" fill="${c.line}" opacity=".5"/><rect x="95" y="296" width="210" height="16" rx="6" fill="${c.line}" opacity=".5"/>
          <rect x="88" y="95" width="16" height="210" rx="6" fill="${c.line}" opacity=".5"/><rect x="296" y="95" width="16" height="210" rx="6" fill="${c.line}" opacity=".5"/>${label(200, 124, 12)}`;
      case 'ac-floor':
        return `<rect x="135" y="40" width="130" height="320" rx="18" ${body}/>
          <rect x="152" y="62" width="96" height="120" rx="8" fill="${c.line}" opacity=".35"/>
          ${[0, 1, 2, 3, 4].map((i) => `<line x1="160" y1="${80 + i * 20}" x2="240" y2="${80 + i * 20}" stroke="${c.a}" stroke-width="4"/>`).join('')}
          <rect x="170" y="200" width="60" height="22" rx="5" fill="#0f172a"/><text x="200" y="216" text-anchor="middle" font-family="Arial" font-size="12" fill="#38bdf8">24°C</text>${label(200, 260, 12)}`;
      case 'ac-duct':
        return `<rect x="40" y="150" width="320" height="100" rx="10" ${body}/>
          <rect x="60" y="170" width="120" height="60" rx="4" fill="${c.line}" opacity=".4"/>
          ${[0, 1, 2, 3, 4].map((i) => `<line x1="200" y1="${172 + i * 13}" x2="340" y2="${172 + i * 13}" stroke="${c.line}" stroke-width="3"/>`).join('')}${label(120, 205, 12)}`;
      case 'fridge':
      case 'fridge-mini': {
        const h = type === 'fridge-mini' ? 210 : 320;
        const y = 200 - h / 2;
        return `<rect x="120" y="${y}" width="160" height="${h}" rx="16" ${body}/>
          <line x1="120" y1="${y + h * 0.32}" x2="280" y2="${y + h * 0.32}" stroke="${c.line}" stroke-width="3"/>
          <rect x="135" y="${y + 20}" width="8" height="${h * 0.18}" rx="4" fill="${c.dark}"/>
          <rect x="135" y="${y + h * 0.38}" width="8" height="${h * 0.3}" rx="4" fill="${c.dark}"/>${label(220, y + h * 0.9, 11)}`;
      }
      case 'fridge-sbs':
      case 'fridge-multi':
        return `<rect x="85" y="40" width="230" height="320" rx="16" ${body}/>
          <line x1="200" y1="40" x2="200" y2="${type === 'fridge-multi' ? 220 : 360}" stroke="${c.line}" stroke-width="3"/>
          ${type === 'fridge-multi' ? `<line x1="85" y1="220" x2="315" y2="220" stroke="${c.line}" stroke-width="3"/><line x1="85" y1="290" x2="315" y2="290" stroke="${c.line}" stroke-width="3"/><rect x="170" y="236" width="60" height="7" rx="3" fill="${c.dark}"/><rect x="170" y="306" width="60" height="7" rx="3" fill="${c.dark}"/>`
            : `<rect x="110" y="90" width="60" height="80" rx="8" fill="#0f172a" opacity=".85"/><rect x="125" y="140" width="30" height="20" rx="3" fill="#38bdf8" opacity=".7"/>`}
          <rect x="186" y="80" width="6" height="110" rx="3" fill="${c.dark}"/><rect x="208" y="80" width="6" height="110" rx="3" fill="${c.dark}"/>${label(258, 340, 11)}`;
      case 'freezer':
        return `<rect x="50" y="150" width="300" height="180" rx="14" ${body}/>
          <rect x="50" y="130" width="300" height="40" rx="12" ${body}/>
          <rect x="170" y="176" width="60" height="10" rx="5" fill="${c.dark}"/>
          <rect x="250" y="290" width="80" height="22" rx="4" fill="#0f172a"/><text x="290" y="306" text-anchor="middle" font-family="Arial" font-size="12" fill="#38bdf8">-18°C</text>${label(120, 305, 12)}`;
      case 'cooler-cabinet':
        return `<rect x="115" y="35" width="170" height="330" rx="12" ${body}/>
          <rect x="130" y="75" width="140" height="250" rx="6" fill="#dbeafe" stroke="${c.line}" stroke-width="2" opacity=".9"/>
          ${[0, 1, 2].map((r) => `<line x1="132" y1="${150 + r * 60}" x2="268" y2="${150 + r * 60}" stroke="${c.line}" stroke-width="2"/>${[0, 1, 2, 3].map((k) => `<rect x="${142 + k * 32}" y="${108 + r * 60}" width="16" height="40" rx="6" fill="${['#ef4444', '#22c55e', '#f59e0b', '#3b82f6'][(k + r) % 4]}"/>`).join('')}`).join('')}
          <rect x="115" y="35" width="170" height="34" rx="12" fill="${brand ? '#0b5ed7' : c.b}"/>${label(200, 58, 13, '#fff')}`;
      case 'washer':
        return `<rect x="95" y="50" width="210" height="300" rx="18" ${body}/>
          <line x1="95" y1="105" x2="305" y2="105" stroke="${c.line}" stroke-width="2"/>
          <circle cx="260" cy="78" r="13" fill="none" stroke="${c.dark}" stroke-width="3"/><rect x="115" y="70" width="70" height="16" rx="4" fill="#0f172a"/>
          <circle cx="200" cy="225" r="85" fill="${c.line}" opacity=".5"/><circle cx="200" cy="225" r="68" fill="#cfe6ff" stroke="${c.dark}" stroke-width="4"/>
          <path d="M150 240 q 25 -22 50 0 t 50 0" fill="none" stroke="#7cc4ff" stroke-width="5"/>${label(200, 340, 10)}`;
      case 'washer-top':
        return `<rect x="95" y="60" width="210" height="290" rx="18" ${body}/>
          <rect x="95" y="60" width="210" height="70" rx="18" fill="${c.line}" opacity=".45"/>
          <rect x="120" y="80" width="80" height="22" rx="5" fill="#0f172a"/><circle cx="260" cy="92" r="14" fill="none" stroke="${c.dark}" stroke-width="3"/>
          <rect x="125" y="150" width="150" height="40" rx="10" fill="#cfe6ff" stroke="${c.dark}" stroke-width="2" opacity=".9"/>${label(200, 300, 12)}`;
      case 'purifier':
      case 'dehumidifier':
        return `<rect x="135" y="55" width="130" height="300" rx="${type === 'purifier' ? 40 : 18}" ${body}/>
          ${Array.from({ length: 24 }, (_, i) => `<circle cx="${160 + (i % 6) * 16}" cy="${90 + Math.floor(i / 6) * 16}" r="4" fill="${c.line}"/>`).join('')}
          <circle cx="200" cy="200" r="22" fill="none" stroke="#22c55e" stroke-width="5"/><text x="200" y="205" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#22c55e">PM</text>
          ${type === 'dehumidifier' ? `<rect x="150" y="260" width="100" height="70" rx="8" fill="#cfe6ff" stroke="${c.line}" stroke-width="2"/>` : ''}${label(200, 250, 11)}`;
      case 'heater':
        return `<rect x="70" y="120" width="260" height="140" rx="70" ${body}/>
          <circle cx="200" cy="190" r="26" fill="none" stroke="${c.dark}" stroke-width="4"/><path d="M200 172v18l10 8" stroke="#ef4444" stroke-width="4" fill="none" stroke-linecap="round"/>
          <line x1="150" y1="260" x2="150" y2="300" stroke="${c.dark}" stroke-width="6"/><line x1="250" y1="260" x2="250" y2="300" stroke="#ef4444" stroke-width="6"/>${label(200, 240, 11)}`;
      case 'cooler':
        return `<rect x="120" y="45" width="160" height="290" rx="20" ${body}/>
          ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="${140 + i * 20}" y1="80" x2="${140 + i * 20}" y2="220" stroke="${c.line}" stroke-width="5" stroke-linecap="round"/>`).join('')}
          <rect x="140" y="240" width="120" height="60" rx="8" fill="#cfe6ff" stroke="${c.line}" stroke-width="2"/>
          <circle cx="145" cy="345" r="10" fill="#334155"/><circle cx="255" cy="345" r="10" fill="#334155"/>${label(200, 70, 11)}`;
      case 'pipe':
        return [0, 1, 2, 3].map((i) => `<ellipse cx="200" cy="${170 + i * 18}" rx="${130 - i * 6}" ry="55" fill="none" stroke="url(#${g}cu)" stroke-width="14"/>`).join('') +
          `<ellipse cx="200" cy="200" rx="70" ry="22" fill="#1e293b" opacity=".2"/><rect x="260" y="250" width="90" height="34" rx="6" fill="#0b5ed7"/><text x="305" y="272" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#fff">15m</text>`;
      case 'pipe-drain':
        return [0, 1, 2, 3, 4].map((i) => `<ellipse cx="200" cy="${165 + i * 16}" rx="${125 - i * 5}" ry="55" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-dasharray="6 3"/>`).join('');
      case 'gas':
        return `<rect x="125" y="110" width="150" height="230" rx="40" fill="${brand === 'R410A' ? '#ec4899' : '#3b82f6'}" stroke="#1e3a8a" stroke-width="2"/>
          <rect x="175" y="70" width="50" height="45" rx="8" fill="#94a3b8"/><rect x="160" y="60" width="80" height="14" rx="5" fill="#64748b"/>
          <rect x="140" y="190" width="120" height="70" rx="8" fill="#fff"/><text x="200" y="232" text-anchor="middle" font-family="Arial" font-size="24" font-weight="800" fill="#0f172a">${brand}</text>`;
      case 'bracket':
        return `<path d="M100 90h30v190h170v30H100z" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><path d="M270 90h30v220h-30z" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
          <path d="M130 270 L270 120" stroke="#94a3b8" stroke-width="12"/>${[110, 200, 290].map((x) => `<circle cx="${x}" cy="295" r="5" fill="#475569"/>`).join('')}`;
      case 'gauge':
        return `<rect x="90" y="150" width="220" height="70" rx="14" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
          <circle cx="150" cy="140" r="55" fill="#fff" stroke="#3b82f6" stroke-width="8"/><circle cx="250" cy="140" r="55" fill="#fff" stroke="#ef4444" stroke-width="8"/>
          <path d="M150 140 l25 -25M250 140 l-20 -28" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
          <path d="M120 220 q -20 80 40 110M200 220 v110M280 220 q 20 80 -40 110" fill="none" stroke="#3b82f6" stroke-width="6"/>`;
      default:
        return `<rect x="100" y="100" width="200" height="200" rx="20" ${body}/>${label(200, 205, 14)}`;
    }
  }

  function svg(type, color, brandText, variant = 0) {
    const c = COLORS[color] || COLORS.white;
    const g = `g${++uid}`;
    const bgs = [['#f4f8ff', '#e6f0ff'], ['#f3fbf8', '#e2f5ee'], ['#fff8ef', '#ffeedb']];
    const [bg1, bg2] = bgs[variant % 3];
    let inner = shape(type, c, g, brandText);
    if (variant === 1) inner = `<g transform="translate(40 30) scale(.8)">${inner}</g>
      <rect x="24" y="330" width="352" height="48" rx="24" fill="#fff" stroke="#dbe4f0"/>
      <text x="200" y="360" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#0b5ed7">Chính hãng • Bảo hành tận nhà</text>`;
    if (variant === 2) inner = `<g transform="translate(110 40) scale(.45)">${inner}</g>
      <text x="200" y="262" text-anchor="middle" font-family="Arial" font-size="28" font-weight="800" fill="#0f172a">${brandText}</text>
      <text x="200" y="295" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">Giao nhanh 2h • Lắp đặt chuẩn hãng</text>
      <rect x="120" y="315" width="160" height="38" rx="19" fill="#e30019"/><text x="200" y="340" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#fff">D&amp;T Điện Lạnh</text>`;
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient>
      <linearGradient id="${g}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
      <linearGradient id="${g}cu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6b37a"/><stop offset=".5" stop-color="#c46a2b"/><stop offset="1" stop-color="#f0a465"/></linearGradient></defs>
      <rect width="400" height="400" rx="24" fill="url(#${g}bg)"/>${inner}</svg>`;
  }

  // Ảnh của sản phẩm theo chỉ số trong gallery
  DT.productImage = (p, i = 0) => {
    const src = p.images[i] ?? p.images[0];
    if (src && !String(src).startsWith('art:')) return `<img src="${DT.u.esc(src)}" alt="${DT.u.esc(p.name)}" loading="lazy">`;
    const variant = Number(String(src).split(':')[1] || 0);
    let label = (DT.api.brand(p.brand)?.name || '').split(' ')[0].toUpperCase();
    if (p.art.type === 'gas') label = /R410A/.test(p.name) ? 'R410A' : 'R32';
    return svg(p.art.type, p.art.color, label, variant);
  };

  // Ảnh minh họa chung (banner, bài viết)
  DT.art = (type, color = 'white', label = '', variant = 0) => svg(type, color, label, variant);
})();
