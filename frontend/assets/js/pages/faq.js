// Hỏi đáp (hoi-dap.html): tìm kiếm không dấu, lọc theo nhóm, mở đúng câu hỏi qua link #q-<id>,
// dữ liệu có cấu trúc FAQPage cho Google & trợ lý AI.
DT.onReady(() => {
  const { $, $$, esc } = DT.u;
  const faqs = (DT.faqs || []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const cats = [...new Set(faqs.map((f) => f.category))];
  const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); };
  let cat = ''; let q = '';

  $('#faq-cats').innerHTML = `<button class="faq-cat active" data-cat="">Tất cả <em>${faqs.length}</em></button>${cats.map((c) => `<button class="faq-cat" data-cat="${esc(c)}">${esc(c)} <em>${faqs.filter((f) => f.category === c).length}</em></button>`).join('')}`;

  function render() {
    const n = DT.u.norm(q);
    const list = faqs.filter((f) => (!cat || f.category === cat) && (!n || DT.u.norm(`${f.question} ${plain(f.answer)}`).includes(n)));
    $$('#faq-cats .faq-cat').forEach((b) => b.classList.toggle('active', b.dataset.cat === cat));
    const groups = cat || n ? [[cat || `Kết quả cho “${q}”`, list]] : cats.map((c) => [c, list.filter((f) => f.category === c)]);
    $('#faq-list').innerHTML = list.length ? groups.filter(([, l]) => l.length).map(([title, l]) => `<section class="faq-group"><h2>${esc(title)}</h2>
      <div class="faq">${l.map((f) => `<details id="q-${esc(f.id)}"><summary>${esc(f.question)}</summary><div class="faq-a rich">${f.answer}</div></details>`).join('')}</div></section>`).join('')
      : `<div class="section-box">${DT.ui.empty('Chưa có câu hỏi phù hợp', 'Thử từ khóa khác hoặc hỏi trực tiếp chuyên viên của chúng tôi.', '')}</div>`;
  }

  $('#faq-cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; render(); } });
  let t;
  $('#faq-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim(); render(); }, 150); });
  $('#faq-search').addEventListener('submit', (e) => e.preventDefault());
  // Ghi lại link câu hỏi đang mở (chia sẻ được)
  $('#faq-list').addEventListener('toggle', (e) => { if (e.target.open && e.target.id) history.replaceState(null, '', `#${e.target.id}`); }, true);
  $('#faq-chat').addEventListener('click', () => $('#fl-chat')?.click());
  $('#faq-call').href = `tel:${DT.u.tel(DT.config.hotline)}`;
  $('#faq-call').textContent = `Gọi ${DT.config.hotline}`;

  render();
  const open = location.hash.match(/^#q-(.+)$/);
  if (open) { const d = document.getElementById(`q-${decodeURIComponent(open[1])}`); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'center' }), 50); } }

  DT.u.jsonLd({
    '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'vi',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: plain(f.answer) } })),
  });
});
