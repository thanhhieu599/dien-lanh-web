// Logo công ty trên chứng từ in (phiếu nhập / xuất kho, hóa đơn): ảnh logo trong Cài đặt cửa hàng,
// chưa có logo thì dùng biểu tượng + tên cửa hàng. In trắng – đen.
import {Icon} from './common';
import {safeUrl} from '../services/runtime';
import type {Row} from '../types';
export function DocLogo({cfg}: {cfg: Row}) {
  const src = typeof cfg.logo === 'string' ? safeUrl(cfg.logo) : '';
  return src
    ? <img className="doc-logo" src={src} alt={`Logo ${cfg.name || cfg.company || ''}`}/>
    : <span className="doc-logo doc-logo-mark" aria-label={`Logo ${cfg.name || ''}`}><Icon name="snow"/><b>{cfg.name}</b></span>;
}
