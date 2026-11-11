import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, pagesServer, blockExternal } from "../browser/lib.mjs";

const { server, base } = await pagesServer("dist");
const browser = await chromium();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "vi-VN",
  });
  await blockExternal(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base + "admin/");
  await page.click("#demo-enter");
  await page.waitForSelector(".ad-side");
  async function open(route) {
    await page.goto(base + "admin/#/" + route);
    await page.locator("#view h1").waitFor();
    await page.waitForFunction(
      () => !document.querySelector('#view [role="status"]'),
    );
    assert.equal(await page.locator("#view .ad-error").count(), 0, route);
  }
  async function read(table, id) {
    return page.evaluate(([table, id]) => AD.db.get(table, id), [table, id]);
  }
  async function saved(button = "#save", text = "Đã lưu thay đổi.") {
    await page
      .locator(".ar-notices button")
      .evaluateAll((items) => items.forEach((el) => el.click()));
    await page.locator(button).click();
    await page.locator(".ar-toast").filter({ hasText: text }).waitFor();
  }
  const routes = [
    "dashboard",
    "orders",
    "leads",
    "customers",
    "products",
    "categories",
    "brands",
    "reviews",
    "coupons",
    "banners",
    "posts",
    "vision",
    "projects",
    "faqs",
    "trust",
    "content",
    "reports",
    "notifications",
    "maintenance",
    "misa",
    "settings",
    "stores",
    "services",
    "policies",
    "products/1001",
    "categories/may-lanh",
    "brands/thuong-hieu",
    "products/new",
  ];
  for (const route of routes) {
    await open(route);
    assert.ok((await page.locator("#view h1").textContent()).trim());
    console.log("Admin route:", route);
  }
  assert.equal(
    await page
      .locator("script[data-admin-runtime]")
      .evaluateAll((items) =>
        items.some((el) =>
          /\/(ui|app|charts|pages-[^/]+|category-products)\.js/.test(el.src),
        ),
      ),
    false,
    "React must not load legacy UI renderers",
  );

  // Exercise validation, typed lists, key/value options, image conversion and persistence.
  await open("products/1001");
  const original = await read("products", 1001);
  await page.locator("[name=price]").fill("-1");
  await page.click("#save");
  await page.locator("[data-field=price] [role=alert]").waitFor();
  assert.equal(
    (await read("products", 1001)).price,
    original.price,
    "Invalid price must not persist",
  );
  await page.locator("[name=price]").fill(String(original.price + 1000));
  await page.locator("[name=name]").fill("Máy lạnh kiểm thử React");
  await page.locator("[name=product_tags]").fill("");
  await page.locator("[name=product_tags]").pressSequentially("React, Demo");
  const options = page.locator("[data-field=options]");
  await options.getByRole("button", { name: "Thêm thuộc tính" }).click();
  await options
    .getByRole("textbox", { name: /Tên thuộc tính/ })
    .last()
    .fill("Màu");
  await options
    .getByRole("textbox", { name: /Giá trị thuộc tính/ })
    .last()
    .fill("Trắng, Đen");
  const gallery = page.locator("[data-field=images]");
  while (await gallery.getByRole("button", { name: /Bỏ ảnh/ }).count())
    await gallery
      .getByRole("button", { name: /Bỏ ảnh/ })
      .first()
      .click();
  await gallery.locator("input[type=file]").setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 2;
        canvas.height = 2;
        canvas.getContext("2d").fillRect(0, 0, 2, 2);
        return canvas.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    ),
  });
  await gallery.locator("img").waitFor();
  await saved();
  const product = await read("products", 1001);
  assert.equal(product.price, original.price + 1000);
  assert.deepEqual(product.product_tags, ["React", "Demo"]);
  assert.deepEqual(product.options["Màu"], ["Trắng", "Đen"]);
  assert.match(product.images[0], /^data:image\/webp;base64,/);
  await open("products/1001");
  assert.equal(await page.locator("[name=name]").inputValue(), product.name);
  await page
    .locator("#view")
    .getByRole("link", { name: "Nhân bản", exact: true })
    .click();
  await page.locator("#save").waitFor();
  await saved();
  const copyId = decodeURIComponent(new URL(page.url()).hash.split("/")[2]);
  assert.notEqual(copyId, "1001");
  assert.equal((await read("products", copyId)).sku, `${original.sku}-COPY`);
  await page
    .locator(".ar-head")
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await page.waitForURL("**/#/products");
  assert.equal(await read("products", copyId), null);
  await open("products?q=khong-co-san-pham-xyz");
  assert.match(await page.locator("#view").textContent(), /Chưa có dữ liệu/);

  // Danh mục: 5 mục ở cột trái, mỗi lần hiện 1 mục; không còn ô JSON
  const catTab = (name) => page.locator(".ce-nav button").filter({ hasText: new RegExp("^" + name) }).click();
  await open("categories/may-lanh");
  const category = await read("categories", "may-lanh");
  const groups = (category.subs || []).length;
  assert.equal(await page.locator(".ce-nav button").count(), 5);
  assert.equal(await page.locator("textarea").count(), 0, "Không còn ô nhập JSON");
  // Menu 2 bậc: thêm nhóm + mục, mã tự tạo khi lưu, xóa nhóm trả lại như cũ
  await catTab("Nhóm & mục menu");
  await page.getByRole("button", { name: "+ Thêm nhóm", exact: true }).click();
  await catTab("Thông tin chung");
  await page.click("#save");
  // Lỗi ở mục khác: tự mở mục có lỗi
  await page.locator(".ar-error").filter({ hasText: "không được để trống" }).waitFor();
  await page.getByLabel(`Tên nhóm ${groups + 1}`, { exact: true }).fill("Nhóm React QA");
  await page.locator(".ar-tree-item").last().getByRole("button", { name: "+ Thêm mục vào nhóm" }).click();
  await page.locator(".ar-tree-item").last().getByLabel("Mục 1", { exact: true }).fill("Mục React QA");
  await saved();
  assert.deepEqual((await read("categories", "may-lanh")).subs.at(-1), {
    id: "nhom-react-qa",
    name: "Nhóm React QA",
    items: [{ id: "muc-react-qa", name: "Mục React QA" }],
  });
  await catTab("Nhóm & mục menu");
  await page.locator(".ar-tree-item").last().getByRole("button", { name: "Xóa nhóm" }).click();
  await saved();
  assert.deepEqual((await read("categories", "may-lanh")).subs, category.subs || []);
  // Bộ lọc: bảng tên + giá trị; mã cũ giữ nguyên, bộ lọc mới tự tạo mã
  await catTab("Bộ lọc sản phẩm");
  await page.getByLabel("Giá trị bộ lọc 1", { exact: true }).fill("1 HP, 1.5 HP, 2 HP");
  await page.getByRole("button", { name: "+ Thêm bộ lọc" }).click();
  const nextFilter = (category.filters || []).length + 1;
  await page.getByLabel(`Tên bộ lọc ${nextFilter}`, { exact: true }).fill("Màu sắc");
  await page.click("#save");
  await page.locator(".ar-error").filter({ hasText: "ít nhất 1 giá trị" }).waitFor();
  await page.getByLabel(`Giá trị bộ lọc ${nextFilter}`, { exact: true }).fill("Trắng, Đen,");
  await saved();
  const filtered = (await read("categories", "may-lanh")).filters;
  assert.equal(filtered[0].key, category.filters[0].key);
  assert.deepEqual(filtered[0].options, ["1 HP", "1.5 HP", "2 HP"]);
  assert.deepEqual(filtered.at(-1), { key: "mau-sac", label: "Màu sắc", options: ["Trắng", "Đen"] });
  await catTab("Bộ lọc sản phẩm");
  await page.getByRole("button", { name: `Xóa bộ lọc ${nextFilter}` }).click();
  await page.getByLabel("Giá trị bộ lọc 1", { exact: true }).fill(category.filters[0].options.join(", "));
  await saved();
  assert.deepEqual((await read("categories", "may-lanh")).filters, category.filters);
  // Sản phẩm: kết quả tìm chỉ hiện khi gõ
  await catTab("Sản phẩm");
  assert.equal(await page.getByRole("button", { name: "Thêm", exact: true }).count(), 0);
  await page.getByLabel("Tìm sản phẩm").fill("DT1050");
  assert.equal(await page.getByRole("button", { name: "Thêm", exact: true }).count(), 1);
  // Ảnh quảng cáo trang chủ của danh mục: có ô tải ảnh, chữ và liên kết lưu đúng
  await catTab("Hình ảnh");
  assert.equal(await page.locator('[data-field="promo_image"]').count(), 1);
  await page.locator("[name=promo_title]").fill("Máy lạnh QA");
  await page.locator("[name=promo_href]").fill("khuyen-mai.html");
  await saved();
  const promoCat = await read("categories", "may-lanh");
  assert.equal(promoCat.promo_title, "Máy lạnh QA");
  assert.equal(promoCat.promo_href, "khuyen-mai.html");
  await catTab("Hình ảnh");
  await page.locator("[name=promo_title]").fill("");
  await page.locator("[name=promo_href]").fill("");
  await saved();
  await open("brands/new");
  await page.locator("[name=name]").fill("Thương hiệu React QA");
  await saved();
  const brandId = decodeURIComponent(new URL(page.url()).hash.split("/")[2]);
  assert.equal((await read("brands", brandId)).name, "Thương hiệu React QA");

  // Editing a pre-migration coupon must retain its minimum order condition.
  const coupon = await page.evaluate(async () =>
    (await AD.db.list("coupons")).rows.find((c) => c.min > 0),
  );
  await open("coupons/" + coupon.code);
  assert.equal(
    await page.locator("[name=condition_type]").inputValue(),
    "order_min",
  );
  await saved();
  assert.equal((await read("coupons", coupon.code)).min, coupon.min);
  await open("coupons/new");
  await page.locator("[name=code]").fill("REACTQA");
  await page.locator("[name=type]").selectOption("percent");
  await page.locator("[name=value]").fill("10");
  await page.locator("[name=scope]").selectOption("products");
  await page
    .getByLabel("Tìm sản phẩm", { exact: true })
    .fill("Máy lạnh kiểm thử React");
  await page.getByRole("checkbox", { name: /Máy lạnh kiểm thử React/ }).check();
  await saved();
  assert.deepEqual((await read("coupons", "REACTQA")).product_ids, [1001]);

  // Seed browser-local customer activity to verify the admin's existing demo adapter.
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const p = AD.cache.products.find((p) => p.id === 1001);
    const total = p.price * 2 + 50000 - 10001;
    localStorage.setItem(
      "dt_shop_v1",
      JSON.stringify({
        orders: [
          {
            code: "DTREACTQA",
            createdAt: now,
            status: "pending",
            customer: {
              name: "Khách đơn React",
              phone: "0912345678",
              email: "qa@example.test",
            },
            shipping: {
              method: "delivery",
              address: "123 Test",
              district: "Quận 1",
              province: "TP.HCM",
            },
            payment: "bank",
            items: [
              {
                id: p.id,
                name: p.name,
                price: p.price,
                qty: 2,
                install: false,
              },
            ],
            subtotal: p.price * 2,
            shippingFee: 50000,
            discount: 10001,
            total,
            maintenance: true,
          },
        ],
        users: [],
        cart: [],
      }),
    );
    localStorage.setItem(
      "dt_leads_v1",
      JSON.stringify([
        {
          id: "LEADREACTQA",
          type: "contact",
          createdAt: now,
          status: "new",
          data: {
            name: "Khách tư vấn React",
            phone: "0987654321",
            message: "Tư vấn lắp đặt",
          },
        },
      ]),
    );
  });
  await open("orders/DTREACTQA");
  await page.getByRole("button", { name: "Chuyển sang:" }).click();
  await page.waitForFunction(
    async () => (await AD.db.get("orders", "DTREACTQA")).status === "confirmed",
  );
  await page.locator("[name=status]").selectOption("done");
  await page.locator("[name=payment_status]").selectOption("paid");
  await page.locator("[name=staff_note]").fill("Đã giao và đối soát");
  await saved(
    "#view form button[type=submit], #view form .btn-primary",
    "Đã cập nhật đơn hàng.",
  );
  let order = await read("orders", "DTREACTQA");
  assert.equal(order.status, "done");
  assert.equal(order.payment_status, "paid");
  assert.equal(order.staff_note, "Đã giao và đối soát");
  await open("leads/LEADREACTQA");
  await page.locator("[name=status]").selectOption("contacted");
  await page.locator("[name=assigned_to]").selectOption("demo-sales-1");
  await page.locator("[name=note]").fill("Hẹn gọi lại");
  await saved("#view form .btn-primary", "Đã cập nhật khách hàng tiềm năng.");
  assert.equal(
    (await read("leads", "LEADREACTQA")).assigned_to,
    "demo-sales-1",
  );
  assert.equal(
    (await read("leads", "LEADREACTQA")).notes[0].text,
    "Hẹn gọi lại",
  );

  await open("customers");
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Thêm khách hàng" });
  await dialog.getByLabel("Tên khách hàng").fill("Khách CRM React");
  await dialog.getByLabel("Số điện thoại").fill("0901234567");
  await dialog.getByRole("button", { name: "Lưu khách hàng" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.waitForURL("**/#/customers/*");
  const customerId = decodeURIComponent(new URL(page.url()).hash.split("/")[2]);
  assert.equal(
    (await read("crm_customer_summary", customerId)).name,
    "Khách CRM React",
  );
  await page.locator("[name=tags]").fill("VIP, React");
  await page.locator("[name=note]").fill("Chăm sóc sau bán");
  await page.getByRole("button", { name: "Lưu ghi chú và nhãn" }).click();
  await page.waitForFunction(
    async (id) => (await AD.db.get("crm_customers", id)).tags.includes("React"),
    customerId,
  );
  await open("customers");
  await page.locator('select[name=segment]').selectOption("vip");
  await page.getByRole("button", {name:"Lọc", exact:true}).click();
  await page.waitForURL("**/customers?segment=vip");
  await page.waitForFunction(() => document.querySelectorAll('.ar-table tbody tr').length === 1);
  assert.equal(await page.locator('.ar-table tbody tr').count(), 1, 'VIP filter excludes regular customers');
  assert.match(await page.locator('.ar-table').textContent(), /Khách CRM React/);
  await open("customers");
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const csv = await csvPromise;
  assert.match(await fs.readFile(await csv.path(), "utf8"), /Khách CRM React/);

  await open("misa");
  assert.equal(
    await page.locator("#view [role=alert]").count(),
    0,
    "MISA totals must reconcile",
  );
  const xlsxPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải file Excel (.xlsx)" }).click();
  const xlsx = await xlsxPromise;
  const bytes = await fs.readFile(await xlsx.path());
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  assert.ok(bytes.length > 3000);
  await open("maintenance?tab=reminders");
  assert.match(await page.locator("#view").textContent(), /DTREACTQA/);
  // Đơn DTREACTQA (đã hoàn thành, có chọn nhắc bảo trì) được gợi ý thêm vào danh sách khách bảo trì
  await open("maintenance");
  await page.locator(".mt-import").getByRole("button", { name: "Thêm vào danh sách" }).click();
  await page.locator(".ar-notices").filter({ hasText: "khách bảo trì từ đơn hàng" }).waitFor();
  assert.ok((await page.evaluate(() => AD.db.list("maintenance_contracts", { filters: [["source", "eq", "order"]] }))).rows.some((c) => c.order_code === "DTREACTQA"));
  await open("vision");
  assert.equal(await page.locator(".ar-gallery").count(), 10);
  await saved("#view .ar-form-foot button", "Đã lưu nội dung website.");
  await open("trust");
  // Mỗi mục hiện riêng, chọn ở cột trái; không còn khung lồng khung
  await page.locator(".ce-nav button", { hasText: "Google Business" }).click();
  assert.ok((await page.getByRole("textbox").count()) > 0);
  assert.equal(await page.locator(".ce-section .ar-panel, .ce-section .ar-tree").count(), 0);
  await saved("#view .ar-form-foot button", "Đã lưu nội dung website.");
  // Bảo trì: thống kê, thêm khách, ghi nhận nhanh 1 lần bảo trì có chi phí
  await open("maintenance");
  assert.equal(await page.locator(".mt-kpis > div").count(), 8);
  await open("maintenance_contracts/new");
  await page.locator("[name=name]").fill("Khách bảo trì QA");
  await page.locator("[name=phone]").fill("0912 345 699");
  await page.locator("[name=cycle_months]").selectOption("3");
  await page.locator("[name=fee_per_visit]").fill("450000");
  await saved();
  const qaId = decodeURIComponent(new URL(page.url()).hash.split("/")[2]);
  const qa = await read("maintenance_contracts", qaId);
  assert.equal(qa.phone, "0912345699");
  assert.equal(qa.cycle_months, 3);
  await open("maintenance");
  const qaRow = page.locator(".ar-table tr", { hasText: "Khách bảo trì QA" });
  await qaRow.getByRole("button", { name: "Ghi nhận" }).click();
  await qaRow.getByLabel("Kỹ thuật viên").fill("KTV QA");
  await qaRow.getByLabel("Đã thu").check();
  await qaRow.getByRole("button", { name: "Lưu" }).click();
  await page.locator(".ar-notices").filter({ hasText: "Đã ghi nhận bảo trì" }).waitFor();
  const qaVisits = (await page.evaluate((id) => AD.db.list("maintenance_visits", { filters: [["contract_id", "eq", Number(id)]] }), qaId)).rows;
  assert.equal(qaVisits.length, 1);
  assert.equal(qaVisits[0].amount, 450000);
  assert.equal(qaVisits[0].paid, true);
  await page.locator(".mt-tabs button", { hasText: "Khách đăng ký" }).click();
  await page.locator(".ar-table").filter({ hasText: "Khách bảo trì QA" }).waitFor();
  await page.locator(".mt-tabs button", { hasText: "Lịch sử & chi phí" }).click();
  await page.locator(".ar-table").filter({ hasText: "450.000" }).waitFor();
  await open("orders");
  // Bộ lọc thanh toán chỉ có COD và chuyển khoản
  assert.deepEqual(await page.locator("select[name=payment] option").evaluateAll((els) => els.map((el) => el.textContent)), ["Tất cả", "COD", "Chuyển khoản"]);
  await open("products/1001");
  assert.equal(await page.getByText("Hỗ trợ trả góp").count(), 0);
  await open("content");
  // Mỗi thẻ cạnh banner trang chủ có ô chọn ảnh nền
  assert.equal(await page.getByText("Ảnh nền thẻ", { exact: true }).count(), 2);
  // Sửa 1 số liệu ở mục Giới thiệu thương hiệu, lưu và đọc lại từ dữ liệu
  await page.locator(".ce-nav button", { hasText: "Giới thiệu thương hiệu" }).click();
  await page.getByLabel("Giá trị 1", { exact: true }).fill("12+");
  await saved("#view .ar-form-foot button", "Đã lưu nội dung website.");
  assert.equal((await read("settings", "home")).value.story.stats[0].value, "12+");
  await page.getByLabel("Giá trị 1", { exact: true }).fill("10+");
  await saved("#view .ar-form-foot button", "Đã lưu nội dung website.");
  await open("settings");
  assert.equal(
    await page.locator("[name=maintenanceMonths]").inputValue(),
    "6",
  );
  await page.locator("[name=maintenanceMonths]").fill("25");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await page.locator("[data-field=maintenanceMonths] [role=alert]").waitFor();
  await page.locator("[name=maintenanceMonths]").fill("6");
  await saved("#view .ar-form-foot button", "Đã lưu cài đặt cửa hàng.");

  // Data loading errors remain actionable and do not display a successful save.
  await page.evaluate(() => {
    window.__adminList = AD.db.list;
    AD.db.list = async function (table, opts) {
      if (table === "products") throw Error("Kiểm thử mất kết nối");
      return window.__adminList.call(this, table, opts);
    };
  });
  await page.locator("[data-nav=products]").click();
  await page
    .locator("#view [role=alert]")
    .filter({ hasText: "Kiểm thử mất kết nối" })
    .waitFor();
  await page.evaluate(() => {
    AD.db.list = window.__adminList;
  });
  await page.getByRole("button", { name: "Thử lại" }).click();
  await page.locator(".ar-table").waitFor();

  // Both UI routes and data writes must respect the current role.
  await page.locator("#demo-role").selectOption("sales");
  await page.waitForFunction(() => AD.me?.role === "sales");
  await open("leads");
  assert.match(await page.locator("#view").textContent(), /Khách tư vấn React/);
  assert.equal(await page.locator("[data-nav=products]").count(), 0);
  await open("settings");
  assert.match(await page.locator("#view h1").textContent(), /Không có quyền/);
  assert.match(
    await page.evaluate(async () => {
      try {
        await AD.db.update("products", 1001, { price: 1 });
        return "allowed";
      } catch (e) {
        return e.message;
      }
    }),
    /quyền/i,
  );
  await page.locator("#demo-role").selectOption("accountant");
  await page.waitForFunction(() => AD.me?.role === "accountant");
  await open("orders/DTREACTQA");
  assert.equal(await page.locator("[name=status]").count(), 0);
  assert.equal(
    await page.locator("[name=staff_note]").getAttribute("readonly"),
    "",
  );
  await page.locator("[name=payment_status]").selectOption("partial");
  await saved("#view form .btn-primary", "Đã cập nhật đơn hàng.");
  assert.equal((await read("orders", "DTREACTQA")).payment_status, "partial");
  await page.locator("#demo-role").selectOption("staff");
  await page.waitForFunction(() => AD.me?.role === "staff");
  await open("settings");
  assert.match(await page.locator("#view h1").textContent(), /Không có quyền/);
  await open("products");
  assert.ok((await page.locator(".ar-table tbody tr").count()) > 0);
  await page.locator("#demo-role").selectOption("admin");
  await page.waitForFunction(() => AD.me?.role === "admin");

  // Responsive pages must contain wide tables, long titles and nested editors.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "dashboard",
      "orders/DTREACTQA",
      "products/1001",
      "categories/may-lanh",
      "coupons/REACTQA",
      "content",
      "misa",
      "customers",
    ]) {
      await open(route);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        `Overflow ${width}: ${route}`,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open("products");
  assert.equal(await page.locator(".ar-side").getAttribute("inert"), "");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .locator(".ar-side")
    .getByRole("button", { name: "Đóng menu" })
    .waitFor();
  assert.equal(await page.locator(".ar-main").getAttribute("inert"), "");
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Mở menu",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await open("dashboard");
  await page.reload();
  await page.locator("#view h1").waitFor();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator(".ar-skip")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("#view").evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.locator("#demo-enter").waitFor();
  assert.deepEqual(errors, [], "No browser exceptions across admin routes");
  // HTTP contract checks exercise the MySQL adapter's login/expiry behavior.
  // These responses are mocked; PHP/MySQL integration remains a separate suite.
  const httpContext = await browser.newContext();
  await blockExternal(httpContext);
  await httpContext.route("**/backend-config.js?*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace("mode: 'demo'", "mode: 'mysql'"),
    });
  });
  let authenticated = false,
    expired = false;
  const requests = [];
  await httpContext.route("**/server/api.php?*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      api = url.searchParams.get("route");
    requests.push({
      api,
      method: request.method(),
      headers: request.headers(),
    });
    const session = {
      access_token: "test-session-marker",
      refresh_token: "test-refresh-marker",
      expires_in: 3600,
      user: { id: "test-accountant" },
    };
    let data = [],
      status = 200;
    if (api === "/auth/login") {
      if (request.postDataJSON().password === "wrong") {
        data = { message: "Invalid login credentials" };
        status = 401;
      } else {
        authenticated = true;
        data = session;
      }
    } else if (api === "/auth/session") data = authenticated ? session : null;
    else if (expired) {
      status = 401;
      data = { message: "Session expired" };
    } else if (api === "/data/profiles")
      data = [
        { id: "test-accountant", name: "Kế toán HTTP", role: "accountant" },
      ];
    else if (api === "/data/orders")
      data = [
        {
          id: "http-order",
          code: "HTTPORDER",
          status: "pending",
          payment_status: "unpaid",
          total: 1000,
          subtotal: 1000,
          created_at: new Date().toISOString(),
          customer: { name: "Khách HTTP" },
          order_items: [],
        },
      ];
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "content-range": `0-0/${Array.isArray(data) ? data.length : 0}`,
      },
      body: JSON.stringify(data),
    });
  });
  const httpPage = await httpContext.newPage();
  await httpPage.goto(base + "admin/");
  await httpPage.locator("#login").waitFor();
  await httpPage.locator("[name=id]").fill("0912345678");
  await httpPage.locator("[name=password]").fill("wrong");
  await httpPage.locator("#login button").click();
  await httpPage
    .getByRole("alert")
    .filter({ hasText: "Sai số điện thoại" })
    .waitFor();
  await httpPage.locator("[name=password]").fill("test-password");
  await httpPage.locator("#login button").click();
  await httpPage.locator(".ad-side").waitFor();
  assert.equal(await httpPage.evaluate(() => AD.db.mode), "mysql");
  await httpPage
    .locator("#view")
    .getByRole("link", { name: "HTTPORDER" })
    .click();
  // The order list also has a payment_status filter. Wait for the detail form
  // before expiring the session so this checks saving rather than filtering.
  await httpPage
    .locator("#view")
    .getByRole("heading", { name: "Đơn HTTPORDER", exact: true })
    .waitFor();
  const orderForm = httpPage.locator("#view form.ar-grid");
  await orderForm.locator("[name=payment_status]").selectOption("paid");
  expired = true;
  await orderForm
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await httpPage.locator("#login").waitFor();
  await httpPage
    .locator(".ar-login")
    .getByRole("alert")
    .filter({ hasText: "Phiên đăng nhập đã hết hạn" })
    .waitFor();
  assert.ok(
    requests.some(
      (r) =>
        r.method === "PATCH" &&
        r.api === "/data/orders" &&
        r.headers["x-dt-admin"] === "1",
    ),
    "React saves through the authenticated MySQL contract",
  );
  await httpContext.close();
  console.log(
    "PASS React admin: CRUD, orders, CRM, coupons, content, Excel/CSV, roles, errors, keyboard and responsive layout.",
  );
} finally {
  await browser.close();
  server.close();
}
