import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { bdt, dateTime, PRODUCT_STATUS } from "../lib/format";
import { Button, ErrorState, Field, Input, Modal, Select, Spinner } from "./ui";
import { ProductStatusBadge } from "./badges";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function ProductModal({ productId, onClose }) {
  const toast = useToast(); const qc = useQueryClient(); const { can } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["product", productId], queryFn: () => api.product(productId), enabled: !!productId });
  const p = data?.data;
  const [img, setImg] = useState(0);
  const [price, setPrice] = useState(null); const [disc, setDisc] = useState(null); const [stock, setStock] = useState(null);

  const quick = useMutation({
    mutationFn: (body) => api.quickProduct(productId, body),
    onSuccess: (r) => { toast.success("Saved"); qc.setQueryData(["product", productId], { data: { ...p, ...r.data } }); qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["overview"] }); setPrice(null); setDisc(null); setStock(null); },
    onError: (e) => toast.error(e.message),
  });
  const writable = can("products:write");
  const hasVariants = p?.variants?.some((v) => v.isActive !== false);
  const dirty = price !== null || disc !== null || stock !== null;
  const saveNumbers = () => {
    const body = {};
    if (price !== null) body.price = price; if (disc !== null) body.discountPrice = disc || 0; if (stock !== null) body.stock = stock;
    quick.mutate(body);
  };

  return (
    <Modal open={!!productId} onClose={onClose} size="xl" title={p?.title || "Product details"}
      subtitle={p && <span className="flex flex-wrap items-center gap-2">SKU {p.sku}<ProductStatusBadge status={p.status} /><span>Updated {dateTime(p.updatedAt)}</span></span>}
      footer={p && writable && <Link to={`/products/${p._id}/edit`}><Button><Pencil size={15} />Edit full product</Button></Link>}>
      {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : error ? <ErrorState error={error} onRetry={refetch} /> : p && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="aspect-square overflow-hidden rounded-xl bg-mint border border-line">
              {p.images?.[img] ? <img src={assetUrl(p.images[img].url)} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm text-slate">No image</div>}
            </div>
            {p.images?.length > 1 && <div className="flex gap-2 mt-2 overflow-x-auto">{p.images.map((im, i) => (
              <button key={im.url} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`} className={`w-14 h-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === img ? "border-leaf" : "border-transparent"}`}><img src={assetUrl(im.url)} alt="" className="w-full h-full object-cover" /></button>
            ))}</div>}
          </div>

          <div className="lg:col-span-3 space-y-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm [&_dd]:[overflow-wrap:anywhere]">
              <div><dt className="text-slate">Category</dt><dd className="font-medium">{p.category}{p.subCategory && ` / ${p.subCategory}`}</dd></div>
              <div><dt className="text-slate">Brand</dt><dd className="font-medium">{p.brand || "-"}</dd></div>
              <div><dt className="text-slate">Sold</dt><dd className="font-medium">{p.soldCount || 0}</dd></div>
              <div><dt className="text-slate">Tags</dt><dd className="font-medium">{p.tag?.join(", ") || "-"}</dd></div>
            </dl>

            {writable && (
              <section className="rounded-xl border border-line p-4 space-y-3">
                <h3 className="text-sm font-semibold">Quick edit - no need to open the full editor</h3>
                <Field label="Status" hint="Only Active products are visible in the shop.">{(id) => (
                  <Select id={id} value={p.status} disabled={quick.isPending} onChange={(e) => quick.mutate({ status: e.target.value })}>{PRODUCT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
                )}</Field>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
                  <Field label="Price (৳)">{(id) => <Input id={id} type="number" min="0" value={price ?? p.price} onChange={(e) => setPrice(e.target.value)} />}</Field>
                  <Field label="Sale price (৳)">{(id) => <Input id={id} type="number" min="0" value={disc ?? (p.discountPrice || "")} onChange={(e) => setDisc(e.target.value)} placeholder="None" />}</Field>
                  <Field label="Stock">{(id) => <Input id={id} type="number" min="0" disabled={hasVariants} value={stock ?? p.stock} onChange={(e) => setStock(e.target.value)} />}</Field>
                </div>
                {hasVariants && <p className="text-xs text-slate">Stock is the total of the variants. Edit variants in the full editor.</p>}
                <Button size="sm" disabled={!dirty} loading={quick.isPending} onClick={saveNumbers}>Save changes</Button>
              </section>
            )}
            {!writable && <p className="text-lg font-bold">{bdt(p.discountPrice > 0 ? p.discountPrice : p.price)} <span className="text-sm font-normal text-slate">· {p.stock} in stock</span></p>}

            {hasVariants && (
              <section><h3 className="text-sm font-semibold mb-2">Variants</h3>
                <div className="overflow-x-auto rounded-lg border border-line"><table className="w-full text-sm">
                  <thead><tr className="bg-canvas text-left text-xs text-slate"><th className="px-3 py-2">Option</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Stock</th></tr></thead>
                  <tbody className="divide-y divide-line">{p.variants.map((v) => <tr key={v._id}><td className="px-3 py-2">{v.label}</td><td className="px-3 py-2 text-slate">{v.sku}</td><td className="px-3 py-2 text-right">{bdt(v.discountPrice > 0 ? v.discountPrice : v.price ?? p.price)}</td><td className="px-3 py-2 text-right">{v.stock}</td></tr>)}</tbody>
                </table></div>
              </section>
            )}

            {p.shortDescription && <section><h3 className="text-sm font-semibold mb-1">Short description</h3><p className="text-sm text-slate">{p.shortDescription}</p></section>}
            {p.description && <section><h3 className="text-sm font-semibold mb-1">Description</h3><div className="rich-view text-sm text-slate" dangerouslySetInnerHTML={{ __html: p.description }} /></section>}
          </div>
        </div>
      )}
    </Modal>
  );
}
