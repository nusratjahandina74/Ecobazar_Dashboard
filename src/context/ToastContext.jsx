import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastCtx = createContext(null);
let uid = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = ++uid;
    setItems((l) => [...l.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === "error" ? 6000 : 3500);
  }, [dismiss]);
  const api = useMemo(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed z-[100] pointer-events-none top-[max(0.75rem,env(safe-area-inset-top))] sm:top-auto inset-x-3 sm:inset-x-auto sm:bottom-4 sm:right-4 flex flex-col gap-2 sm:w-96" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role={t.type === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg bg-white pointer-events-auto ${t.type === "error" ? "border-red-200 text-red-700" : "border-leaf/30 text-forest"}`}>
            {t.type === "error" ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-leaf" />}
            <span className="flex-1 min-w-0 [overflow-wrap:anywhere]">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-slate p-1 -m-1"><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastCtx);
