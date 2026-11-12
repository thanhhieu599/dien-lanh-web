// Trình soạn thảo nội dung (kiểu Word) cho bài viết, dự án, chính sách, mô tả sản phẩm.
// Dùng contentEditable + execCommand (không cần thư viện ngoài). HTML được làm sạch khi dán
// và khi hiển thị ở website (DOMPurify).
import {useEffect,useRef,useState,type ReactNode} from 'react';
import DOMPurify from 'dompurify';
import {imageFile,safeUrl} from '../services/runtime';
import {useNotice} from './common';

const MAX = 100000;
const FONTS: [string, string][] = [['', 'Mặc định'], ['Arial, sans-serif', 'Arial'], ['Roboto, sans-serif', 'Roboto'], ['Tahoma, sans-serif', 'Tahoma'], ['Verdana, sans-serif', 'Verdana'], ['"Times New Roman", serif', 'Times New Roman'], ['Georgia, serif', 'Georgia'], ['"Courier New", monospace', 'Courier New']];
const BLOCKS: [string, string][] = [['p', 'Đoạn văn'], ['h2', 'Tiêu đề lớn (H2)'], ['h3', 'Tiêu đề vừa (H3)'], ['h4', 'Tiêu đề nhỏ (H4)'], ['blockquote', 'Trích dẫn'], ['pre', 'Mã / chữ cố định']];
const SIZES = ['12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px'];
const HEIGHTS = ['1', '1.2', '1.5', '1.8', '2'];

// Biểu tượng nét mảnh 16×16
const P: Record<string, string> = {
  bold: 'M4 2h5a3 3 0 0 1 0 6H4zM4 8h6a3 3 0 0 1 0 6H4z',
  italic: 'M7 2h6M3 14h6M10 2 6 14',
  underline: 'M4 2v5a4 4 0 0 0 8 0V2M3 14h10',
  strike: 'M2 8h12M11 4.5C10.5 3 9.4 2.5 8 2.5c-2 0-3.3 1-3.3 2.5M5 11.5c.5 1.5 1.6 2 3 2 2 0 3.3-1 3.3-2.5',
  ol: 'M7 4h7M7 8h7M7 12h7M2 3l1-1v4M2 10h2l-2 3h2',
  ul: 'M7 4h7M7 8h7M7 12h7M3 4h.01M3 8h.01M3 12h.01',
  outdent: 'M7 6h7M7 10h7M2 3h12M2 13h12M5 6 3 8l2 2',
  indent: 'M7 6h7M7 10h7M2 3h12M2 13h12M3 6l2 2-2 2',
  left: 'M2 3h12M2 6h8M2 9h12M2 12h8',
  center: 'M2 3h12M4 6h8M2 9h12M4 12h8',
  right: 'M2 3h12M6 6h8M2 9h12M6 12h8',
  justify: 'M2 3h12M2 6h12M2 9h12M2 12h12',
  table: 'M2 3h12v10H2zM2 6.5h12M2 10h12M6 3v10M10 3v10',
  image: 'M2 3h12v10H2zM2 11l3.5-3.5L9 11l2-2 3 3M10.5 6h.01',
  clear: 'M4 3h9M8.5 3 6 13M10 10l4 4M14 10l-4 4',
  link: 'M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1',
  unlink: 'M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1M2 2l12 12',
  hr: 'M2 8h12M2 4h4M2 12h4M10 4h4M10 12h4',
  quote: 'M3 9h3v4H2V9c0-3 1-5 4-6M10 9h3v4H9V9c0-3 1-5 4-6',
  code: 'M2 3h12v10H2zM6 6 4 8l2 2M10 6l2 2-2 2',
  undo: 'M5 4 2 7l3 3M2 7h7a4 4 0 0 1 0 8H7',
  redo: 'M11 4l3 3-3 3M14 7H7a4 4 0 0 0 0 8h2',
  full: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4',
  exit: 'M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4',
};
const Svg = ({name}: {name: string}) => <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d={P[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// Nội dung cũ dạng chữ thường (xuống dòng) -> đoạn văn HTML
export function toHtml(value: unknown) {
  const s = String(value ?? '');
  if (!s.trim() || /<[a-z][\s\S]*>/i.test(s)) return s;
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return s.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('');
}
// Làm sạch HTML dán từ Word / web: bỏ class, id, thẻ lạ của Office
function clean(html: string) {
  return DOMPurify.sanitize(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?o:[^>]*>/gi, ''), {FORBID_TAGS: ['style', 'script', 'meta', 'link', 'form', 'input', 'button'], FORBID_ATTR: ['class', 'id', 'lang', 'onerror', 'onclick']});
}

type Pop = null | 'link' | 'image' | 'table';
export function RichEditor({value, onChange, label, id, rows = 12}: {value: unknown; onChange: (html: string) => void; label: string; id?: string; rows?: number}) {
  const box = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const last = useRef<string>('');
  const [source, setSource] = useState(false);
  const [full, setFull] = useState(false);
  const [html, setHtml] = useState(() => toHtml(value));
  const [pop, setPop] = useState<Pop>(null);
  const [form, setForm] = useState({url: '', text: '', blank: true, alt: '', rows: 3, cols: 3});
  const [busy, setBusy] = useState(false);
  const notice = useNotice();

  // Đồng bộ khi giá trị bên ngoài đổi (mở bản ghi khác); không ghi đè khi đang gõ
  useEffect(() => {
    const next = toHtml(value);
    if (next !== last.current) { last.current = next; setHtml(next); if (box.current && box.current.innerHTML !== next) box.current.innerHTML = next; }
  }, [value]);
  useEffect(() => { if (!source && box.current && box.current.innerHTML !== html) box.current.innerHTML = html; }, [source]);
  useEffect(() => {
    const save = () => { const sel = getSelection(); if (sel?.rangeCount && box.current?.contains(sel.anchorNode)) range.current = sel.getRangeAt(0).cloneRange(); };
    document.addEventListener('selectionchange', save);
    return () => document.removeEventListener('selectionchange', save);
  }, []);

  function emit(next: string) { last.current = next; setHtml(next); onChange(next); }
  function sync() { if (box.current) emit(box.current.innerHTML === '<br>' ? '' : box.current.innerHTML); }
  function restore() {
    const el = box.current; if (!el) return;
    el.focus();
    const sel = getSelection();
    if (range.current && sel) { sel.removeAllRanges(); sel.addRange(range.current); }
  }
  function exec(cmd: string, arg?: string) {
    if (source) return;
    restore();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, arg);
    sync();
  }
  // Áp kiểu cho phần chữ đang chọn bằng thẻ <span style>
  function wrapStyle(prop: 'fontSize' | 'fontFamily', v: string) {
    if (source) return;
    restore();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('fontSize', false, '7');
    box.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement('span');
      (span.style as any)[prop] = v;
      span.innerHTML = f.innerHTML; f.replaceWith(span);
    });
    sync();
  }
  function blockStyle(v: string) {
    restore();
    const sel = getSelection(); const el = box.current; if (!sel?.rangeCount || !el) return;
    const r = sel.getRangeAt(0);
    const blocks = new Set<HTMLElement>();
    const blockOf = (n: Node | null) => { let x: Node | null = n; while (x && x !== el) { if (x instanceof HTMLElement && /^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DIV|TD|TH)$/.test(x.tagName)) return x; x = x.parentNode; } return null; };
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) if (r.intersectsNode(n)) { const b = blockOf(n); if (b) blocks.add(b); }
    if (!blocks.size) { document.execCommand('formatBlock', false, 'p'); const b = blockOf(getSelection()!.anchorNode); if (b) blocks.add(b); }
    blocks.forEach((b) => { b.style.lineHeight = v; });
    sync();
  }
  function insert(markup: string) { exec('insertHTML', markup); setPop(null); }
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function addLink() {
    const url = safeUrl(form.url.trim()); if (!url) { notice('Liên kết không hợp lệ.', true); return; }
    const sel = range.current && !range.current.collapsed;
    const attrs = `href="${esc(url)}"${form.blank ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
    insert(sel && !form.text ? `<a ${attrs}>${esc(range.current!.toString())}</a>` : `<a ${attrs}>${esc(form.text || url)}</a>`);
  }
  function addImage(src: string) {
    const url = safeUrl(src); if (!url) { notice('Đường dẫn ảnh không hợp lệ.', true); return; }
    insert(`<p><img src="${esc(url)}" alt="${esc(form.alt)}" style="max-width:100%;height:auto"></p>`);
  }
  async function upload(file?: File) {
    if (!file) return; setBusy(true);
    try { addImage(await imageFile(file, 'content')); } catch (err) { notice(err instanceof Error ? err.message : String(err), true); } finally { setBusy(false); }
  }
  function addTable() {
    const r = Math.min(20, Math.max(1, form.rows)), c = Math.min(10, Math.max(1, form.cols));
    const cell = (tag: string) => `<${tag} style="border:1px solid #d0d7e2;padding:6px 8px">&nbsp;</${tag}>`;
    insert(`<table style="width:100%;border-collapse:collapse"><thead><tr>${Array.from({length: c}, () => cell('th')).join('')}</tr></thead><tbody>${Array.from({length: r - 1}, () => `<tr>${Array.from({length: c}, () => cell('td')).join('')}</tr>`).join('')}</tbody></table><p><br></p>`);
  }
  const btn = (name: string, title: string, run: () => void, on = false) => <button type="button" className={on ? 'on' : ''} title={title} aria-label={title} disabled={source && !['code', 'full', 'exit'].includes(name)} onMouseDown={(e) => e.preventDefault()} onClick={run}><Svg name={name}/></button>;
  const select = (label: string, options: [string, string][], run: (v: string) => void, width = 112) => <select aria-label={label} title={label} disabled={source} style={{width}} value="" onChange={(e) => { if (e.target.value !== '') run(e.target.value); e.target.value = ''; }}><option value="">{label}</option>{options.map(([v, l]) => <option key={v || 'x'} value={v || 'inherit'}>{l}</option>)}</select>;
  const color = (label: string, cmd: string, mark: ReactNode) => <label className="re-color" title={label}>{mark}<input type="color" aria-label={label} disabled={source} onMouseDown={() => restore()} onChange={(e) => exec(cmd, e.target.value)}/></label>;
  const size = html.length;

  return <div className={`re${full ? ' re-full' : ''}`}>
    <div className="re-bar" role="toolbar" aria-label={`Công cụ soạn thảo: ${label}`}>
      <div className="re-group">
        <button type="button" className={`re-src${source ? ' on' : ''}`} onClick={() => { if (source) { const c = clean(html); emit(c); } setSource(!source); }} aria-pressed={source}><Svg name="code"/> Mã HTML</button>
      </div>
      <div className="re-group">
        {select('Phông', FONTS, (v) => wrapStyle('fontFamily', v), 112)}
        {select('Định dạng', BLOCKS, (v) => exec('formatBlock', v), 120)}
        {select('Cỡ chữ', SIZES.map((s) => [s, s]), (v) => wrapStyle('fontSize', v), 104)}
      </div>
      <div className="re-group">
        {color('Màu chữ', 'foreColor', <b className="re-a">A</b>)}
        {color('Màu nền chữ', 'hiliteColor', <b className="re-a re-hl">A</b>)}
      </div>
      <div className="re-group">
        {btn('bold', 'In đậm (Ctrl+B)', () => exec('bold'))}
        {btn('italic', 'In nghiêng (Ctrl+I)', () => exec('italic'))}
        {btn('underline', 'Gạch chân (Ctrl+U)', () => exec('underline'))}
        {btn('strike', 'Gạch ngang', () => exec('strikeThrough'))}
      </div>
      <div className="re-group">
        {btn('ol', 'Danh sách số', () => exec('insertOrderedList'))}
        {btn('ul', 'Danh sách chấm', () => exec('insertUnorderedList'))}
        {btn('outdent', 'Giảm thụt lề', () => exec('outdent'))}
        {btn('indent', 'Tăng thụt lề', () => exec('indent'))}
      </div>
      <div className="re-group">
        {btn('left', 'Căn trái', () => exec('justifyLeft'))}
        {btn('center', 'Căn giữa', () => exec('justifyCenter'))}
        {btn('right', 'Căn phải', () => exec('justifyRight'))}
        {btn('justify', 'Căn đều hai bên', () => exec('justifyFull'))}
      </div>
      <div className="re-group">
        {btn('table', 'Chèn bảng', () => setPop(pop === 'table' ? null : 'table'), pop === 'table')}
        {btn('image', 'Chèn ảnh', () => { setForm({...form, url: '', alt: ''}); setPop(pop === 'image' ? null : 'image'); }, pop === 'image')}
        {btn('clear', 'Xóa định dạng', () => { exec('removeFormat'); exec('formatBlock', 'p'); })}
        {select('Giãn dòng', HEIGHTS.map((h) => [h, h]), blockStyle, 116)}
      </div>
      <div className="re-group">
        {btn('link', 'Chèn liên kết', () => { setForm({...form, url: '', text: ''}); setPop(pop === 'link' ? null : 'link'); }, pop === 'link')}
        {btn('unlink', 'Bỏ liên kết', () => exec('unlink'))}
        {btn('hr', 'Đường kẻ ngang', () => exec('insertHorizontalRule'))}
        {btn('quote', 'Trích dẫn', () => exec('formatBlock', 'blockquote'))}
      </div>
      <div className="re-group">
        {btn('undo', 'Hoàn tác (Ctrl+Z)', () => exec('undo'))}
        {btn('redo', 'Làm lại (Ctrl+Y)', () => exec('redo'))}
        {btn(full ? 'exit' : 'full', full ? 'Thu nhỏ' : 'Toàn màn hình', () => setFull(!full), full)}
      </div>
    </div>
    {pop && <div className="re-pop" role="dialog" aria-label={pop === 'link' ? 'Chèn liên kết' : pop === 'image' ? 'Chèn ảnh' : 'Chèn bảng'}>
      {pop === 'link' && <>
        <label>Đường dẫn<input autoFocus placeholder="https://… hoặc tin-tuc.html" value={form.url} onChange={(e) => setForm({...form, url: e.target.value})}/></label>
        <label>Chữ hiển thị<input placeholder="Để trống: dùng chữ đang chọn" value={form.text} onChange={(e) => setForm({...form, text: e.target.value})}/></label>
        <label className="re-check"><input type="checkbox" checked={form.blank} onChange={(e) => setForm({...form, blank: e.target.checked})}/>Mở ở tab mới</label>
        <div className="re-pop-actions"><button type="button" className="btn btn-primary" onClick={addLink}>Chèn liên kết</button><button type="button" className="btn btn-light" onClick={() => setPop(null)}>Đóng</button></div>
      </>}
      {pop === 'image' && <>
        <label className="btn btn-light re-upload">{busy ? 'Đang tải ảnh…' : 'Tải ảnh từ máy'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => upload(e.target.files?.[0])}/></label>
        <label>Hoặc dán đường dẫn ảnh<input placeholder="https://…/anh.jpg" value={form.url} onChange={(e) => setForm({...form, url: e.target.value})}/></label>
        <label>Mô tả ảnh (SEO)<input value={form.alt} onChange={(e) => setForm({...form, alt: e.target.value})}/></label>
        <div className="re-pop-actions"><button type="button" className="btn btn-primary" disabled={!form.url.trim()} onClick={() => addImage(form.url.trim())}>Chèn ảnh</button><button type="button" className="btn btn-light" onClick={() => setPop(null)}>Đóng</button></div>
      </>}
      {pop === 'table' && <>
        <label>Số hàng<input type="number" min={1} max={20} value={form.rows} onChange={(e) => setForm({...form, rows: Number(e.target.value)})}/></label>
        <label>Số cột<input type="number" min={1} max={10} value={form.cols} onChange={(e) => setForm({...form, cols: Number(e.target.value)})}/></label>
        <div className="re-pop-actions"><button type="button" className="btn btn-primary" onClick={addTable}>Chèn bảng</button><button type="button" className="btn btn-light" onClick={() => setPop(null)}>Đóng</button></div>
      </>}
    </div>}
    {source
      ? <textarea id={id} className="re-source" aria-label={`${label} (mã HTML)`} rows={rows} value={html} onChange={(e) => emit(e.target.value)}/>
      : <div id={id} ref={box} className="re-area ar-rich" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} style={{minHeight: rows * 22}}
          onInput={sync} onBlur={sync}
          onPaste={(e) => { const h = e.clipboardData.getData('text/html'); if (h) { e.preventDefault(); document.execCommand('insertHTML', false, clean(h)); sync(); } }}/>}
    <div className={`re-foot${size > MAX ? ' over' : ''}`}>HTML: {size.toLocaleString('vi-VN')}/{MAX.toLocaleString('vi-VN')}</div>
  </div>;
}
export const RICH_MAX = MAX;
