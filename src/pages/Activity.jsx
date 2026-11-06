import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { dateTime } from "../lib/format";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, TableSkeleton, Td, Th } from "../components/ui";

const ENTITIES = [["", "Everything"], ["order", "Orders"], ["product", "Products"], ["user", "Team & users"], ["setting", "Settings"], ["banner", "Banners"]];

export default function Activity() {
  const [entity, setEntity] = useState(""); const [page, setPage] = useState(1); const [limit, setLimit] = useState(30);
  const q = useQuery({ queryKey: ["audit", entity, page, limit], queryFn: () => api.audit({ entity, page, limit }), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what. Kept for one year." actions={<Select aria-label="Filter by type" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>{ENTITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>} />
      <Card>
        {q.isLoading ? <TableSkeleton rows={8} cols={5} />
          : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
          : rows.length === 0 ? <EmptyState title="No activity recorded yet" /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr><Th>When</Th><Th>Who</Th><Th>What happened</Th><Th>Type</Th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map((a) => (
                <tr key={a._id}>
                  <Td className="text-slate whitespace-nowrap">{dateTime(a.createdAt)}</Td>
                  <Td><p className="font-medium">{a.actorEmail || "System"}</p>{a.actorRole && <p className="text-xs text-slate capitalize">{a.actorRole}</p>}</Td>
                  <Td>{a.summary || a.action}</Td>
                  <Td><Badge>{a.entity || a.action}</Badge></Td>
                </tr>))}</tbody>
            </table></div>)}
        <Pagination pagination={q.data?.pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
    </>
  );
}
