import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, Trash2, X } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { dateOnly } from "../lib/format";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, PageHeader, Pagination, Skeleton, Tabs, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const Stars = ({ n }) => <span className="inline-flex" role="img" aria-label={`${n} out of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={15} className={i <= n ? "fill-amber-400 text-amber-400" : "text-gray-300"} />)}</span>;
const TONE = { pending: "amber", approved: "green", rejected: "red" };

function Item({ r, canWrite }) {
  const toast = useToast(); const qc = useQueryClient();
  const [reply, setReply] = useState(r.adminReply || ""); const [del, setDel] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["reviews"] }); qc.invalidateQueries({ queryKey: ["reviews-pending"] }); };
  const upd = useMutation({ mutationFn: (b) => api.updateReview(r._id, b), onSuccess: () => { refresh(); toast.success("Saved"); }, onError: (e) => toast.error(e.message) });
  const rm = useMutation({ mutationFn: () => api.deleteReview(r._id), onSuccess: () => { refresh(); toast.success("Review deleted"); }, onError: (e) => toast.error(e.message) });
  const img = r.product?.images?.find((i) => i.isMain)?.url || r.product?.images?.[0]?.url;
  return (
    <li className="p-4 flex gap-4 border-b border-line last:border-0">
      {img ? <img src={assetUrl(img)} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover border border-line shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-canvas shrink-0" />}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2"><Stars n={r.rating} /><Badge tone={TONE[r.status]}>{r.status}</Badge>{r.verified && <Badge tone="blue">Verified buyer</Badge>}<span className="text-xs text-slate">{r.userName} · {dateOnly(r.createdAt)}</span></div>
        <p className="text-xs text-slate truncate">on {r.product?.title || "a deleted product"}</p>
        {r.title && <p className="text-sm font-semibold">{r.title}</p>}
        {r.comment && <p className="text-sm whitespace-pre-wrap break-words">{r.comment}</p>}
        {canWrite && (<>
          <Textarea aria-label="Your public reply" rows={2} maxLength={800} placeholder="Reply publicly (optional)" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {r.status !== "approved" && <Button size="sm" onClick={() => upd.mutate({ status: "approved", adminReply: reply })} loading={upd.isPending}><Check size={15} /> Approve</Button>}
            {r.status !== "rejected" && <Button size="sm" variant="secondary" onClick={() => upd.mutate({ status: "rejected" })}><X size={15} /> Reject</Button>}
            <Button size="sm" variant="secondary" disabled={reply === (r.adminReply || "")} onClick={() => upd.mutate({ adminReply: reply })}>Save reply</Button>
            <IconButton label="Delete review" onClick={() => setDel(true)}><Trash2 size={16} /></IconButton>
          </div></>)}
      </div>
      <ConfirmDialog open={del} danger title="Delete this review?" message="This cannot be undone." confirmLabel="Delete" loading={rm.isPending} onConfirm={() => rm.mutate()} onClose={() => setDel(false)} />
    </li>
  );
}

export default function Reviews() {
  const { can } = useAuth(); const [tab, setTab] = useState("pending"); const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const q = useQuery({ queryKey: ["reviews", tab, page, limit], queryFn: () => api.reviews({ status: tab === "all" ? "" : tab, page, limit }), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Reviews" subtitle="Customers can review products they received. Approve what appears in the shop." />
      <Card>
        <div className="px-2"><Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ key: "pending", label: "Waiting", count: q.data?.pending }, { key: "approved", label: "Published" }, { key: "rejected", label: "Rejected" }, { key: "all", label: "All" }]} /></div>
        {q.isLoading ? <div className="p-4 space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
          : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
          : rows.length === 0 ? <EmptyState title={tab === "pending" ? "Nothing waiting for approval" : "No reviews here"} text="Reviews appear after customers receive their orders." /> : <ul>{rows.map((r) => <Item key={r._id} r={r} canWrite={can("reviews:write")} />)}</ul>}
        <Pagination pagination={q.data?.pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
    </>
  );
}
