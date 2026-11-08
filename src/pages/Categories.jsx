import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Download } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, Input, Modal, PageHeader, ListSkeleton, Switch, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";

function CategoryModal({ cat, onClose }) {
  const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState({ name: cat?.name || "", description: cat?.description || "", order: cat?.order ?? 0, isActive: cat?.isActive ?? true, showOnHome: cat?.showOnHome ?? true });
  const [file, setFile] = useState(null); const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const preview = file ? URL.createObjectURL(file) : cat?.image ? assetUrl(cat.image) : "";
  const save = useMutation({
    mutationFn: () => { const fd = new FormData(); Object.entries(f).forEach(([k, v]) => fd.append(k, v)); if (file) fd.append("image", file); return api.saveCategory(cat?._id, fd); },
    onSuccess: () => { toast.success(cat ? "Category updated" : "Category added"); qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["product-meta"] }); onClose(); },
    onError: (e) => setErr(e.message),
  });
  const submit = (e) => { e.preventDefault(); if (!f.name.trim()) return setErr("Enter a category name."); if (file && file.size > 5 * 1024 * 1024) return setErr("Image must be under 5 MB."); setErr(""); save.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title={cat ? "Edit category" : "Add category"} subtitle="Categories appear in the shop menu and as tiles on the home page."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="cat-form" loading={save.isPending}>{cat ? "Save changes" : "Add category"}</Button></>}>
      <form id="cat-form" onSubmit={submit} className="space-y-4">
        <Field label="Name *">{(i) => <Input id={i} maxLength={80} value={f.name} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Image" hint="Square image, shown on the home page tile.">{(i) => (<div className="flex flex-wrap items-center gap-x-4 gap-y-2">{preview ? <img src={preview} alt="" className="w-16 h-16 rounded-xl object-cover border border-line" /> : <div className="w-16 h-16 rounded-xl bg-canvas border border-dashed border-line" />}<input id={i} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm min-w-0 max-w-full" /></div>)}</Field>
        <Field label="Short description">{(i) => <Textarea id={i} rows={2} maxLength={300} value={f.description} onChange={(e) => set("description", e.target.value)} />}</Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Position" hint="Lower numbers show first">{(i) => <Input id={i} type="number" value={f.order} onChange={(e) => set("order", e.target.value)} />}</Field>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3"><Switch label="Visible in shop" checked={f.isActive} onChange={(v) => set("isActive", v)} /><span className="text-sm">Visible in shop</span></div>
            <div className="flex items-center gap-3"><Switch label="Show on home page" checked={f.showOnHome} onChange={(v) => set("showOnHome", v)} /><span className="text-sm">Show on home page</span></div>
          </div>
        </div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </form>
    </Modal>
  );
}

export default function Categories() {
  const toast = useToast(); const qc = useQueryClient();
  const [edit, setEdit] = useState(null); const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["product-meta"] }); };
  const rm = useMutation({ mutationFn: (id) => api.deleteCategory(id), onSuccess: () => { toast.success("Category deleted"); refresh(); setDel(null); }, onError: (e) => { toast.error(e.message); setDel(null); } });
  const imp = useMutation({ mutationFn: api.importCategories, onSuccess: (r) => { toast.success(r.message); refresh(); }, onError: (e) => toast.error(e.message) });
  const rows = q.data?.data || []; const unmanaged = q.data?.unmanaged || [];
  return (
    <>
      <PageHeader title="Categories" subtitle="Organise your shop. Customers browse by these." actions={<Button onClick={() => setEdit({})}><Plus size={16} /> Add category</Button>} />
      {unmanaged.length > 0 && (
        <Card className="mb-5 p-4 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm"><b>{unmanaged.length} categories</b> are used by products but not managed yet ({unmanaged.slice(0, 4).join(", ")}{unmanaged.length > 4 ? "..." : ""}). Add them to control their image, order and visibility.</p>
          <Button variant="secondary" loading={imp.isPending} onClick={() => imp.mutate()}><Download size={16} /> Add them all</Button>
        </Card>)}
      {q.isLoading ? <ListSkeleton rows={4} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : rows.length === 0 ? (
        <Card><EmptyState title="No categories yet" text="Add your first category, e.g. Fruits or Electronics." action={<Button onClick={() => setEdit({})}>Add category</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c._id} className="p-4 flex items-center gap-4">
              {c.image ? <img src={assetUrl(c.image)} alt="" loading="lazy" className="w-16 h-16 rounded-xl object-cover border border-line" /> : <div className="w-16 h-16 rounded-xl bg-canvas border border-dashed border-line" />}
              <div className="min-w-0 flex-1"><p className="font-semibold truncate">{c.name}</p><p className="text-xs text-slate">{c.productCount} products</p><div className="mt-1.5 flex gap-1.5"><Badge tone={c.isActive ? "green" : "gray"}>{c.isActive ? "Visible" : "Hidden"}</Badge>{c.showOnHome && <Badge tone="blue">On home</Badge>}</div></div>
              <div className="flex flex-col"><IconButton label={`Edit ${c.name}`} onClick={() => setEdit(c)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${c.name}`} onClick={() => setDel(c)}><Trash2 size={16} /></IconButton></div>
            </Card>))}
        </div>)}
      {edit && <CategoryModal cat={edit._id ? edit : null} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} danger title={`Delete "${del?.name}"?`} message="This only works if no product uses it." confirmLabel="Delete" loading={rm.isPending} onConfirm={() => rm.mutate(del._id)} onClose={() => setDel(null)} />
    </>
  );
}
