// If any <img> fails to load (deleted upload, wiped Render disk, bad URL) show a neutral placeholder
// instead of the browser's broken-image icon. Runs once for the whole app.
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#eef3ef"/>' +
  '<g fill="none" stroke="#9db0a4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="30" y="34" width="60" height="52" rx="7"/><circle cx="48" cy="52" r="5"/><path d="M33 80l19-18 13 12 10-8 12 12"/></g></svg>'
);

if (typeof window !== "undefined" && !window.__imgFallback) {
  window.__imgFallback = true;
  window.addEventListener("error", (e) => {
    const el = e.target;
    if (el && el.tagName === "IMG" && !el.dataset.fallback && el.src !== PLACEHOLDER) {
      el.dataset.fallback = "1";
      el.removeAttribute("srcset");
      el.src = PLACEHOLDER;
    }
  }, true);
}
export { PLACEHOLDER };
