// Cấu hình → Tài khoản & phân quyền (chỉ Quản trị viên): tạo tài khoản nhân viên, đổi vai trò,
// đặt lại mật khẩu, khóa / mở khóa, cấp quyền cho tài khoản khách đã đăng ký.
import {useState, type FormEvent} from 'react';
import {ad, date} from '../services/runtime';
import {ROLE_INFO, ROLE_LABEL, usersOp} from '../services/users';
import {Action, DataState, Head, Panel, Table, useData, useNotice} from '../components/common';
import type {Row} from '../types';

const roleOptions = ROLE_INFO.map(([k, l]) => <option key={k} value={k}>{l}</option>);

export function AccountsPage() {
  const notice = useNotice();
  const state = useData(() => usersOp('list'), []);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const me = ad.me?.id;
  async function run(fn: () => Promise<any>, ok: string) {
    try { await fn(); notice(ok); state.reload(); } catch (e) { notice(e instanceof Error ? e.message : String(e), true); throw e; }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const v = Object.fromEntries(new FormData(form)) as Row;
    if (v.password !== v.confirm) { notice('Hai lần nhập mật khẩu không khớp.', true); return; }
    setBusy(true);
    try { await run(() => usersOp('create', {p_name: v.name, p_phone: v.phone, p_email: v.email, p_role: v.role, p_password: v.password}), `Đã tạo tài khoản cho ${v.name}.`); form.reset(); } catch { /* đã báo lỗi */ } finally { setBusy(false); }
  }
  async function grant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const v = Object.fromEntries(new FormData(form)) as Row;
    try { await run(() => usersOp('grant', {p_phone: v.phone, p_role: v.role}), `Đã cấp quyền ${ROLE_LABEL[v.role]} cho ${v.phone}.`); form.reset(); } catch { /* đã báo lỗi */ }
  }
  async function resetPassword(e: FormEvent<HTMLFormElement>, row: Row) {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget)) as Row;
    try { await run(() => usersOp('set_password', {p_id: row.id, p_password: v.password}), `Đã đặt lại mật khẩu cho ${row.name}.`); setResetFor(null); } catch { /* đã báo lỗi */ }
  }
  return <>
    <Head title="Tài khoản & phân quyền" subtitle="Tạo tài khoản cho nhân viên, chọn vai trò để giới hạn quyền, đặt lại mật khẩu hoặc khóa khi nhân viên nghỉ việc. Chỉ quản trị viên thấy mục này."/>
    <Panel title="Danh sách tài khoản nhân viên">
      <DataState state={state}>{state.data && <Table rows={state.data} columns={[
        {label: 'Nhân viên', render: (r) => <><b>{r.name}</b>{r.id === me && <span className="ar-badge"> Bạn</span>}<small>{[r.phone, r.email].filter(Boolean).join(' · ')}</small></>},
        {label: 'Vai trò', render: (r) => <select aria-label={`Vai trò của ${r.name}`} value={r.role} disabled={r.id === me}
          onChange={(e) => { const role = e.target.value; if (!window.confirm(`Đổi vai trò của ${r.name} thành "${ROLE_LABEL[role] || 'Khách hàng'}"?`)) { e.target.value = r.role; return; } run(() => usersOp('set_role', {p_id: r.id, p_role: role}), 'Đã đổi vai trò.').catch(() => {}); }}>
          {roleOptions}<option value="customer">Bỏ quyền (thành khách hàng)</option></select>},
        {label: 'Trạng thái', render: (r) => <span className={`ar-badge ${r.locked ? 'negative' : 'positive'}`}>{r.locked ? 'Đã khóa' : 'Đang hoạt động'}</span>},
        {label: 'Tạo lúc', render: (r) => <>{r.created_at ? date(r.created_at) : '—'}<small>{r.created_by_name ? `bởi ${r.created_by_name}` : ''}</small></>},
        {label: 'Thao tác', render: (r) => resetFor === r.id
          ? <form className="acc-reset" onSubmit={(e) => resetPassword(e, r)}><input name="password" type="password" minLength={8} maxLength={72} required placeholder="Mật khẩu mới (≥ 8 ký tự)" aria-label={`Mật khẩu mới cho ${r.name}`} autoComplete="new-password"/><button className="btn btn-primary">Lưu</button><button type="button" className="btn btn-light" onClick={() => setResetFor(null)}>Hủy</button></form>
          : <div className="ar-actions">
            <button type="button" className="btn btn-light" onClick={() => setResetFor(r.id)}>Đặt lại mật khẩu</button>
            {r.id !== me && <Action className={`btn btn-light${r.locked ? '' : ' ce-del'}`} confirm={r.locked ? `Mở khóa tài khoản ${r.name}?` : `Khóa tài khoản ${r.name}? Nhân viên sẽ bị đăng xuất và không đăng nhập được.`}
              run={() => run(() => usersOp(r.locked ? 'unlock' : 'lock', {p_id: r.id}), r.locked ? 'Đã mở khóa.' : 'Đã khóa tài khoản.')}>{r.locked ? 'Mở khóa' : 'Khóa'}</Action>}
          </div>},
      ]}/>}</DataState>
    </Panel>
    <div className="ar-two-columns">
      <Panel title="Tạo tài khoản nhân viên">
        <form className="ar-grid" id="acc-create" onSubmit={create}>
          <label>Họ tên *<input name="name" required maxLength={120}/></label>
          <label>Số điện thoại (dùng để đăng nhập) *<input name="phone" required inputMode="tel"/></label>
          <label>Email<input name="email" type="email"/></label>
          <label>Vai trò *<select name="role" required defaultValue="staff">{roleOptions}</select></label>
          <label>Mật khẩu *<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password"/></label>
          <label>Nhập lại mật khẩu *<input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password"/></label>
          <button className="btn btn-primary full" disabled={busy} aria-busy={busy}>Tạo tài khoản</button>
        </form>
      </Panel>
      <div>
        <Panel title="Vai trò & quyền hạn">
          <dl className="acc-roles">{ROLE_INFO.map(([k, l, d]) => <div key={k}><dt>{l}</dt><dd>{d}</dd></div>)}</dl>
        </Panel>
        <Panel title="Cấp quyền cho tài khoản có sẵn">
          <p className="inv-muted">Nhân viên đã tự đăng ký tài khoản trên website: nhập số điện thoại để cấp vai trò.</p>
          <form className="ar-grid" id="acc-grant" onSubmit={grant}>
            <label>Số điện thoại *<input name="phone" required inputMode="tel"/></label>
            <label>Vai trò *<select name="role" required defaultValue="staff">{roleOptions}</select></label>
            <button className="btn btn-light full">Cấp quyền</button>
          </form>
        </Panel>
      </div>
    </div>
  </>;
}
