import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import useDebounce from "../components/useDebounce";
import { Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, PageHeader, PageLoader, Select, Switch, Tabs, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const BD = 6 * 3600 * 1000;
const isoToInput = (iso) => (iso ? new Date(new Date(iso).getTime() + BD).toISOString().slice(0, 16) : "");
const inputToIso = (v) => (v ? new Date(`${v}:00+06:00`).toISOString() : null);

function useSection(section, initial) {
  const toast = useToast(); const qc = useQueryClient();
  const [form, setForm] = useState(initial); const [dirty, setDirty] = useState(false);
  const key = JSON.stringify(initial);
useEffect(() => { 
  setForm(initial); 
  setDirty(false); 
}, [initial?.name, initial?.returnPolicy]); 
useEffect(() => { 
  setForm(initial); 
  setDirty(false); 
}, []); 

  const set = (k, v) => { setForm((s) => ({ ...s, [k]: v })); setDirty(true); };
  const save = useMutation({
    mutationFn: (body) => api.saveSettings(section, body),
    onSuccess: (r) => { toast.success("Settings saved"); qc.setQueryData(["settings"], (old) => old && ({ ...old, data: r.data })); setDirty(false); },
    onError: (e) => toast.error(e.message),
  });
  return { form, set, save, dirty };
}
const SaveBar = ({ dirty, loading, disabled }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-4 border-t border-line bg-canvas rounded-b-xl">
    <Button type="submit" loading={loading} disabled={!dirty || disabled}>Save changes</Button>
    {!disabled && <span className="text-xs text-slate">{dirty ? "You have unsaved changes." : "All changes saved."}</span>}
    {disabled && <span className="text-xs text-slate">Only admins can change settings.</span>}
  </div>
);

function StoreForm({ s, ro }) {
  const toast = useToast();
  const { form, set, save, dirty } = useSection("store", s);
  const [uploading, setUploading] = useState(false);
  const upload = async (file) => {
    if (!file) return; setUploading(true);
    try { const r = await api.uploadLogo(file); set("logo", r.url); toast.success("Logo uploaded - press Save to apply"); } catch (e) { toast.error(e.message); } finally { setUploading(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <CardHeader title="Store information" subtitle="Shown in the shop header, footer, contact page and invoices." />
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Store name">{(i) => <Input id={i} disabled={ro} value={form.name || ""} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Tagline">{(i) => <Input id={i} disabled={ro} value={form.tagline || ""} onChange={(e) => set("tagline", e.target.value)} />}</Field>
        <Field label="Contact email">{(i) => <Input id={i} type="email" disabled={ro} value={form.email || ""} onChange={(e) => set("email", e.target.value)} />}</Field>
        <Field label="Contact phone">{(i) => <Input id={i} disabled={ro} value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />}</Field>
        <Field label="Address" className="sm:col-span-2">{(i) => <Input id={i} disabled={ro} value={form.address || ""} onChange={(e) => set("address", e.target.value)} />}</Field>
        <Field label="Logo" hint="Square image works best. Replaces the default logo in the shop navbar." className="sm:col-span-2">{(i) => (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <img src={form.logo ? assetUrl(form.logo) : "/favicon.svg"} alt="" className="w-14 h-14 rounded-xl border border-line object-contain bg-white" />
            <input id={i} type="file" accept="image/png,image/jpeg,image/webp" disabled={ro || uploading} onChange={(e) => upload(e.target.files?.[0])} className="text-sm min-w-0 max-w-full" />
            {form.logo && !ro && <Button type="button" variant="ghost" size="sm" onClick={() => set("logo", "")}>Use default</Button>}
          </div>)}</Field>
        <Field label="Facebook page">{(i) => <Input id={i} disabled={ro} value={form.facebook || ""} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/..." />}</Field>
        <Field label="Instagram">{(i) => <Input id={i} disabled={ro} value={form.instagram || ""} onChange={(e) => set("instagram", e.target.value)} />}</Field>
        <Field label="YouTube">{(i) => <Input id={i} disabled={ro} value={form.youtube || ""} onChange={(e) => set("youtube", e.target.value)} />}</Field>
        <Field label="TikTok">{(i) => <Input id={i} disabled={ro} value={form.tiktok || ""} onChange={(e) => set("tiktok", e.target.value)} />}</Field>
        <Field label="Return policy" className="sm:col-span-2">{(i) => <Textarea id={i} rows={4} disabled={ro} value={form.returnPolicy || ""} onChange={(e) => set("returnPolicy", e.target.value)} />}</Field>
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}

function DeliveryForm({ s, ro }) {
  const init = { ...s, freeAllStartDate: isoToInput(s.freeAllStartDate), freeAllEndDate: isoToInput(s.freeAllEndDate) };
  const { form, set, save, dirty } = useSection("delivery", init);
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    for (const k of ["insideDhakaCharge", "outsideDhakaCharge", "freeDeliveryThreshold"]) if (!(Number(form[k]) >= 0) || form[k] === "") return setErr("Delivery amounts must be 0 or more.");
    if (form.freeAllEnabled && form.freeAllStartDate && form.freeAllEndDate && form.freeAllEndDate < form.freeAllStartDate) return setErr("The free-delivery end date must be after the start date.");
    setErr("");
    save.mutate({ ...form, freeAllStartDate: inputToIso(form.freeAllStartDate), freeAllEndDate: inputToIso(form.freeAllEndDate) });
  };
  return (
    <form onSubmit={submit}>
      <CardHeader title="Delivery & payment" subtitle="Customers pick Inside Dhaka or Outside Dhaka at checkout. The server charges exactly these amounts." />
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Inside Dhaka charge (৳)">{(i) => <Input id={i} type="number" min="0" disabled={ro} value={form.insideDhakaCharge ?? ""} onChange={(e) => set("insideDhakaCharge", e.target.value)} />}</Field>
        <Field label="Outside Dhaka charge (৳)">{(i) => <Input id={i} type="number" min="0" disabled={ro} value={form.outsideDhakaCharge ?? ""} onChange={(e) => set("outsideDhakaCharge", e.target.value)} />}</Field>
        <div className="sm:col-span-2 rounded-lg border border-line p-4 space-y-3">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Free delivery above an amount</p><p className="text-xs text-slate">Orders at or above the amount ship free.</p></div><Switch label="Free delivery above amount" checked={!!form.freeDeliveryEnabled} disabled={ro} onChange={(v) => set("freeDeliveryEnabled", v)} /></div>
          {form.freeDeliveryEnabled && <Field label="Minimum order amount (৳)">{(i) => <Input id={i} type="number" min="0" disabled={ro} value={form.freeDeliveryThreshold ?? ""} onChange={(e) => set("freeDeliveryThreshold", e.target.value)} className="max-w-xs" />}</Field>}
        </div>
        <div className="sm:col-span-2 rounded-lg border border-line p-4 space-y-3">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Free delivery campaign</p><p className="text-xs text-slate">Everything ships free between two dates (Bangladesh time).</p></div><Switch label="Free delivery campaign" checked={!!form.freeAllEnabled} disabled={ro} onChange={(v) => set("freeAllEnabled", v)} /></div>
          {form.freeAllEnabled && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Starts">{(i) => <Input id={i} type="datetime-local" disabled={ro} value={form.freeAllStartDate || ""} onChange={(e) => set("freeAllStartDate", e.target.value)} />}</Field><Field label="Ends">{(i) => <Input id={i} type="datetime-local" disabled={ro} value={form.freeAllEndDate || ""} onChange={(e) => set("freeAllEndDate", e.target.value)} />}</Field></div>}
        </div>
        <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-line p-4"><div><p className="text-sm font-medium">Cash on delivery</p><p className="text-xs text-slate">Offer COD at checkout</p></div><Switch label="Cash on delivery" checked={form.codEnabled !== false} disabled={ro} onChange={(v) => set("codEnabled", v)} /></div>
          <div className="flex items-center justify-between rounded-lg border border-line p-4"><div><p className="text-sm font-medium">Online payment</p><p className="text-xs text-slate">Offer aamarPay at checkout</p></div><Switch label="Online payment" checked={form.onlineEnabled !== false} disabled={ro} onChange={(v) => set("onlineEnabled", v)} /></div>
        </div>
        {err && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{err}</p>}
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}

function NoticeForm({ s, ro }) {
  const { form, set, save, dirty } = useSection("notice", s);
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <CardHeader title="Notice bar" subtitle="A scrolling announcement above the shop header (e.g. Eid offer, holiday delivery delay)." />
      <div className="p-5 space-y-4">
        <Field label="Notice text">{(i) => <Textarea id={i} rows={3} maxLength={300} disabled={ro} value={form.text || ""} onChange={(e) => set("text", e.target.value)} />}</Field>
        <div className="flex items-center gap-3"><Switch label="Show notice" checked={!!form.isActive} disabled={ro} onChange={(v) => set("isActive", v)} /><span className="text-sm">{form.isActive ? "Visible on the shop" : "Hidden"}</span></div>
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}
function WhatsAppForm({ s, ro }) {
  const { form, set, save, dirty } = useSection("whatsapp", s);
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <CardHeader title="WhatsApp chat button" subtitle="A floating button on the shop that opens a WhatsApp chat." />
      <div className="p-5 space-y-4">
        <Field label="WhatsApp number" hint="e.g. 017XXXXXXXX or 88017XXXXXXXX">{(i) => <Input id={i} disabled={ro} value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} className="max-w-xs" />}</Field>
        <div className="flex items-center gap-3"><Switch label="Show WhatsApp button" checked={!!form.isActive} disabled={ro} onChange={(v) => set("isActive", v)} /><span className="text-sm">{form.isActive ? "Visible on the shop" : "Hidden"}</span></div>
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}
function CourierForm({ s, ro, status }) {
  const { form, set, save, dirty } = useSection("courier", s);
  const Row = ({ name, ok }) => <li className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 size={16} className="text-leaf" /> : <XCircle size={16} className="text-slate/60" />}<b>{name}</b><span className="text-slate">{ok ? "API keys connected" : "Not connected - orders use TEST mode (fake tracking IDs)"}</span></li>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <CardHeader title="Couriers" subtitle="Pick the default for the Send to courier button." />
      <div className="p-5 space-y-4">
        <Field label="Default courier">{(i) => <Select id={i} disabled={ro} value={form.defaultProvider || "steadfast"} onChange={(e) => set("defaultProvider", e.target.value)} className="max-w-xs"><option value="steadfast">Steadfast</option><option value="pathao">Pathao</option></Select>}</Field>
        <ul className="space-y-2 rounded-lg border border-line p-4"><Row name="Steadfast" ok={status?.steadfast} /><Row name="Pathao" ok={status?.pathao} /></ul>
        <p className="text-xs text-slate">API keys are secrets, so they are set on the server (Render environment variables), not here: STEADFAST_API_KEY, STEADFAST_SECRET_KEY, PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD, PATHAO_STORE_ID.</p>
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}
function InventoryForm({ s, ro }) {
  const { form, set, save, dirty } = useSection("inventory", s);
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate({ lowStockThreshold: form.lowStockThreshold }); }}>
      <CardHeader title="Inventory" subtitle="Used for the Low stock warnings on the dashboard and product list." />
      <div className="p-5"><Field label="Low stock warning at (units)">{(i) => <Input id={i} type="number" min="0" disabled={ro} value={form.lowStockThreshold ?? 5} onChange={(e) => set("lowStockThreshold", e.target.value)} className="max-w-xs" />}</Field></div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}


const ICONS = [["truck", "Delivery truck"], ["shield", "Shield"], ["refresh", "Returns"], ["headset", "Support"], ["leaf", "Leaf"], ["gift", "Gift"], ["clock", "Clock"], ["star", "Star"]];
const SECTIONS_HOME = [["showCategories", "Categories"], ["showFeatured", "Featured products"], ["showNewArrivals", "New arrivals"], ["showBestSellers", "Best sellers"], ["showTestimonials", "Customer reviews"], ["showNewsletter", "Newsletter sign-up"]];

function ProductPicker({ value, onChange, disabled }) {
  const [q, setQ] = useState(""); const dq = useDebounce(q);
  const list = useQuery({ queryKey: ["picker", dq], queryFn: () => api.products({ q: dq, status: "active", limit: 12, sort: "newest" }), staleTime: 30000 });
  const chosen = useQuery({ queryKey: ["picker-chosen", value.join(",")], queryFn: async () => (value.length ? (await api.products({ ids: value.join(","), limit: 100 })).data : []), enabled: value.length > 0, staleTime: 30000 });
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= 24 ? value : [...value, id]);
  const Row = ({ p }) => (
    <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer">
      <Checkbox disabled={disabled} checked={value.includes(p._id)} onChange={() => toggle(p._id)} />
      <span className="flex-1 truncate">{p.title}</span>
      <span className="text-xs text-slate">{p.discountPrice > 0 && p.discountPrice < p.price ? <b className="text-leaf-dark">৳{p.discountPrice} <s className="font-normal text-slate">৳{p.price}</s></b> : <span className="text-amber-700">No sale price</span>}</span>
    </label>
  );
  return (
    <div className="space-y-2">
      <Input aria-label="Search products for the flash sale" placeholder="Search products to add" value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled} />
      <div className="rounded-lg border border-line divide-y divide-line max-h-56 overflow-y-auto">{(list.data?.data || []).map((p) => <Row key={p._id} p={p} />)}{list.isSuccess && !(list.data?.data || []).length && <p className="p-3 text-sm text-slate">No products found.</p>}</div>
      <p className="text-xs text-slate">{value.length} selected. Flash sale shows each product's sale price - set it in the product's quick edit.</p>
      {(chosen.data || []).length > 0 && <div className="flex flex-wrap gap-1.5">{chosen.data.map((p) => <button type="button" key={p._id} disabled={disabled} onClick={() => toggle(p._id)} className="rounded-full bg-green-50 text-green-800 ring-1 ring-green-600/20 px-2.5 py-0.5 text-xs">{p.title} ×</button>)}</div>}
    </div>
  );
}

function HomeForm({ s, ro }) {
  const init = { ...s, flash: { ...s.flash, endsAt: isoToInput(s.flash?.endsAt), productIds: (s.flash?.productIds || []).map(String) } };
  const { form, set, save, dirty } = useSection("home", init);
  const [err, setErr] = useState("");
  const setFlash = (k, v) => set("flash", { ...form.flash, [k]: v });
  const setBadge = (i, k, v) => set("badges", form.badges.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const submit = (e) => {
    e.preventDefault();
    if (form.flash.enabled && !form.flash.endsAt) return setErr("Set when the flash sale ends.");
    if (form.flash.enabled && form.flash.endsAt && new Date(`${form.flash.endsAt}:00+06:00`) < new Date()) return setErr("The flash sale end time is in the past.");
    if (form.flash.enabled && !form.flash.productIds.length) return setErr("Choose at least one product for the flash sale.");
    setErr(""); const { showCategories, showFeatured, showNewArrivals, showBestSellers, showTestimonials, showNewsletter, badges } = form;
    save.mutate({ showCategories, showFeatured, showNewArrivals, showBestSellers, showTestimonials, showNewsletter, badges, flash: { ...form.flash, endsAt: inputToIso(form.flash.endsAt) } });
  };
  return (
    <form onSubmit={submit}>
      <CardHeader title="Home page" subtitle="Choose what customers see on the shop home page." />
      <div className="p-5 space-y-6">
        <div><p className="text-sm font-medium mb-2">Sections</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{SECTIONS_HOME.map(([k, l]) => <div key={k} className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5"><span className="text-sm">{l}</span><Switch label={l} checked={form[k] !== false} disabled={ro} onChange={(v) => set(k, v)} /></div>)}</div></div>
        <div className="rounded-lg border border-line p-4 space-y-4">
          <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm font-medium">Flash sale</p><p className="text-xs text-slate">A highlighted section with a live countdown. Hides itself when time is up.</p></div><Switch label="Flash sale" checked={!!form.flash.enabled} disabled={ro} onChange={(v) => setFlash("enabled", v)} /></div>
          {form.flash.enabled && (<>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Title">{(i) => <Input id={i} maxLength={60} disabled={ro} value={form.flash.title || ""} onChange={(e) => setFlash("title", e.target.value)} />}</Field>
              <Field label="Ends at (Bangladesh time)">{(i) => <Input id={i} type="datetime-local" disabled={ro} value={form.flash.endsAt || ""} onChange={(e) => setFlash("endsAt", e.target.value)} />}</Field>
              <Field label="Subtitle" className="sm:col-span-2">{(i) => <Input id={i} maxLength={120} disabled={ro} value={form.flash.subtitle || ""} onChange={(e) => setFlash("subtitle", e.target.value)} placeholder="Up to 30% off fresh fruits" />}</Field>
            </div>
            <ProductPicker value={form.flash.productIds} disabled={ro} onChange={(v) => setFlash("productIds", v)} />
          </>)}
        </div>
        <div><p className="text-sm font-medium mb-2">Highlights under the banner</p>
          <div className="space-y-2">{form.badges.map((b, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Select aria-label="Icon" disabled={ro} value={b.icon} onChange={(e) => setBadge(i, "icon", e.target.value)}>{ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
              <Input aria-label="Highlight title" maxLength={40} disabled={ro} value={b.title} onChange={(e) => setBadge(i, "title", e.target.value)} placeholder="Title" />
              <Input aria-label="Highlight text" maxLength={80} disabled={ro} value={b.text} onChange={(e) => setBadge(i, "text", e.target.value)} placeholder="Short text" />
              <Button type="button" variant="ghost" size="sm" disabled={ro} onClick={() => set("badges", form.badges.filter((_, j) => j !== i))}>Remove</Button>
            </div>))}
          </div>
          {form.badges.length < 6 && !ro && <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => set("badges", [...form.badges, { icon: "star", title: "", text: "" }])}>Add highlight</Button>}
        </div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}

const SWATCHES = ["#16a34a", "#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#b91c1c", "#334155"];
function BrandForm({ s, seo, ro }) {
  const theme = useSection("theme", s); const sseo = useSection("seo", seo);
  const toast = useToast();
  const bad = theme.form.primary && !/^#[0-9a-fA-F]{6}$/.test(theme.form.primary);
  const submit = (e) => { e.preventDefault(); if (bad) return toast.error("Color must look like #16a34a"); if (theme.dirty) theme.save.mutate(theme.form); if (sseo.dirty) sseo.save.mutate(sseo.form); };
  return (
    <form onSubmit={submit}>
      <CardHeader title="Brand colour & search appearance" subtitle="Make the shop match your brand and look good on Google." />
      <div className="p-5 space-y-5">
        <Field label="Main colour" hint="Used for buttons and highlights in the shop. Empty = default green.">{(i) => (
          <div className="flex flex-wrap items-center gap-2">
            <input id={i} type="color" aria-label="Pick colour" disabled={ro} value={/^#[0-9a-fA-F]{6}$/.test(theme.form.primary || "") ? theme.form.primary : "#16a34a"} onChange={(e) => theme.set("primary", e.target.value)} className="h-10 w-12 rounded border border-line" />
            <Input aria-label="Colour code" disabled={ro} value={theme.form.primary || ""} onChange={(e) => theme.set("primary", e.target.value)} placeholder="#16a34a" className="w-32" />
            {SWATCHES.map((c) => <button type="button" key={c} aria-label={`Use ${c}`} disabled={ro} onClick={() => theme.set("primary", c)} style={{ background: c }} className="h-7 w-7 rounded-full ring-1 ring-black/10" />)}
            <Button type="button" variant="ghost" size="sm" disabled={ro} onClick={() => theme.set("primary", "")}>Reset</Button>
          </div>)}</Field>
        <Field label="Browser tab title" hint="Shown in Google results and the browser tab.">{(i) => <Input id={i} maxLength={300} disabled={ro} value={sseo.form.title || ""} onChange={(e) => sseo.set("title", e.target.value)} placeholder="EcoBazaar - Fresh groceries in Bangladesh" />}</Field>
        <Field label="Search description" hint="One or two sentences. About 150 characters works best.">{(i) => <Textarea id={i} rows={3} maxLength={300} disabled={ro} value={sseo.form.description || ""} onChange={(e) => sseo.set("description", e.target.value)} />}</Field>
      </div>
      <SaveBar dirty={theme.dirty || sseo.dirty} loading={theme.save.isPending || sseo.save.isPending} disabled={ro} />
    </form>
  );
}
function ReviewsForm({ s, ro }) {
  const { form, set, save, dirty } = useSection("reviews", s);
  const Row = ({ k, title, text }) => <div className="flex items-center justify-between gap-4 rounded-lg border border-line p-4"><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-slate">{text}</p></div><Switch label={title} checked={form[k] !== false} disabled={ro} onChange={(v) => set(k, v)} /></div>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <CardHeader title="Customer reviews" subtitle="Control how reviews work in your shop." />
      <div className="p-5 space-y-3">
        <Row k="enabled" title="Allow reviews" text="Show stars and reviews on product pages." />
        <Row k="requirePurchase" title="Only buyers can review" text="Customer must have a delivered order of that product (shown as Verified buyer)." />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line p-4"><div><p className="text-sm font-medium">Publish automatically</p><p className="text-xs text-slate">Off = you approve each review first (Reviews page).</p></div><Switch label="Publish automatically" checked={!!form.autoApprove} disabled={ro} onChange={(v) => set("autoApprove", v)} /></div>
      </div>
      <SaveBar dirty={dirty} loading={save.isPending} disabled={ro} />
    </form>
  );
}

const TABS = [{ key: "store", label: "Store" }, { key: "home", label: "Home page" }, { key: "brand", label: "Brand & SEO" }, { key: "reviews", label: "Reviews" }, { key: "delivery", label: "Delivery & payment" }, { key: "notice", label: "Notice" }, { key: "whatsapp", label: "WhatsApp" }, { key: "courier", label: "Couriers" }, { key: "inventory", label: "Inventory" }];

export default function SettingsPage() {
  const { can } = useAuth(); const [tab, setTab] = useState("store");
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["settings"], queryFn: api.settings, staleTime: 30000 });
  const ro = !can("settings:write");
  const s = data?.data;
  return (
    <>
      <PageHeader title="Settings" subtitle="Everything the shop shows to customers can be changed here." />
      <Card>
        <div className="px-2"><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>
        {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <div className="max-w-3xl">
            {tab === "store" && <StoreForm s={s.store} ro={ro} />}
            {tab === "home" && <HomeForm s={s.home} ro={ro} />}
            {tab === "brand" && <BrandForm s={s.theme} seo={s.seo} ro={ro} />}
            {tab === "reviews" && <ReviewsForm s={s.reviews} ro={ro} />}
            {tab === "delivery" && <DeliveryForm s={s.delivery} ro={ro} />}
            {tab === "notice" && <NoticeForm s={s.notice} ro={ro} />}
            {tab === "whatsapp" && <WhatsAppForm s={s.whatsapp} ro={ro} />}
            {tab === "courier" && <CourierForm s={s.courier} ro={ro} status={data.courierStatus} />}
            {tab === "inventory" && <InventoryForm s={s.inventory} ro={ro} />}
          </div>
        )}
      </Card>
    </>
  );
}
