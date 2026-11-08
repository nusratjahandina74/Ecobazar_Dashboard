import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { dateOnly, fullName } from "../lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, TableSkeleton, Td, Th } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access including team and settings" },
  { value: "manager", label: "Manager", desc: "Orders, products, customers, banners, reports" },
  { value: "staff", label: "Staff", desc: "View and process orders, view products" },
];
const roleTone = { admin: "violet", manager: "blue", staff: "gray", editor: "amber", vendor: "amber" };

function AddModal({ onClose }) {
  const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", role: "staff" }); const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const m = useMutation({ mutationFn: () => api.createTeamMember(f), onSuccess: () => { toast.success("Team member added"); qc.invalidateQueries({ queryKey: ["team"] }); onClose(); }, onError: (e) => setErr(e.message) });
  const submit = (e) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Enter a valid email address."); if (f.password.length < 8) return setErr("Password must be at least 8 characters."); setErr(""); m.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title="Add team member" subtitle="They can sign in to this dashboard right away."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="team-form" loading={m.isPending}>Add member</Button></>}>
      <form id="team-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name">{(i) => <Input id={i} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />}</Field>
          <Field label="Last name">{(i) => <Input id={i} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />}</Field>
        </div>
        <Field label="Email">{(i) => <Input id={i} type="email" autoComplete="off" value={f.email} onChange={(e) => set("email", e.target.value)} />}</Field>
        <Field label="Temporary password" hint="At least 8 characters. Share it securely.">{(i) => <Input id={i} type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} />}</Field>
        <Field label="Role" hint={ROLES.find((r) => r.value === f.role)?.desc}>{(i) => <Select id={i} value={f.role} onChange={(e) => set("role", e.target.value)}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>}</Field>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </form>
    </Modal>
  );
}

export default function Team() {
  const { user } = useAuth(); const toast = useToast(); const qc = useQueryClient(); const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["team"], queryFn: () => api.users({ role: "team", limit: 100 }), placeholderData: keepPreviousData });
  const upd = useMutation({ mutationFn: ({ id, body }) => api.updateUser(id, body), onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["team"] }); }, onError: (e) => toast.error(e.message) });
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Team & roles" subtitle="Control who can sign in to this dashboard and what they can do." actions={<Button onClick={() => setAdding(true)}><Plus size={16} /> Add member</Button>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">{ROLES.map((r) => <Card key={r.value} className="p-4"><Badge tone={roleTone[r.value]}>{r.label}</Badge><p className="text-sm text-slate mt-2">{r.desc}</p></Card>)}</div>
      <Card>
        {q.isLoading ? <TableSkeleton rows={4} cols={5} />
          : q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
          : rows.length === 0 ? <EmptyState title="No team members" /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[40rem]">
              <thead><tr><Th>Member</Th><Th>Role</Th><Th>Added</Th><Th>Access</Th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map((u) => { const me = u._id === user?._id || u._id === user?.id; return (
                <tr key={u._id}>
                  <Td><p className="font-medium">{fullName(u)}{me && <span className="text-xs text-slate"> (you)</span>}</p><p className="text-xs text-slate">{u.email}</p></Td>
                  <Td>{["editor", "vendor"].includes(u.role) || me ? <Badge tone={roleTone[u.role]}>{u.role}</Badge> : <Select aria-label={`Role for ${fullName(u)}`} value={u.role} onChange={(e) => upd.mutate({ id: u._id, body: { role: e.target.value } })} className="max-w-[9rem]">{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>}</Td>
                  <Td className="text-slate">{dateOnly(u.createdAt)}</Td>
                  <Td>{me ? <span className="text-slate">-</span> : <Button size="sm" variant={u.isHold ? "primary" : "secondary"} loading={upd.isPending && upd.variables?.id === u._id} onClick={() => upd.mutate({ id: u._id, body: { isHold: !u.isHold } })}>{u.isHold ? "Restore access" : "Suspend"}</Button>}</Td>
                </tr>); })}</tbody>
            </table></div>)}
      </Card>
      {adding && <AddModal onClose={() => setAdding(false)} />}
    </>
  );
}
