import { memo, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, ShoppingBag, CalendarDays, TrendingUp, TrendingDown, AlertTriangle, PackageX, Wallet, Truck, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { bdt, compactBdt, num, timeAgo, ORDER_STATUS } from "../lib/format";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Select, Skeleton, Button } from "../components/ui";
import { OrderStatusBadge } from "../components/badges";

const COD = "#15803d"; const ONLINE = "#2563eb"; // validated pair (CVD + contrast)
const RANGES = [{ v: "today", l: "Today" }, { v: "7d", l: "Last 7 days" }, { v: "30d", l: "Last 30 days" }, { v: "month", l: "This month" }];

const Change = memo(function Change({ value }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-green-700" : "text-red-600"}`}><Icon size={14} />{up ? "+" : ""}{value}%<span className="sr-only"> vs previous period</span></span>;
});

const StatCard = memo(function StatCard({ icon: Icon, label, value, sub, change, loading, tone = "bg-mint text-leaf-dark" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate">{label}</p>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}><Icon size={18} /></span>
      </div>
      {loading ? <Skeleton className="h-8 w-32 mt-3" /> : <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate min-h-4">{!loading && <>{change !== undefined && <Change value={change} />}{sub && <span>{sub}</span>}</>}</div>
    </Card>
  );
});

const SplitCard = memo(function SplitCard({ split, loading }) {
  const cod = split?.cod?.revenue || 0; const online = split?.online?.revenue || 0; const total = cod + online;
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate">COD vs Online</p>
        <span className="w-9 h-9 rounded-lg bg-mint text-leaf-dark flex items-center justify-center"><Wallet size={18} /></span>
      </div>
      {loading ? <Skeleton className="h-16 mt-3" /> : (
        <>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-gray-100 gap-0.5" role="img" aria-label={`Cash on delivery ${pct(cod)} percent, online ${pct(online)} percent`}>
            {total > 0 && <><div style={{ width: `${pct(cod)}%`, background: COD }} /><div style={{ width: `${pct(online)}%`, background: ONLINE }} /></>}
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5"><dt className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COD }} />Cash on delivery</dt><dd className="font-semibold ml-auto text-right">{bdt(cod)} <span className="font-normal text-slate">({pct(cod)}%) · {num(split?.cod?.orders)} orders</span></dd></div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5"><dt className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: ONLINE }} />Online payment</dt><dd className="font-semibold ml-auto text-right">{bdt(online)} <span className="font-normal text-slate">({pct(online)}%) · {num(split?.online?.orders)} orders</span></dd></div>
          </dl>
        </>
      )}
    </Card>
  );
});

const dayLabel = (d, monthly) => {
  if (monthly) { const [y, m] = d.split("-"); return new Date(Date.UTC(+y, +m - 1, 1)).toLocaleString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }); }
  const dt = new Date(`${d}T00:00:00Z`); return `${dt.getUTCDate()} ${dt.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}`;
};

const ChartTooltip = ({ active, payload, label, monthly }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink mb-1">{dayLabel(label, monthly)}</p>
      <p className="flex justify-between gap-6"><span className="text-slate">Total</span><b>{bdt(row.revenue)}</b></p>
      <p className="flex justify-between gap-6"><span style={{ color: COD }}>Cash on delivery</span><b>{bdt(row.cod)}</b></p>
      <p className="flex justify-between gap-6"><span style={{ color: ONLINE }}>Online</span><b>{bdt(row.online)}</b></p>
      <p className="flex justify-between gap-6 mt-1 pt-1 border-t border-line"><span className="text-slate">Orders</span><b>{num(row.orders)}</b></p>
    </div>
  );
};

const SalesChart = memo(function SalesChart({ rows, monthly }) {
  const data = useMemo(() => rows || [], [rows]);
  return (
    <div className="h-64 sm:h-72 px-2 pb-4 pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#e7eee9" />
          <XAxis dataKey="date" tickFormatter={(d) => dayLabel(d, monthly)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#5b6b61" }} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tickFormatter={compactBdt} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: "#5b6b61" }} />
          <Tooltip content={<ChartTooltip monthly={monthly} />} cursor={{ fill: "rgba(15,61,36,0.05)" }} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-ink">{v === "cod" ? "Cash on delivery" : "Online payment"}</span>} />
          <Bar dataKey="cod" stackId="s" fill={COD} stroke="#fff" strokeWidth={1} isAnimationActive={false} />
          <Bar dataKey="online" stackId="s" fill={ONLINE} stroke="#fff" strokeWidth={1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default function Dashboard() {
  const [range, setRange] = useState("30d");
  const [view, setView] = useState("daily");

  const overview = useQuery({ queryKey: ["overview", range], queryFn: () => api.overview({ range }), placeholderData: keepPreviousData, refetchInterval: 30000 });
  const sales = useQuery({ queryKey: ["sales", view], queryFn: () => api.sales(view === "monthly" ? { view, months: 12 } : { view, days: 30 }), placeholderData: keepPreviousData, refetchInterval: 60000 });
  const top = useQuery({ queryKey: ["top", range], queryFn: () => api.topProducts({ range }), placeholderData: keepPreviousData });
  const recent = useQuery({ queryKey: ["recent-orders"], queryFn: api.recentOrders, refetchInterval: 30000 });

  const o = overview.data?.data; const loading = overview.isLoading;
  const sc = o?.statusCounts;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live sales performance. Updates every 30 seconds."
        actions={<>
          <Select aria-label="Report period" value={range} onChange={(e) => setRange(e.target.value)} className="w-40 max-w-full">{RANGES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select>
          <Button variant="outline" onClick={() => { overview.refetch(); sales.refetch(); recent.refetch(); }} loading={overview.isFetching && !loading}><RefreshCw size={15} />Refresh</Button>
        </>} />

      {overview.isError && !o ? <Card><ErrorState error={overview.error} onRetry={overview.refetch} /></Card> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Banknote} label="Total revenue" value={bdt(o?.totalRevenue)} change={o?.revenueChange} sub={`Avg order ${bdt(o?.avgOrderValue)}`} loading={loading} />
            <StatCard icon={ShoppingBag} label="Total orders" value={num(o?.totalOrders)} change={o?.ordersChange} sub={`${num(o?.itemsSold)} items sold`} loading={loading} tone="bg-blue-50 text-blue-700" />
            <StatCard icon={CalendarDays} label="Today's sales" value={bdt(o?.today.sales)} change={o?.today.change} sub={`${num(o?.today.orders)} orders today`} loading={loading} tone="bg-amber-50 text-amber-700" />
            <SplitCard split={o?.paymentSplit} loading={loading} />
          </div>

          <Card className="mt-4">
            <CardHeader title="Sales report" subtitle="Revenue by day (last 30 days) or month (last 12 months), split by payment type"
              action={<div className="inline-flex rounded-lg border border-line p-0.5 bg-canvas" role="group" aria-label="Chart view">
                {["daily", "monthly"].map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`px-3 py-1.5 text-sm rounded-md capitalize font-medium ${view === v ? "bg-white shadow-sm text-leaf-dark" : "text-slate"}`}>{v}</button>)}
              </div>} />
            {sales.isLoading ? <Skeleton className="h-72 m-5" /> : sales.isError ? <ErrorState error={sales.error} onRetry={sales.refetch} /> : <SalesChart rows={sales.data?.data} monthly={view === "monthly"} />}
          </Card>

          <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Order pipeline" subtitle="Orders in the selected period" />
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 p-4 sm:p-5">
                {ORDER_STATUS.map((s) => (
                  <Link key={s.key} to={`/orders?status=${s.key}`} className="rounded-lg border border-line p-3">
                    <p className="text-xs text-slate">{s.label}</p>
                    <p className="text-xl font-bold mt-1">{loading ? "-" : num(sc?.[s.value])}</p>
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 px-4 sm:px-5 pb-5">
                <Alert icon={AlertTriangle} tone="amber" to="/products?stock=low" value={o?.inventory.lowStock} label={`Low stock (≤ ${o?.inventory.lowStockThreshold ?? 5})`} />
                <Alert icon={PackageX} tone="red" to="/products?stock=out" value={o?.inventory.outOfStock} label="Out of stock" />
                <Alert icon={Truck} tone="blue" to="/orders?status=processing" value={sc?.Processing} label="Ready to ship" />
              </div>
            </Card>

            <Card>
              <CardHeader title="Top products" subtitle="By revenue" />
              {top.isLoading ? <Skeleton className="h-40 m-5" /> : !top.data?.data?.length ? <EmptyState title="No sales yet" text="Top sellers appear here after the first orders." /> : (
                <ol className="p-4 sm:p-5 space-y-3">
                  {top.data.data.slice(0, 6).map((p, i) => (
                    <li key={p._id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-sm font-semibold text-slate">{i + 1}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{p.title}</p><p className="text-xs text-slate">{num(p.quantity)} sold</p></div>
                      <span className="text-sm font-semibold shrink-0">{compactBdt(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader title="Recent orders" action={<Link to="/orders" className="text-sm font-medium text-leaf-dark">View all</Link>} />
            {recent.isLoading ? <Skeleton className="h-32 m-5" /> : !recent.data?.data?.length ? <EmptyState title="No orders yet" /> : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm min-w-[40rem] [&_td]:whitespace-nowrap"><tbody className="divide-y divide-line">
                  {recent.data.data.map((r) => (
                    <tr key={r._id}>
                      <td className="px-5 py-3 font-semibold">{r.orderNumber || r._id.slice(-6)}</td>
                      <td className="px-3 py-3">{r.shippingAddress?.name}</td>
                      <td className="px-3 py-3 text-slate">{timeAgo(r.createdAt)}</td>
                      <td className="px-3 py-3"><Badge tone={r.paymentMethod === "cod" ? "green" : "blue"}>{r.paymentMethod === "cod" ? "COD" : "Online"}</Badge></td>
                      <td className="px-3 py-3"><OrderStatusBadge status={r.orderStatus} /></td>
                      <td className="px-5 py-3 text-right font-semibold">{bdt(r.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function Alert({ icon: Icon, tone, to, value, label }) {
  const t = { amber: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-800" }[tone];
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-lg px-3.5 py-3 ${t}`}>
      <Icon size={20} /><div><p className="text-lg font-bold leading-none">{num(value)}</p><p className="text-xs mt-1">{label}</p></div>
    </Link>
  );
}
