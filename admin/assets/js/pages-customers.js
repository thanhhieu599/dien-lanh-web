window.AD = window.AD || {};

(() => {
  const { esc, money, dt, table, pager, badge, run } = AD.ui;

  const ROLE = {
    customer: ["Khách hàng", "muted"],
    staff: ["Nhân viên vận hành", "info"],
    sales: ["Kinh doanh", "info"],
    accountant: ["Kế toán", "info"],
    admin: ["Quản trị", "ok"],
  };

  const roleCell = (c) =>
    AD.me.role === "admin" && AD.db.mode === "supabase" &&
    c.profile_id && c.profile_id !== AD.me.id
      ? `<select data-role="${esc(c.profile_id)}">${Object.entries(ROLE)
          .map(([key, [label]]) => `<option value="${key}" ${c.role === key ? "selected" : ""}>${label}</option>`)
          .join("")}</select>`
      : badge(ROLE, c.role || "customer");

  function bindRoles(el, rows) {
    el.querySelectorAll("[data-role]").forEach((select) => {
      select.onchange = async () => {
        const c = rows.find((row) => row.profile_id === select.dataset.role);
        const role = select.value;
        if (!(await AD.ui.confirm(`Đổi vai trò tài khoản này thành <b>${ROLE[role][0]}</b>?`))) {
          select.value = c.role;
          return;
        }
        const saved = await run(select,
          () => AD.db.update("profiles", c.profile_id, { role }),
          "Đã cập nhật vai trò");
        if (!saved) select.value = c.role;
        else {
          delete AD.cache.staff;
          AD.route();
        }
      };
    });
  }

  AD.PK.crm_customers = "id";
  AD.PK.crm_customer_summary = "id";

  const link = (id) => `#/customers/${encodeURIComponent(id)}`;

  const orderLink = (id) => `#/orders/${encodeURIComponent(id)}`;

  const addressOf = (c) =>
    (c.addresses || []).find((a) => a.default) || c.addresses?.[0] || {};

  const addressText = (a) =>
    [a.address, a.district, a.province].filter(Boolean).join(", ");

  const avatar = (c) => `
    <span class="crm-avatar">
      ${esc(Array.from(c.name || "?")[0].toUpperCase())}
    </span>`;

  const tagsOf = (value) => [
    ...new Set(
      value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => (x.toUpperCase() === "VIP" ? "VIP" : x)),
    ),
  ];

  // Đọc theo từng trang, tránh giới hạn 1.000 dòng của PostgREST.
  async function allRows(name, opts = {}) {
    const result = [];

    for (let offset = 0; ; offset += 1000) {
      const { rows, count } = await AD.db.list(name, {
        ...opts,
        limit: 1000,
        offset,
      });

      result.push(...rows);

      if (rows.length < 1000 || result.length >= count) {
        return result;
      }
    }
  }

  function editCustomer(c = null) {
    const a = c ? addressOf(c) : {};

    const input = (name, label, value = "", extra = "") => `
      <label class="ad-field full">
        ${label}
        <input
          name="${name}"
          value="${esc(value || "")}"
          ${extra}
        >
      </label>`;

    const modal = AD.ui.modal(
      `
      <h3>${c ? "Sửa" : "Thêm"} khách hàng</h3>

      <form id="crm-edit" class="ad-grid">
        ${input(
          "name",
          "Tên khách hàng / công ty",
          c?.name,
          'required maxlength="150"',
        )}

        ${input("phone", "Điện thoại", c?.phone, 'required type="tel"')}

        ${input("email", "Email", c?.email, 'type="email"')}
        ${input("address", "Địa chỉ", a.address)}
        ${input("district", "Quận / huyện", a.district)}
        ${input("province", "Tỉnh / thành phố", a.province)}

        <label class="ad-field full">
          Đồng ý nhận quảng cáo

          <select name="marketing">
            <option value="">Chưa ghi nhận</option>
            <option value="true">
              Có — đã được khách đồng ý
            </option>
            <option value="false">Không đồng ý</option>
          </select>
        </label>

        <button class="btn btn-primary" type="submit">
          Lưu khách hàng
        </button>
      </form>
    `,
      { wide: true },
    );

    const f = modal.querySelector("form");

    f.elements.marketing.value =
      c?.marketing_opt_in == null ? "" : String(c.marketing_opt_in);

    f.onsubmit = async (event) => {
      event.preventDefault();

      if (!f.reportValidity()) return;

      const values = Object.fromEntries(new FormData(f));

      if (!DT.u.validPhone(values.phone)) {
        AD.ui.toast("Số điện thoại không hợp lệ", "error");
        return;
      }

      const nextAddress = {
        ...a,
        name: values.name.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        district: values.district.trim(),
        province: values.province.trim(),
        default: true,
      };

      // Sửa địa chỉ mặc định, giữ các địa chỉ khác.
      const addresses = [...(c?.addresses || [])];
      const index = addresses.findIndex((x) => x.default);

      if (addresses.length) {
        addresses[index < 0 ? 0 : index] = nextAddress;
      } else {
        addresses.push(nextAddress);
      }

      const patch = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        addresses,
        marketing_opt_in:
          values.marketing === "" ? null : values.marketing === "true",
      };

      const saved = await run(
        f.querySelector("button"),
        () =>
          c
            ? AD.db.update("crm_customers", c.id, patch)
            : AD.db.insert("crm_customers", patch),
        "Đã lưu khách hàng",
      );

      if (!saved) return;

      modal.closest(".ad-modal-wrap").remove();

      if (location.hash === link(saved.id)) {
        AD.route();
      } else {
        location.hash = link(saved.id);
      }
    };
  }

  // =====================================================
  // Danh sách khách hàng
  // =====================================================
  AD.pages.customers = async (params, el) => {
    // Đường dẫn cũ dùng chung giao diện CRM.
    if (params.view === "accounts") {
      const query = new URLSearchParams(params);
      query.delete("view");
      location.replace(`#/customers${query.size ? "?" + query : ""}`);
      return;
    }

    el.classList.add("crm-page");

    const size = 25;
    const page = Math.max(1, Number(params.page) || 1);

    const segment = ["marketing", "vip"].includes(params.segment)
      ? params.segment
      : "";

    const filters =
      segment === "marketing"
        ? [["marketing_opt_in", "eq", true]]
        : segment === "vip"
          ? [["is_vip", "eq", true]]
          : [];

    const opts = {
      filters: [...filters, ["role", "eq", ROLE[params.role] ? params.role : undefined]],
      search: params.q
        ? {
            q: params.q,
            cols: ["name", "email", "phone"],
          }
        : null,
      order: "created_at.desc,id.desc",
    };

    el.innerHTML = `
      <div class="ad-head">
        <div>
          <h1>Khách hàng</h1>
        </div>

        <div class="ad-head-actions">
          <button class="btn btn-light" id="crm-export">
            Xuất CSV
          </button>

          <button class="btn btn-primary" id="crm-add">
            Thêm khách hàng
          </button>
        </div>
      </div>

      <section class="ad-card">
        <div class="ad-tabs">
          ${[
            ["", "Tất cả khách hàng"],
            ["marketing", "Nhận quảng cáo"],
            ["vip", "Khách hàng thân thiết"],
          ]
            .map(
              ([key, label]) => `
            <a
              href="#/customers${key ? "?segment=" + key : ""}"
              class="${segment === key ? "active" : ""}"
            >${label}</a>
          `,
            )
            .join("")}
        </div>

        <form class="ad-toolbar" id="crm-search">
          <input
            type="hidden"
            name="segment"
            value="${segment}"
          >

          <input
            name="q"
            type="search"
            placeholder="Tên, email, số điện thoại…"
            value="${esc(params.q || "")}"
          >

          <button class="btn btn-light">
            Tìm khách hàng
          </button>
          <select name="role" aria-label="Vai trò">
            <option value="">Vai trò: tất cả</option>
            ${Object.entries(ROLE).map(([key, [label]]) =>
              `<option value="${key}" ${params.role === key ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </form>

        <div id="crm-list"></div>
      </section>
    `;

    AD.bindToolbar(el.querySelector("form"), "customers", params);

    const { rows, count } = await AD.db.list("crm_customer_summary", {
      ...opts,
      limit: size,
      offset: (page - 1) * size,
    });

    el.querySelector("#crm-list").innerHTML =
      table(
        [
          {
            label: "Thông tin",
            render: (c) => `
          <a class="crm-person" href="${link(c.id)}">
            ${avatar(c)}
            <span><b>${esc(c.name)}</b><small>Đăng ký ${AD.ui.d(c.created_at)}</small></span>
          </a>`,
          },
          { label: "Email", key: "email" },
          { label: "Điện thoại", key: "phone" },
          { label: "Địa chỉ", render: (c) => esc(addressText(addressOf(c))) || "—" },
          { label: "Vai trò", render: roleCell },
          {
            label: "Đơn hàng",
            key: "order_count",
            cls: "num",
          },
          {
            label: "Đơn hàng gần nhất",
            render: (c) =>
              c.last_order_id
                ? `
            <a href="${orderLink(c.last_order_id)}">
              ${esc(c.last_order_code)}
            </a>`
                : "—",
          },
          {
            label: "Tổng chi tiêu",
            render: (c) => money(c.total_spent),
            cls: "num",
          },
        ],
        rows,
        {
          rowHref: (c) => `#/customers/${encodeURIComponent(c.id)}`,
          empty: "Chưa có khách hàng phù hợp",
        },
      ) + pager(page, count, size);

    AD.bindPager(el, "customers", params);
    bindRoles(el, rows);

    el.querySelector("#crm-add").onclick = () => editCustomer();

    el.querySelector("#crm-export").onclick = async (event) => {
      await run(event.currentTarget, async () => {
        const data = await allRows("crm_customer_summary", opts);

        AD.ui.csv(
          "khach-hang.csv",
          ["name", "email", "phone", "role", "created_at", "order_count", "total_spent"].map(
            (key) => ({ key, label: key }),
          ),
          data,
        );
      });
    };
  };

  // =====================================================
  // Chi tiết khách hàng
  // =====================================================
  AD.pages.customerDetail = async (id, params, el) => {
    el.classList.add("crm-page");

    const c = await AD.db.get("crm_customer_summary", id);

    if (!c) {
      el.innerHTML = `
        <p>Không tìm thấy khách hàng.</p>
        <a href="#/customers">Quay lại</a>`;
      return;
    }

    const page = Math.max(1, Number(params.page) || 1);
    const size = 20;

    const [{ rows: orders, count }, products] = await Promise.all([
      AD.db.list("orders", {
        select: "id,code,created_at,total,status,payment_status",
        filters: [["customer_id", "eq", id]],
        order: "created_at.desc,id.desc",
        limit: size,
        offset: (page - 1) * size,
      }),

      allRows("crm_customer_products", {
        filters: [["customer_id", "eq", id]],
        order: "last_bought_at.desc,sku.asc,name.asc,product_id.asc",
      }),
    ]);

    const consent =
      c.marketing_opt_in == null
        ? "Chưa ghi nhận đồng ý tiếp thị"
        : c.marketing_opt_in
          ? "Đã đồng ý nhận tiếp thị"
          : "Không đồng ý nhận tiếp thị";

    el.innerHTML = `
      <a class="ad-back" href="#/customers">
        ← Khách hàng
      </a>

      <div class="ad-head">
        <h1>${esc(c.name)}</h1>
      </div>

      <div class="crm-layout">
        <main>
          <section class="ad-card">
            <div class="crm-person crm-profile">
              ${avatar(c)}
              <div>
                <h2>${esc(c.name)}</h2>
                <p class="muted">
                  ${esc(addressText(addressOf(c)))}
                </p>
              </div>
            </div>

            <form id="crm-note">
              <label>Ghi chú</label>

              <textarea name="note" rows="3">${esc(c.note)}</textarea>

              <button class="btn btn-light" type="submit">
                Lưu ghi chú
              </button>
            </form>

            <div class="crm-metrics">
              <div>
                Đơn hàng mới nhất

                <strong>
                  ${
                    c.last_order_id
                      ? `
                      <a href="${orderLink(c.last_order_id)}">
                        ${esc(c.last_order_code)}
                      </a>`
                      : "—"
                  }
                </strong>
              </div>

              <div>
                Tổng chi tiêu
                <strong>${money(c.total_spent)}</strong>
                <small>${c.order_count} đơn chưa hủy</small>
              </div>

              <div>
                Chi tiêu trung bình
                <strong>${money(c.average_spent)}</strong>
                <small>
                  Trên ${c.paid_count} đơn đã thanh toán
                </small>
              </div>
            </div>
          </section>

          <section class="ad-card">
            <h3>Đơn hàng (${count})</h3>

            ${table(
              [
                {
                  label: "Đơn hàng",
                  render: (o) => `
                  <a href="${orderLink(o.id)}">
                    ${esc(o.code)}
                  </a>`,
                },
                {
                  label: "Ngày",
                  render: (o) => dt(o.created_at),
                },
                {
                  label: "Giá trị đơn",
                  render: (o) => money(o.total),
                },
                {
                  label: "Thanh toán",
                  render: (o) => badge(AD.PAY_STATUS, o.payment_status),
                },
                {
                  label: "Trạng thái",
                  render: (o) => badge(AD.ORDER_STATUS, o.status),
                },
              ],
              orders,
              {
                empty: "Khách chưa có đơn hàng",
              },
            )}

            ${pager(page, count, size)}
          </section>

          <section class="ad-card">
            <h3>Sản phẩm đã mua</h3>

            <p class="muted">
              Từ đơn đã hoàn thành và thanh toán đủ.
            </p>

            ${table(
              [
                {
                  label: "Sản phẩm",
                  render: (p) =>
                    p.product_id
                      ? `
                    <a href="#/products/${encodeURIComponent(
                      p.product_id,
                    )}">${esc(p.name)}</a>`
                      : esc(p.name) + " (đã xóa)",
                },
                { label: "SKU", key: "sku" },
                {
                  label: "Số lượng",
                  key: "quantity",
                  cls: "num",
                },
                {
                  label: "Ngày đặt gần nhất",
                  render: (p) => dt(p.last_bought_at),
                },
              ],
              products,
              {
                empty: "Chưa có sản phẩm từ đơn hoàn thành, thanh toán đủ",
              },
            )}
          </section>
        </main>

        <aside>
          <section class="ad-card">
            <div class="crm-card-head">
              <h3>Liên hệ</h3>
              <button class="btn btn-link" data-edit>
                Sửa
              </button>
            </div>

            <p>${esc(c.email)}</p>
            <p>${esc(c.name)}</p>
            <p>${esc(c.phone)}</p>
            <p>Vai trò: ${roleCell(c)}</p>
            <p class="muted">${consent}</p>

            <p class="muted">
              ${
                c.profile_id
                  ? "Có tài khoản website"
                  : "Chưa liên kết tài khoản website"
              }
            </p>

            <hr>

            <div class="crm-card-head">
              <h3>Sổ địa chỉ</h3>
              <button class="btn btn-link" data-edit>
                Sửa
              </button>
            </div>

            ${
              (c.addresses || [])
                .map(
                  (a) => `
              <p>
                <b>${esc(a.name || c.name)}</b><br>
                ${esc(a.phone || c.phone)}<br>
                ${esc(addressText(a))}
              </p>
            `,
                )
                .join("") || "<p>Chưa có địa chỉ.</p>"
            }
          </section>

          <section class="ad-card">
            <h3>Tag</h3>

            <form id="crm-tags">
              <input
                name="tags"
                value="${esc((c.tags || []).join(", "))}"
                placeholder="VIP, thân thiết, quay lại"
              >

              <button class="btn btn-light" type="submit">
                Lưu tag
              </button>
            </form>

            <div class="crm-tags">
              ${(c.tags || [])
                .map(
                  (t) => `
                <span>${esc(t)}</span>
              `,
                )
                .join("")}
            </div>
          </section>
        </aside>
      </div>
    `;

    AD.bindPager(el, `customers/${id}`, params);
    bindRoles(el, [c]);

    el.querySelectorAll("[data-edit]").forEach((b) => {
      b.onclick = () => editCustomer(c);
    });

    const bindSave = (selector, patch) => {
      const f = el.querySelector(selector);

      f.onsubmit = async (event) => {
        event.preventDefault();

        const saved = await run(
          f.querySelector("button"),
          () => AD.db.update("crm_customers", id, patch(f)),
          "Đã lưu",
        );

        if (saved) AD.route();
      };
    };

    bindSave("#crm-note", (f) => ({
      note: f.elements.note.value.trim(),
    }));

    bindSave("#crm-tags", (f) => ({
      tags: tagsOf(f.elements.tags.value),
    }));
  };
})();
