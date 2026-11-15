// Tuyển dụng: danh sách vị trí đang tuyển (lọc theo bộ phận) và trang chi tiết có form ứng tuyển.
// Dữ liệu quản lý tại Quản trị › Tuyển dụng; hồ sơ ứng tuyển vào Quản trị › Yêu cầu khách hàng (loại "Ứng tuyển").
import { useState, type FormEvent } from "react";
import { dt, formValues, toast } from "../services/runtime";
import { Breadcrumb, Empty, Icon, Media, Rich, ShopLink, useJsonLd, useMeta } from "../components/common";
import { Field } from "../components/forms";
import type { Row } from "../types";

const today = () => new Date().toISOString().slice(0, 10);
const vnDate = (d?: string) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "");
const expired = (j: Row) => !!j.deadline && String(j.deadline).slice(0, 10) < today();
const jobUrl = (j: Row) => `tuyen-dung.html?slug=${encodeURIComponent(j.slug)}`;
const DEPT_ICON: Record<string, string> = { "Kỹ thuật": "tool", "Kinh doanh": "tag", "Chăm sóc khách hàng": "headset", "Kho – Giao nhận": "truck", "Kế toán": "file", Marketing: "zap" };
const deptIcon = (d?: string) => DEPT_ICON[d || ""] || "user";
const sorted = (list: Row[]) =>
  [...list].sort((a, b) => Number(expired(a)) - Number(expired(b)) || Number(!!b.featured) - Number(!!a.featured) || (a.sort ?? 0) - (b.sort ?? 0));

function JobCard({ job: j }: { job: Row }) {
  const off = expired(j);
  return (
    <article className={`job-card${off ? " is-expired" : ""}`}>
      <ShopLink className="job-img" href={jobUrl(j)} aria-label={j.title}>
        {j.image ? <Media src={j.image} alt={j.title} /> : <span className="job-img-ph"><Icon name={deptIcon(j.department)} /></span>}
        {j.featured && !off && <span className="job-badge">Tuyển gấp</span>}
        {off && <span className="job-badge job-badge-off">Đã hết hạn</span>}
      </ShopLink>
      <div className="job-body">
        <small className="job-kicker">{[j.department, j.type].filter(Boolean).join(" · ")}</small>
        <h3><ShopLink href={jobUrl(j)}>{j.title}</ShopLink></h3>
        {j.summary && <p>{j.summary}</p>}
        <ul className="job-facts">
          <li><Icon name="card" />{j.salary || "Thỏa thuận"}</li>
          {j.location && <li><Icon name="pin" />{j.location}</li>}
          {j.deadline && <li><Icon name="clock" />Hạn {vnDate(j.deadline)}</li>}
        </ul>
      </div>
    </article>
  );
}

function ApplyForm({ job }: { job?: Row }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formValues(form);
    if (!dt.u.validPhone(data.phone)) { toast("Số điện thoại không hợp lệ", true); return; }
    if (data.cv && !/^https?:\/\//i.test(String(data.cv))) { toast("Link CV cần bắt đầu bằng https://", true); return; }
    setBusy(true);
    try {
      const position = job?.title || String(data.position || "Ứng tuyển chung");
      const lead = await dt.saveLead("recruit", { ...data, position, job: job?.slug || null, message: [`Ứng tuyển: ${position}`, data.experience && `Kinh nghiệm: ${data.experience}`, data.cv && `CV: ${data.cv}`, data.intro].filter(Boolean).join("\n") });
      setDone(`Đã nhận hồ sơ ${lead.code || ""}. Bộ phận nhân sự sẽ liên hệ với bạn trong 3 ngày làm việc.`);
      form.reset();
    } catch (err) { toast(String(err), true); } finally { setBusy(false); }
  }
  return (
    <form id="ung-tuyen" className="section-box react-form job-apply" onSubmit={submit}>
      <h2>{job ? "Ứng tuyển vị trí này" : "Gửi hồ sơ ứng tuyển"}</h2>
      <p className="muted">{job ? job.title : "Chưa thấy vị trí phù hợp? Để lại hồ sơ, chúng tôi sẽ liên hệ khi có vị trí mới."}</p>
      {done && <p className="react-notice" role="status">{done}</p>}
      <div className="job-apply-grid">
        <Field label="Họ tên" name="name" required autoComplete="name" />
        <Field label="Số điện thoại" name="phone" type="tel" required autoComplete="tel" />
        <Field label="Email" name="email" type="email" />
        {!job && <Field label="Vị trí mong muốn" name="position" placeholder="VD: Kỹ thuật viên điện lạnh" />}
        <Field label="Kinh nghiệm">
          <select name="experience" defaultValue="">
            <option value="">Chọn…</option>
            {["Chưa có kinh nghiệm", "Dưới 1 năm", "1 – 2 năm", "3 – 5 năm", "Trên 5 năm"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <div className="job-apply-wide"><Field label="Link CV (Google Drive, TopCV…)" name="cv" type="url" placeholder="https://" /></div>
        <div className="job-apply-wide"><Field label="Giới thiệu ngắn về bản thân"><textarea name="intro" rows={3} /></Field></div>
      </div>
      <label className="check"><input name="consent" type="checkbox" required /> Tôi đồng ý để công ty lưu và dùng thông tin này cho mục đích tuyển dụng.</label>
      <button className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>{busy ? "Đang gửi…" : "Gửi hồ sơ"}</button>
    </form>
  );
}

export function JobsPage({ slug }: { slug?: string }) {
  const jobs: Row[] = (dt.jobs || []).filter((j: Row) => j.published !== false);
  const job = slug ? jobs.find((j) => j.slug === slug) : undefined;
  const [dept, setDept] = useState("");
  useMeta(job ? `${job.title} – Tuyển dụng` : "Tuyển dụng", job?.summary || "Cơ hội việc làm tại công ty: kỹ thuật viên điện lạnh, kinh doanh, chăm sóc khách hàng. Thu nhập cạnh tranh, đào tạo bài bản.");
  useJsonLd(
    job ? "JobPosting" : "ItemList",
    job
      ? { title: job.title, description: [job.summary, job.description].filter(Boolean).join(" "), datePosted: String(job.created_at || job.updated_at || today()).slice(0, 10), validThrough: job.deadline || undefined, employmentType: job.type === "Bán thời gian" ? "PART_TIME" : job.type === "Thực tập" ? "INTERN" : job.type === "Thời vụ" ? "TEMPORARY" : "FULL_TIME", hiringOrganization: { "@type": "Organization", name: dt.config.company || dt.config.name }, jobLocation: { "@type": "Place", address: job.location || dt.config.address } }
      : { itemListElement: sorted(jobs).map((j, i) => ({ "@type": "ListItem", position: i + 1, name: j.title, url: dt.u.abs(jobUrl(j)) })) },
  );
  if (slug && !job) return <Empty heading={1} title="Vị trí tuyển dụng không tồn tại hoặc đã đóng" />;

  if (job) {
    const off = expired(job);
    const others = sorted(jobs.filter((j) => j.slug !== job.slug && !expired(j))).slice(0, 3);
    const facts: [string, string, unknown][] = [
      ["card", "Mức lương", job.salary || "Thỏa thuận"], ["pin", "Nơi làm việc", job.location], ["user", "Số lượng", job.quantity ? `${job.quantity} người` : ""],
      ["clock", "Hình thức", job.type], ["star", "Kinh nghiệm", job.experience], ["calendar", "Hạn nộp", vnDate(job.deadline)],
    ];
    return (
      <>
        <Breadcrumb items={[{ label: "Tuyển dụng", href: "tuyen-dung.html" }, { label: job.title }]} />
        <div className="container job-detail">
          <header className="job-head section-box">
            <div>
              <small className="job-kicker">{[job.department, job.type].filter(Boolean).join(" · ")}</small>
              <h1>{job.title}</h1>
              {job.summary && <p>{job.summary}</p>}
            </div>
            {off ? <span className="job-badge job-badge-off">Đã hết hạn nhận hồ sơ</span> : <a className="btn btn-primary" href="#ung-tuyen">Ứng tuyển ngay</a>}
          </header>
          <div className="job-layout">
            <div className="job-main">
              {[["Mô tả công việc", job.description], ["Yêu cầu ứng viên", job.requirements], ["Quyền lợi", job.benefits]].filter(([, h]) => String(h || "").trim()).map(([t, h]) => (
                <section className="section-box job-section" key={String(t)}><h2>{String(t)}</h2><Rich className="article-content" html={h} /></section>
              ))}
              {!off && <ApplyForm job={job} />}
            </div>
            <aside className="job-side">
              <div className="section-box job-summary">
                <h2>Thông tin chung</h2>
                <dl>{facts.filter(([, , v]) => v).map(([i, l, v]) => <div key={l}><dt><Icon name={i} />{l}</dt><dd>{String(v)}</dd></div>)}</dl>
                {!off && <a className="btn btn-primary btn-block" href="#ung-tuyen">Ứng tuyển ngay</a>}
              </div>
              <div className="section-box job-contact">
                <h2>Liên hệ tuyển dụng</h2>
                {job.contact ? <p className="pre-line">{job.contact}</p> : <p>Gửi CV hoặc hỏi thêm thông tin qua:</p>}
                <a className="btn btn-outline btn-block" href={`tel:${dt.u.tel(dt.config.hotline)}`}><Icon name="phone" />{dt.config.hotline}</a>
                {dt.config.email && <a className="btn btn-outline btn-block" href={`mailto:${dt.config.email}?subject=${encodeURIComponent("Ứng tuyển: " + job.title)}`}><Icon name="mail" />Gửi CV qua email</a>}
              </div>
            </aside>
          </div>
          {others.length > 0 && <section className="job-others"><h2>Vị trí khác đang tuyển</h2><div className="job-grid">{others.map((j) => <JobCard key={j.slug} job={j} />)}</div></section>}
        </div>
      </>
    );
  }

  const open = jobs.filter((j) => !expired(j));
  const depts = [...new Set(jobs.map((j) => j.department).filter(Boolean))] as string[];
  const shown = sorted(jobs.filter((j) => !dept || j.department === dept));
  const perks: [string, string, string][] = [["card", "Thu nhập cạnh tranh", "Lương cứng + thưởng theo hiệu quả, xét tăng lương hằng năm."], ["shield", "Đầy đủ chế độ", "BHXH, BHYT, nghỉ phép, đồng phục và dụng cụ làm việc."], ["tool", "Đào tạo bài bản", "Kèm cặp thực tế, cập nhật công nghệ Inverter, VRV/VRF."], ["star", "Lộ trình thăng tiến", "Cơ hội lên trưởng nhóm, quản lý chi nhánh."]];
  return (
    <>
      <section className="page-banner job-banner">
        <div className="container">
          <h1>Tuyển dụng</h1>
          <p>Cùng {dt.config.name || "chúng tôi"} mang không gian mát lành đến hàng nghìn gia đình và doanh nghiệp.</p>
          <div className="job-stats"><span><b>{open.length}</b> vị trí đang tuyển</span><span><b>{open.reduce((s, j) => s + (Number(j.quantity) || 1), 0)}</b> chỉ tiêu</span></div>
        </div>
      </section>
      <div className="container">
        {jobs.length ? (
          <>
            {depts.length > 1 && (
              <div className="job-filter" role="tablist" aria-label="Lọc theo bộ phận">
                {["", ...depts].map((d) => <button type="button" role="tab" key={d || "all"} aria-selected={dept === d} className={dept === d ? "on" : ""} onClick={() => setDept(d)}>{d || "Tất cả"}<b>{jobs.filter((j) => !d || j.department === d).length}</b></button>)}
              </div>
            )}
            <div className="job-grid">{shown.map((j) => <JobCard key={j.slug} job={j} />)}</div>
          </>
        ) : (
          <div className="section-box job-empty"><Icon name="user" /><p>Hiện chưa có vị trí đang tuyển. Bạn vẫn có thể gửi hồ sơ, chúng tôi sẽ liên hệ khi có vị trí phù hợp.</p></div>
        )}
        <section className="job-perks">
          <h2>Vì sao làm việc cùng chúng tôi</h2>
          <div className="job-perk-grid">{perks.map(([i, t, d]) => <div className="job-perk" key={t}><span><Icon name={i} /></span><b>{t}</b><p>{d}</p></div>)}</div>
        </section>
        <div className="job-general"><ApplyForm /></div>
      </div>
    </>
  );
}
