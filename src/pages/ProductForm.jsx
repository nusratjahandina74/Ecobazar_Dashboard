import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { PRODUCT_STATUS } from "../lib/format";
import { Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, PageLoader, Select, Switch, Textarea } from "../components/ui";
import RichTextEditor from "../components/RichTextEditor";
import ImageUploader from "../components/ImageUploader";
import { useToast } from "../context/ToastContext";

const EMPTY = { title: "", shortDescription: "", description: "", additionalInfo: "", category: "", subCategory: "", brand: "", unit: "", tag: "", price: "", discountPrice: "", stock: "0", sku: "", status: "active", isFeatured: false };
const newVariant = () => ({ key: Math.random().toString(36).slice(2), label: "", size: "", color: "", sku: "", price: "", discountPrice: "", stock: "0", isActive: true });

export default function ProductForm() {
  const { id } = useParams(); const editing = !!id;
  const navigate = useNavigate(); const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState(EMPTY); const [images, setImages] = useState([]); const [variants, setVariants] = useState([]);
  const [removed, setRemoved] = useState([]); const [errors, setErrors] = useState({}); const [loaded, setLoaded] = useState(!editing);

  const meta = useQuery({ queryKey: ["product-meta"], queryFn: api.productMeta, staleTime: 60000 });
  const product = useQuery({ queryKey: ["product", id], queryFn: () => api.product(id), enabled: editing, staleTime: 0, gcTime: 0 });

  useEffect(() => {
    const p = product.data?.data; if (!p) return;
    setF({ title: p.title || "", shortDescription: p.shortDescription || "", description: p.description || "", additionalInfo: p.additionalInfo || "", category: p.category || "", subCategory: p.subCategory || "", brand: p.brand || "", unit: p.unit || "", tag: (p.tag || []).join(", "), price: String(p.price ?? ""), discountPrice: p.discountPrice ? String(p.discountPrice) : "", stock: String(p.stock ?? 0), sku: p.sku || "", status: p.status || "active", isFeatured: !!p.isFeatured });
    setImages((p.images || []).map((im) => ({ id: im.url, url: assetUrl(im.url), existing: im.url, isMain: !!im.isMain })));
    setVariants((p.variants || []).map((v) => ({ key: v._id, _id: v._id, label: v.label || "", size: v.size || "", color: v.color || "", sku: v.sku || "", price: v.price != null ? String(v.price) : "", discountPrice: v.discountPrice ? String(v.discountPrice) : "", stock: String(v.stock ?? 0), isActive: v.isActive !== false })));
    setRemoved([]); setLoaded(true);
  }, [product.data]);

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e })); setErrors((s) => ({ ...s, [k]: undefined })); };
  const hasVariants = variants.some((v) => v.isActive);
  const cats = meta.data?.data?.categories || [];
  const subs = useMemo(() => cats.find((c) => c.name.toLowerCase() === f.category.trim().toLowerCase())?.subcategories || [], [cats, f.category]);

  const onImages = (next) => {
    const gone = images.filter((i) => i.existing && !next.some((n) => n.id === i.id)).map((i) => i.existing);
    if (gone.length) setRemoved((r) => [...r, ...gone]);
    setImages(next);
  };

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = "Enter a product name.";
    if (!f.category.trim()) e.category = "Choose or type a category.";
    const price = Number(f.price);
    if (!(price > 0)) e.price = "Price must be greater than 0.";
    if (f.discountPrice !== "" && !(Number(f.discountPrice) >= 0 && Number(f.discountPrice) < price)) e.discountPrice = "Sale price must be lower than the price.";
    if (!hasVariants && !(Number(f.stock) >= 0)) e.stock = "Stock cannot be negative.";
    variants.forEach((v, i) => { if (v.isActive && !(v.label || v.size || v.color)) e[`v${i}`] = "Give this option a name, size or color."; if (!(Number(v.stock) >= 0)) e[`v${i}`] = "Stock cannot be negative."; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries({ title: f.title.trim(), shortDescription: f.shortDescription, description: f.description, additionalInfo: f.additionalInfo, category: f.category.trim(), subCategory: f.subCategory.trim(), brand: f.brand, unit: f.unit, tag: f.tag, price: f.price, discountPrice: f.discountPrice || 0, status: f.status, isFeatured: f.isFeatured }).forEach(([k, v]) => fd.append(k, v));
      if (!hasVariants) fd.append("stock", f.stock || 0);
      if (f.sku.trim()) fd.append("sku", f.sku.trim());
      fd.append("variants", JSON.stringify(variants.map(({ key: _k, ...v }) => ({ ...v, price: v.price === "" ? undefined : Number(v.price), discountPrice: v.discountPrice === "" ? 0 : Number(v.discountPrice), stock: Number(v.stock) || 0 }))));
      const fresh = images.filter((i) => i.file);
      fresh.forEach((i) => fd.append("photos", i.file));
      const main = images.find((i) => i.isMain);
      if (main) fd.append("mainImage", main.file ? `new:${fresh.indexOf(main)}` : main.existing);
      if (editing && removed.length) fd.append("removeImages", JSON.stringify(removed.filter((u) => !images.some((i) => i.existing === u))));
      return editing ? api.updateProduct(id, fd) : api.createProduct(fd);
    },
    onSuccess: (r) => {
      toast.success(editing ? "Product updated" : "Product created");
      ["products", "product", "product-meta", "overview"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate("/products", { replace: true });
      return r;
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e) => { e.preventDefault(); if (validate()) save.mutate(); else toast.error("Please fix the highlighted fields."); };
  const setVar = (key, k, v) => setVariants((l) => l.map((x) => (x.key === key ? { ...x, [k]: v } : x)));

  if (editing && product.isError) return <ErrorState error={product.error} onRetry={product.refetch} />;
  if (!loaded) return <PageLoader />;

  return (
    <form onSubmit={submit} noValidate>
      <div className="sticky top-0 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-5 bg-canvas/95 backdrop-blur border-b border-line flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/products" aria-label="Back to products" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-line bg-white"><ArrowLeft size={18} /></Link>
          <div><h1 className="text-xl font-bold">{editing ? "Edit product" : "Add product"}</h1><p className="text-xs text-slate">{editing ? f.title : "Fill in the details and save"}</p></div>
        </div>
        <div className="flex gap-2"><Link to="/products"><Button type="button" variant="outline">Cancel</Button></Link><Button type="submit" loading={save.isPending}><Save size={16} />{editing ? "Save changes" : "Create product"}</Button></div>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Product images" subtitle="Add photos first. The cover image is the one customers see in the shop list." />
          <div className="p-5"><ImageUploader items={images} onChange={onImages} /></div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardHeader title="Basic information" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Product name *" error={errors.title} className="sm:col-span-2">{(i) => <Input id={i} value={f.title} onChange={set("title")} maxLength={200} aria-invalid={!!errors.title} />}</Field>
                <Field label="Short description" hint="One or two lines shown near the price." className="sm:col-span-2">{(i) => <Textarea id={i} rows={2} maxLength={500} value={f.shortDescription} onChange={set("shortDescription")} />}</Field>
                <Field label="Category *" error={errors.category}>{(i) => <><Input id={i} list="cat-list" value={f.category} onChange={set("category")} placeholder="Choose or type new" aria-invalid={!!errors.category} /><datalist id="cat-list">{cats.map((c) => <option key={c.name} value={c.name} />)}</datalist></>}</Field>
                <Field label="Sub category">{(i) => <><Input id={i} list="sub-list" value={f.subCategory} onChange={set("subCategory")} /><datalist id="sub-list">{subs.map((s) => <option key={s} value={s} />)}</datalist></>}</Field>
                <Field label="Brand">{(i) => <Input id={i} value={f.brand} onChange={set("brand")} />}</Field>
                <Field label="Unit" hint="kg, piece, litre...">{(i) => <Input id={i} value={f.unit} onChange={set("unit")} />}</Field>
                <Field label="Tags" hint="Separate with commas" className="sm:col-span-2">{(i) => <Input id={i} value={f.tag} onChange={set("tag")} placeholder="organic, fresh, offer" />}</Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="Description" subtitle="Format the text like a document: headings, lists, bold, colors, links and images." />
              <div className="p-5"><RichTextEditor value={f.description} onChange={(v) => setF((s) => ({ ...s, description: v }))} placeholder="Describe the product..." /></div>
            </Card>
            <Card>
              <CardHeader title="Additional information" subtitle="Optional: ingredients, size chart, care instructions." />
              <div className="p-5"><RichTextEditor value={f.additionalInfo} onChange={(v) => setF((s) => ({ ...s, additionalInfo: v }))} placeholder="Extra details..." minHeight={140} /></div>
            </Card>

            <Card>
              <CardHeader title="Variants" subtitle="Optional. Use for different sizes or colors - each can have its own price and stock."
                action={<Button type="button" variant="outline" size="sm" onClick={() => setVariants((l) => [...l, newVariant()])}><Plus size={15} />Add variant</Button>} />
              <div className="p-5 space-y-3">
                {variants.length === 0 && <p className="text-sm text-slate">No variants. The product is sold as a single item using the price and stock on the right.</p>}
                {variants.map((v, i) => (
                  <div key={v.key} className="rounded-lg border border-line p-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                      <Field label="Size" className="sm:col-span-1">{(id) => <Input id={id} value={v.size} onChange={(e) => setVar(v.key, "size", e.target.value)} placeholder="M" />}</Field>
                      <Field label="Color" className="sm:col-span-1">{(id) => <Input id={id} value={v.color} onChange={(e) => setVar(v.key, "color", e.target.value)} placeholder="Red" />}</Field>
                      <Field label="Price ৳" hint="Blank = main price" className="sm:col-span-1">{(id) => <Input id={id} type="number" min="0" value={v.price} onChange={(e) => setVar(v.key, "price", e.target.value)} />}</Field>
                      <Field label="Sale ৳" className="sm:col-span-1">{(id) => <Input id={id} type="number" min="0" value={v.discountPrice} onChange={(e) => setVar(v.key, "discountPrice", e.target.value)} />}</Field>
                      <Field label="Stock" className="sm:col-span-1">{(id) => <Input id={id} type="number" min="0" value={v.stock} onChange={(e) => setVar(v.key, "stock", e.target.value)} />}</Field>
                      <Field label="SKU" className="sm:col-span-1">{(id) => <Input id={id} value={v.sku} onChange={(e) => setVar(v.key, "sku", e.target.value)} placeholder="Auto" />}</Field>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.isActive} onChange={(e) => setVar(v.key, "isActive", e.target.checked)} />Available for sale</label>
                      <button type="button" onClick={() => setVariants((l) => l.filter((x) => x.key !== v.key))} className="flex items-center gap-1 text-sm text-red-600"><Trash2 size={14} />Remove</button>
                    </div>
                    {errors[`v${i}`] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[`v${i}`]}</p>}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Visibility" />
              <div className="p-5"><Field label="Status" hint="Only Active products appear in the shop.">{(i) => <Select id={i} value={f.status} onChange={set("status")}>{PRODUCT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>}</Field>
                <label className="mt-4 flex items-start gap-3 text-sm"><Switch label="Featured on home page" checked={f.isFeatured} onChange={(v) => setF((x) => ({ ...x, isFeatured: v }))} /><span><b>Featured</b><br /><span className="text-xs text-slate">Show in the Featured section on the shop home page.</span></span></label></div>
            </Card>
            <Card>
              <CardHeader title="Price & stock" />
              <div className="grid gap-4 p-5">
                <Field label="Price (৳) *" error={errors.price}>{(i) => <Input id={i} type="number" min="0" step="any" value={f.price} onChange={set("price")} aria-invalid={!!errors.price} />}</Field>
                <Field label="Sale price (৳)" hint="Leave empty for no discount" error={errors.discountPrice}>{(i) => <Input id={i} type="number" min="0" step="any" value={f.discountPrice} onChange={set("discountPrice")} />}</Field>
                <Field label="Stock quantity" error={errors.stock} hint={hasVariants ? "Calculated from the variants" : undefined}>{(i) => <Input id={i} type="number" min="0" disabled={hasVariants} value={hasVariants ? variants.filter((v) => v.isActive).reduce((s, v) => s + (Number(v.stock) || 0), 0) : f.stock} onChange={set("stock")} />}</Field>
                <Field label="SKU" hint={editing ? "Unique product code" : "Leave empty to generate"}>{(i) => <Input id={i} value={f.sku} onChange={set("sku")} disabled={editing} />}</Field>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </form>
  );
}
