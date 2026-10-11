// Dự án tiêu biểu (du-an.html) & chi tiết dự án (du-an-chi-tiet.html)
DT.onReady(() => {
  const { $, $$, esc } = DT.u;
  const page = document.body.dataset.page;
  const T = DT.trustUI;
  const fmt = (n) => Number(n).toLocaleString('vi-VN');
  const projects = DT.projects || [];

  if (page === 'projects') {
    // Số liệu tổng hợp từ chính các dự án đã đăng
    const units = projects.reduce((s, p) => s + (Number(p.units) || 0), 0);
    const inds = new Set(projects.map((p) => p.industry).filter(Boolean));
    $('#pj-stats').innerHTML = projects.length ? [
      [fmt(projects.length), 'dự án tiêu biểu'], [fmt(units), 'máy / dàn lạnh đã lắp'], [fmt(inds.size), 'lĩnh vực khách hàng'],
    ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('') : '';
    const render = (ind) => {
      $$('#pj-filter .tab').forEach((t) => t.classList.toggle('active', t.dataset.ind === ind));
      const list = projects.filter((p) => !ind || p.industry === ind);
      $('#pj-grid').innerHTML = list.length ? list.map(T.projectCard).join('') : DT.ui.empty('Chưa có dự án', 'Các dự án tiêu biểu sẽ sớm được cập nhật.', '<a class="btn btn-primary" href="bao-gia-du-an.html">Gửi yêu cầu báo giá</a>');
    };
    $('#pj-filter').innerHTML = inds.size > 1 ? `<button class="tab active" data-ind="">Tất cả</button>${[...inds].map((i) => `<button class="tab" data-ind="${esc(i)}">${esc(i)}</button>`).join('')}` : '';
    $('#pj-filter').addEventListener('click', (e) => { const t = e.target.closest('[data-ind]'); if (t) render(t.dataset.ind); });
    render('');
    $('#pj-trust').innerHTML = T.section();
    DT.u.jsonLd({
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'Dự án tiêu biểu',
      itemListElement: projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: DT.u.abs(DT.projectUrl(p.slug)), name: p.title })),
    });
  }

  if (page === 'project') {
    const p = projects.find((x) => x.slug === DT.u.param('slug'));
    if (!p) { location.replace('404.html'); return; }
    DT.u.setMeta({ title: p.title, description: p.summary || p.title, canonical: DT.projectUrl(p.slug), image: T.isImg(p.afterImage) && /^https?:/.test(p.afterImage) ? p.afterImage : null, type: 'article' });
    $('#crumb').outerHTML = DT.ui.breadcrumb([{ label: 'Dự án tiêu biểu', href: 'du-an.html' }, { label: p.title }]);
    const facts = [
      ['Khách hàng', p.client], ['Lĩnh vực', p.industry], ['Địa điểm', p.location], ['Năm thực hiện', p.year],
      ['Số máy / dàn lạnh', p.units ? fmt(p.units) : ''], ['Tổng công suất', p.capacity], ['Thời gian thi công', p.duration],
    ].filter(([, v]) => v);
    const both = T.isImg(p.beforeImage) && T.isImg(p.afterImage);
    // So sánh trước / sau: kéo thanh trượt (có ảnh cả hai) hoặc hai khung cạnh nhau
    const compare = both ? `<div class="ba" id="ba" style="--pos:50%">
        <img src="${esc(p.afterImage)}" alt="Sau thi công – ${esc(p.title)}">
        <div class="ba-before"><img src="${esc(p.beforeImage)}" alt="Trước thi công – ${esc(p.title)}"></div>
        <span class="ba-tag ba-t1">Trước</span><span class="ba-tag ba-t2">Sau</span><span class="ba-line" aria-hidden="true"></span>
        <input type="range" min="0" max="100" value="50" aria-label="Kéo để so sánh trước và sau thi công"></div>`
      : `<div class="ba-pair"><figure><span>${T.pic(p.beforeImage, 'Trước thi công', 'Ảnh trước thi công')}</span><figcaption>Trước thi công</figcaption></figure>
        <figure><span>${T.pic(p.afterImage, 'Sau thi công', 'Ảnh sau thi công')}</span><figcaption>Sau thi công</figcaption></figure></div>`;
    const gallery = (p.images || []).filter(T.isImg);
    const others = projects.filter((x) => x.slug !== p.slug).slice(0, 3);
    $('#project').innerHTML = `<article class="pj-detail">
      <header class="pj-head"><span class="pj-ind">${esc(p.industry || 'Dự án')}${p.year ? ` • ${esc(p.year)}` : ''}</span>
        <h1>${esc(p.title)}</h1>${p.sample ? '<p class="pj-sample-note">Dự án mẫu minh họa bố cục – thay bằng dự án thật tại Quản trị › Dự án tiêu biểu.</p>' : ''}
        ${p.summary ? `<p class="pj-lead">${esc(p.summary)}</p>` : ''}</header>
      <div class="pj-layout">
        <div>
          ${compare}
          <div class="rich pj-content">${p.content || ''}</div>
          ${gallery.length ? `<div class="pj-gallery">${gallery.map((g) => `<a href="${esc(g)}" target="_blank" rel="noopener"><img src="${esc(g)}" alt="${esc(p.title)}" loading="lazy"></a>`).join('')}</div>` : ''}
          ${p.testimonial ? `<figure class="pj-quote"><blockquote>“${esc(p.testimonial)}”</blockquote><figcaption><b>${esc(p.testimonialName || 'Khách hàng')}</b>${p.testimonialRole ? `<small>${esc(p.testimonialRole)}</small>` : ''}</figcaption></figure>` : ''}
        </div>
        <aside class="pj-aside">
          <div class="section-box pj-facts-box"><h2>Thông tin dự án</h2><dl>${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
          <div class="section-box pj-cta"><h3>Cần giải pháp tương tự?</h3><p>Khảo sát miễn phí, báo giá trong 24 giờ, xuất VAT & công nợ cho doanh nghiệp.</p>
            <a class="btn btn-accent btn-block" href="bao-gia-du-an.html">Nhận báo giá dự án</a>
            <a class="btn btn-light btn-block" href="tel:${DT.u.tel(DT.config.hotlineB2B || DT.config.hotline)}">${DT.icon('phone')} ${esc(DT.config.hotlineB2B || DT.config.hotline)}</a></div>
        </aside>
      </div>
      ${others.length ? `<section class="section"><div class="section-head"><h2>Dự án khác</h2><a class="link" href="du-an.html">Xem tất cả →</a></div><div class="pj-grid">${others.map(T.projectCard).join('')}</div></section>` : ''}
    </article>`;
    const ba = $('#ba');
    ba?.querySelector('input').addEventListener('input', (e) => ba.style.setProperty('--pos', `${e.target.value}%`));
    DT.u.jsonLd({
      '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.summary || p.title,
      ...(p.year ? { datePublished: `${p.year}-01-01` } : {}), inLanguage: 'vi', mainEntityOfPage: DT.u.abs(DT.projectUrl(p.slug)),
      ...(T.isImg(p.afterImage) && /^https?:/.test(p.afterImage) ? { image: p.afterImage } : {}),
      author: { '@type': 'Organization', name: DT.config.name }, publisher: { '@type': 'Organization', name: DT.config.name, url: DT.u.abs('index.html') },
      about: [p.industry, p.location].filter(Boolean),
    });
  }
});
