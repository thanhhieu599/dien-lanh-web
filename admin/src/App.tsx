import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  HashRouter,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ad, dt, loadCache } from "./services/runtime";
import { allowed, navigation, roles } from "./services/permissions";
import {
  Action,
  Busy,
  ErrorBox,
  Icon,
  Notices,
  useNotice,
} from "./components/common";
import type { Row, User } from "./types";
const Resources = lazy(() =>
  import("./pages/resources").then((m) => ({ default: m.ResourceList })),
);
const Editor = lazy(() =>
  import("./pages/resources").then((m) => ({ default: m.ResourceEditor })),
);
const Dashboard = lazy(() =>
  import("./pages/dashboard").then((m) => ({ default: m.DashboardPage })),
);
const Sales = lazy(() =>
  import("./pages/sales").then((m) => ({ default: m.SalesPage })),
);
const Customers = lazy(() =>
  import("./pages/customers").then((m) => ({ default: m.CustomersPage })),
);
const Settings = lazy(() =>
  import("./pages/settings").then((m) => ({ default: m.SettingsPage })),
);
const Content = lazy(() =>
  import("./pages/content").then((m) => ({ default: m.ContentPage })),
);
const Maintenance = lazy(() =>
  import("./pages/maintenance").then((m) => ({ default: m.MaintenancePage })),
);
const Inventory = lazy(() =>
  import("./pages/inventory").then((m) => ({ default: m.InventoryPage })),
);
const Voucher = lazy(() =>
  import("./pages/vouchers").then((m) => ({ default: m.VoucherPage })),
);
const Invoice = lazy(() =>
  import("./pages/invoice").then((m) => ({ default: m.InvoicePage })),
);
const Operations = lazy(() =>
  import("./pages/operations").then((m) => ({ default: m.OperationsPage })),
);
class Boundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <ErrorBox error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}
function Login({
  onLogin,
  error: initialError,
}: {
  onLogin: () => Promise<void>;
  error?: string;
}) {
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const user = await ad.db.login(
        String(form.get("id")).trim(),
        String(form.get("password")),
      );
      if (!user || !roles[user.role]) {
        await ad.db.logout();
        throw new Error("Tài khoản không có quyền truy cập quản trị.");
      }
      await onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="ar-login">
      <div className="ar-login-card">
        <div className="ar-brand">
          <Icon name="snow" />
          <div>
            <strong>{dt.config.name}</strong>
          </div>
        </div>
        <h1>Đăng nhập quản trị</h1>
        {error && <ErrorBox error={error} />}{" "}
        {ad.db.mode === "demo" ? (
          <>
            <div className="ar-notice">
              Chế độ demo: dữ liệu lưu trong trình duyệt này, dùng chung với
              website demo.
            </div>
            <Action
              id="demo-enter"
              className="btn btn-primary"
              run={async () => {
                sessionStorage.setItem("dt_admin_demo_in", "1");
                await onLogin();
              }}
            >
              Vào trang quản trị (demo)
            </Action>
          </>
        ) : (
          <form id="login" onSubmit={login}>
            <label>
              Số điện thoại hoặc email
              <input name="id" required autoComplete="username" />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button
              className="btn btn-primary"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>
        )}
        <a href="../frontend/index.html">← Về website</a>
      </div>
    </main>
  );
}
function CurrentPage() {
  const location = useLocation();
  const [resource, id] = location.pathname.slice(1).split("/");
  const user = ad.me;
  if (!resource) return <Navigate to={`/${roles[user!.role].home}`} replace />;
  if (!allowed(user, resource))
    return (
      <section className="ar-panel">
        <h1>Không có quyền truy cập</h1>
        <p>Vai trò của bạn không được phép xem mục này.</p>
        <Link className="btn btn-light" to={`/${roles[user!.role].home}`}>
          Về trang của tôi
        </Link>
      </section>
    );
  if (ad.resources[resource])
    return id ? (
      <Editor resource={resource} />
    ) : (
      <Resources resource={resource} />
    );
  if (resource === "dashboard") return <Dashboard />;
  if (["orders", "leads", "reviews"].includes(resource))
    return <Sales resource={resource} />;
  if (resource === "customers") return <Customers />;
  if (resource === "settings") return <Settings />;
  if (["content", "vision", "trust"].includes(resource))
    return <Content resource={resource} />;
  if (resource === "maintenance") return <Maintenance />;
  if (["inventory", "purchases", "stocktakes", "stock-exports", "stock-history"].includes(resource))
    return <Inventory resource={resource} />;
  if (resource === "invoice") return <Invoice />;
  if (resource === "voucher") return <Voucher />;
  if (["reports", "notifications", "misa"].includes(resource))
    return <Operations resource={resource} />;
  return (
    <section className="ar-panel">
      <h1>Không tìm thấy trang</h1>
      <Link to={`/${roles[user!.role].home}`}>Về trang chính</Link>
    </section>
  );
}
function Shell({
  user,
  onLogout,
  onRole,
}: {
  user: User;
  onLogout: () => Promise<void>;
  onRole: (role: string) => Promise<void>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:1000px)").matches,
  );
  const notice = useNotice();
  useEffect(() => {
    const media = matchMedia("(max-width:1000px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setDrawer(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [badges, setBadges] = useState<Row>({});
  const side = useRef<HTMLElement>(null);
  const resource = location.pathname.split("/")[1];
  useEffect(() => {
    setDrawer(false);
    document.title = `Quản trị | ${dt.config.name}`;
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const entries = await Promise.all(
        ["orders", "leads", "reviews"]
          .filter((k) => allowed(user, k))
          .map(async (k) => [
            k,
            (
              await ad.db.list(k, {
                filters: [["status", "eq", k === "leads" ? "new" : "pending"]],
                limit: 1,
              })
            ).count,
          ]),
      );
      if (active) setBadges(Object.fromEntries(entries));
    };
    refresh().catch(() => {});
    const timer = setInterval(() => refresh().catch(() => {}), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user.role]);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    side.current?.querySelector<HTMLElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
      if (e.key === "Tab") {
        const items = Array.from(
          side.current?.querySelectorAll<HTMLElement>("a,button") || [],
        ).filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [drawer]);
  return (
    <div className={`ar-app ${drawer ? "ar-nav-open" : ""}`}>
      <a
        className="ar-skip"
        href="#view"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("view")?.focus();
        }}
      >
        Đến nội dung quản trị
      </a>
      {drawer && (
        <button
          className="ar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        className="ad-side ar-side"
        ref={side}
        inert={mobile && !drawer}
        aria-label="Điều hướng quản trị"
        id="admin-menu"
      >
        <div className="ar-brand">
          <Icon name="snow" />
          <div>
            <strong>{dt.config.name}</strong>
            <span>Quản trị cửa hàng</span>
          </div>
          <button
            className="btn btn-light ar-mobile-only"
            aria-label="Đóng menu"
            onClick={() => setDrawer(false)}
          >
            ×
          </button>
        </div>
        <nav>
          {navigation.map((group) => {
            const items = group.items.filter(([key]) => allowed(user, key));
            return items.length ? (
              <section key={group.title}>
                <h2>{group.title}</h2>
                {items.map(([key, icon, title]) => (
                  <Link
                    to={`/${key}`}
                    data-nav={key}
                    aria-current={resource === key ? "page" : undefined}
                    key={key}
                  >
                    <Icon name={icon} />
                    <span>
                      {key === "leads" && user.role === "sales"
                        ? "Khách hàng của tôi"
                        : key === "orders" && user.role === "accountant"
                          ? "Đơn hàng & thanh toán"
                          : title}
                    </span>
                    {badges[key] > 0 && <em>{badges[key]}</em>}
                  </Link>
                ))}
              </section>
            ) : null;
          })}
        </nav>
        <a
          className="ar-view-site"
          href="../frontend/index.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="eye" />
          Xem website
        </a>
      </aside>
      <div className="ar-main" inert={mobile && drawer}>
        <header className="ar-top">
          <button
            className="btn btn-light ar-mobile-only"
            aria-label="Mở menu"
            aria-expanded={drawer}
            aria-controls="admin-menu"
            onClick={() => setDrawer(true)}
          >
            <Icon name="menu" />
          </button>
          {allowed(user, "orders") && (
            <form
              className="ar-quick-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(
                  `/orders?q=${encodeURIComponent(String(new FormData(e.currentTarget).get("q") || "").trim())}`,
                );
              }}
            >
              <input
                name="q"
                type="search"
                aria-label="Tìm đơn hàng"
                placeholder="Mã đơn hoặc số điện thoại…"
              />
            </form>
          )}
          <div className="ar-user">
            <strong>{user.name}</strong>
            <small>{roles[user.role].label}</small>
          </div>
          <Action run={onLogout}>Đăng xuất</Action>
        </header>
        {ad.db.mode === "demo" && (
          <div className="ar-demo">
            <span>
              Demo · Dữ liệu lưu trên trình duyệt, dùng chung với website demo.
            </span>
            <label>
              Vai trò demo
              <select
                id="demo-role"
                value={user.role}
                onChange={(e) =>
                  void onRole(e.target.value).catch((err) =>
                    notice(err.message, true),
                  )
                }
              >
                {Object.entries(roles).map(([key, r]) => (
                  <option value={key} key={key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <Action
              confirm="Khôi phục dữ liệu mẫu? Đơn hàng và thông tin khách hàng được giữ lại."
              run={async () => {
                ad.db.reset!();
                await loadCache();
                window.dispatchEvent(new Event("admin-data-refresh"));
              }}
            >
              Khôi phục dữ liệu mẫu
            </Action>
          </div>
        )}
        <main id="view" className="ar-view" tabIndex={-1}>
          <Boundary key={location.key}>
            <Suspense fallback={<Busy />}>
              <CurrentPage key={`${resource}-${location.pathname}`} />
            </Suspense>
          </Boundary>
        </main>
      </div>
    </div>
  );
}
function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [notices, setNotices] = useState<
    { id: string; text: string; error: boolean }[]
  >([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notice = useCallback((text: string, error = false) => {
    const id = crypto.randomUUID();
    setNotices((prev) => [...prev.slice(-3), { id, text, error }]);
    timers.current.push(
      setTimeout(
        () => setNotices((prev) => prev.filter((x) => x.id !== id)),
        6000,
      ),
    );
  }, []);
  const login = useCallback(async () => {
    const me = await ad.db.me();
    if (!me || !roles[me.role]) {
      ad.me = null;
      setUser(null);
      return;
    }
    ad.me = me;
    await loadCache();
    setUser(me);
  }, []);
  useEffect(() => {
    login()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const expired = () => {
      ad.me = null;
      setUser(null);
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    };
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener("admin-session-expired", expired);
    window.addEventListener("admin-data-refresh", refresh);
    return () => {
      window.removeEventListener("admin-session-expired", expired);
      window.removeEventListener("admin-data-refresh", refresh);
      timers.current.forEach(clearTimeout);
    };
  }, [login]);
  const entered =
    ad.db.mode !== "demo" || sessionStorage.getItem("dt_admin_demo_in");
  return (
    <Notices.Provider value={notice}>
      {loading ? (
        <Busy />
      ) : user && entered ? (
        <Shell
          key={revision}
          user={user}
          onLogout={async () => {
            await ad.db.logout();
            ad.me = null;
            setUser(null);
            sessionStorage.removeItem("dt_admin_demo_in");
            location.hash = "";
          }}
          onRole={async (role) => {
            ad.db.setRole!(role);
            location.hash = `#/${roles[role].home}`;
            await login();
          }}
        />
      ) : (
        <Login error={error} onLogin={login} />
      )}
      <div className="ar-notices" aria-live="polite" aria-atomic="false">
        {notices.map((n) => (
          <div
            className={n.error ? "ar-toast ar-error" : "ar-toast"}
            role={n.error ? "alert" : "status"}
            key={n.id}
          >
            <span>{n.text}</span>
            <button
              aria-label="Đóng thông báo"
              onClick={() =>
                setNotices((prev) => prev.filter((x) => x.id !== n.id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Notices.Provider>
  );
}
export function App() {
  return (
    <HashRouter>
      <Root />
    </HashRouter>
  );
}
