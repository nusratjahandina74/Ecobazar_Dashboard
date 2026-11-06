import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { dateTime } from "../lib/format";
import { Button, Card, EmptyState, ErrorState, IconButton, Input, PageHeader, Pagination, TableSkeleton, Td, Th } from "../components/ui";
import useDebounce from "../components/useDebounce";
import { useToast } from "../context/ToastContext";

export default function Subscribers() {
  const toast = useToast(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(30); const [q, setQ] = useState(""); const dq = useDebounce(q);
  const list = useQuery({ queryKey: ["subscribers", dq, page, limit], queryFn: () => api.subscribers({ q: dq, page, limit }), placeholderData: keepPreviousData });
  const rm = useMutation({ mutationFn: (id) => api.deleteSubscriber(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["subscribers"] }), onError: (e) => toast.error(e.message) });
  const exportCsv = async () => { try { const blob = await api.downloadSubscribers(); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "subscribers.csv"; a.click(); URL.revokeObjectURL(a.href); } catch (e) { toast.error(e.message); } };
  const rows = list.data?.data || [];
  return (
    <>
      <PageHeader title="Subscribers" subtitle="People who signed up for offers from the shop footer." actions={<Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export CSV</Button>} />
      <Card>
        <div className="p-4"><div className="relative max-w-md"><Search size={16} className="absolute left-3 top-3 text-slate/60" /><Input aria-label="Search subscribers" className="pl-9" placeholder="Search email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div></div>
        {list.isLoading ? <TableSkeleton rows={5} cols={4} />
          : list.isError && !list.data ? <ErrorState error={list.error} onRetry={list.refetch} />
          : rows.length === 0 ? <EmptyState title="No subscribers yet" text="The sign-up box is in the shop footer and on the home page." /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><Th>Email</Th><Th>Subscribed</Th><Th className="text-right">Remove</Th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map((s) => <tr key={s._id}><Td>{s.email}</Td><Td className="text-slate">{dateTime(s.createdAt)}</Td><Td><div className="flex justify-end"><IconButton label={`Remove ${s.email}`} onClick={() => rm.mutate(s._id)}><Trash2 size={16} /></IconButton></div></Td></tr>)}</tbody></table></div>)}
        <Pagination pagination={list.data?.pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
    </>
  );
}
