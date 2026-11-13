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
  // Chờ điều kiện bất đồng bộ trong trang (waitForFunction không chờ được hàm async: Promise luôn "đúng")
  async function waitUntil(fn, arg, timeout = 15000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await page.evaluate(fn, arg)) return;
      await page.waitForTimeout(100);
    }
    throw new Error("Hết thời gian chờ: " + fn.toString().slice(0, 140));
  }
  // Trang sửa chia mục: bấm mục ở cột trái theo tên
  const tabTo = (name) => page.locator(".ce-nav button").filter({ hasText: new RegExp("^" + name) }).click();
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
    "inventory",
    "purchases",
    "purchases/new",
    "stocktakes",
    "stocktakes/new",
    "stock-exports",
    "stock-exports/new",
    "suppliers",
    "stock-history",
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
  assert.equal(await page.locator("[name=image]").count(), 0, "Sản phẩm không có ô Ảnh dịch vụ");
  await tabTo("Giá & tồn kho");
  await page.locator("[name=price]").fill("-1");
  await tabTo("Thông tin chung");
  await page.click("#save");
  // Lưu bị lỗi: tự mở mục chứa ô lỗi
  await page.locator("[data-field=price] [role=alert]").waitFor();
  assert.equal(
    (await read("products", 1001)).price,
    original.price,
    "Invalid price must not persist",
  );
  await page.locator("[name=price]").fill(String(original.price + 1000));
  await tabTo("Thông tin chung");
  await page.locator("[name=name]").fill("Máy lạnh kiểm thử React");
  await page.locator("[name=product_tags]").fill("");
  await page.locator("[name=product_tags]").pressSequentially("React, Demo");
  await tabTo("Thuộc tính & thông số");
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
  await tabTo("Hình ảnh");
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
  // Mở lại cùng sản phẩm có thể giữ mục đang xem (Hình ảnh): chọn lại mục đầu tiên
  await page.locator(".ce-nav button", { hasText: "Thông tin chung" }).click();
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
  // Thuộc tính bộ lọc: gõ giá trị mới (ngoài danh sách) → lưu vào sản phẩm và tự thêm vào bộ lọc của danh mục
  {
    const copy = await read("products", copyId);
    const filter = (await read("categories", copy.cat)).filters?.[0];
    if (filter) {
      await tabTo("Thuộc tính");
      await page.locator(`[name="attr-${filter.key}"]`).fill("Giá trị mới QA");
      await saved();
      assert.equal((await read("products", copyId)).attrs[filter.key], "Giá trị mới QA");
      await waitUntil(async ([cat, key]) => ((await AD.db.get("categories", cat)).filters.find((f) => f.key === key)?.options || []).includes("Giá trị mới QA"), [copy.cat, filter.key]);
    }
  }
  await page
    .locator(".ar-head")
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await page.waitForURL("**/#/products");
  assert.equal(await read("products", copyId), null);
  await open("products?q=khong-co-san-pham-xyz");
  assert.match(await page.locator("#view").textContent(), /Chưa có dữ liệu/);

  // Danh mục: 5 mục ở cột trái, mỗi lần hiện 1 mục; không còn ô JSON
  const catTab = tabTo;
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
  // Hỏi đáp: câu hỏi tạo trong admin hiện trên trang Hỏi đáp điện lạnh của website
  await open("faqs/new");
  await page.locator("[name=question]").fill("Câu hỏi kiểm thử React QA?");
  await page.locator("[name=category]").fill("Lắp đặt");
  await page.locator("[data-field=answer] .re-area").fill("Trả lời kiểm thử.");
  await saved();
  const faqId = decodeURIComponent(new URL(page.url()).hash.split("/")[2]);
  await page.goto(base + "frontend/hoi-dap.html");
  await page.getByRole("heading", { name: "Hỏi đáp điện lạnh", exact: true }).waitFor();
  assert.equal(await page.locator(".faq-search").count(), 0, "Không còn ô nhập câu hỏi");
  await page.locator(".faq-cat", { hasText: "Lắp đặt" }).click();
  await page.getByText("Câu hỏi kiểm thử React QA?").waitFor();
  await open("faqs/" + faqId);
  await page.locator(".ar-head").getByRole("button", { name: "Xóa", exact: true }).click();
  await page.waitForURL("**/#/faqs");
  // Dịch vụ có ô ảnh dịch vụ; Thương hiệu chia 2 mục: Thông tin & logo, Sản phẩm
  await open("services/ve-sinh");
  assert.equal(await page.locator('[data-field="image"]').count(), 1);
  await open("brands/new");
  assert.equal(await page.locator(".ce-nav button").count(), 2);
  await page.locator("[name=name]").fill("Thương hiệu React QA");
  await saved();
  const brandId = decodeURIComponent(new URL(page.url()).hash.split("/")[2]);
  assert.equal((await read("brands", brandId)).name, "Thương hiệu React QA");

  // Editing a pre-migration coupon must retain its minimum order condition.
  const coupon = await page.evaluate(async () =>
    (await AD.db.list("coupons")).rows.find((c) => c.min > 0),
  );
  await open("coupons/" + coupon.code);
  await tabTo("Phạm vi & điều kiện");
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
  await tabTo("Phạm vi & điều kiện");
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
    const total = p.price * 2 - 10001;
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
            shippingFee: 0,
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
  await waitUntil(
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
  // Báo cáo: tách Đã thu / Chưa thu và mục Đối soát tiền
  await open("reports");
  assert.match(await page.locator("#view").innerText(), /Đối soát tiền/);
  assert.notEqual(await page.locator("#rev-collected").innerText(), "0 ₫", "Đơn đã thu tiền được tính vào Đã thu");
  await open("dashboard");
  assert.match(await page.locator("#view .ar-kpis").innerText(), /Đã thu tiền 30 ngày[\s\S]*Chưa thu tiền/);
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
  await waitUntil(
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
  // Trang Tầm nhìn: mỗi vị trí ảnh là 1 thẻ (xem trước + Tải ảnh / Dán link / Bỏ ảnh)
  assert.equal(await page.locator(".ar-slot").count(), 10);
  assert.equal(await page.locator(".ar-gallery").count(), 0);
  const firstSlot = page.locator(".ar-slot").first();
  await firstSlot.getByRole("button", { name: "Dán link" }).click();
  await firstSlot.locator("input[type=url]").fill("https://example.com/tru-so.jpg");
  await firstSlot.getByRole("button", { name: "Dùng" }).click();
  assert.equal(await firstSlot.locator("img").getAttribute("src"), "https://example.com/tru-so.jpg");
  await saved("#view .ar-form-foot button", "Đã lưu nội dung website.");
  assert.ok(await page.evaluate(() => JSON.stringify(localStorage).includes("https://example.com/tru-so.jpg")), "Ảnh Tầm nhìn được lưu");
  await firstSlot.getByRole("button", { name: /^Bỏ ảnh/ }).click();
  assert.equal(await firstSlot.locator("img").count(), 0);
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
  assert.ok((await page.locator(".ce-nav button").count()) >= 5, "Cài đặt chia nhóm ở cột trái");
  await tabTo("Nhắc bảo trì");
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

  // Quản trị viên: yêu cầu từ website (liên hệ, báo giá, đặt lịch…) xem ở mục "Yêu cầu khách hàng"
  assert.equal((await page.locator("[data-nav=leads]").innerText()).trim().startsWith("Yêu cầu khách hàng"), true);
  // Both UI routes and data writes must respect the current role.
  await page.locator("#demo-role").selectOption("sales");
  await page.waitForFunction(() => AD.me?.role === "sales");
  await open("leads");
  assert.match(await page.locator("#view").textContent(), /Khách tư vấn React/);
  assert.equal(await page.locator("[data-nav=products]").count(), 0);
  assert.equal(await page.locator("[data-nav=leads]").count(), 1, "Nhân viên kinh doanh vẫn có Khách hàng của tôi");
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
      "inventory",
      "purchases/new",
      "stocktakes/new",
      "invoice/DTREACTQA",
      "voucher/ban/DTREACTQA",
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
  // Menu bên bị khóa (inert) trên điện thoại: chờ giao diện cập nhật sau khi đổi cỡ màn hình
  await page.waitForFunction(() => document.querySelector(".ar-side")?.getAttribute("inert") === "");
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
  // Kho hàng: nhập hàng (giá vốn bình quân, công nợ NCC), kiểm hàng, xuất kho, lịch sử kho, hóa đơn bán hàng
  {
    const pid = 1001;
    const before = await read("products", pid);
    await open("purchases/new");
    await page.locator("[name=supplier]").click();
    await page.locator(".ar-combo-list li").first().click();
    await page.locator(".inv-picker input").fill(before.sku);
    await page.keyboard.press("Enter");
    await page.locator(`input[aria-label^="Số lượng"]`).fill("5");
    await page.locator(`input[aria-label^="Đơn giá"]`).fill("1000000");
    await page.locator(`select[aria-label^="Thuế"]`).selectOption("8");
    await page.locator("input[aria-label='Số tiền thanh toán ngay']").fill("2000000");
    await page.locator("#po-receive").click();
    await page.locator(".inv-steps").waitFor();
    const po = (await page.evaluate(() => AD.db.list("purchase_orders", { order: "id.desc", limit: 1 }))).rows[0];
    assert.match(po.code, /^PON\d{5}$/);
    assert.equal(po.total, 5400000, "5 × 1.000.000 + 8% thuế");
    assert.equal(po.received, true);
    assert.equal(po.paid, 2000000);
    assert.equal(po.status, "ordered", "Còn nợ NCC: Đang giao dịch");
    const afterPo = await read("products", pid);
    assert.equal(afterPo.stock, before.stock + 5, "Nhập kho cộng tồn");
    const expectedCost = Math.round(((before.stock * (Number(before.cost_price) || 0)) + 5 * 1000000) / (before.stock + 5));
    assert.equal(afterPo.cost_price, expectedCost, "Giá vốn bình quân");
    let supplier = await read("suppliers", po.supplier_id);
    assert.equal(supplier.debt, 3400000, "Công nợ NCC = tổng - đã trả");
    await page.locator("input[aria-label='Số tiền thanh toán']").fill("3400000");
    await page.locator("#po-pay").click();
    await waitUntil(async (id) => (await AD.db.get("purchase_orders", id)).status === "done", po.id);
    supplier = await read("suppliers", po.supplier_id);
    assert.equal(supplier.debt, 0, "Trả đủ: hết công nợ");
    // Gõ tên nhà cung cấp mới: tự tạo nhà cung cấp khi lưu đơn nhập
    {
      await open("purchases/new");
      await page.locator("[name=supplier]").fill("Công ty TNHH Vật tư QA Mới");
      await page.locator(".inv-picker input").fill(before.sku);
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Tạo & chưa nhập" }).click();
      await page.locator(".inv-steps").waitFor();
      const draft = (await page.evaluate(() => AD.db.list("purchase_orders", { order: "id.desc", limit: 1 }))).rows[0];
      const sup = await page.evaluate((id) => AD.db.get("suppliers", id), draft.supplier_id);
      assert.equal(sup.name, "Công ty TNHH Vật tư QA Mới");
      await page.evaluate((id) => AD.db.inventory("purchase_cancel", { p_id: id }), draft.id);
    }
    // Kiểm hàng: thực tế ít hơn 2 -> cân bằng kho
    await open("stocktakes/new");
    await page.locator(".inv-picker input").fill(before.sku);
    await page.keyboard.press("Enter");
    await page.locator(`input[aria-label^="Tồn thực tế"]`).fill(String(afterPo.stock - 2));
    await page.locator(`input[aria-label^="Lý do"]`).fill("Thất thoát");
    assert.match(await page.locator(".inv-lines").innerText(), /-2/);
    await page.locator("#adj-balance").click();
    await waitUntil(async ([id, n]) => (await AD.db.get("products", id)).stock === n, [pid, afterPo.stock - 2]);
    const adj = (await page.evaluate(() => AD.db.list("stock_adjustments", { order: "id.desc", limit: 1 }))).rows[0];
    assert.equal(adj.status, "balanced");
    assert.match(adj.code, /^IAN\d{5}$/);
    // Xuất kho quà tặng 1 cái
    await open("stock-exports/new");
    // Lý do xuất: bấm chọn từ danh sách có sẵn
    await page.locator("[name=reason]").click();
    await page.locator(".ar-combo-list li", { hasText: "Quà tặng doanh nghiệp" }).click();
    assert.equal(await page.locator("[name=reason]").inputValue(), "Quà tặng doanh nghiệp");
    await page.locator(".inv-picker input").fill(before.sku);
    await page.keyboard.press("Enter");
    await page.locator("#exp-confirm").click();
    await waitUntil(async ([id, n]) => (await AD.db.get("products", id)).stock === n, [pid, afterPo.stock - 3]);
    // Xuất quá tồn bị chặn, không ghi gì
    await open("stock-exports/new");
    // Lý do xuất: tự gõ lý do ngoài danh sách
    await page.locator("[name=reason]").fill("Bảo hành đổi máy cho khách");
    await page.locator(".inv-picker input").fill(before.sku);
    await page.keyboard.press("Enter");
    await page.locator(`input[aria-label^="Số lượng xuất"]`).fill(String(afterPo.stock + 100));
    await page.locator("#exp-confirm").click();
    await page.locator(".ar-toast").filter({ hasText: "Không đủ tồn kho" }).waitFor();
    assert.equal((await read("products", pid)).stock, afterPo.stock - 3);
    // Lịch sử kho: 3 dòng nhập / kiểm / xuất của sản phẩm
    await open(`stock-history?product=${pid}`);
    const history = await page.locator("#view .ar-table tbody").innerText();
    assert.match(history, /Nhập hàng/); assert.match(history, /Kiểm hàng/); assert.match(history, /Xuất kho/);
    // Phiếu nhập kho (01-VT) của đơn nhập: tổng = tiền hàng chưa VAT, chữ, chữ ký
    await open(`purchases/${po.id}`);
    await page.locator("#view a", { hasText: "Phiếu nhập kho" }).click();
    await page.locator(".vc-sheet").waitFor();
    let sheet = await page.locator(".vc-sheet").innerText();
    assert.match(sheet, /PHIẾU NHẬP KHO/); assert.match(sheet, /Mẫu số: 01 - VT/); assert.match(sheet, /99\/2025\/TT-BTC/); assert.match(sheet, /Thủ kho/);
    assert.match(sheet, new RegExp(`PNK${po.code.slice(3)}`));
    assert.equal(await page.locator(".vc-total").innerText(), "5.000.000");
    assert.match(sheet, /Năm triệu đồng chẵn/);
    assert.equal(await page.locator("#vc-print").isEnabled(), true);
    assert.equal(await page.locator(".vc-no").evaluate((el) => getComputedStyle(el).color), "rgb(0, 0, 0)", "Phiếu in trắng đen");
    // Phiếu xuất kho (02-VT) của phiếu xuất quà tặng: Nợ 641 / Có 156
    const exp = (await page.evaluate(() => AD.db.list("stock_exports", { order: "id.desc", limit: 1 }))).rows[0];
    assert.equal(exp.status, "done");
    await open(`stock-exports/${exp.id}`);
    await page.locator("#view a", { hasText: "In phiếu xuất kho" }).click();
    await page.locator(".vc-sheet").waitFor();
    sheet = await page.locator(".vc-sheet").innerText();
    assert.match(sheet, /PHIẾU XUẤT KHO/); assert.match(sheet, /Mẫu số: 02 - VT/); assert.match(sheet, /Nợ: 641/); assert.match(sheet, /Có: 156/); assert.match(sheet, /Quà tặng doanh nghiệp/); assert.match(sheet, /Giám đốc/);
    assert.equal(await page.locator(".vc-sheet tbody tr").count(), 1);
    // Phiếu xuất kho bán hàng theo đơn
    await open("orders/DTREACTQA");
    await page.locator("#view a", { hasText: "Phiếu xuất kho" }).click();
    await page.locator(".vc-sheet").waitFor();
    sheet = await page.locator(".vc-sheet").innerText();
    assert.match(sheet, /Xuất bán hàng theo đơn DTREACTQA/); assert.match(sheet, /Nợ: 632/);
    assert.match(sheet, /PXK-DTREACTQA/);
    // Đơn nhập chưa nhập kho: không in được phiếu nhập
    const draftPo = await page.evaluate(([sid, pid]) => AD.db.inventory("purchase_save", { supplier_id: sid, items: [{ product_id: pid, qty: 1, price: 1000 }] }), [po.supplier_id, pid]);
    await open(`voucher/nhap/${draftPo.id}`);
    await page.locator(".vc-sheet").waitFor();
    assert.equal(await page.locator("#vc-print").isDisabled(), true);
    assert.match(await page.locator("#view [role=alert]").innerText(), /chưa nhập kho/);
    await page.evaluate((id) => AD.db.inventory("purchase_cancel", { p_id: id }), draftPo.id);
    // Quản lý kho: dòng sản phẩm hiện tồn & giá vốn
    await open("inventory");
    await page.locator(".ar-toolbar input[type=search]").fill(before.sku);
    assert.match(await page.locator("#view .ar-table").innerText(), new RegExp(before.sku));
    // Sửa tồn tay ở trang sản phẩm cũng ghi lịch sử
    const manualMoves = (await page.evaluate((id) => AD.db.list("stock_moves", { filters: [["product_id", "eq", id], ["type", "eq", "manual"]] }), pid)).count;
    await page.evaluate((id) => AD.db.update("products", id, { stock: 50 }), pid);
    assert.equal((await page.evaluate((id) => AD.db.list("stock_moves", { filters: [["product_id", "eq", id], ["type", "eq", "manual"]] }), pid)).count, manualMoves + 1);
    // Hóa đơn bán hàng của đơn DTREACTQA: cấp số, số tiền bằng chữ, tách VAT
    await open("orders/DTREACTQA");
    await page.locator("#view a", { hasText: "Xuất hóa đơn" }).click();
    await page.locator(".inv-sheet").waitFor();
    await page.locator("#inv-issue").click();
    await page.locator(".inv-no", { hasText: /^\d{7}$/ }).waitFor();
    const invSheet = await page.locator(".inv-sheet").innerText();
    assert.match(invSheet, /HÓA ĐƠN BÁN HÀNG/);
    assert.match(invSheet, /Tổng cộng tiền thanh toán/);
    assert.match(invSheet, /đồng chẵn/);
    assert.equal(await page.locator(".inv-no").evaluate((el) => getComputedStyle(el).color), "rgb(0, 0, 0)", "Hóa đơn trắng đen");
    assert.equal(await page.locator(".inv-table th").first().evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
    const inv = await read("orders", "DTREACTQA");
    assert.match(inv.invoice_no, /^\d{7}$/);
    await page.reload();
    await page.locator(".inv-sheet").waitFor();
    assert.equal(await page.locator("#inv-issue").count(), 0, "Cấp số 1 lần");
    assert.equal((await read("orders", "DTREACTQA")).invoice_no, inv.invoice_no);
  }
  // Tạo đơn hàng tại quản trị: khách có sẵn, sản phẩm trong hệ thống (sửa giá) + dòng tự nhập, phí, chiết khấu, VAT cộng thêm
  {
    const prod = (await page.evaluate(() => AD.db.list("products", { filters: [["stock", "gte", 5]], limit: 1 }))).rows[0];
    const stockBefore = Number(prod.stock);
    await open("orders");
    await page.locator("#order-new").click();
    await page.locator("#view h1", { hasText: "Tạo đơn hàng" }).waitFor();
    // Chưa có sản phẩm: báo lỗi, không tạo
    await page.locator("[name=c_name]").fill("Khách tạo tay QA");
    await page.locator("[name=c_phone]").fill("0977000111");
    await page.locator("#order-create").click();
    await page.locator("#view [role=alert]", { hasText: "chưa có sản phẩm" }).waitFor();
    // Chọn khách có sẵn rồi sửa lại tên
    const known = (await page.evaluate(() => AD.db.list("crm_customers", { limit: 1 }))).rows[0];
    if (known?.phone) {
      await page.getByLabel("Chọn khách hàng có sẵn").fill(String(known.phone).slice(0, 6));
      await page.locator(".inv-hits button").first().click();
      assert.ok((await page.locator("[name=c_phone]").inputValue()).length >= 10, "Chọn khách có sẵn điền số điện thoại");
    }
    await page.locator("[name=c_name]").fill("Khách tạo tay QA");
    await page.locator("[name=c_phone]").fill("0977000111");
    await page.getByLabel("Thêm sản phẩm có sẵn").fill(prod.sku);
    await page.locator(".inv-hits button").first().click();
    await page.getByLabel("Số lượng dòng 1").fill("2");
    await page.getByLabel("Đơn giá dòng 1").fill("1000000");
    await page.locator("#order-add-custom").click();
    await page.getByLabel("Tên dòng 2").fill("Công lắp đặt ống đồng");
    await page.getByLabel("Đơn vị dòng 2").fill("Mét");
    await page.getByLabel("Số lượng dòng 2").fill("3");
    await page.getByLabel("Đơn giá dòng 2").fill("100000");
    await page.getByLabel("Phí giao hàng").fill("50000");
    await page.getByLabel("Chiết khấu", { exact: true }).fill("250000");
    await page.getByLabel("Thuế suất GTGT").selectOption("10");
    await page.getByLabel("Cách tính thuế").selectOption("out");
    // (2.000.000 + 300.000 + 50.000 - 250.000) = 2.100.000 + VAT 10% 210.000 = 2.310.000
    assert.match(await page.locator("#order-total").innerText(), /2\.310\.000/);
    await page.locator("[name=payment]").selectOption("bank");
    await page.locator("[name=payment_status]").selectOption("paid");
    await page.locator("#order-create").click();
    await page.waitForURL(/#\/orders\/DT/);
    await page.locator("#view h1", { hasText: /^Đơn DT/ }).waitFor();
    const view = await page.locator("#view").innerText();
    assert.match(view, /Tạo tại quản trị/); assert.match(view, /Công lắp đặt ống đồng/); assert.match(view, /Thuế GTGT 10%/); assert.match(view, /2\.310\.000/);
    const made = (await page.evaluate(() => AD.db.list("orders", { filters: [["source", "eq", "admin"]], order: "created_at.desc", limit: 1, select: "*,order_items(*)" }))).rows[0];
    assert.equal(made.total, 2310000); assert.equal(made.vat_amount, 210000); assert.equal(made.payment_status, "paid"); assert.equal(made.order_items.length, 2);
    assert.equal(Number((await page.evaluate((id) => AD.db.get("products", id), prod.id)).stock), stockBefore - 2, "Trừ kho 2 cái, dòng tự nhập không trừ");
    // Hóa đơn: VAT 10% cộng thêm, tiền trước thuế 2.100.000
    await page.locator("#view a", { hasText: "Xuất hóa đơn" }).click();
    await page.locator(".inv-sheet").waitFor();
    const invText = await page.locator(".inv-sheet").innerText();
    assert.match(invText, /2\.100\.000/); assert.match(invText, /210\.000/); assert.match(invText, /Công lắp đặt ống đồng/);
  }
  // Danh mục: bật/tắt "Hiện dải sản phẩm ở trang chủ" → trang chủ website thêm / bớt dải tương ứng
  {
    const homeStrips = async () => { await page.goto(base + "frontend/index.html"); await page.waitForFunction(() => document.querySelectorAll("section h2").length > 3); return page.evaluate(() => [...document.querySelectorAll("section h2")].map((h) => h.textContent.trim())); };
    const cat = await page.evaluate(() => DT.categories.find((c) => !DT.showOnHome(c) && DT.products.some((p) => p.cat === c.id)));
    assert.ok(cat, "Có danh mục chưa hiện ở trang chủ");
    assert.ok(!(await homeStrips()).includes(cat.name));
    await open(`categories/${cat.id}`);
    assert.equal(await page.locator("[name=show_home]").isChecked(), false);
    await page.locator("[name=show_home]").check();
    await saved();
    { const list = await homeStrips(); assert.ok(list.includes(cat.name), "Bật: dải danh mục hiện ở trang chủ " + cat.name + " / " + list.join("|")); }
    await open("categories/may-lanh");
    assert.equal(await page.locator("[name=show_home]").isChecked(), true, "Máy lạnh mặc định đang hiện ở trang chủ");
    await page.locator("[name=show_home]").uncheck();
    await saved();
    assert.ok(!(await homeStrips()).includes("Máy lạnh - Điều hòa"), "Tắt: dải Máy lạnh biến khỏi trang chủ");
    await open("dashboard");
    for (const id of ["may-lanh", cat.id]) await page.evaluate(([id, on]) => AD.db.update("categories", id, { show_home: on }), [id, id === "may-lanh"]);
  }
  // Trình soạn thảo nội dung bài viết: định dạng, bảng, liên kết, mã HTML, lưu và đọc lại
  {
    const post = (await page.evaluate(() => AD.db.list("posts", { limit: 1 }))).rows[0];
    await open(`posts/${encodeURIComponent(post.slug || post.id)}`);
    await tabTo("Nội dung");
    const area = page.locator(".re-area");
    await area.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type("Hướng dẫn vệ sinh máy lạnh");
    await page.keyboard.press("Control+A");
    await page.locator(".re-bar button[title^='In đậm']").click();
    await page.locator(".re-bar select[aria-label='Định dạng']").selectOption("h2");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.locator(".re-bar button[title='Chèn bảng']").click();
    await page.locator(".re-pop input").first().fill("2");
    await page.locator(".re-pop button", { hasText: "Chèn bảng" }).click();
    assert.equal(await area.locator("table tr").count(), 2);
    await page.locator(".re-bar button", { hasText: "Mã HTML" }).click();
    const code = await page.locator(".re-source").inputValue();
    assert.match(code, /<h2>.*Hướng dẫn vệ sinh máy lạnh.*<\/h2>/);
    assert.match(code, /<(b|strong)>|font-weight/);
    await page.locator(".re-source").fill(code + '<p><a href="lien-he.html">Liên hệ</a></p>');
    await page.locator(".re-bar button", { hasText: "Mã HTML" }).click();
    assert.equal(await area.locator("a[href='lien-he.html']").count(), 1);
    assert.match(await page.locator(".re-foot").innerText(), /HTML: [\d.]+\/100\.000/);
    await saved();
    const stored = await read("posts", post.slug || post.id);
    assert.match(stored.content, /<table/);
    assert.match(stored.content, /lien-he\.html/);
  }
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
