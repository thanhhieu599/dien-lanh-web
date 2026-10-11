// Trang Tầm nhìn & Sứ mệnh: ảnh công ty (tự nhận file), hiệu ứng xuất hiện khi cuộn, đếm số, ánh sáng theo chuột.
// Chèn ảnh: Quản trị › Trang Tầm nhìn & Sứ mệnh (hoặc chép file vào frontend/assets/images/cong-ty/, xem README.md).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Ảnh: ưu tiên ảnh tải lên trong trang quản trị; chưa có thì file khai báo trong DT.visionFiles
  // (chép vào assets/images/cong-ty/); không có nữa thì hiện khung chờ ảnh
  const placeholder = (img) => {
    const ph = document.createElement('div');
    ph.className = 'vm-ph';
    ph.innerHTML = `<svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></svg>
      <b>${DT.u.esc(img.dataset.hint || 'Hình ảnh công ty')}</b>
      <span>${DT.u.esc(img.dataset.size || '')}</span>
      <small>Chèn ảnh tại Quản trị › Trang Tầm nhìn</small>`;
    return ph;
  };
  const loadImage = (img, uploaded) => {
    const fig = img.closest('.vm-media');
    fig.querySelector('.vm-ph')?.remove(); // trang đã pre-render: dựng lại khung chờ
    fig.classList.remove('has-img');
    img.removeAttribute('src'); // bỏ ảnh đã "nướng" sẵn khi build: luôn lấy ảnh mới nhất
    const ph = placeholder(img);
    fig.append(ph);
    const key = img.dataset.img.split('/').pop();
    const dir = img.dataset.img.slice(0, -key.length);
    const local = (DT.visionFiles || []).filter((f) => String(f).replace(/\.\w+$/, '') === key).map((f) => dir + f);
    const sources = [uploaded[key], ...local].filter(Boolean);
    let i = 0;
    const tryNext = () => {
      if (i >= sources.length) { img.removeAttribute('src'); return; }
      img.src = sources[i++];
    };
    img.onload = () => { fig.classList.add('has-img'); ph.remove(); };
    img.onerror = tryNext;
    tryNext();
  };
  DT.onReady(() => {
    const uploaded = DT.visionImages();
    document.querySelectorAll('.vm img[data-img]').forEach((img) => loadImage(img, uploaded));
  });

  // ---------- Đếm số
  const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
  const count = (el) => {
    const to = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = fmt(to) + suffix; return; }
    const t0 = performance.now();
    const dur = 1600;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))) + suffix; // easeOutQuart
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ---------- Xuất hiện khi cuộn
  const counters = document.querySelectorAll('.vm [data-count]');
  if (!('IntersectionObserver' in window) || reduce) {
    document.querySelectorAll('.vm .reveal').forEach((el) => el.classList.add('in'));
    counters.forEach(count);
  } else {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('.vm .reveal').forEach((el, i) => {
      el.style.setProperty('--d', `${(i % 4) * 90}ms`);
      io.observe(el);
    });
    const co = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      count(e.target);
      co.unobserve(e.target);
    }), { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  // ---------- Ánh sáng theo chuột trên thẻ sứ mệnh / giá trị
  if (!reduce && matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.vm-card, .vm-tile').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    // Ảnh hero dịch nhẹ theo chuột (chiều sâu)
    const hero = document.querySelector('.vm-hero');
    const media = document.querySelector('.vm-hero-media');
    hero?.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      media.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    hero?.addEventListener('pointerleave', () => { media.style.transform = ''; });
  }

  // ---------- Thanh tiến trình hành trình (dự phòng khi trình duyệt chưa có scroll-driven animations)
  if (!CSS.supports('animation-timeline: view()')) {
    const tl = document.querySelector('.vm-timeline');
    const update = () => {
      const r = tl.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
      tl.style.setProperty('--p', k.toFixed(3));
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }
})();
