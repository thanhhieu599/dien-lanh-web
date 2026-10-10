// Tin tức (tin-tuc.html) & chi tiết bài viết (bai-viet.html)
document.addEventListener('DOMContentLoaded', () => {
  const { $, esc } = DT.u;
  const page = document.body.dataset.page;
  const sidebar = (exclude) => `
    <aside>
      <div class="section-box"><h3>Bài viết mới</h3><div class="side-list">${DT.posts.filter((p) => p.slug !== exclude).slice(0, 5).map((a) => `<a href="bai-viet.html?slug=${a.slug}"><span class="sl-img">${DT.art(a.art)}</span>${esc(a.title)}</a>`).join('')}</div></div>
      <div class="section-box" style="margin-top:16px"><h3>Sản phẩm bán chạy</h3><div class="side-list">${DT.api.list({ sort: 'popular', limit: 4 }).items.map((p) => `<a href="${DT.api.url(p)}"><span class="sl-img">${DT.productImage(p, 0)}</span><span>${esc(p.name)}<br><b class="price">${DT.u.money(p.price)}</b></span></a>`).join('')}</div></div>
      <div class="section-box" style="margin-top:16px;background:var(--primary);color:#fff"><h3>Cần tư vấn chọn máy?</h3><p>Kỹ thuật viên tư vấn miễn phí, khảo sát tận nơi.</p><a class="btn btn-light btn-block" href="tel:${DT.config.hotline.replace(/\s/g, '')}">${DT.icon('phone')} ${DT.config.hotline}</a></div>
    </aside>`;

  if (page === 'blog') {
    const cats = [...new Set(DT.posts.map((p) => p.cat))];
    const render = (cat) => {
      const list = DT.posts.filter((p) => !cat || p.cat === cat);
      $('#blog').innerHTML = `<div class="blog-layout"><div>
        <div class="cat-pills"><button class="tab ${!cat ? 'active' : ''}" data-c="">Tất cả</button>${cats.map((c) => `<button class="tab ${cat === c ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="blog-list">${list.map((p) => `<article class="blog-item"><a class="news-img" href="bai-viet.html?slug=${p.slug}" aria-label="${esc(p.title)}">${DT.art(p.art, 'white', 'D&amp;T')}</a>
          <div class="news-body"><span class="news-cat">${esc(p.cat)}</span><h3><a href="bai-viet.html?slug=${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p><span class="news-meta">${DT.u.date(p.date)} • ${esc(p.author)}</span></div></article>`).join('')}</div>
      </div>${sidebar()}</div>`;
    };
    $('#blog').addEventListener('click', (e) => { const t = e.target.closest('[data-c]'); if (t) render(t.dataset.c); });
    render('');
  }

  if (page === 'article') {
    const post = DT.posts.find((p) => p.slug === DT.u.param('slug'));
    if (!post) { location.replace('404.html'); return; }
    DT.u.setMeta({ title: post.title, description: post.excerpt });
    $('#crumb').outerHTML = DT.ui.breadcrumb([{ label: 'Tin tức', href: 'tin-tuc.html' }, { label: post.title }]);
    const related = DT.posts.filter((p) => p.slug !== post.slug).slice(0, 3);
    $('#article').innerHTML = `<div class="blog-layout"><div>
      <article class="article"><span class="news-cat">${esc(post.cat)}</span><h1>${esc(post.title)}</h1>
        <div class="news-meta">${DT.u.date(post.date)} • ${esc(post.author)}</div>
        <div class="article-cover">${DT.art(post.art, 'white', 'D&amp;T', 1)}</div>
        <p><strong>${esc(post.excerpt)}</strong></p>
        <div class="rich">${post.content}</div>
      </article>
      <section class="section"><div class="section-head"><h2>Bài viết liên quan</h2></div><div class="news-grid">${related.map(DT.ui.newsCard).join('')}</div></section>
    </div>${sidebar(post.slug)}</div>`;
    DT.u.jsonLd({ '@context': 'https://schema.org', '@type': 'Article', headline: post.title, datePublished: post.date, author: { '@type': 'Organization', name: post.author }, publisher: { '@type': 'Organization', name: DT.config.name } });
  }
});
