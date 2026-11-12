import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { chromium, pagesServer, blockExternal } from "../browser/lib.mjs";
const remote = process.env.STOREFRONT_BASE;
const local = remote ? null : await pagesServer(path.resolve("dist"));
const base = remote || local.base + "frontend/";
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
  async function open(route) {
    await page.goto(base + route);
    await page.waitForSelector('html[data-react-ready="true"] #main h1', {
      state: "attached",
    });
    await page.waitForFunction(
      () => !document.querySelector("#main .react-loading"),
    );
  }
  await open("index.html");
  const baseline = await page.evaluate(() => ({
    font: getComputedStyle(document.body).fontFamily,
    size: getComputedStyle(document.body).fontSize,
    container: getComputedStyle(document.querySelector(".container")).maxWidth,
    radius: getComputedStyle(document.querySelector(".section-box"))
      .borderRadius,
    heroColumns: getComputedStyle(
      document.querySelector(".hero"),
    ).gridTemplateColumns.split(" ").length,
  }));
  assert.ok(baseline.font.includes("Be Vietnam Pro"));
  assert.equal(baseline.size, "14px");
  assert.equal(baseline.container, "1240px");
  assert.equal(baseline.radius, "0px");
  assert.equal(baseline.heroColumns, 3);
  assert.equal(
    await page.locator(".cat-toggle").count(),
    0,
    "Header không còn nút Danh mục",
  );
  assert.equal(await page.locator(".hero-banner-copy").count(), 0);
  assert.equal(await page.locator(".slider-nav").count(), 2);
  assert.equal(await page.locator(".hero-user").count(), 1);
  assert.equal(
    await page.locator("#brand-story").count(),
    0,
    "Trang chủ không còn dải giới thiệu thương hiệu",
  );
  assert.ok((await page.locator(".qcat .qcat-img").count()) > 0);
  assert.ok((await page.locator(".svc-grid .svc-ic").count()) > 0);
  // Đã gỡ: khối Giải pháp doanh nghiệp ở trang chủ, mục Khách hàng & đối tác
  assert.equal(await page.locator(".b2b-banner, .tr-logos").count(), 0);
  assert.equal(await page.getByText("Khách hàng & đối tác tin tưởng").count(), 0);
  assert.equal(
    await page.locator("[data-block] .tabs").count(),
    0,
    "Khối sản phẩm trang chủ không còn tab loại",
  );
  assert.equal(
    await page
      .locator(
        'script[data-shared-runtime="components/layout"],script[data-shared-runtime="components/ui"],script[data-shared-runtime^="pages/"]',
      )
      .count(),
    0,
    "Giữ React, không nạp lại các trình dựng trang cũ",
  );
  const id = await page.evaluate(() => DT.products.find((p) => p.stock > 0).id);
  await open(`san-pham.html?id=${id}`);
  assert.equal(await page.locator(".gallery-feats>div").count(), 3);
  assert.equal(await page.locator(".pd-title .pd-sub").count(), 1);
  assert.equal(await page.locator(".promo-box h4").count(), 1);
  assert.equal(await page.locator(".pd-aside .aside-box").count(), 2);
  const columns = await page.evaluate(() => ({
    main: getComputedStyle(
      document.querySelector("#pd"),
    ).gridTemplateColumns.split(" ").length,
    details: getComputedStyle(
      document.querySelector(".pd-content-layout"),
    ).gridTemplateColumns.split(" ").length,
  }));
  assert.equal(columns.main, 3);
  assert.equal(columns.details, 2);
  assert.equal(await page.locator(".buy-btns .btn-buy").count(), 1);
  for (const [route, selector] of [
    ["lien-he.html", '.two-col form[data-lead="contact"]'],
    ["dich-vu.html", '.svc-book form[data-lead="service"]'],
    ["he-thong-cua-hang.html", ".stores-layout .map-box"],
    ["tin-tuc.html", ".blog-layout"],
    ["hoi-dap.html", ".faq-layout"],
    ["tai-khoan.html", ".auth-wrap"],
  ]) {
    await open(route);
    assert.ok(await page.locator(selector).isVisible(), route);
  }
  await open("tai-khoan.html#register");
  await page.locator("#register-form").waitFor();
  fs.mkdirSync(".cache/visual-restore", { recursive: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "index.html",
      `san-pham.html?id=${id}`,
      "lien-he.html",
      "dich-vu.html",
      "he-thong-cua-hang.html",
      "tai-khoan.html",
      "tin-tuc.html",
      "hoi-dap.html",
    ]) {
      await open(route);
      const problems = await page.evaluate(() => {
        const issues = [];
        if (document.documentElement.scrollWidth > innerWidth + 1)
          issues.push("Tràn ngang");
        for (const list of document.querySelectorAll("[data-collection-items]"))
          if (list.children.length > (list.closest(".footer-col") ? 12 : 5)) issues.push("Quá 5 mục");
        for (const section of document.querySelectorAll(
          ".gallery,.pd-info,.aside-box,.svc-book>.react-form,.blog-item,.map-box,.auth-wrap",
        )) {
          const box = section.getBoundingClientRect();
          if (box.left < 0 || box.right > innerWidth + 1)
            issues.push("Khối nằm ngoài màn hình");
        }
        return issues;
      });
      assert.deepEqual(problems, [], `${width}px ${route}`);
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS: giao diện gốc 408d998 trên React, khung header/trang chủ/sản phẩm/nội dung/tài khoản và responsive 320–1440px (${remote ? "MySQL" : "demo"}).`,
  );
} finally {
  await browser.close();
  local?.server.close();
}
