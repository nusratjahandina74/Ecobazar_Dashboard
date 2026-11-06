import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, Input, Modal, PageHeader, ListSkeleton, Switch } from "../components/ui";
import { useToast } from "../context/ToastContext";

const blank = { title: "", subtitle: "", link: "", buttonText: "", order: 0, isActive: true };

function BannerModal({ banner, onClose }) {
  const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState(banner ? { ...blank, ...banner } : blank);
  const [file, setFile] = useState(null); const [err, setErr] = useState("");
  const preview = file ? URL.createObjectURL(file) : banner?.image ? assetUrl(banner.image) : "";
  const save = useMutation({
    mutationFn: () => { const fd = new FormData(); Object.entries({ title: f.title, subtitle: f.subtitle, link: f.link, buttonText: f.buttonText, order: f.order, isActive: f.isActive }).forEach(([k, v]) => fd.append(k, v)); if (file) fd.append("image", file); return api.saveBanner(banner?._id, fd); },
    onSuccess: () => { toast.success(banner ? "Banner updated" : "Banner added"); qc.invalidateQueries({ queryKey: ["banners"] }); onClose(); },
    onError: (e) => setErr(e.message),
  });
  const submit = (e) => { e.preventDefault(); if (!banner && !file) return setErr("Choose a banner image."); if (file && file.size > 5 * 1024 * 1024) return setErr("Image must be under 5 MB."); setErr(""); save.mutate(); };
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal open onClose={onClose} size="md" title={banner ? "Edit banner" : "Add banner"} subtitle="Shown in the slider on the shop home page. Wide images (1600x600) look best."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="banner-form" loading={save.isPending}>{banner ? "Save changes" : "Add banner"}</Button></>}>
      <form id="banner-form" onSubmit={submit} className="space-y-4">
        <Field label="Image" error={!preview && err ? err : ""}>{(i) => (<div className="space-y-2">{preview && <img src={preview} alt="" className="w-full aspect-[8/3] object-cover rounded-lg border border-line" />}<input id={i} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" /></div>)}</Field>
        <Field label="Headline">{(i) => <Input id={i} maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} />}</Field>
        <Field label="Sub headline">{(i) => <Input id={i} maxLength={200} value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text">{(i) => <Input id={i} maxLength={40} value={f.buttonText} onChange={(e) => set("buttonText", e.target.value)} placeholder="Shop now" />}</Field>
          <Field label="Button link" hint="e.g. /shop">{(i) => <Input id={i} value={f.link} onChange={(e) => set("link", e.target.value)} />}</Field>
          <Field label="Position" hint="Lower numbers show first">{(i) => <Input id={i} type="number" value={f.order} onChange={(e) => set("order", e.target.value)} />}</Field>
          <div className="flex items-center gap-3 pt-6"><Switch label="Visible" checked={f.isActive} onChange={(v) => set("isActive", v)} /><span className="text-sm">{f.isActive ? "Visible" : "Hidden"}</span></div>
        </div>
        {err && preview && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </form>
    </Modal>
  );
}

export default function Banners() {
  const toast = useToast(); const qc = useQueryClient();
  const [edit, setEdit] = useState(null); const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ["banners"], queryFn: api.banners });
  const rm = useMutation({ mutationFn: (id) => api.deleteBanner(id), onSuccess: () => { toast.success("Banner deleted"); qc.invalidateQueries({ queryKey: ["banners"] }); setDel(null); }, onError: (e) => toast.error(e.message) });
  const rows = q.data?.data || [];
  return (
    <>
      <PageHeader title="Banners" subtitle="Home page slider." actions={<Button onClick={() => setEdit({})}><Plus size={16} /> Add banner</Button>} />
      {q.isLoading ? <ListSkeleton rows={4} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : rows.length === 0 ? (
        <Card><EmptyState title="No banners yet" text="Add a banner to show a slider on your shop home page." action={<Button onClick={() => setEdit({})}>Add banner</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => (
            <Card key={b._id} className="overflow-hidden">
              <img src={assetUrl(b.image)} alt={b.title || "Banner"} loading="lazy" className="w-full aspect-[8/3] object-cover bg-canvas" />
              <div className="p-4 flex items-start gap-3">
                <div className="min-w-0 flex-1"><p className="font-semibold truncate">{b.title || "Untitled banner"}</p><p className="text-xs text-slate truncate">{b.subtitle || b.link || "-"}</p><div className="mt-2 flex gap-2"><Badge tone={b.isActive ? "green" : "gray"}>{b.isActive ? "Visible" : "Hidden"}</Badge><Badge>Position {b.order}</Badge></div></div>
                <IconButton label="Edit banner" onClick={() => setEdit(b)}><Pencil size={16} /></IconButton>
                <IconButton label="Delete banner" onClick={() => setDel(b)}><Trash2 size={16} /></IconButton>
              </div>
            </Card>))}
        </div>)}
      {edit && <BannerModal banner={edit._id ? edit : null} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} danger title="Delete this banner?" message="It will be removed from the shop slider." confirmLabel="Delete" loading={rm.isPending} onConfirm={() => rm.mutate(del._id)} onClose={() => setDel(null)} />
    </>
  );
}
