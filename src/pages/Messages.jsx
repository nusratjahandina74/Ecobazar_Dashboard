import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { dateTime, timeAgo } from "../lib/format";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, PageHeader, Pagination, Skeleton, Tabs, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

function Item({ m, canWrite }) {
  const toast = useToast(); const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [note, setNote] = useState(m.adminNote || ""); const [del, setDel] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["messages"] }); qc.invalidateQueries({ queryKey: ["messages-unread"] }); };
  const upd = useMutation({ mutationFn: (b) => api.updateMessage(m._id, b), onSuccess: () => { refresh(); toast.success("Saved"); }, onError: (e) => toast.error(e.message) });
  const rm = useMutation({ mutationFn: () => api.deleteMessage(m._id), onSuccess: () => { refresh(); toast.success("Message deleted"); }, onError: (e) => toast.error(e.message) });
  const toggle = () => { const next = !open; setOpen(next); if (next && !m.isRead && canWrite) upd.mutate({ isRead: true }); };
  return (
    <li className="border-b border-line last:border-0">
      <button type="button" onClick={toggle} aria-expanded={open} className="w-full text-left px-4 py-3.5 flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${m.isRead ? "bg-gray-300" : "bg-leaf"}`} aria-label={m.isRead ? "Read" : "Unread"} />
        <span className="min-w-0 flex-1"><span className={`block text-sm ${m.isRead ? "" : "font-semibold"}`}>{m.subject || "(no subject)"} <span className="font-normal text-slate">- {m.name}</span></span><span className="block text-sm text-slate truncate">{m.message}</span></span>
        <span className="text-xs text-slate whitespace-nowrap">{timeAgo(m.createdAt)}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-9 space-y-3">
          <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate">
            {m.email && <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 underline"><Mail size={14} />{m.email}</a>}
            {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 underline"><Phone size={14} />{m.phone}</a>}
            <span>{dateTime(m.createdAt)}</span>
          </div>
          {canWrite && (<>
            <label className="block text-xs font-medium text-slate" htmlFor={`n-${m._id}`}>Internal note (customers never see this)</label>
            <Textarea id={`n-${m._id}`} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => upd.mutate({ adminNote: note })} loading={upd.isPending} disabled={note === (m.adminNote || "")}>Save note</Button>
              <Button size="sm" variant="secondary" onClick={() => upd.mutate({ isRead: !m.isRead })}>{m.isRead ? "Mark as unread" : "Mark as read"}</Button>
              <IconButton label="Delete message" onClick={() => setDel(true)}><Trash2 size={16} /></IconButton>
            </div></>)}
        </div>)}
      <ConfirmDialog open={del} danger title="Delete this message?" message="This cannot be undone." confirmLabel="Delete" loading={rm.isPending} onConfirm={() => rm.mutate()} onClose={() => setDel(false)} />
    </li>
  );
}

export default function Messages() {
  const { can } = useAuth(); const [tab, setTab] = useState("all"); const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const q = useQuery({ queryKey: ["messages", tab, page, limit], queryFn: () => api.messages({ unread: tab === "unread" ? "true" : "", page, limit }), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Messages" subtitle="Enquiries sent from the shop's contact page." />
      <Card>
        <div className="px-2"><Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ key: "all", label: "All" }, { key: "unread", label: "Unread", count: q.data?.unread }]} /></div>
        {q.isLoading ? <div className="p-4 space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
          : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
          : rows.length === 0 ? <EmptyState title={tab === "unread" ? "No unread messages" : "No messages yet"} /> : <ul>{rows.map((m) => <Item key={m._id} m={m} canWrite={can("messages:write")} />)}</ul>}
        <Pagination pagination={q.data?.pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
    </>
  );
}
