import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { bdt, dateOnly, fullName } from "../lib/format";
import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, TableSkeleton, Td, Th } from "../components/ui";
import useDebounce from "../components/useDebounce";

export default function Customers() {
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20); const [q, setQ] = useState(""); const dq = useDebounce(q);
  const list = useQuery({ queryKey: ["customers", dq, page, limit], queryFn: () => api.users({ q: dq, role: "user", page, limit }), placeholderData: keepPreviousData });
  const rows = list.data?.data || [];
  return (
    <>
      <PageHeader title="Customers" subtitle="People who registered in your shop." />
      <Card>
        <div className="p-4"><div className="relative max-w-md"><Search size={16} className="absolute left-3 top-3 text-slate/60" /><Input aria-label="Search customers" className="pl-9" placeholder="Search name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div></div>
        {list.isLoading ? <TableSkeleton rows={6} cols={5} avatar />
          : list.isError && !list.data ? <ErrorState error={list.error} onRetry={list.refetch} />
          : rows.length === 0 ? <EmptyState title="No customers found" /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr><Th>Customer</Th><Th>Phone</Th><Th className="text-right">Orders</Th><Th className="text-right">Total spent</Th><Th>Joined</Th><Th>Account</Th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map((u) => (
                <tr key={u._id}>
                  <Td><p className="font-medium">{fullName(u)}</p><p className="text-xs text-slate">{u.email}</p></Td>
                  <Td className="text-slate">{u.phoneNumber || "-"}</Td><Td className="text-right">{u.orders}</Td><Td className="text-right font-semibold">{bdt(u.totalSpent)}</Td>
                  <Td className="text-slate">{dateOnly(u.createdAt)}</Td>
                  <Td><div className="flex gap-1.5">{u.isHold && <Badge tone="red">On hold</Badge>}<Badge tone={u.isVerified ? "green" : "amber"}>{u.isVerified ? "Verified" : "Unverified"}</Badge></div></Td>
                </tr>))}</tbody>
            </table></div>
          )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>
    </>
  );
}
