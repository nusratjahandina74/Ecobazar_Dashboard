import { useEffect, useId, useRef } from "react";
import { Loader2, X, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

export function Button({ variant = "primary", size = "md", loading, className, children, ...p }) {
  const v = {
    primary: "bg-leaf text-white", dark: "bg-forest text-white",
    outline: "border border-line bg-white text-ink", ghost: "text-slate",
    danger: "bg-red-600 text-white", soft: "bg-mint text-leaf-dark",
  }[variant];
  const s = { sm: "h-8 px-3 text-xs pointer-coarse:h-10", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-sm" }[size];
  return (
    <button {...p} disabled={p.disabled || loading} className={cx("inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]", v, s, className)}>
      {loading && <Loader2 size={15} className="animate-spin" />}{children}
    </button>
  );
}
export const IconButton = ({ label, className, children, ...p }) => (
  <button {...p} aria-label={label} title={label} className={cx("inline-flex items-center justify-center w-9 h-9 pointer-coarse:w-10 pointer-coarse:h-10 shrink-0 rounded-lg border border-line bg-white text-slate disabled:opacity-40", className)}>{children}</button>
);

const fieldBase = "w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-slate/50 focus:outline-none focus:ring-4 focus:ring-leaf/15 focus:border-leaf disabled:bg-canvas disabled:text-slate";
export const Input = ({ className, ...p }) => <input {...p} className={cx(fieldBase, "h-10", className)} />;
export const Textarea = ({ className, ...p }) => <textarea {...p} className={cx(fieldBase, "py-2.5", className)} />;
export const Select = ({ className, children, ...p }) => <select {...p} className={cx(fieldBase, "h-10 pr-8", className)}>{children}</select>;

export function Field({ label, hint, error, children, className }) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>}
      {typeof children === "function" ? children(id) : children}
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-slate">{hint}</p> : null}
    </div>
  );
}

const TONES = {
  green: "bg-green-50 text-green-800 ring-green-600/20", amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  blue: "bg-blue-50 text-blue-800 ring-blue-600/20", violet: "bg-violet-50 text-violet-800 ring-violet-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20", gray: "bg-gray-100 text-gray-700 ring-gray-500/20",
};
export const Badge = ({ tone = "gray", children, className }) => (
  <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>{children}</span>
);

export const Card = ({ className, children }) => <section className={cx("min-w-0 max-w-full rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,61,36,.04)]", className)}>{children}</section>;
export const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 px-4 sm:px-5 pt-5">
    <div className="min-w-0 flex-1 basis-56"><h2 className="text-base font-semibold text-ink">{title}</h2>{subtitle && <p className="text-sm text-slate mt-0.5">{subtitle}</p>}</div>{action}
  </div>
);

export const Spinner = ({ className }) => <LeafLoader size={40} className={className} />;
export const Skeleton = ({ className }) => <div aria-hidden="true" className={cx("skeleton rounded-md", className)} />;

/* Table-shaped placeholder: header strip + rows with varied widths, so the page does not "jump" when data arrives. */
const WIDTHS = ["w-24", "w-40", "w-16", "w-28", "w-20", "w-32", "w-14", "w-24"];
export function TableSkeleton({ rows = 6, cols = 6, avatar = false }) {
  const grid = { gridTemplateColumns: `1.5fr repeat(${Math.max(cols - 1, 1)}, minmax(0, 1fr))` };
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden">
      <div className="grid grid-cols-1 items-center gap-6 px-4 py-3 border-y border-line bg-canvas" style={grid}>
        {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className={cx("h-3 max-w-full", WIDTHS[(c * 3) % WIDTHS.length])} />)}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="grid grid-cols-1 items-center gap-6 px-4 py-4" style={grid}>
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className="flex items-center min-w-0 gap-3">
                {avatar && c === 0 && <Skeleton className="w-10 h-10 rounded-lg shrink-0" />}
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className={cx("h-3.5 max-w-full", WIDTHS[(r + c * 2) % WIDTHS.length])} />
                  {c === 0 && <Skeleton className="w-20 h-2.5 max-w-full opacity-70" />}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/* Stacked cards placeholder (reviews, messages, banners, categories ...) */
export function ListSkeleton({ rows = 4 }) {
  return (
    <div role="status" aria-label="Loading" className="p-4 space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-xl border-line">
          <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2.5"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-3 w-4/5 opacity-70" /></div>
          <Skeleton className="hidden w-20 h-8 rounded-lg sm:block" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/* Brand loader: a leaf that draws itself inside an orbiting ring, with bouncing dots. */
export function LeafLoader({ size = 56, label = "", className = "" }) {
  return (
    <div role="status" aria-label={label || "Loading"} className={`flex flex-col items-center justify-center gap-3 text-leaf ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle className="leaf-orbit" cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="28 104" />
        <path className="leaf-draw" d="M14 33C13 21 21 13 34 12C35 25 28 34 14 33Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path className="leaf-draw" d="M14 33L27 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="flex items-center gap-1.5" aria-hidden="true"><i className="leaf-dot" /><i className="leaf-dot" /><i className="leaf-dot" /></span>
      {label && <p className="text-sm text-slate">{label}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/* Shown while a page chunk is loading. */
export function PageLoader() {
  return <div className="min-h-[60vh] flex items-center justify-center fade-up"><LeafLoader size={64} label="Loading" /></div>;
}

/* Branded splash for the very first load / session check. */
export function SplashScreen({ label = "Signing you in" }) {
  return (
    <div role="status" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-canvas">
      <div className="relative flex items-center justify-center w-20 h-20">
        <span className="absolute inset-0 rounded-3xl bg-leaf/30 ring-pulse" />
        <span className="absolute inset-0 rounded-3xl bg-leaf/20 ring-pulse [animation-delay:.5s]" />
        <img src="/favicon.svg" alt="" className="relative w-16 h-16 shadow-lg rounded-2xl" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-ink">EcoBazaar <span className="font-medium text-slate">Admin</span></p>
        <p className="mt-1 text-sm text-slate">{label}...</p>
      </div>
      <div className="w-44 h-1 overflow-hidden rounded-full bg-forest/10"><div className="w-1/3 h-full rounded-full bg-leaf topbar-run" /></div>
    </div>
  );
}

/* Thin progress bar fixed to the top of the screen while any request is running. */
export function TopProgress({ active }) {
  return (
    <div aria-hidden="true" className={cx("fixed top-0 left-0 right-0 z-[90] h-0.5 overflow-hidden transition-opacity duration-300", active ? "opacity-100" : "opacity-0")}>
      <div className="w-1/3 h-full rounded-full bg-leaf topbar-run" />
    </div>
  );
}
export function EmptyState({ title, text, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center text-center py-12 sm:py-16 px-4">
      <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center text-leaf mb-3"><Icon size={22} /></div>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="text-sm text-slate mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-4" role="alert">
      <p className="font-semibold text-red-700">Could not load this data</p>
      <p className="text-sm text-slate mt-1 max-w-md">{error?.message || "Something went wrong."}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-leaf" : "bg-gray-300")}>
      <span className={cx("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
    </button>
  );
}
export const Checkbox = ({ className, ...p }) => <input type="checkbox" {...p} className={cx("h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5 rounded border-line accent-[#16a34a]", className)} />;

export function Modal({ open, onClose, title, subtitle, children, footer, size = "lg" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-forest/50" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cx("relative flex flex-col w-full bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92dvh] outline-none", w)}>
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-line">
          <div className="min-w-0"><h2 className="text-lg font-semibold text-ink truncate">{title}</h2>{subtitle && <div className="text-sm text-slate mt-0.5">{subtitle}</div>}</div>
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="px-5 sm:px-6 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-line bg-canvas sm:rounded-b-2xl flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, loading, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm text-slate">{message}</p>
    </Modal>
  );
}

export function Pagination({ pagination, onPage, onLimit }) {
  if (!pagination) return null;
  const { page, pages, total, limit } = pagination;
  const from = total ? (page - 1) * limit + 1 : 0; const to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-sm text-slate">
      <span>{total ? `${from}-${to} of ${total.toLocaleString("en-BD")}` : "No results"}</span>
      <div className="flex items-center gap-2">
        {onLimit && (
          <label className="flex items-center gap-1.5 text-xs">Rows
            <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="h-8 rounded-md border border-line bg-white px-1.5">
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <IconButton label="Previous page" className="w-8 h-8" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></IconButton>
        <span className="min-w-16 text-center font-medium text-ink">{page} / {pages}</span>
        <IconButton label="Next page" className="w-8 h-8" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></IconButton>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line -mb-px">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cx("flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2", value === t.key ? "border-leaf text-leaf-dark" : "border-transparent text-slate")}>
          {t.label}
          {t.count !== undefined && <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", value === t.key ? "bg-leaf text-white" : "bg-gray-100 text-slate")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
    <div className="min-w-0"><h1 className="text-xl sm:text-2xl font-bold text-ink [overflow-wrap:anywhere]">{title}</h1>{subtitle && <p className="text-sm text-slate mt-1">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Th = ({ children, className }) => <th scope="col" className={cx("px-4 py-3 text-left text-xs font-semibold text-slate bg-canvas whitespace-nowrap", className)}>{children}</th>;
export const Td = ({ children, className }) => <td className={cx("px-4 py-3 align-middle", className)}>{children}</td>;
