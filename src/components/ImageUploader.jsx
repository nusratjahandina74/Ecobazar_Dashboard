import { useEffect, useRef, useState } from "react";
import { ImagePlus, Star, X, UploadCloud } from "lucide-react";

const MAX = 5; const MAX_MB = 5;
let seq = 0;

/**
 * items: [{ id, url, file?, existing? }]  - first item flagged `isMain` is the cover.
 * Controlled by the parent so the form can submit new files + removed urls + main image.
 */
export default function ImageUploader({ items, onChange, error }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false); const [msg, setMsg] = useState("");
  const urls = useRef(new Set());
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const add = (fileList) => {
    setMsg("");
    const incoming = [...fileList];
    const room = MAX - items.length;
    const ok = []; let problem = "";
    for (const f of incoming) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { problem = "Only JPG, PNG, WEBP or GIF images are allowed."; continue; }
      if (f.size > MAX_MB * 1024 * 1024) { problem = `"${f.name}" is bigger than ${MAX_MB} MB.`; continue; }
      ok.push(f);
    }
    if (ok.length > room) problem = `You can add up to ${MAX} images.`;
    const next = ok.slice(0, Math.max(0, room)).map((file) => { const url = URL.createObjectURL(file); urls.current.add(url); return { id: `n${++seq}`, url, file, isMain: false }; });
    const merged = [...items, ...next];
    if (merged.length && !merged.some((i) => i.isMain)) merged[0] = { ...merged[0], isMain: true };
    onChange(merged);
    if (problem) setMsg(problem);
  };
  const remove = (id) => {
    const rest = items.filter((i) => i.id !== id);
    if (rest.length && !rest.some((i) => i.isMain)) rest[0] = { ...rest[0], isMain: true };
    onChange(rest);
  };
  const makeMain = (id) => onChange(items.map((i) => ({ ...i, isMain: i.id === id })));

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed p-4 sm:p-5 ${drag ? "border-leaf bg-mint" : error ? "border-red-300" : "border-line bg-canvas"}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map((i) => (
            <div key={i.id} className={`relative aspect-square rounded-lg overflow-hidden bg-white border-2 ${i.isMain ? "border-leaf" : "border-line"}`}>
              <img src={i.url} alt="" className="w-full h-full object-cover" />
              {i.isMain && <span className="absolute left-1.5 top-1.5 rounded-full bg-leaf px-2 py-0.5 text-[11px] font-semibold text-white">Cover</span>}
              <button type="button" onClick={() => remove(i.id)} aria-label="Remove image" className="absolute right-1.5 top-1.5 w-7 h-7 rounded-full bg-white/95 text-red-600 shadow flex items-center justify-center"><X size={15} /></button>
              {!i.isMain && <button type="button" onClick={() => makeMain(i.id)} className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1 rounded-md bg-white/95 py-1 text-xs font-medium text-ink shadow"><Star size={12} />Make cover</button>}
            </div>
          ))}
          {items.length < MAX && (
            <button type="button" onClick={() => input.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-leaf/40 bg-white flex flex-col items-center justify-center gap-1.5 text-leaf-dark">
              {items.length ? <ImagePlus size={22} /> : <UploadCloud size={26} />}
              <span className="text-xs font-semibold">{items.length ? "Add more" : "Upload images"}</span>
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        <p className="mt-3 text-xs text-slate">Drag photos here or click upload. Up to {MAX} images, {MAX_MB} MB each (JPG, PNG, WEBP). The cover image is shown first in the shop.</p>
      </div>
      {(msg || error) && <p role="alert" className="mt-2 text-xs text-red-600">{msg || error}</p>}
    </div>
  );
}
