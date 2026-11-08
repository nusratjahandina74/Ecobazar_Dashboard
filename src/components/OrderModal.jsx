import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Truck, RefreshCw, MapPin, Phone, Mail, StickyNote } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { bdt, dateTime, fullName, nextStatuses, orderStatusMeta, PROVIDERS, ZONES } from "../lib/format";
import { Button, Field, Input, Modal, Select, Spinner, Textarea, ErrorState } from "./ui";
import { MethodBadge, OrderStatusBadge, PaymentBadge } from "./badges";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { printInvoices } from "../lib/invoice";

export default function OrderModal({ orderId, onClose }) {
  const toast = useToast(); const qc = useQueryClient(); const { can } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["order", orderId], queryFn: () => api.order(orderId), enabled: !!orderId });
  const o = data?.data;
  const [note, setNote] = useState(""); const [provider, setProvider] = useState("steadfast"); const [tracking, setTracking] = useState("");
  const [internal, setInternal] = useState(null);

  const refresh = (updated) => {
    if (updated) qc.setQueryData(["order", orderId], (old) => ({ ...old, data: { ...old?.data, ...updated } }));
    qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["order-counts"] }); qc.invalidateQueries({ queryKey: ["overview"] });
    qc.invalidateQueries({ queryKey: ["order", orderId] });
  };
  const run = (fn, ok) => ({ mutationFn: fn, onSuccess: (r) => { toast.success(ok || r.message || "Saved"); refresh(r.data); }, onError: (e) => toast.error(e.message) });
  const status = useMutation(run((s) => api.setOrderStatus(orderId, s, note), "Status updated"));
  const courier = useMutation(run(() => api.sendCourier(orderId, provider)));
  const manual = useMutation(run(() => api.manualTracking(orderId, tracking), "Tracking saved"));
  const sync = useMutation(run(() => api.syncCourier(orderId), "Courier status refreshed"));
  const save = useMutation(run((body) => api.updateOrder(orderId, body), "Order updated"));

  const next = o ? nextStatuses(o.orderStatus) : [];
  const a = o?.shippingAddress || {};
  const sent = !!o?.courier?.consignmentId;

  return (
    <Modal open={!!orderId} onClose={onClose} size="xl"
      title={o ? `Order ${o.orderNumber || o._id.slice(-6)}` : "Order details"}
      subtitle={o && <span className="flex flex-wrap items-center gap-2">{dateTime(o.createdAt)}<OrderStatusBadge status={o.orderStatus} /><MethodBadge method={o.paymentMethod} /><PaymentBadge status={o.paymentStatus} /></span>}
      footer={o && <Button variant="outline" onClick={() => printInvoices([o._id]).catch((e) => toast.error(e.message))}><Printer size={16} />Print invoice</Button>}>
      {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : error ? <ErrorState error={error} onRetry={refetch} /> : o && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <section>
              <h3 className="text-sm font-semibold mb-2">Items</h3>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {o.products.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 p-3">
                    {p.image ? <img src={assetUrl(p.image)} alt="" className="w-12 h-12 rounded-md object-cover bg-mint shrink-0" /> : <div className="w-12 h-12 rounded-md bg-mint" />}
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{p.title}</p><p className="text-xs text-slate">{p.variantLabel ? `${p.variantLabel} · ` : ""}{bdt(p.price)} × {p.quantity}</p></div>
                    <span className="text-sm font-semibold shrink-0">{bdt(p.totalPrice)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{bdt(o.subtotal ?? o.totalAmount)}</dd></div>
                {o.discountAmount > 0 && <div className="flex justify-between text-green-700"><dt>Coupon {o.couponCode}</dt><dd>-{bdt(o.discountAmount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate">Delivery ({ZONES[o.deliveryZone] || "-"})</dt><dd>{bdt(o.deliveryCharge)}</dd></div>
                <div className="flex justify-between pt-1.5 border-t border-line text-base font-bold"><dt>Total</dt><dd>{bdt(o.totalAmount)}</dd></div>
                {o.paymentMethod === "cod" && o.paymentStatus !== "Paid" && <p className="text-xs text-amber-700 text-right">Collect {bdt(o.totalAmount)} in cash on delivery</p>}
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">Customer & delivery address</h3>
              <div className="rounded-lg border border-line p-4 text-sm space-y-1.5">
                <p className="font-semibold">{a.name}</p>
                <p className="flex items-center gap-2 text-slate"><Phone size={14} className="shrink-0" />{a.phone}</p>
                <p className="flex items-center gap-2 text-slate [overflow-wrap:anywhere]"><Mail size={14} className="shrink-0" />{a.email}</p>
                <p className="flex items-start gap-2 text-slate"><MapPin size={14} className="mt-0.5 shrink-0" />{[a.address1, a.address2 !== "N/A" && a.address2, a.city, a.state !== "N/A" && a.state, a.postcode].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-slate pt-1">Account: {fullName(o.user)} {o.user?.email && `(${o.user.email})`}</p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">History</h3>
              <ol className="space-y-2 border-l-2 border-line pl-4">
                {[...(o.statusHistory || [])].reverse().map((h, i) => (
                  <li key={i} className="text-sm"><span className="font-medium">{orderStatusMeta(h.status).label}</span>{h.note && <span className="text-slate"> - {h.note}</span>}
                    <p className="text-xs text-slate">{dateTime(h.at)}{h.by && ` · ${fullName(h.by)}`}</p></li>
                ))}
              </ol>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-5">
            {can("orders:update") && (
              <section className="rounded-xl border border-line p-4 space-y-3">
                <h3 className="text-sm font-semibold">Update status</h3>
                {next.length === 0 ? <p className="text-sm text-slate">This order is {orderStatusMeta(o.orderStatus).label.toLowerCase()}; no further changes.</p> : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {next.map((s) => (
                        <Button key={s} size="sm" variant={s === "Cancelled" ? "danger" : "soft"} loading={status.isPending && status.variables === s} onClick={() => status.mutate(s)}>
                          {s === "Cancelled" ? "Cancel order" : `Mark ${orderStatusMeta(s).label}`}
                        </Button>
                      ))}
                    </div>
                    <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Shown in history" /></Field>
                  </>
                )}
              </section>
            )}

            {can("orders:courier") && (
              <section className="rounded-xl border border-line p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Truck size={16} />Courier</h3>
                {sent ? (
                  <div className="text-sm space-y-1">
                    <p><span className="text-slate">Provider:</span> <b className="capitalize">{o.courier.provider}</b>{o.courier.provider === "mock" && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">TEST mode</span>}</p>
                    <p><span className="text-slate">Tracking ID:</span> <b className="select-all">{o.courier.trackingCode}</b></p>
                    <p><span className="text-slate">Status:</span> {o.courier.status || "-"} · sent {dateTime(o.courier.sentAt)}</p>
                    <Button size="sm" variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}><RefreshCw size={14} />Refresh status</Button>
                  </div>
                ) : ["Cancelled", "Delivered"].includes(o.orderStatus) ? <p className="text-sm text-slate">Not available for this order.</p> : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Select aria-label="Courier" className="min-w-0 flex-1 basis-32" value={provider} onChange={(e) => setProvider(e.target.value)}>{PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select>
                      <Button className="shrink-0" loading={courier.isPending} onClick={() => courier.mutate()}>Send to courier</Button>
                    </div>
                    {o.courier?.error && <p role="alert" className="text-xs text-red-600">Last attempt failed: {o.courier.error}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Input aria-label="Manual tracking code" className="min-w-0 flex-1 basis-40" placeholder="Or enter a tracking code" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                      <Button className="shrink-0" variant="outline" disabled={!tracking.trim()} loading={manual.isPending} onClick={() => manual.mutate()}>Save</Button>
                    </div>
                  </>
                )}
              </section>
            )}

            {can("orders:update") && (
              <section className="rounded-xl border border-line p-4 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2"><StickyNote size={16} />Internal note</h3>
                <Textarea rows={3} maxLength={1000} value={internal ?? o.internalNote ?? ""} onChange={(e) => setInternal(e.target.value)} placeholder="Only your team sees this" />
                <Button size="sm" variant="outline" disabled={internal === null} loading={save.isPending} onClick={() => save.mutate({ internalNote: internal }, { onSuccess: () => setInternal(null) })}>Save note</Button>
                {o.paymentMethod === "cod" && o.paymentStatus === "Pending" && ["Shipped", "Processing"].includes(o.orderStatus) && (
                  <Button size="sm" variant="soft" loading={save.isPending} onClick={() => save.mutate({ paymentStatus: "Paid" })}>Mark cash as received</Button>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
