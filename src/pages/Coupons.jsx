import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { bdt, dateOnly } from "../lib/format";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, Input, Modal, PageHeader, Pagination, Select, Skeleton, Switch, Td, Th } from "../components/ui";
import { useToast } from "../context/ToastContext";

const TYPES = { percent: "Percent off", fixed: "Fixed amount off", free_delivery: "Free delivery" };
const BD = 6 * 3600 * 1000;
const toInput = (iso) => (iso ? new Date(new Date(iso).getTime() + BD).toISOString().slice(0, 16) : "");
const toIso = (v) => (v ? new Date(`${v}:00+06:00`).toISOString() : null);
const describe = (c) => (c.type === "percent" ? `${c.value}% off${c.maxDiscount ? ` (max ${bdt(c.maxDiscount)})` : ""}` : c.type === "fixed" ? `${bdt(c.value)} off` : "Free delivery");
const state = (c) => { const n = Date.now(); if (!c.isActive) return ["gray", "Paused"]; if (c.expiresAt && new Date(c.expiresAt) < n) return ["red", "Expired"]; if (c.startsAt && new Date(c.startsAt) > n) return ["amber", "Scheduled"]; if (c.usageLimit && c.usedCount >= c.usageLimit) return ["amber", "Used up"]; return ["green", "Active"]; };

function CouponModal({ coupon, onClose }) {
  const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState({ code: coupon?.code || "", description: coupon?.description || "", type: coupon?.type || "percent", value: coupon?.value ?? "", maxDiscount: coupon?.maxDiscount || "", minOrder: coupon?.minOrder || "", usageLimit: coupon?.usageLimit || "", perUserLimit: coupon?.perUserLimit || "", startsAt: toInput(coupon?.startsAt), expiresAt: toInput(coupon?.expiresAt), isActive: coupon?.isActive ?? true });
  const [err, setErr] = useState(""); const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = useMutation({ mutationFn: (b) => api.saveCoupon(coupon?._id, b), onSuccess: () => { toast.success(coupon ? "Coupon updated" : "Coupon created"); qc.invalidateQueries({ queryKey: ["coupons"] }); onClose(); }, onError: (e) => setErr(e.message) });
  const submit = (e) => {
    e.preventDefault();
    if (f.code.trim().length < 3) return setErr("Code must be at least 3 characters.");
    if (f.type === "percent" && !(Number(f.value) > 0 && Number(f.value) <= 100)) return setErr("Percent must be between 1 and 100.");
    if (f.type === "fixed" && !(Number(f.value) > 0)) return setErr("Enter the discount amount.");
    if (f.startsAt && f.expiresAt && f.expiresAt < f.startsAt) return setErr("Expiry must be after the start.");
    setErr(""); save.mutate({ ...f, value: f.type === "free_delivery" ? 0 : Number(f.value), maxDiscount: Number(f.maxDiscount) || 0, minOrder: Number(f.minOrder) || 0, usageLimit: Number(f.usageLimit) || 0, perUserLimit: Number(f.perUserLimit) || 0, startsAt: toIso(f.startsAt), expiresAt: toIso(f.expiresAt) });
  };
  return (
    <Modal open onClose={onClose} size="md" title={coupon ? `Edit ${coupon.code}` : "Create coupon"} subtitle="Customers enter the code at checkout."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="coupon-form" loading={save.isPending}>{coupon ? "Save changes" : "Create coupon"}</Button></>}>
      <form id="coupon-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code *" hint="Letters and numbers, e.g. EID20">{(i) => <Input id={i} value={f.code} maxLength={30} onChange={(e) => set("code", e.target.value.toUpperCase())} className="uppercase" />}</Field>
          <Field label="Discount type">{(i) => <Select id={i} value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          {f.type !== "free_delivery" && <Field label={f.type === "percent" ? "Percent (%)" : "Amount (৳)"}>{(i) => <Input id={i} type="number" min="0" value={f.value} onChange={(e) => set("value", e.target.value)} />}</Field>}
          {f.type === "percent" && <Field label="Maximum discount (৳)" hint="Empty = no cap">{(i) => <Input id={i} type="number" min="0" value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />}</Field>}
          <Field label="Minimum order (৳)" hint="Empty = any order">{(i) => <Input id={i} type="number" min="0" value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} />}</Field>
          <Field label="Total uses allowed" hint="Empty = unlimited">{(i) => <Input id={i} type="number" min="0" value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} />}</Field>
          <Field label="Uses per customer" hint="Empty = unlimited">{(i) => <Input id={i} type="number" min="0" value={f.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} />}</Field>
          <span />
          <Field label="Starts">{(i) => <Input id={i} type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />}</Field>
          <Field label="Expires">{(i) => <Input id={i} type="datetime-local" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />}</Field>
        </div>
        <Field label="Note for your team">{(i) => <Input id={i} maxLength={200} value={f.description} onChange={(e) => set("description", e.target.value)} />}</Field>
        <div className="flex items-center gap-3"><Switch label="Coupon is on" checked={f.isActive} onChange={(v) => set("isActive", v)} /><span className="text-sm">{f.isActive ? "Coupon is on" : "Paused"}</span></div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </form>
    </Modal>
  );
}

export default function Coupons() {
  const toast = useToast(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ["coupons", page, limit], queryFn: () => api.coupons({ page, limit }), placeholderData: keepPreviousData });
  const rm = useMutation({ mutationFn: (id) => api.deleteCoupon(id), onSuccess: () => { toast.success("Coupon deleted"); qc.invalidateQueries({ queryKey: ["coupons"] }); setDel(null); }, onError: (e) => toast.error(e.message) });
  const toggle = useMutation({ mutationFn: (c) => api.saveCoupon(c._id, { isActive: !c.isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }), onError: (e) => toast.error(e.message) });
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes for sales, Eid offers and first orders." actions={<Button onClick={() => setEdit({})}><Plus size={16} /> Create coupon</Button>} />
      <Card>
        {q.isLoading ? <div className="p-4 space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
          : rows.length === 0 ? <EmptyState title="No coupons yet" text="Create a code like EID20 to boost sales." action={<Button onClick={() => setEdit({})}>Create coupon</Button>} /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Rules</Th><Th>Used</Th><Th>Valid until</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map((c) => { const [tone, label] = state(c); return (
                <tr key={c._id}>
                  <Td><p className="font-mono font-semibold">{c.code}</p>{c.description && <p className="text-xs text-slate">{c.description}</p>}</Td>
                  <Td>{describe(c)}</Td>
                  <Td className="text-slate text-xs">{c.minOrder ? `Min ${bdt(c.minOrder)}` : "Any order"}{c.perUserLimit ? ` · ${c.perUserLimit}/customer` : ""}</Td>
                  <Td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</Td>
                  <Td className="text-slate">{c.expiresAt ? dateOnly(c.expiresAt) : "No expiry"}</Td>
                  <Td><Badge tone={tone}>{label}</Badge></Td>
                  <Td><div className="flex justify-end items-center gap-1"><Switch label={`Toggle ${c.code}`} checked={c.isActive} onChange={() => toggle.mutate(c)} /><IconButton label={`Edit ${c.code}`} onClick={() => setEdit(c)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${c.code}`} onClick={() => setDel(c)}><Trash2 size={16} /></IconButton></div></Td>
                </tr>); })}</tbody>
            </table></div>)}
        <Pagination pagination={q.data?.pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
      {edit && <CouponModal coupon={edit._id ? edit : null} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} danger title={`Delete ${del?.code}?`} message="Past orders keep their discount. The code stops working." confirmLabel="Delete" loading={rm.isPending} onConfirm={() => rm.mutate(del._id)} onClose={() => setDel(null)} />
    </>
  );
}
