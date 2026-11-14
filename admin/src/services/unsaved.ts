// Cảnh báo rời trang khi form trong admin có thay đổi chưa lưu.
// - Gõ / chọn trong form ở vùng nội dung (#view) → đánh dấu "chưa lưu" (trừ ô lọc, tìm kiếm, chọn ngày)
// - Bấm sang mục khác (link #/...) → hỏi xác nhận; đóng tab / tải lại → trình duyệt cảnh báo
// - Lưu thành công (thông báo không lỗi) hoặc đã rời trang → bỏ đánh dấu
let dirty = false;
const IGNORE = '.ar-toolbar, .ar-quick-search, .ar-range, .ar-filters, [data-no-unsaved]';
export const markSaved = () => { dirty = false; };
export const isDirty = () => dirty;
export function installUnsavedGuard() {
  const track = (e: Event) => {
    const el = e.target as HTMLElement | null;
    if (!el?.closest || !el.closest('#view form') || el.closest(IGNORE)) return;
    if ((el as HTMLInputElement).type === 'search') return;
    dirty = true;
  };
  document.addEventListener('input', track, true);
  document.addEventListener('change', track, true);
  document.addEventListener('click', (e) => {
    if (!dirty) return;
    const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#/') && !href.startsWith('/admin') && !a.closest('.ad-side, .ar-side')) return;
    if (a.closest('#view form')) return;
    if (window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) { dirty = false; return; }
    e.preventDefault(); e.stopPropagation();
  }, true);
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', () => { dirty = false; });
}
