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
  pageSize = ITEMS_PER_PAGE,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  label?: string;
  initialIndex?: number;
  variant?: Variant;
  pageSize?: number;
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
      pageSize={pageSize}
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
  pageSize,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className: string;
  label: string;
  initialIndex: number;
  variant: Variant;
  pageSize: number;
}) {
  const [page, setPage] = useState(
    Math.max(0, Math.floor(initialIndex / pageSize)),
  );
  const id = useId(),
    list = useRef<HTMLDivElement>(null);
  const pages = Math.ceil(items.length / pageSize);
  const current = Math.min(page, Math.max(0, pages - 1));
  const start = current * pageSize;
  const more = items.length > pageSize;
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
          .slice(start, start + pageSize)
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

// Chọn trang dạng « 1 2 3 … 29 »: luôn có trang đầu, trang cuối và 1 trang hai bên trang hiện tại
export function pageList(page: number, pages: number): (number | "…")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1, ...(page <= 3 ? [2, 3] : []), ...(page >= pages - 2 ? [pages - 1, pages - 2] : [])]);
  const list = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return list.flatMap((n, i) => (i && n - list[i - 1] > 1 ? (["…", n] as const) : ([n] as const)));
}
export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <nav className="pager-num" aria-label="Chọn trang sản phẩm">
      <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)}>«</button>
      {pageList(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">…</span>
        ) : (
          <button type="button" key={n} className={n === page ? "active" : ""} aria-label={`Trang ${n}`} aria-current={n === page ? "page" : undefined} onClick={() => n !== page && onPage(n)}>
            {n}
          </button>
        ),
      )}
      <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onPage(page + 1)}>»</button>
    </nav>
  );
}


// Danh sách hiện đủ 1 trang (mặc định 20 mục), chọn trang « 1 2 3 … » ở cuối, gần chân trang
export function NumberedList<T>({
  items,
  renderItem,
  className = "",
  label = "Danh sách",
  perPage = 20,
  initialIndex = 0,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  label?: string;
  perPage?: number;
  initialIndex?: number;
}) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const [page, setPage] = useState(() => Math.min(pages, Math.floor(Math.max(0, initialIndex) / perPage) + 1));
  const current = Math.min(page, pages);
  const list = useRef<HTMLDivElement>(null);
  const start = (current - 1) * perPage;
  return (
    <>
      <div ref={list} className={className} role="group" aria-label={label} data-numbered-list>
        {items.slice(start, start + perPage).map((item, i) => renderItem(item, start + i))}
      </div>
      {pages > 1 && (
        <Pagination
          page={current}
          pages={pages}
          onPage={(p) => {
            setPage(p);
            requestAnimationFrame(() => list.current?.scrollIntoView({ block: "start" }));
          }}
        />
      )}
    </>
  );
}

