// Ô "vừa chọn vừa gõ": bấm mũi tên để chọn giá trị có sẵn trong hệ thống, hoặc gõ giá trị mới.
// options: [giá trị lưu, nhãn hiển thị]. Gõ trùng nhãn → lưu giá trị tương ứng; gõ chữ khác → lưu đúng chữ đã gõ.
import {useEffect, useId, useMemo, useRef, useState} from 'react';

export type ComboOption = [string, string] | string;
const pair = (o: ComboOption): [string, string] => (Array.isArray(o) ? [String(o[0]), String(o[1])] : [String(o), String(o)]);
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

export function Combo({value, options, onChange, placeholder = 'Chọn hoặc gõ mới…', id, name, label, disabled, required, newHint = 'Dùng giá trị mới'}: {
  value: string; options: ComboOption[]; onChange: (v: string) => void; placeholder?: string; id?: string; name?: string; label?: string; disabled?: boolean; required?: boolean; newHint?: string;
}) {
  const auto = useId(); const listId = `${id || auto}-list`;
  const list = useMemo(() => options.map(pair), [options]);
  const labelOf = (v: string) => list.find(([k]) => k === v)?.[1] ?? v;
  const [text, setText] = useState(() => labelOf(value ?? ''));
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const emitted = useRef(value ?? '');
  // Giá trị đổi từ bên ngoài (chọn khách, nạp lại dữ liệu) → cập nhật chữ hiển thị
  useEffect(() => { if ((value ?? '') !== emitted.current) { emitted.current = value ?? ''; setText(labelOf(value ?? '')); } }, [value, list]);
  const emit = (v: string) => { emitted.current = v; onChange(v); };
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);
  const q = fold(text);
  const hits = all || !q ? list : list.filter(([, l]) => fold(l).includes(q));
  const exact = list.find(([, l]) => fold(l) === q);
  function type(next: string) {
    setText(next); setOpen(true); setAll(false); setActive(0);
    const match = list.find(([, l]) => fold(l) === fold(next));
    emit(match ? match[0] : next.trim());
  }
  function pick([v, l]: [string, string]) { setText(l); emit(v); setOpen(false); }
  return <div className="ar-combo" ref={box}>
    <input id={id} name={name} aria-label={label} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off"
      value={text} placeholder={placeholder} disabled={disabled} required={required}
      onChange={(e) => type(e.target.value)} onFocus={() => { setOpen(true); setAll(true); }} onClick={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, hits.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter' && open && hits[active] && (all || q)) { e.preventDefault(); pick(hits[active]); }
        else if (e.key === 'Escape') setOpen(false);
      }}/>
    <button type="button" className="ar-combo-toggle" tabIndex={-1} aria-label={`Mở danh sách ${label || ''}`.trim()} disabled={disabled} onClick={() => { setOpen(!open); setAll(true); }}>▾</button>
    {open && !disabled && (hits.length > 0 || (q && !exact)) && <ul className="ar-combo-list" id={listId} role="listbox">
      {hits.map(([v, l], i) => <li key={v} role="option" aria-selected={v === value} className={i === active ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); pick([v, l]); }}>{l}</li>)}
      {q && !exact && <li role="option" aria-selected={false} className="ar-combo-new" onMouseDown={(e) => { e.preventDefault(); setOpen(false); }}>{newHint}: “{text.trim()}”</li>}
    </ul>}
  </div>;
}
