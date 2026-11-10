import { useState, type FormEvent } from "react";
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
    row.name || row.title || row.question || row.code || row.id || row.key;
  const extra =
    key === "products"
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
      if (
        !Array.isArray(data.filters) ||
        data.filters.some(
          (f: Row) =>
            !f ||
            typeof f.key !== "string" ||
            typeof f.label !== "string" ||
            !Array.isArray(f.options) ||
            f.options.some((v: any) => typeof v !== "string"),
        )
      )
        problems.filters =
          "Bộ lọc cần có key, label và options là danh sách chuỗi.";
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
          {key === "products" && r.formSections ? (
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
          {key === "categories" && (
            <Panel title="Loại con và bộ lọc">
              <SubsEditor
                value={row.subs || []}
                error={errors.subs}
                onChange={(v) => patch({ subs: v })}
              />
              <EditorField
                field={{
                  key: "filters",
                  label: "Bộ lọc",
                  type: "json",
                  help: "Mảng đối tượng gồm key, label và options (mảng chuỗi).",
                }}
                value={row.filters || []}
                row={row}
                error={errors.filters}
                onChange={(v) => patch({ filters: v })}
              />
            </Panel>
          )}
          {["categories", "brands"].includes(key) && (
            <ProductMembership
              row={row}
              kind={key as "categories" | "brands"}
              onChange={patch}
            />
          )}
          {key === "coupons" && <CouponRules row={row} onChange={patch} />}
        </fieldset>
        <div className="ar-form-foot">
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
function CouponRules({
  row,
  onChange,
}: {
  row: Row;
  onChange: (patch: Row) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const groups = useData(async () => {
    const result = await ad.db.list("crm_customer_summary", { limit: 50000 });
    return Array.from(new Set(result.rows.flatMap((r) => r.tags || []))).map(
      String,
    );
  });
  function toggle(key: string, value: any) {
    const list = row[key] || [];
    onChange({
      [key]: list.map(String).includes(String(value))
        ? list.filter((v: any) => String(v) !== String(value))
        : [...list, value],
    });
  }
  const products = (ad.cache.products || []).filter((p: Row) =>
    `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Panel title="Sản phẩm và nhóm khách hàng áp dụng">
      {row.scope === "categories" && (
        <fieldset className="ar-tree">
          <legend>Chọn danh mục</legend>
          {(ad.cache.categories || []).map((c: Row) => (
            <label className="ar-check" key={c.id}>
              <input
                type="checkbox"
                checked={(row.category_ids || []).includes(c.id)}
                onChange={() => toggle("category_ids", c.id)}
              />
              {c.name}
            </label>
          ))}
        </fieldset>
      )}
      {row.scope === "products" && (
        <>
          <label>
            Tìm sản phẩm
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(20);
              }}
            />
          </label>
          <p>{(row.product_ids || []).length} sản phẩm đã chọn</p>
          <div className="ar-members">
            {products.slice(0, limit).map((p: Row) => (
              <label className="ar-check" key={p.id}>
                <input
                  type="checkbox"
                  checked={(row.product_ids || [])
                    .map(String)
                    .includes(String(p.id))}
                  onChange={() => toggle("product_ids", p.id)}
                />
                {p.name} · {p.sku}
              </label>
            ))}
          </div>
          {products.length > limit && (
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setLimit((v) => v + 20)}
            >
              Xem thêm sản phẩm
            </button>
          )}
        </>
      )}
      <fieldset className="ar-tree">
        <legend>Nhóm khách hàng</legend>
        <p>Không chọn nhóm = áp dụng cho tất cả khách hàng.</p>
        {[
          ["vip", "Khách VIP"],
          ["marketing", "Khách đồng ý nhận quảng cáo"],
          ...(groups.data || [])
            .filter((t) => t !== "VIP")
            .map((t) => [`tag:${t}`, t]),
        ].map(([value, label]) => (
          <label className="ar-check" key={value}>
            <input
              type="checkbox"
              checked={(row.customer_groups || []).includes(value)}
              onChange={() => toggle("customer_groups", value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </Panel>
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
  return (
    <fieldset className="ar-tree ar-subs">
      <legend>Nhóm và mục (menu 2 bậc)</legend>
      <p>
        Nhóm là tiêu đề cột trong menu Sản phẩm (ví dụ "Máy khoan"), mục là các
        dòng bên dưới (ví dụ "Máy khoan sắt"). Mã được tạo tự động khi lưu; đổi
        tên sau này không làm hỏng link.
      </p>
      {error && (
        <p className="ar-error" role="alert">
          {error}
        </p>
      )}
      {subs.map((s, i) => {
        const items = s.items || [];
        return (
          <div className="ar-tree-item" key={s.id || `new-${i}`}>
            <div className="ar-subs-row">
              <label>
                Tên nhóm {i + 1}
                <input
                  value={s.name || ""}
                  onChange={(e) => setGroup(i, { name: e.target.value })}
                />
              </label>
              {s.id && <small>Mã: {s.id}</small>}
              <button
                type="button"
                className="btn btn-light"
                aria-label={`Đưa nhóm ${s.name || i + 1} lên`}
                disabled={i === 0}
                onClick={() => onChange(move(subs, i, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-light"
                aria-label={`Đưa nhóm ${s.name || i + 1} xuống`}
                disabled={i === subs.length - 1}
                onClick={() => onChange(move(subs, i, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  if (
                    !items.length ||
                    confirm(
                      `Xóa nhóm "${s.name}" và ${items.length} mục bên trong?`,
                    )
                  )
                    onChange(subs.filter((_, j) => j !== i));
                }}
              >
                Xóa nhóm
              </button>
            </div>
            <ol className="ar-subs-items">
              {items.map((it, k) => (
                <li key={it.id || `new-${k}`}>
                  <label>
                    Mục {k + 1}
                    <input
                      value={it.name || ""}
                      onChange={(e) =>
                        setGroup(i, {
                          items: items.map((x, m) =>
                            m === k ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-light"
                    aria-label={`Đưa mục ${it.name || k + 1} lên`}
                    disabled={k === 0}
                    onClick={() => setGroup(i, { items: move(items, k, -1) })}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-light"
                    aria-label={`Đưa mục ${it.name || k + 1} xuống`}
                    disabled={k === items.length - 1}
                    onClick={() => setGroup(i, { items: move(items, k, 1) })}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() =>
                      setGroup(i, { items: items.filter((_, m) => m !== k) })
                    }
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-light"
              onClick={() =>
                setGroup(i, { items: [...items, { id: "", name: "" }] })
              }
            >
              + Thêm mục vào nhóm
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => onChange([...subs, { id: "", name: "", items: [] }])}
      >
        + Thêm nhóm
      </button>
    </fieldset>
  );
}
