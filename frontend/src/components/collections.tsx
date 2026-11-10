import { useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./common";

export const ITEMS_PER_PAGE = 5;
export function MoreButton({
  onClick,
  controls,
}: {
  onClick: () => void;
  controls?: string;
}) {
  return (
    <div className="collection-more">
      <button
        type="button"
        className="btn btn-primary"
        aria-controls={controls}
        onClick={onClick}
      >
        Xem thêm
        <Icon name="right" />
      </button>
    </div>
  );
}
// variant="arrow": mũi tên ở mép phải + chấm tròn bên dưới cho biết có bao nhiêu lượt sản phẩm
type Variant = "button" | "arrow";
export function PagedList<T>({
  items,
  renderItem,
  className = "",
  label = "Danh sách",
  initialIndex = 0,
  variant = "button",
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  label?: string;
  initialIndex?: number;
  variant?: Variant;
}) {
  const identity = items
    .map(
      (item: any) =>
        item?.id ??
        item?.slug ??
        item?.key ??
        item?.name ??
        item?.title ??
        String(item),
    )
    .join("|");
  return (
    <CollectionPage
      key={identity + ":" + initialIndex}
      items={items}
      renderItem={renderItem}
      className={className}
      label={label}
      initialIndex={initialIndex}
      variant={variant}
    />
  );
}
function CollectionPage<T>({
  items,
  renderItem,
  className,
  label,
  initialIndex,
  variant,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className: string;
  label: string;
  initialIndex: number;
  variant: Variant;
}) {
  const [page, setPage] = useState(
    Math.max(0, Math.floor(initialIndex / ITEMS_PER_PAGE)),
  );
  const id = useId(),
    list = useRef<HTMLDivElement>(null);
  const pages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const current = Math.min(page, Math.max(0, pages - 1));
  const start = current * ITEMS_PER_PAGE;
  const more = items.length > ITEMS_PER_PAGE;
  function go(target: number) {
    setPage(target);
    requestAnimationFrame(() => {
      list.current?.focus({ preventScroll: true });
      list.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  }
  const next = () => go((current + 1) % pages);
  return (
    <div
      className={`paged-list${variant === "arrow" && more ? " paged-arrow" : ""}`}
      data-collection={label}
      data-collection-size={items.length}
    >
      <div
        id={id}
        ref={list}
        className={className}
        role="group"
        tabIndex={-1}
        aria-label={label}
        data-collection-items
      >
        {items
          .slice(start, start + ITEMS_PER_PAGE)
          .map((item, index) => renderItem(item, start + index))}
      </div>
      {more &&
        (variant === "arrow" ? (
          <>
            <button
              type="button"
              className="car-btn next paged-next"
              aria-label="Xem thêm"
              title={`Xem tiếp (${current + 1}/${pages})`}
              aria-controls={id}
              onClick={next}
            >
              <Icon name="right" />
            </button>
            <div
              className="paged-dots"
              role="group"
              aria-label={`${label}: ${items.length} mục, ${pages} lượt`}
            >
              {Array.from({ length: pages }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  className={i === current ? "active" : ""}
                  aria-label={`Lượt ${i + 1} / ${pages}`}
                  aria-current={i === current ? "true" : undefined}
                  aria-controls={id}
                  onClick={() => go(i)}
                />
              ))}
            </div>
          </>
        ) : (
          <MoreButton controls={id} onClick={next} />
        ))}
    </div>
  );
}
