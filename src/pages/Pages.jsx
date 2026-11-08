import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { api, STORE_URL } from "../lib/api";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, Input, PageHeader, PageLoader, ListSkeleton, Switch, Td, Th } from "../components/ui";
import RichTextEditor from "../components/RichTextEditor";
import { useToast } from "../context/ToastContext";

function Editor({ id, onBack }) {
  const toast = useToast(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ["page", id], queryFn: () => api.page(id), enabled: !!id });
  if (id && q.isLoading) return <PageLoader />;
  if (id && q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return <EditorForm key={id || "new"} page={id ? q.data.data : null} onBack={onBack} toast={toast} qc={qc} />;
}
function EditorForm({ page, onBack, toast, qc }) {
  const [f, setF] = useState({ title: page?.title || "", slug: page?.slug || "", content: page?.content || "", isActive: page?.isActive ?? true, showInFooter: page?.showInFooter ?? true, order: page?.order ?? 10 });
  const [err, setErr] = useState(""); const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = useMutation({ mutationFn: () => api.savePage(page?._id, f), onSuccess: () => { toast.success("Page saved"); qc.invalidateQueries({ queryKey: ["pages"] }); qc.invalidateQueries({ queryKey: ["page"] }); onBack(); }, onError: (e) => setErr(e.message) });
  const submit = (e) => { e.preventDefault(); if (!f.title.trim()) return setErr("Enter a page title."); setErr(""); save.mutate(); };
  return (
    <form onSubmit={submit}>
      <PageHeader title={page ? `Edit: ${page.title}` : "New page"} subtitle={page ? `Address: /page/${page.slug}` : "Shown in the shop footer."} actions={<><Button type="button" variant="secondary" onClick={onBack}><ArrowLeft size={16} /> Back</Button><Button type="submit" loading={save.isPending}>Save page</Button></>} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-5 space-y-4">
          <Field label="Title *">{(i) => <Input id={i} maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} />}</Field>
          {!page && <Field label="Page address" hint="Optional. Letters and dashes, e.g. shipping-info">{(i) => <Input id={i} value={f.slug} onChange={(e) => set("slug", e.target.value)} />}</Field>}
          <Field label="Content">{() => <RichTextEditor value={f.content} onChange={(v) => set("content", v)} placeholder="Write the page..." minHeight={320} />}</Field>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        </Card>
        <Card className="p-5 space-y-4 h-fit">
          <div className="flex items-center gap-3"><Switch label="Page is visible" checked={f.isActive} onChange={(v) => set("isActive", v)} /><span className="text-sm">{f.isActive ? "Visible" : "Hidden"}</span></div>
          <div className="flex items-center gap-3"><Switch label="Show in footer" checked={f.showInFooter} onChange={(v) => set("showInFooter", v)} /><span className="text-sm">Show link in footer</span></div>
          <Field label="Position" hint="Lower numbers first">{(i) => <Input id={i} type="number" value={f.order} onChange={(e) => set("order", e.target.value)} />}</Field>
        </Card>
      </div>
    </form>
  );
}

export default function Pages() {
  const toast = useToast(); const qc = useQueryClient();
  const [editing, setEditing] = useState(undefined); const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ["pages"], queryFn: api.pages });
  const rm = useMutation({ mutationFn: (id) => api.deletePage(id), onSuccess: () => { toast.success("Page deleted"); qc.invalidateQueries({ queryKey: ["pages"] }); setDel(null); }, onError: (e) => toast.error(e.message) });
  if (editing !== undefined) return <Editor id={editing} onBack={() => setEditing(undefined)} />;
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Pages" subtitle="About us, privacy policy, FAQ and more. Edit the text any time." actions={<Button onClick={() => setEditing(null)}><Plus size={16} /> New page</Button>} />
      <Card>
        {q.isLoading ? <ListSkeleton rows={4} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : rows.length === 0 ? <EmptyState title="No pages yet" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[34rem]">
            <thead><tr><Th>Title</Th><Th>Address</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody className="divide-y divide-line">{rows.map((p) => (
              <tr key={p._id}>
                <Td className="font-medium">{p.title}</Td>
                <Td><a className="text-leaf-dark underline" href={`${STORE_URL}/page/${p.slug}`} target="_blank" rel="noreferrer">/page/{p.slug}</a></Td>
                <Td><div className="flex gap-1.5"><Badge tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Visible" : "Hidden"}</Badge>{p.showInFooter && <Badge tone="blue">Footer</Badge>}</div></Td>
                <Td><div className="flex justify-end"><IconButton label={`Edit ${p.title}`} onClick={() => setEditing(p._id)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${p.title}`} onClick={() => setDel(p)}><Trash2 size={16} /></IconButton></div></Td>
              </tr>))}</tbody>
          </table></div>)}
      </Card>
      <ConfirmDialog open={!!del} danger title={`Delete "${del?.title}"?`} message="The page will disappear from the shop." confirmLabel="Delete" loading={rm.isPending} onConfirm={() => rm.mutate(del._id)} onClose={() => setDel(null)} />
    </>
  );
}
