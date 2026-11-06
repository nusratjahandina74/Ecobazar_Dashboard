import { memo, useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Trash2, X, ImageOff } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { bdt, PRODUCT_STATUS } from "../lib/format";
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, IconButton, Input, PageHeader, Pagination, Select, TableSkeleton, Th, Td } from "../components/ui";
import ProductModal from "../components/ProductModal";
import useDebounce from "../components/useDebounce";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const StockBadge = ({ stock, threshold }) => stock <= 0 ? <Badge tone="red">Out of stock</Badge> : stock <= threshold ? <Badge tone="amber">Low · {stock}</Badge> : <span className="font-medium">{stock}</span>;

const Row = memo(function Row({ p, selected, onSelect, onView, onStatus, onDelete, writable, canDelete, threshold, busy }) {
  const img = p.images?.find((i) => i.isMain) || p.images?.[0];
  return (
    <tr className={selected ? "bg-mint/60" : undefined}>
      <Td className="w-10"><Checkbox checked={selected} onChange={() => onSelect(p._id)} aria-label={`Select ${p.title}`} /></Td>
      <Td><div className="flex items-center gap-3 min-w-56">
        {img ? <img src={assetUrl(img.url)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover bg-mint shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-mint flex items-center justify-center text-slate/50 shrink-0"><ImageOff size={16} /></div>}
        <div className="min-w-0"><button onClick={() => onView(p._id)} className="block max-w-xs font-medium text-left truncate text-ink">{p.title}</button><p className="text-xs text-slate">{p.sku}{p.variants?.length ? ` · ${p.variants.length} variants` : ""}</p></div>
      </div></Td>
      <Td className="text-slate">{p.category}{p.subCategory && <p className="text-xs">{p.subCategory}</p>}</Td>
      <Td className="text-right">{p.discountPrice > 0 ? <><b>{bdt(p.discountPrice)}</b><p className="text-xs line-through text-slate">{bdt(p.price)}</p></> : <b>{bdt(p.price)}</b>}</Td>
      <Td className="text-right"><StockBadge stock={p.stock} threshold={threshold} /></Td>
      <Td>{writable ? (
        <Select aria-label={`Status of ${p.title}`} value={p.status} disabled={busy} className="h-9 w-32 text-xs font-medium" onChange={(e) => onStatus(p, e.target.value)}>{PRODUCT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
      ) : <Badge tone={PRODUCT_STATUS.find((s) => s.value === p.status)?.tone}>{p.status}</Badge>}</Td>
      <Td><div className="flex justify-end gap-1.5">
        <IconButton label={`View ${p.title}`} onClick={() => onView(p._id)}><Eye size={17} /></IconButton>
        {writable && <Link to={`/products/${p._id}/edit`} aria-label={`Edit ${p.title}`} title="Edit" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-line bg-white text-slate"><Pencil size={16} /></Link>}
        {canDelete && <IconButton label={`Delete ${p.title}`} className="text-red-600" onClick={() => onDelete(p)}><Trash2 size={16} /></IconButton>}
      </div></Td>
    </tr>
  );
});

export default function Products() {
  const toast = useToast(); const qc = useQueryClient(); const { can } = useAuth();
  const [sp] = useSearchParams();
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [category, setCategory] = useState("all");
  const [stock, setStock] = useState(sp.get("stock") || "all"); const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(() => new Set()); const [viewId, setViewId] = useState(null); const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false); const [bulkStatus, setBulkStatus] = useState("");
  const dq = useDebounce(q);

  const params = useMemo(() => ({ q: dq, status, category, stock, sort, page, limit }), [dq, status, category, stock, sort, page, limit]);
  const list = useQuery({ queryKey: ["products", params], queryFn: () => api.products(params), placeholderData: keepPreviousData });
  const meta = useQuery({ queryKey: ["product-meta"], queryFn: api.productMeta, staleTime: 60000 });
  const threshold = meta.data?.data?.lowStockThreshold ?? 5;
  const writable = can("products:write");

  const reset = (fn) => (v) => { fn(v); setPage(1); setSelected(new Set()); };
  const refresh = () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["product-meta"] }); qc.invalidateQueries({ queryKey: ["overview"] }); };

  const statusMut = useMutation({
    mutationFn: ({ p, to }) => api.quickProduct(p._id, { status: to }),
    onMutate: async ({ p, to }) => {
      await qc.cancelQueries({ queryKey: ["products"] });
      const snaps = qc.getQueriesData({ queryKey: ["products"] });
      qc.setQueriesData({ queryKey: ["products"] }, (old) => old && ({ ...old, data: old.data.map((r) => (r._id === p._id ? { ...r, status: to } : r)) }));
      return { snaps };
    },
    onError: (e, _v, ctx) => { ctx?.snaps.forEach(([k, d]) => qc.setQueryData(k, d)); toast.error(e.message); },
    onSuccess: (_r, v) => toast.success(`"${v.p.title}" is now ${v.to}`),
    onSettled: refresh,
  });
  const onStatus = useCallback((p, to) => statusMut.mutate({ p, to }), [statusMut]);

  const deleteMut = useMutation({
    mutationFn: (id) => api.deleteProduct(id),
    onSuccess: () => { toast.success("Product deleted"); setToDelete(null); }, onError: (e) => toast.error(e.message), onSettled: refresh,
  });
  const bulkMut = useMutation({
    mutationFn: (body) => api.bulkProducts({ ids: [...selected], ...body }),
    onSuccess: (r) => { toast.success(r.message); setSelected(new Set()); setBulkConfirm(false); setBulkStatus(""); }, onError: (e) => toast.error(e.message), onSettled: refresh,
  });

  const rows = list.data?.data || [];
  const toggle = useCallback((id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const togglePage = () => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r._id) : n.add(r._id))); return n; });
  const cats = meta.data?.data?.categories || []; const counts = meta.data?.data?.status;

  return (
    <>
      <PageHeader title="Products" subtitle={counts ? `${counts.active} active · ${counts.pending} pending · ${counts.inactive} inactive` : "Manage your catalog"}
        actions={writable && <Link to="/products/new"><Button><Plus size={16} />Add product</Button></Link>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 basis-64 min-w-0"><Search size={16} className="absolute left-3 top-3 text-slate/60" /><Input aria-label="Search products" className="pl-9" placeholder="Search name, SKU, brand or tag" value={q} onChange={(e) => reset(setQ)(e.target.value)} /></div>
          <Select aria-label="Status" className="w-full sm:w-44" value={status} onChange={(e) => reset(setStatus)(e.target.value)}><option value="all">All statuses</option>{PRODUCT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
          <Select aria-label="Category" className="w-full sm:w-44" value={category} onChange={(e) => reset(setCategory)(e.target.value)}><option value="all">All categories</option>{cats.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}</Select>
          <Select aria-label="Stock" className="w-full sm:w-44" value={stock} onChange={(e) => reset(setStock)(e.target.value)}><option value="all">Any stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></Select>
          <Select aria-label="Sort" className="w-full sm:w-44" value={sort} onChange={(e) => reset(setSort)(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A-Z</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="stock_asc">Stock: low to high</option><option value="best_selling">Best selling</option></Select>
        </div>

        {selected.size > 0 && writable && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-forest text-white text-sm" role="region" aria-label="Bulk actions">
            <b>{selected.size} selected</b>
            <Select aria-label="Bulk status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 w-44 text-ink"><option value="">Set status to...</option>{PRODUCT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
            <Button size="sm" disabled={!bulkStatus} loading={bulkMut.isPending && !bulkConfirm} onClick={() => bulkMut.mutate({ action: "status", status: bulkStatus })}>Apply</Button>
            {can("products:delete") && <Button size="sm" variant="danger" onClick={() => setBulkConfirm(true)}><Trash2 size={14} />Delete</Button>}
            <button className="ml-auto flex items-center gap-1 text-white/80" onClick={() => setSelected(new Set())}><X size={15} />Clear</button>
          </div>
        )}

        {list.isLoading ? <TableSkeleton rows={8} cols={7} avatar />
          : list.isError && !list.data ? <ErrorState error={list.error} onRetry={list.refetch} />
          : rows.length === 0 ? <EmptyState title="No products found" text="Try different filters, or add your first product." action={writable && <Link to="/products/new"><Button><Plus size={16} />Add product</Button></Link>} />
          : (
            <div className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
              <table className="w-full text-sm">
                <thead><tr><Th className="w-10"><Checkbox checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></Th><Th>Product</Th><Th>Category</Th><Th className="text-right">Price</Th><Th className="text-right">Stock</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p) => <Row key={p._id} p={p} selected={selected.has(p._id)} onSelect={toggle} onView={setViewId} onStatus={onStatus} onDelete={setToDelete} writable={writable} canDelete={can("products:delete")} threshold={threshold} busy={statusMut.isPending && statusMut.variables?.p._id === p._id} />)}
                </tbody>
              </table>
            </div>
          )}
        <Pagination pagination={list.data?.pagination} onPage={(p) => { setPage(p); setSelected(new Set()); }} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </Card>

      <ProductModal productId={viewId} onClose={() => setViewId(null)} />
      <ConfirmDialog open={!!toDelete} danger title="Delete product?" confirmLabel="Delete" loading={deleteMut.isPending} onClose={() => setToDelete(null)} onConfirm={() => deleteMut.mutate(toDelete._id)}
        message={`"${toDelete?.title}" will be removed from the shop, carts and wishlists. Past orders keep their details. This cannot be undone.`} />
      <ConfirmDialog open={bulkConfirm} danger title={`Delete ${selected.size} products?`} confirmLabel="Delete all" loading={bulkMut.isPending} onClose={() => setBulkConfirm(false)} onConfirm={() => bulkMut.mutate({ action: "delete" })}
        message="The selected products will be permanently removed. This cannot be undone." />
    </>
  );
}
