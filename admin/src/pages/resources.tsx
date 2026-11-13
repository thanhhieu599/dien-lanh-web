import { ProductStockHistory } from "../components/stock";
import { RICH_MAX } from "../components/editor";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { ad, dt, downloadCSV, loadCache, money } from "../services/runtime";
import {
  Action,
  Badge,
  DataState,
  DetailLink,
  Filters,
  Head,
  Image,
  Pager,
  Panel,
  Table,
  useData,
  useNotice,
} from "../components/common";
import { EditorField, ProductMembership } from "../components/fields";
import type { Row, FieldSpec } from "../types";
export function ResourceList({ resource: key }: { resource: string }) {
  const r = ad.resources[key];
  const [params] = useSearchParams();
  const notice = useNotice();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const size = r.pageSize || 20;
  const options = {
    order: r.order,
    filters: (r.filters || []).map((f: Row) => [
      f.key,
      f.op || "eq",
      params.get(f.key) || undefined,
    ]),
    search: params.get("q")
      ? { q: params.get("q"), cols: r.search }
      : undefined,
  };
  const state = useData(
    () =>
      ad.db.list(r.table, {
        ...options,
        limit: size,
        offset: (page - 1) * size,
      }),
    [key, params.toString()],
  );
  const summary = (row: Row) =>
    row.name || row.title || row.question || row.code || (row.contract_id ? `Bảo trì ${row.date}` : row.id) || row.key;
  // Cột riêng khai báo trong resources.js (listColumns): tiền, đúng/sai, tên khách bảo trì
  const contractName = (id: unknown) =>
    (ad.cache.maintenance_contracts || []).find((c: Row) => String(c.id) === String(id))?.name || id;
  const extra = r.listColumns
    ? r.listColumns.map((c: Row) => ({
        label: c.label,
        render: (row: Row) =>
          c.money ? money(row[c.key]) : c.bool ? (row[c.key] ? "Có" : "Chưa") : c.contract ? contractName(row[c.key]) : row[c.key],
      }))
    : key === "products"
      ? [
          { label: "Giá bán", render: (row: Row) => money(row.price) },
          { label: "Tồn kho", key: "stock" },
          { label: "Danh mục", key: "cat" },
        ]
      : key === "coupons"
        ? [
            { label: "Loại giảm", key: "type" },
            { label: "Giá trị", key: "value" },
            { label: "Đã dùng", key: "used_count" },
          ]
        : [
            { label: "Thứ tự", key: "sort" },
            {
              label: key === "posts" ? "Ngày" : "Mã",
              key: key === "posts" ? "date" : ad.PK[key],
            },
          ];
  return (
    <>
      <Head title={r.title}>
        <Link className="btn btn-primary" to={`/${key}/new`}>
          Thêm mới
        </Link>
        <Action
          run={async () => {
            const all = await ad.db.list(r.table, { ...options, limit: 50000 });
            const keys =
              r.csv ||
              r.fields.filter((f) => !f.key.startsWith("_")).map((f) => f.key);
            downloadCSV(
              `${key}.csv`,
              keys.map((k: string) => ({ label: k, key: k })),
              all.rows,
            );
            notice(`Đã xuất ${all.rows.length} bản ghi`);
          }}
        >
          Xuất CSV
        </Action>
      </Head>
      <Filters placeholder={`Tìm ${r.title.toLowerCase()}…`}>
        {(r.filters || []).map((f: Row) => (
          <label key={f.key}>
            <span>{f.label}</span>
            <select name={f.key} defaultValue={params.get(f.key) || ""}>
              <option value="">Tất cả</option>
              {(typeof f.options === "function" ? f.options() : f.options).map(
                ([v, l]: any) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ),
              )}
            </select>
          </label>
        ))}
      </Filters>
      <DataState state={state}>
        {state.data && (
          <Panel>
            <Table
              rows={state.data.rows}
              rowKey={ad.PK[key]}
              columns={[
                {
                  label: r.title,
                  render: (row) => (
                    <DetailLink resource={key} row={row} label={summary(row)} />
                  ),
                },
                ...(key === "products"
                  ? [
                      {
                        label: "Ảnh",
                        render: (row: Row) => (
                          <div className="ar-thumb">
                            <Image src={row.images?.[0]} />
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...extra,
                {
                  label: "Hiển thị",
                  render: (row) => (
                    <Badge
                      value={
                        row.active === false || row.published === false
                          ? "Đã ẩn / Nháp"
                          : "Đang hiển thị"
                      }
                    />
                  ),
                },
              ]}
            />
            <Pager count={state.data.count} size={size} />
          </Panel>
        )}
      </DataState>
    </>
  );
}
export function ResourceEditor({ resource: key }: { resource: string }) {
  const id = decodeURIComponent(useLocation().pathname.split("/")[2] || "new");
  const [params] = useSearchParams();
  const editing = id !== "new";
  const r = ad.resources[key];
  const state = useData(async () => {
    const loaded = editing
      ? await ad.db.get(r.table, id)
      : params.get("from")
        ? await ad.db.get(r.table, params.get("from"))
        : null;
    if (editing && !loaded) throw new Error("Bản ghi không tồn tại.");
    const row: Row = { ...(r.defaults?.() || {}), ...(loaded || {}) };
    if (key === "coupons" && row.condition_type === undefined)
      row.condition_type = Number(row.min) > 0 ? "order_min" : "none";
    for (const f of r.fields)
      if (row[f.key] === undefined)
        row[f.key] =
          f.def !== undefined
            ? f.def
            : f.type === "kv"
              ? {}
              : ["gallery", "lines", "tags"].includes(f.type || "")
                ? []
                : f.type === "bool"
                  ? false
                  : undefined;
    if (!editing) {
      delete row[ad.PK[key]];
      if (params.get("from")) {
        row.sku = `${row.sku || "SKU"}-COPY`;
        row.slug = "";
        row.name = `${row.name || ""} (bản sao)`;
      }
    }
    return row;
  }, [key, id, params.get("from")]);
  return (
    <DataState state={state}>
      {state.data && (
        <Editor
          key={`${key}-${id}-${params.get("from")}`}
          resource={key}
          initial={state.data}
          editing={editing}
          id={id}
        />
      )}
    </DataState>
  );
}
function Editor({
  resource: key,
  initial,
  editing,
  id,
}: {
  resource: string;
  initial: Row;
  editing: boolean;
  id: string;
}) {
  const [row, setRow] = useState<Row>(initial);
  const [errors, setErrors] = useState<Row>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const tabs = RESOURCE_TABS[key];
  const [tab, setTab] = useState(tabs?.[0].id || "");
  const notice = useNotice();
  const navigate = useNavigate();
  const r = ad.resources[key];
  const pk = ad.PK[key];
  const fields = r.fields.filter((f) => !f.key.startsWith("_"));
  const patch = (data: Row) => setRow((prev) => ({ ...prev, ...data }));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || pending) return;
    const data: Row = {};
    const problems: Row = {};
    for (const f of fields) {
      if (f.type === "readonly" || f.readonly || (editing && f.readonlyOnEdit))
        continue;
      let value = row[f.key];
      if (
        typeof value === "string" &&
        !["html", "textarea"].includes(f.type || "")
      )
        value = value.trim();
      // Trình soạn thảo: chỉ còn thẻ rỗng (<p><br></p>) coi như chưa nhập
      if (f.type === "html" && typeof value === "string" && !value.replace(/<(?!img|table|iframe|hr)[^>]*>|&nbsp;|\s/gi, ""))
        value = "";
      if (f.type === "html" && typeof value === "string" && value.length > RICH_MAX)
        problems[f.key] = `Nội dung quá dài (tối đa ${RICH_MAX.toLocaleString("vi-VN")} ký tự HTML).`;
      if (f.required && (value == null || value === ""))
        problems[f.key] = "Vui lòng nhập thông tin này.";
      const err = f.validate?.(value, { ...row, ...data });
      if (err) problems[f.key] = err;
      data[f.key] =
        value === "" &&
        !f.keepEmpty &&
        !["textarea", "html", "image"].includes(f.type || "")
          ? null
          : (value ?? null);
    }
    if (key === "brands") {
      data.slug = dt.u.slugify(data.name);
      if (!data.slug) problems.name = "Tên thương hiệu cần có chữ hoặc số.";
      data.product_ids = row.product_ids;
    }
    if (key === "categories") {
      const subs = normalizeSubs(row.subs);
      Object.assign(data, {
        product_ids: row.product_ids,
        excluded_product_ids: row.excluded_product_ids,
        subs: subs.list,
        filters: row.filters || [],
      });
      if (subs.error) problems.subs = subs.error;
      const filters = normalizeFilters(row.filters);
      data.filters = filters.list;
      if (filters.error) problems.filters = filters.error;
    }
    if (key === "coupons") {
      if (!editing) data.code = String(data.code || "").toUpperCase();
      if (data.type === "ship") data.value = 0;
      for (const n of ["min", "value", "max", "usage_limit", "condition_value"])
        if (
          data[n] != null &&
          (!Number.isInteger(Number(data[n])) || Number(data[n]) < 0)
        )
          problems[n] = "Nhập số nguyên từ 0 trở lên.";
      if (data.usage_limit != null && data.usage_limit < 1)
        problems.usage_limit =
          "Giới hạn lượt dùng phải từ 1 trở lên hoặc để trống.";
      if (data.ends_at && data.starts_at && data.ends_at <= data.starts_at)
        problems.ends_at = "Kết thúc phải sau thời điểm bắt đầu.";
      Object.assign(data, {
        product_ids: data.scope === "products" ? row.product_ids || [] : [],
        category_ids: data.scope === "categories" ? row.category_ids || [] : [],
        customer_groups: row.customer_groups || [],
      });
      if (
        (data.scope === "products" && !data.product_ids.length) ||
        (data.scope === "categories" && !data.category_ids.length)
      )
        problems.scope = "Vui lòng chọn sản phẩm hoặc danh mục áp dụng.";
      if (data.condition_type !== "order_min") data.min = 0;
      if (!["eligible_min", "eligible_qty"].includes(data.condition_type))
        data.condition_value = 0;
      if (data.type !== "percent") data.max = null;
    }
    setErrors(problems);
    // Trang chia mục: tự mở mục đầu tiên đang có lỗi để người dùng thấy ngay
    const errorTab = tabs?.find((t) => Object.keys(problems).some((k) => t.keys.includes(k) || t.extra === k));
    if (errorTab) setTab(errorTab.id);
    if (Object.keys(problems).length) {
      notice("Vui lòng kiểm tra các trường báo lỗi.", true);
      return;
    }
    r.beforeSave?.(data, editing);
    setBusy(true);
    try {
      let saved: Row;
      if (r.save) saved = await r.save(data, { editing, id });
      else if (editing) saved = await ad.db.update(r.table, id, data);
      else {
        try {
          saved = await ad.db.insert(r.table, data);
        } catch (err) {
          const retry = r.onDuplicate?.(data, (err as Row).raw || String(err));
          if (!retry) throw err;
          saved = await ad.db.insert(r.table, retry);
        }
      }
      setRow((prev) => ({ ...prev, ...saved }));
      await loadCache();
      notice("Đã lưu thay đổi.");
      navigate(`/${key}/${encodeURIComponent(saved[pk] ?? id)}`, {
        replace: true,
      });
    } catch (err) {
      notice(err instanceof Error ? err.message : String(err), true);
    } finally {
      setBusy(false);
    }
  }
  function field(f: FieldSpec) {
    if (f.key === "attrs") {
      const cat = (ad.cache.categories || []).find(
        (c: Row) => c.id === row.cat,
      );
      return (
        <section className="ar-field full" key="attrs">
          <h3>Thuộc tính bộ lọc</h3>
          <div className="ar-grid">
            {(cat?.filters || []).map((a: Row) => (
              <label key={a.key}>
                {a.label}
                <select
                  data-attr={a.key}
                  value={row.attrs?.[a.key] || ""}
                  onChange={(e) =>
                    patch({
                      attrs: { ...(row.attrs || {}), [a.key]: e.target.value },
                    })
                  }
                >
                  <option value="">Chọn…</option>
                  {a.options.map((v: string) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {!cat?.filters?.length && <p>Danh mục chưa cấu hình bộ lọc.</p>}
        </section>
      );
    }
    return (
      <EditorField
        key={f.key}
        field={f}
        value={row[f.key]}
        row={row}
        editing={editing}
        error={errors[f.key]}
        onPending={(n) => setPending((v) => v + n)}
        onChange={(v) =>
          patch({
            [f.key]: v,
            ...(f.key === "cat"
              ? { sub: "", sub2: "", attrs: {} }
              : f.key === "sub"
                ? { sub2: "" }
                : {}),
          })
        }
      />
    );
  }
  return (
    <>
      <Head
        title={
          editing
            ? String(
                row.name || row.title || row.question || row.code || r.title,
              )
            : `Thêm ${r.title.toLowerCase()}`
        }
        subtitle={
          editing
            ? "Chỉnh sửa dữ liệu dùng chung với website"
            : "Tạo bản ghi mới"
        }
      >
        <Link className="btn btn-light" to={`/${key}`}>
          Quay lại
        </Link>
        {editing && r.preview && (
          <a
            className="btn btn-light"
            href={r.preview(row)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Xem trên web
          </a>
        )}
        {editing && r.duplicate && (
          <Link
            className="btn btn-light"
            to={`/${key}/new?from=${encodeURIComponent(id)}`}
          >
            Nhân bản
          </Link>
        )}
        {editing && (
          <Action
            confirm="Xóa bản ghi này? Bạn có thể chọn ẩn để giữ lịch sử."
            run={async () => {
              await ad.db.remove(r.table, id);
              await loadCache();
              notice("Đã xóa bản ghi.");
              navigate(`/${key}`);
            }}
          >
            Xóa
          </Action>
        )}
      </Head>
      <form id="frm" className="ar-editor" onSubmit={submit}>
        <fieldset disabled={busy} className="ar-fieldset">
          {tabs ? (
            <ResourceTabs
              tabs={tabs}
              tab={tab}
              onTab={setTab}
              row={row}
              errors={errors}
              fields={fields}
              field={field}
              patch={patch}
              resource={key}
            />
          ) : key === "products" && r.formSections ? (
            <div className="ar-editor-columns">
              {["main", "aside"].map((group) => (
                <div key={group}>
                  {r.formSections[group].map(([sid, title, keys]: any) => (
                    <Panel title={title} key={sid}>
                      <div className="ar-grid">
                        {keys
                          .map((k: string) => fields.find((f) => f.key === k))
                          .filter(Boolean)
                          .map(field)}
                      </div>
                    </Panel>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <Panel>
              <div className="ar-grid">{fields.map(field)}</div>
            </Panel>
          )}
        </fieldset>
        <div className={`ar-form-foot${tabs ? " ce-savebar" : ""}`}>
          <button
            id="save"
            className="btn btn-primary"
            disabled={busy || pending > 0}
            aria-busy={busy}
          >
            {busy ? "Đang lưu…" : pending ? "Đang tải ảnh…" : "Lưu"}
          </button>
          <Link to={`/${key}`} className="btn btn-light">
            Hủy
          </Link>
        </div>
      </form>
    </>
  );
}
// Mã giảm giá: chọn danh mục / sản phẩm được giảm (theo "Phạm vi sản phẩm")
function toggleIn(row: Row, key: string, value: any) {
  const list = row[key] || [];
  return { [key]: list.map(String).includes(String(value)) ? list.filter((v: any) => String(v) !== String(value)) : [...list, value] };
}
function CouponScope({ row, onChange, error }: { row: Row; onChange: (patch: Row) => void; error?: string }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const all: Row[] = ad.cache.products || [];
  const chosen = (row.product_ids || []).map(String);
  // Chưa gõ tìm: chỉ hiện sản phẩm đã chọn; gõ tìm: hiện sản phẩm khớp
  const products = query.trim() ? all.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase())) : all.filter((p) => chosen.includes(String(p.id)));
  if (row.scope !== "categories" && row.scope !== "products") return <p className="ce-empty">Phạm vi đang là "Tất cả sản phẩm". Chọn "Danh mục đã chọn" hoặc "Sản phẩm đã chọn" ở trên để giới hạn.</p>;
  return (
    <div className="ce-sub coupon-scope">
      {error && <p className="ar-error" role="alert">{error}</p>}
      {row.scope === "categories" && (
        <>
          <h3>Danh mục được giảm</h3>
          <div className="coupon-checks">
            {(ad.cache.categories || []).map((c: Row) => (
              <label className="ar-check" key={c.id}>
                <input type="checkbox" checked={(row.category_ids || []).includes(c.id)} onChange={() => onChange(toggleIn(row, "category_ids", c.id))} />
                {c.name}
              </label>
            ))}
          </div>
        </>
      )}
      {row.scope === "products" && (
        <>
          <h3>Sản phẩm được giảm <small>{chosen.length} đã chọn</small></h3>
          <label className="pm-add">
            Tìm sản phẩm
            <input type="search" value={query} placeholder="Gõ tên hoặc mã SKU để tìm và chọn thêm…" onChange={(e) => { setQuery(e.target.value); setLimit(20); }} />
          </label>
          <div className="coupon-checks coupon-products">
            {products.slice(0, limit).map((p: Row) => (
              <label className="ar-check" key={p.id}>
                <input type="checkbox" checked={chosen.includes(String(p.id))} onChange={() => onChange(toggleIn(row, "product_ids", p.id))} />
                {p.name} · {p.sku}
              </label>
            ))}
            {!products.length && <p className="ce-empty">{query.trim() ? "Không tìm thấy sản phẩm phù hợp." : "Chưa chọn sản phẩm nào. Gõ vào ô tìm để chọn."}</p>}
          </div>
          {products.length > limit && <button type="button" className="btn btn-light" onClick={() => setLimit((v) => v + 20)}>Xem thêm sản phẩm</button>}
        </>
      )}
    </div>
  );
}
// Mã giảm giá: nhóm khách hàng được dùng mã
function CouponGroups({ row, onChange }: { row: Row; onChange: (patch: Row) => void }) {
  const groups = useData(async () => {
    const result = await ad.db.list("crm_customer_summary", { limit: 50000 });
    return Array.from(new Set(result.rows.flatMap((r) => r.tags || []))).map(String);
  });
  return (
    <div className="coupon-checks">
      {[["vip", "Khách VIP"], ["marketing", "Khách đồng ý nhận quảng cáo"], ...(groups.data || []).filter((t) => t !== "VIP").map((t) => [`tag:${t}`, t])].map(([value, label]) => (
        <label className="ar-check" key={value}>
          <input type="checkbox" checked={(row.customer_groups || []).includes(value)} onChange={() => onChange(toggleIn(row, "customer_groups", value))} />
          {label}
        </label>
      ))}
    </div>
  );
}
// Nhóm (cấp 2) và mục (cấp 3) của danh mục: hiện thành menu 2 bậc trên website
type SubItem = { id: string; name: string };
type SubGroup = SubItem & { items?: SubItem[] };
function uniqueSlug(name: string, taken: Set<string>) {
  const base = dt.u.slugify(name) || "muc";
  let id = base,
    n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}
// Gán mã (slug) cho nhóm/mục mới thêm; mã cũ giữ nguyên để link và sản phẩm đã gán không bị mất
function normalizeSubs(value: unknown): { list: SubGroup[]; error?: string } {
  if (!Array.isArray(value))
    return { list: [], error: "Danh sách nhóm không hợp lệ." };
  const groups = new Set(value.map((s: Row) => s?.id).filter(Boolean));
  let error: string | undefined;
  const list = value.map((s: Row) => {
    const name = String(s?.name || "").trim();
    if (!name) error = "Tên nhóm và tên mục không được để trống.";
    const id =
      s?.id && /^[a-z0-9-]+$/.test(s.id) ? s.id : uniqueSlug(name, groups);
    const taken = new Set<string>(
      (s?.items || []).map((x: Row) => x?.id).filter(Boolean),
    );
    const items = (Array.isArray(s?.items) ? s.items : []).map((x: Row) => {
      const itemName = String(x?.name || "").trim();
      if (!itemName) error = "Tên nhóm và tên mục không được để trống.";
      return {
        id:
          x?.id && /^[a-z0-9-]+$/.test(x.id)
            ? x.id
            : uniqueSlug(itemName, taken),
        name: itemName,
      };
    });
    return { id, name, ...(items.length ? { items } : {}) };
  });
  return { list, error };
}
function SubsEditor({
  value,
  onChange,
  error,
}: {
  value: SubGroup[];
  onChange: (v: SubGroup[]) => void;
  error?: string;
}) {
  const subs: SubGroup[] = Array.isArray(value) ? value : [];
  const setGroup = (i: number, data: Partial<SubGroup>) =>
    onChange(subs.map((s, j) => (j === i ? { ...s, ...data } : s)));
  const move = <T,>(list: T[], i: number, d: number) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  };
  // Nút ↑ ↓ Xóa dùng chung cho nhóm và mục
  const tools = (name: string, i: number, total: number, onMove: (d: number) => void, onRemove: () => void, removeLabel = "Xóa") => (
    <div className="ce-tools">
      <button type="button" className="btn btn-light btn-icon" aria-label={`Đưa ${name} lên`} disabled={i === 0} onClick={() => onMove(-1)}>↑</button>
      <button type="button" className="btn btn-light btn-icon" aria-label={`Đưa ${name} xuống`} disabled={i === total - 1} onClick={() => onMove(1)}>↓</button>
      <button type="button" className="btn btn-light ce-del" onClick={onRemove}>{removeLabel}</button>
    </div>
  );
  return (
    <div className="ce-list cat-menu">
      {error && <p className="ar-error" role="alert">{error}</p>}
      {subs.length === 0 && <p className="ce-empty">Danh mục chưa có nhóm nào.</p>}
      {subs.map((s, i) => {
        const items = s.items || [];
        return (
          <div className="ce-row ar-tree-item cat-group" key={s.id || `new-${i}`}>
            <div className="cat-group-head">
              <label className="cat-group-name">
                <span>Tên nhóm {i + 1}</span>
                <input value={s.name || ""} placeholder="Ví dụ: Máy lạnh treo tường" onChange={(e) => setGroup(i, { name: e.target.value })} />
              </label>
              {tools(`nhóm ${s.name || i + 1}`, i, subs.length, (d) => onChange(move(subs, i, d)), () => {
                if (!items.length || confirm(`Xóa nhóm "${s.name}" và ${items.length} mục bên trong?`)) onChange(subs.filter((_, j) => j !== i));
              }, "Xóa nhóm")}
            </div>
            {s.id && <small className="cat-code">Mã: {s.id}</small>}
            <ol className="cat-items">
              {items.map((it, k) => (
                <li key={it.id || `new-${k}`}>
                  <label>
                    <span>Mục {k + 1}</span>
                    <input value={it.name || ""} placeholder="Tên mục" onChange={(e) => setGroup(i, { items: items.map((x, m) => (m === k ? { ...x, name: e.target.value } : x)) })} />
                  </label>
                  {tools(`mục ${it.name || k + 1}`, k, items.length, (d) => setGroup(i, { items: move(items, k, d) }), () => setGroup(i, { items: items.filter((_, m) => m !== k) }))}
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-light cat-add-item" onClick={() => setGroup(i, { items: [...items, { id: "", name: "" }] })}>
              + Thêm mục vào nhóm
            </button>
          </div>
        );
      })}
      <button type="button" className="btn btn-primary ce-add" onClick={() => onChange([...subs, { id: "", name: "", items: [] }])}>
        + Thêm nhóm
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Trang sửa chia mục
// Các trang sửa dài chia thành mục ở cột trái; mỗi lần chỉ hiện 1 mục trong 1 khung phẳng (không lồng khung).
// extra = khối riêng ngoài các trường thường (menu nhóm/mục, bộ lọc, sản phẩm, phạm vi mã giảm giá…).
type ResourceTab = { id: string; label: string; hint: string; keys: string[]; extra?: string };
const tab = (id: string, label: string, hint: string, keys: string[], extra?: string): ResourceTab => ({ id, label, hint, keys, extra });
export const RESOURCE_TABS: Record<string, ResourceTab[]> = {
  categories: [
    tab("general", "Thông tin chung", "Tên, mã đường dẫn, biểu tượng và thứ tự hiển thị của danh mục.", ["name", "short", "id", "icon", "art", "sort", "active"]),
    tab("images", "Hình ảnh", "Ảnh danh mục (hiện lớn ở đầu trang danh mục) và ảnh quảng cáo ở cột đầu dải sản phẩm trên trang chủ.", ["image", "promo_image", "promo_title", "promo_href"]),
    tab("menu", "Nhóm & mục menu", "Nhóm là tiêu đề cột trong menu Sản phẩm (vd \"Máy lạnh treo tường\"), mục là các dòng bên dưới. Mã được tạo tự động khi lưu.", [], "subs"),
    tab("filters", "Bộ lọc sản phẩm", "Bộ lọc là các ô khách bấm ở cột trái trang danh mục để thu hẹp sản phẩm theo thông số (vd Công suất: 1 HP, 1.5 HP; Công nghệ: Inverter). Cách dùng: (1) đặt tên bộ lọc và các giá trị ở đây, (2) vào Sản phẩm → sửa từng sản phẩm → Thuộc tính bộ lọc để chọn giá trị cho sản phẩm đó. Giá trị chưa gán cho sản phẩm nào sẽ tự ẩn trên website. Không dùng bộ lọc để đặt tên sản phẩm hay danh mục.", [], "filters"),
    tab("products", "Sản phẩm", "Sản phẩm thuộc danh mục và thứ tự hiển thị trên website.", [], "productMembership"),
  ],
  brands: [
    tab("general", "Thông tin & logo", "Tên thương hiệu, trạng thái hiển thị và logo trên trang Thương hiệu.", ["name", "active", "logo"]),
    tab("products", "Sản phẩm", "Sản phẩm thuộc thương hiệu và thứ tự hiển thị trên website.", [], "productMembership"),
  ],
  products: [
    tab("basic", "Thông tin chung", "Tên, mã, phân loại và trạng thái bán trên website.", ["name", "sku", "slug", "active", "cat", "sub", "sub2", "brand", "warranty", "technology", "origin", "product_tags"]),
    tab("pricing", "Giá & tồn kho", "Giá bán, giá vốn, tồn kho, đơn vị, mã vạch, khuyến mãi và vận chuyển. Lịch sử kho ở cuối mục.", ["price", "old_price", "wholesale_price", "cost_price", "stock", "sold", "min_stock", "unit", "barcode", "location", "flash_sale", "free_install", "gift", "requires_shipping", "weight", "weight_unit"], "stockHistory"),
    tab("content", "Mô tả", "Nội dung giới thiệu sản phẩm hiện ở trang chi tiết.", ["description"]),
    tab("images", "Hình ảnh", "Ảnh sản phẩm; ảnh đầu tiên là ảnh đại diện.", ["images"]),
    tab("attributes", "Thuộc tính & thông số", "Tùy chọn khách chọn khi mua, giá trị bộ lọc của danh mục và bảng thông số kỹ thuật.", ["options", "attrs", "specs"]),
    tab("reviews", "Đánh giá", "Số sao và số lượt đánh giá hiển thị trên website.", ["rating", "reviews"]),
  ],
  coupons: [
    tab("main", "Mã & mức giảm", "Mã khách nhập, loại giảm, mức giảm, thời gian hiệu lực và trạng thái.", ["code", "type", "value", "max", "min", "usage_limit", "used_count", "starts_at", "ends_at", "description", "active", "is_public"]),
    tab("scope", "Phạm vi & điều kiện", "Sản phẩm / danh mục được giảm và điều kiện áp dụng.", ["scope", "condition_type", "condition_value", "combine_discounts", "once_per_customer"], "couponScope"),
    tab("groups", "Nhóm khách hàng", "Không chọn nhóm nào = áp dụng cho tất cả khách hàng.", [], "couponGroups"),
  ],
  projects: [
    tab("info", "Thông tin dự án", "Tên, khách hàng, quy mô và trạng thái đăng.", ["title", "slug", "client", "industry", "location", "year", "sort", "units", "capacity", "duration", "published", "featured", "summary"]),
    tab("images", "Hình ảnh", "Ảnh trước / sau thi công và thư viện ảnh.", ["before_image", "after_image", "images"]),
    tab("content", "Nội dung", "Bài viết chi tiết: yêu cầu, giải pháp, kết quả.", ["content"]),
    tab("testimonial", "Cảm nhận khách hàng", "Lời nhận xét của khách hàng về dự án.", ["testimonial", "testimonial_name", "testimonial_role"]),
  ],
  posts: [
    tab("info", "Thông tin bài viết", "Tiêu đề, đường dẫn, chuyên mục, ngày đăng và mô tả ngắn cho Google.", ["title", "slug", "cat", "date", "author", "art", "published", "excerpt"]),
    tab("content", "Nội dung", "Nội dung bài viết.", ["content"]),
  ],
};
function ResourceTabs({
  tabs,
  tab: active,
  onTab,
  row,
  errors,
  fields,
  field,
  patch,
  resource,
}: {
  tabs: ResourceTab[];
  tab: string;
  onTab: (t: string) => void;
  row: Row;
  errors: Row;
  fields: FieldSpec[];
  field: (f: FieldSpec) => ReactNode;
  patch: (data: Row) => void;
  resource: string;
}) {
  const products: Row[] = ad.cache.products || [];
  const field2 = resource === "brands" ? "brand" : "cat";
  const memberCount = Array.isArray(row.product_ids)
    ? row.product_ids.length
    : products.filter((p) => String(p[field2]) === String(row.id) && !(row.excluded_product_ids || []).map(String).includes(String(p.id))).length;
  // Trường không nằm trong mục nào (vd trường mới thêm) được đưa vào mục đầu tiên để không bị mất
  const listed = new Set(tabs.flatMap((t) => t.keys));
  const leftovers = fields.filter((f) => !listed.has(f.key)).map((f) => f.key);
  const keysOf = (t: ResourceTab, i: number) => (i === 0 ? [...t.keys, ...leftovers] : t.keys);
  const count = (t: ResourceTab) =>
    t.extra === "subs" ? (row.subs || []).length : t.extra === "filters" ? (row.filters || []).length : t.extra === "productMembership" ? memberCount : t.extra === "couponGroups" ? (row.customer_groups || []).length || null : null;
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  const current = tabs[index];
  const pick = (keys: string[]) => keys.map((k) => fields.find((f) => f.key === k)).filter(Boolean) as FieldSpec[];
  return (
    <div className="ce-layout cat-editor">
      <nav className="ce-nav" aria-label="Các mục">
        {tabs.map((t, i) => {
          const c = count(t);
          const bad = keysOf(t, i).some((k) => errors[k]) || (t.extra && errors[t.extra]);
          return (
            <div key={t.id}>
              <button type="button" className={`${t.id === current.id ? "active" : ""}${bad ? " has-error" : ""}`} aria-current={t.id === current.id ? "true" : undefined} onClick={() => onTab(t.id)}>
                {t.label}
                {c != null && <span className="ce-count">{c}</span>}
              </button>
            </div>
          );
        })}
      </nav>
      <section className="ar-panel ce-section" aria-labelledby="tab-title">
        <h2 id="tab-title" className="ce-title">{current.label}</h2>
        <p className="ce-hint">{current.hint}</p>
        {keysOf(current, index).length > 0 && <div className={`ar-grid ce-grid tab-${current.id}`}>{pick(keysOf(current, index)).map(field)}</div>}
        {current.extra === "subs" && <SubsEditor value={row.subs || []} error={errors.subs} onChange={(v) => patch({ subs: v })} />}
        {current.extra === "filters" && <FiltersEditor catId={String(row.id || "")} value={row.filters || []} error={errors.filters} onChange={(v) => patch({ filters: v })} />}
        {current.extra === "productMembership" && <ProductMembership row={row} kind={resource as "categories" | "brands"} onChange={patch} bare />}
        {current.extra === "couponScope" && <CouponScope row={row} onChange={patch} error={errors.scope} />}
        {current.extra === "couponGroups" && <CouponGroups row={row} onChange={patch} />}
        {current.extra === "stockHistory" && <ProductStockHistory productId={row.id} />}
      </section>
    </div>
  );
}

// Bộ lọc: mỗi dòng 1 bộ lọc gồm tên và các giá trị cách nhau bằng dấu phẩy. Mã (key) giữ nguyên để sản phẩm cũ không mất giá trị.
type CatFilter = { key: string; label: string; options: string[] };
function normalizeFilters(value: unknown): { list: CatFilter[]; error?: string } {
  if (!Array.isArray(value)) return { list: [], error: "Danh sách bộ lọc không hợp lệ." };
  const taken = new Set<string>(value.map((f: Row) => f?.key).filter(Boolean));
  let error: string | undefined;
  const list = value
    .filter((f: Row) => f && (String(f.label || "").trim() || (f.options || []).length))
    .map((f: Row) => {
      const label = String(f.label || "").trim();
      const options = (Array.isArray(f.options) ? f.options : []).map((o: unknown) => String(o).trim()).filter(Boolean);
      if (!label || !options.length) error = "Mỗi bộ lọc cần có tên và ít nhất 1 giá trị.";
      const key = typeof f.key === "string" && /^[a-z0-9_-]+$/.test(f.key) ? f.key : uniqueSlug(label, taken);
      return { key, label, options: [...new Set(options)] };
    });
  return { list, error };
}
function FiltersEditor({ catId, value, onChange, error }: { catId: string; value: Row[]; onChange: (v: Row[]) => void; error?: string }) {
  const list = Array.isArray(value) ? value : [];
  // Sản phẩm của danh mục đang gán giá trị nào cho từng bộ lọc (để biết bộ lọc nào thực sự dùng được trên website)
  const products: Row[] = (ad.cache.products || []).filter((p: Row) => String(p.cat) === catId);
  const usage = (f: Row) => {
    const counts: Record<string, number> = {};
    if (f.key) for (const p of products) { const v = p.attrs?.[f.key]; if (v) counts[v] = (counts[v] || 0) + 1; }
    return counts;
  };
  const set = (i: number, data: Row) => onChange(list.map((f, j) => (j === i ? { ...f, ...data } : f)));
  const move = (i: number, d: number) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="ce-list ce-table cat-filters">
      {error && <p className="ar-error" role="alert">{error}</p>}
      {list.length > 0 && (
        <div className="ce-thead" aria-hidden="true">
          <span>Tên bộ lọc</span>
          <span>Giá trị (cách nhau bằng dấu phẩy)</span>
          <span />
        </div>
      )}
      {list.length === 0 && <p className="ce-empty">Danh mục chưa có bộ lọc.</p>}
      {list.map((f, i) => (
        <div className="ce-trow" key={i}>
          <input aria-label={`Tên bộ lọc ${i + 1}`} placeholder="Ví dụ: Công suất" value={f.label || ""} onChange={(e) => set(i, { label: e.target.value })} />
          <FilterOptions index={i} value={f.options || []} onChange={(options) => set(i, { options })} />
          <div className="ce-tools">
            <button type="button" className="btn btn-light btn-icon" aria-label={`Đưa bộ lọc ${i + 1} lên`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="btn btn-light btn-icon" aria-label={`Đưa bộ lọc ${i + 1} xuống`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="btn btn-light ce-del" aria-label={`Xóa bộ lọc ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>Xóa</button>
          </div>
          <FilterUsage filter={f} counts={usage(f)} />
        </div>
      ))}
      <button type="button" className="btn btn-light ce-add" onClick={() => onChange([...list, { key: "", label: "", options: [] }])}>+ Thêm bộ lọc</button>
    </div>
  );
}
// Dưới mỗi bộ lọc: giá trị nào đã gán cho bao nhiêu sản phẩm; cảnh báo giá trị sản phẩm đang dùng nhưng đã bị đổi tên / xóa
function FilterUsage({ filter, counts }: { filter: Row; counts: Record<string, number> }) {
  const options: string[] = (filter.options || []).map((o: unknown) => String(o).trim()).filter(Boolean);
  if (!options.length) return null;
  const used = options.reduce((t, o) => t + (counts[o] || 0), 0);
  const orphan = Object.entries(counts).filter(([v]) => !options.includes(v));
  return (
    <p className="cat-filter-usage">
      {filter.key ? (used ? <>Website đang lọc được: {options.map((o) => `${o} (${counts[o] || 0})`).join(" · ")}</> : <>Chưa sản phẩm nào được gán giá trị — bộ lọc sẽ ẩn trên website. Vào <b>Sản phẩm → sửa sản phẩm → Thuộc tính bộ lọc</b> để chọn giá trị.</>) : <>Bộ lọc mới: lưu danh mục rồi gán giá trị cho từng sản phẩm.</>}
      {orphan.length > 0 && <span className="cat-filter-warn"> Có sản phẩm đang dùng giá trị không còn trong danh sách: {orphan.map(([v, n]) => `${v} (${n})`).join(", ")} — các sản phẩm này sẽ không hiện khi lọc, hãy thêm lại giá trị hoặc sửa sản phẩm.</span>}
    </p>
  );
}
// Ô giá trị: giữ nguyên chữ đang gõ (kể cả dấu phẩy cuối), chỉ tách thành danh sách khi lưu vào dữ liệu
function FilterOptions({ index, value, onChange }: { index: number; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState(() => value.join(", "));
  return (
    <input
      aria-label={`Giá trị bộ lọc ${index + 1}`}
      placeholder="1 HP, 1.5 HP, 2 HP"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean));
      }}
    />
  );
}

