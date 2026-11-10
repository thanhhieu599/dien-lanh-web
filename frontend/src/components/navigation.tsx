import { useState } from "react";
import { dt } from "../services/runtime";
import { Icon, ShopLink } from "./common";
import type { Category } from "../types";
export function uniqueCategories() {
  return dt.categories.filter(
    (c, index, all) =>
      all.findIndex(
        (other) =>
          dt.u.norm(
            other.short || other.name.replace(/\[TEST[^\]]*\]\s*/gi, ""),
          ) === dt.u.norm(c.short || c.name.replace(/\[TEST[^\]]*\]\s*/gi, "")),
      ) === index,
  );
}
export function MegaMenu() {
  const categories = uniqueCategories();
  const [active, setActive] = useState(categories[0]?.id);
  return (
    <div className="mega">
      <ul className="mega-list">
        {categories.map((c) => (
          <li
            className={active === c.id ? "active" : ""}
            key={c.id}
            onMouseEnter={() => setActive(c.id)}
            onFocus={() => setActive(c.id)}
          >
            <ShopLink href={dt.api.catUrl(c.id)}>
              <Icon name={c.icon} />
              <span>{c.name}</span>
              <Icon name="right" />
            </ShopLink>
          </li>
        ))}
      </ul>
      <div className="mega-panels">
        {categories.map((c) => (
          <div
            className={`mega-panel ${active === c.id ? "active" : ""}`}
            key={c.id}
          >
            <CategoryGroups category={c} />
          </div>
        ))}
      </div>
    </div>
  );
}
// Bảng nhóm (cấp 2) và mục (cấp 3) của một danh mục, dùng chung cho menu Sản phẩm và menu cạnh banner
export function CategoryGroups({ category: c }: { category: Category }) {
  if (!c.subs.length)
    return (
      <div className="mega-group">
        <h4>
          <ShopLink href={dt.api.catUrl(c.id)}>Xem tất cả {c.name}</ShopLink>
        </h4>
      </div>
    );
  return (
    <>
      {c.subs.map((s) => (
        <div className="mega-group" key={s.id}>
          <h4>
            <ShopLink href={dt.api.catUrl(c.id, s.id)}>{s.name}</ShopLink>
          </h4>
          {(s.items || []).map((it) => (
            <ShopLink key={it.id} href={dt.api.catUrl(c.id, s.id, it.id)}>
              {it.name}
            </ShopLink>
          ))}
        </div>
      ))}
    </>
  );
}
