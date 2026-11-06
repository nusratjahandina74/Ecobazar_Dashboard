import { memo, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Printer, Search, Truck, X } from "lucide-react";
import { api } from "../lib/api";
import { bdt, dateTime, nextStatuses, orderStatusMeta, ORDER_STATUS, PROVIDERS, ZONES } from "../lib/format";
import { Button, Card, Checkbox, EmptyState, ErrorState, IconButton, Input, PageHeader, Pagination, Select, TableSkeleton, Tabs, Th, Td } from "../components/ui";
import { MethodBadge, OrderStatusBadge, PaymentBadge } from "../components/badges";
import OrderModal from "../components/OrderModal";
import useDebounce from "../components/useDebounce";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { printInvoices } from "../lib/invoice";

const TABS = [{ key: "all", label: "All" }, ...ORDER_STATUS.map((s) => ({ key: s.key, label: s.label }))];

const Row = memo(function Row({ o, selected, onSelect, onView, onStatus, onInvoice, canUpdate, busy }) {
  const next = nextStatuses(o.orderStatus);
  return (
    <tr className={selected ? "bg-mint/60" : undefined}>
      <Td className="w-10"><Checkbox checked={selected} onChange={() => onSelect(o._id)} aria-label={`Select order ${o.orderNumber}`} /></Td>
      <Td className="whitespace-nowrap"><button onClick={() => onView(o._id)} className="font-semibold text-leaf-dark">{o.orderNumber || o._id.slice(-6)}</button><p className="text-xs text-slate">{dateTime(o.createdAt)}</p></Td>
      <Td className="whitespace-nowrap"><p className="font-medium">{o.shippingAddress?.name}</p><p className="text-xs text-slate">{o.shippingAddress?.phone}</p></Td>
      <Td className="whitespace-nowrap text-slate">{o.products?.length} {o.products?.length === 1 ? "item" : "items"}<p className="text-xs">{ZONES[o.deliveryZone]}</p></Td>
      <Td className="font-semibold text-right">{bdt(o.totalAmount)}</Td>
      <Td><MethodBadge method={o.paymentMethod} /><div className="mt-1"><PaymentBadge status={o.paymentStatus} /></div></Td>
      <Td>
        {canUpdate && next.length ? (
          <Select aria-label={`Status of ${o.orderNumber}`} disabled={busy} value={o.orderStatus} className="h-9 w-36 text-xs font-medium" onChange={(e) => onStatus(o, e.target.value)}>
            <option value={o.orderStatus}>{orderStatusMeta(o.orderStatus).label}</option>
            {next.map((s) => <option key={s} value={s}>{s === "Cancelled" ? "Cancel order" : orderStatusMeta(s).label}</option>)}
          </Select>
        ) : <OrderStatusBadge status={o.orderStatus} />}
      </Td>
      <Td className="text-xs">{o.courier?.trackingCode ? <><span className="capitalize font-medium">{o.courier.provider}</span><p className="select-all text-slate">{o.courier.trackingCode}</p></> : <span className="text-slate">Not sent</span>}</Td>
      <Td><div className="flex gap-1.5 justify-end">
        <IconButton label={`View order ${o.orderNumber}`} onClick={() => onView(o._id)}><Eye size={17} /></IconButton>
        <IconButton label="Print invoice" onClick={() => onInvoice(o._id)}><Printer size={16} /></IconButton>
      </div></Td>
    </tr>
  );
});

export default function Orders() {
  const toast = useToast(); const qc = useQueryClient(); const { can } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("status") || "all";
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [q, setQ] = useState(""); const [method, setMethod] = useState("all"); const [zone, setZone] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [viewId, setViewId] = useState(null);
  const [bulkStatus, setBulkStatus] = useState(""); const [bulkProvider, setBulkProvider] = useState("steadfast");
  const dq = useDebounce(q);

  const filters = useMemo(() => ({ q: dq, paymentMethod: method, zone, from, to }), [dq, method, zone, from, to]);
  const listParams = { ...filters, status: tab, page, limit };
  const list = useQuery({ queryKey: ["orders", listParams], queryFn: () => api.orders(listParams), placeholderData: keepPreviousData, refetchInterval: 30000 });
  const counts = useQuery({ queryKey: ["order-counts", filters], queryFn: () => api.orderCounts(filters), placeholderData: keepPreviousData, refetchInterval: 30000 });

  const resetPage = (fn) => (v) => { fn(v); setPage(1); setSelected(new Set()); };
  const setTab = (k) => { const n = new URLSearchParams(sp); if (k === "all") n.delete("status"); else n.set("status", k); setSp(n, { replace: true }); setPage(1); setSelected(new Set()); };

  const afterChange = () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["order-counts"] }); qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["order"] }); };

  // optimistic single status change: the row updates instantly, rolls back on error
  const statusMut = useMutation({
    mutationFn: ({ o, to: s }) => api.setOrderStatus(o._id, s),
    onMutate: async ({ o, to: s }) => {
      await qc.cancelQueries({ queryKey: ["orders"] });
      const snaps = qc.getQueriesData({ queryKey: ["orders"] });
      qc.setQueriesData({ queryKey: ["orders"] }, (old) => old && ({ ...old, data: old.data.map((r) => (r._id === o._id ? { ...r, orderStatus: s } : r)) }));
      return { snaps };
    },
    onError: (e, _v, ctx) => { ctx?.snaps.forEach(([k, d]) => qc.setQueryData(k, d)); toast.error(e.message); },
    onSuccess: (r) => toast.success(r.message),
    onSettled: afterChange,
  });
  const onStatus = useCallback((o, s) => statusMut.mutate({ o, to: s }), [statusMut]);

  const bulkStatusMut = useMutation({
    mutationFn: () => api.bulkOrderStatus([...selected], bulkStatus),
    onSuccess: (r) => { r.failed?.length ? toast.error(`${r.message}. ${r.failed[0].reason}`) : toast.success(r.message); setSelected(new Set()); setBulkStatus(""); },
    onError: (e) => toast.error(e.message), onSettled: afterChange,
  });
  const bulkCourierMut = useMutation({
    mutationFn: () => api.bulkCourier([...selected], bulkProvider),
    onSuccess: (r) => { const bad = r.results.find((x) => !x.ok); bad ? toast.error(`${r.message}. ${bad.orderNumber}: ${bad.reason}`) : toast.success(r.message); setSelected(new Set()); },
    onError: (e) => toast.error(e.message), onSettled: afterChange,
  });

  const rows = list.data?.data || [];
  const pagination = list.data?.pagination;
  const toggle = useCallback((id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const togglePage = () => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r._id) : n.add(r._id))); return n; });
  const invoice = useCallback((ids) => printInvoices(ids).catch((e) => toast.error(e.message)), [toast]);

  const download = async () => {
    try {
      const blob = await api.downloadOrders({ ...filters, status: tab });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(e.message); }
  };

  const tabs = TABS.map((t) => ({ ...t, count: counts.data?.data?.[t.key] }));
  const bulkNext = bulkStatus || "";

  return (
    <>
      <PageHeader title="Orders" subtitle="Change status right from the table, or open an order with the eye icon."
        actions={<Button variant="outline" onClick={download}><Download size={16} />Export CSV</Button>} />

      <Card>
        <div className="px-2 pt-1"><Tabs tabs={tabs} value={tab} onChange={setTab} /></div>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 basis-64 min-w-0"><Search size={16} className="absolute left-3 top-3 text-slate/60" />
            <Input aria-label="Search orders" className="pl-9" placeholder="Search order, phone, name or tracking ID" value={q} onChange={(e) => resetPage(setQ)(e.target.value)} /></div>
          <Select aria-label="Payment type" className="w-full sm:w-44" value={method} onChange={(e) => resetPage(setMethod)(e.target.value)}><option value="all">All payments</option><option value="cod">Cash on delivery</option><option value="online">Online</option></Select>
          <Select aria-label="Delivery area" className="w-full sm:w-44" value={zone} onChange={(e) => resetPage(setZone)(e.target.value)}><option value="all">All areas</option><option value="inside_dhaka">Inside Dhaka</option><option value="outside_dhaka">Outside Dhaka</option></Select>
          <div className="flex items-center w-full gap-2 sm:w-auto">
            <Input type="date" aria-label="From date" className="min-w-0 flex-1 sm:w-40 sm:flex-none" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
            <span className="text-sm text-slate">to</span>
            <Input type="date" aria-label="To date" className="min-w-0 flex-1 sm:w-40 sm:flex-none" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-forest text-white text-sm" role="region" aria-label="Bulk actions">
            <b>{selected.size} selected</b>
            {can("orders:bulk") && <>
              <Select aria-label="Bulk status" value={bulkNext} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 w-44 text-ink"><option value="">Change status to...</option>{ORDER_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
              <Button size="sm" disabled={!bulkStatus} loading={bulkStatusMut.isPending} onClick={() => bulkStatusMut.mutate()}>Apply</Button></>}
            {can("orders:courier") && <>
              <Select aria-label="Bulk courier" value={bulkProvider} onChange={(e) => setBulkProvider(e.target.value)} className="h-9 w-36 text-ink">{PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select>
              <Button size="sm" variant="soft" loading={bulkCourierMut.isPending} onClick={() => bulkCourierMut.mutate()}><Truck size={14} />Send to courier</Button></>}
            <Button size="sm" variant="soft" onClick={() => invoice([...selected].slice(0, 100))}><Printer size={14} />Invoices</Button>
            <button className="ml-auto flex items-center gap-1 text-white/80" onClick={() => setSelected(new Set())}><X size={15} />Clear</button>
          </div>
        )}

        {list.isLoading ? <TableSkeleton rows={8} cols={9} />
          : list.isError && !list.data ? <ErrorState error={list.error} onRetry={list.refetch} />
          : rows.length === 0 ? <EmptyState title="No orders found" text={dq || method !== "all" || zone !== "all" || from || to ? "Try clearing the filters." : "New orders will appear here automatically."} />
          : (
            <div className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
              <table className="w-full text-sm">
                <thead><tr><Th className="w-10"><Checkbox checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></Th><Th>Order</Th><Th>Customer</Th><Th>Items</Th><Th className="text-right">Total</Th><Th>Payment</Th><Th>Status</Th><Th>Courier</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody className="divide-y divide-line">
                  {rows.map((o) => <Row key={o._id} o={o} selected={selected.has(o._id)} onSelect={toggle} onView={setViewId} onStatus={onStatus} onInvoice={(id) => invoice([id])} canUpdate={can("orders:update")} busy={statusMut.isPending && statusMut.variables?.o._id === o._id} />)}
                </tbody>
              </table>
            </div>
          )}
        <Pagination pagination={pagination} onPage={(p) => { setPage(p); setSelected(new Set()); }} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
      <OrderModal orderId={viewId} onClose={() => setViewId(null)} />
    </>
  );
}
