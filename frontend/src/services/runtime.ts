import type { Runtime, Row } from "../types";
declare const __BUILD_VERSION__: string;

// Lớp nghiệp vụ này vẫn được admin HTML sử dụng; React chỉ thay thế phần giao diện website.
export const siteBase = new URL("./", document.baseURI);
export let dt: Runtime;
function script(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const element = document.createElement("script");
    const url = new URL(`assets/js/${file}.js`, siteBase);
    url.searchParams.set("v", __BUILD_VERSION__);
    element.async = false; // tải song song nhưng vẫn chạy đúng thứ tự thêm vào
    element.src = url.href;
    element.dataset.sharedRuntime = file;
    element.onload = () => resolve();
    element.onerror = () =>
      reject(new Error(`Không tải được thành phần ${file}`));
    document.head.append(element);
  });
}
export async function bootstrap(): Promise<void> {
  // Tải song song; async=false giữ thứ tự thực thi, rows phải có trước backend.
  await Promise.all(
    [
      "data/catalog",
      "data/content",
      "seo-config",
      "backend-config",
      "core/utils",
      "components/icons",
      "core/api",
      "core/rows",
      "core/promotions",
      "core/datasource",
      "core/store",
      "core/backend",
      "components/art",
      "core/payments",
    ].map(script),
  );
  dt = window.DT;
  let notices = document.getElementById("toasts");
  if (!notices) {
    notices = document.createElement("div");
    notices.id = "toasts";
    document.body.append(notices);
  }
  notices.setAttribute("role", "status");
  notices.setAttribute("aria-live", "polite");
  notices.setAttribute("aria-atomic", "false");
  await dt.ready;
  dt.store.prune();
  dt.saveLead = (type: string, data: Row) =>
    dt.dataSource.current().submitLead(type, data);
  await script("components/analytics");
}
export const money = (value: number | null | undefined): string =>
  dt.u.money(value);
export const toast = (message: string, error = false): void =>
  dt.u.toast(message, error ? "error" : "success");
export const safeUrl = (url: unknown): string => dt.u.safeUrl(url);
export function safeImage(source: unknown): string {
  if (typeof source !== "string") return "";
  // Ảnh demo do quản trị nén bằng canvas được lưu dưới dạng data URL bitmap.
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(source))
    return source;
  const url = safeUrl(source);
  return /^(tel|mailto|zalo):/i.test(url) ? "" : url;
}
export const formValues = (form: HTMLFormElement): Row =>
  Object.fromEntries(new FormData(form));
