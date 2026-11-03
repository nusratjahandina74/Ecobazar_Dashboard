import axios from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://ecobazar-backend-1x13.onrender.com").replace(/\/+$/, "");
export const STORE_URL = (import.meta.env.VITE_STORE_URL || "https://ecobazar-bd.vercel.app").replace(/\/+$/, "");
const TOKEN_KEY = "ecobazar_admin_token";

export const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status = 0, data = null) { super(message); this.status = status; this.data = data; }
}

const http = axios.create({ baseURL: API_BASE_URL, timeout: 45000 }); // Render free tier can take ~30s to wake up

http.interceptors.request.use((c) => { const t = token.get(); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response) {
      const { status, data } = err.response;
      if (status === 401 && token.get() && onUnauthorized) onUnauthorized();
      return Promise.reject(new ApiError((data && data.message) || `Request failed (${status})`, status, data));
    }
    if (err.code === "ECONNABORTED") return Promise.reject(new ApiError("The server took too long to respond. It may be waking up - try again in a few seconds."));
    return Promise.reject(new ApiError("Cannot reach the server. Check your internet connection."));
  }
);

const clean = (o = {}) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"));
const get = (url, params) => http.get(url, { params: clean(params) }).then((r) => r.data);
const send = (method) => (url, body, config) => http[method](url, body, config).then((r) => r.data);
const post = send("post"), put = send("put"), patch = send("patch");
const del = (url) => http.delete(url).then((r) => r.data);

export const api = {
  login: (email, password) => post("/login", { email, password }),
  me: () => get("/me"),
  permissions: () => get("/admin/me/permissions"),

  overview: (p) => get("/admin/analytics/overview", p),
  sales: (p) => get("/admin/analytics/sales", p),
  topProducts: (p) => get("/admin/analytics/top-products", p),
  recentOrders: () => get("/admin/analytics/recent-orders"),

  products: (p) => get("/admin/products", p),
  productMeta: () => get("/admin/products/meta"),
  product: (id) => get(`/admin/products/${id}`),
  createProduct: (fd) => post("/admin/products", fd),
  updateProduct: (id, fd) => put(`/admin/products/${id}`, fd),
  quickProduct: (id, body) => patch(`/admin/products/${id}/quick`, body),
  bulkProducts: (body) => post("/admin/products/bulk", body),
  deleteProduct: (id) => del(`/admin/products/${id}`),

  orders: (p) => get("/admin/orders", p),
  orderCounts: (p) => get("/admin/orders/counts", p),
  order: (id) => get(`/admin/orders/${id}`),
  setOrderStatus: (id, status, note) => patch(`/admin/orders/${id}/status`, { status, note }),
  updateOrder: (id, body) => patch(`/admin/orders/${id}`, body),
  bulkOrderStatus: (ids, status) => post("/admin/orders/bulk/status", { ids, status }),
  sendCourier: (id, provider) => post(`/admin/orders/${id}/courier`, { provider }),
  bulkCourier: (ids, provider) => post("/admin/orders/bulk/courier", { ids, provider }),
  manualTracking: (id, trackingCode) => post(`/admin/orders/${id}/courier/manual`, { trackingCode }),
  syncCourier: (id) => post(`/admin/orders/${id}/courier/sync`),
  invoices: (ids) => get("/admin/orders/invoices", { ids: ids.join(",") }),
  exportUrl: (p) => `${API_BASE_URL}/admin/orders/export?${new URLSearchParams(clean(p)).toString()}`,
  downloadOrders: (p) => http.get("/admin/orders/export", { params: clean(p), responseType: "blob" }).then((r) => r.data),

  users: (p) => get("/admin/users", p),
  createTeamMember: (body) => post("/admin/users", body),
  updateUser: (id, body) => patch(`/admin/users/${id}`, body),

  settings: () => get("/admin/settings"),
  saveSettings: (section, body) => put(`/admin/settings/${section}`, body),
  uploadLogo: (file) => { const fd = new FormData(); fd.append("logo", file); return post("/admin/uploads/logo", fd); },

  banners: () => get("/admin/banners"),
  saveBanner: (id, fd) => (id ? put(`/admin/banners/${id}`, fd) : post("/admin/banners", fd)),
  deleteBanner: (id) => del(`/admin/banners/${id}`),

  messages: (p) => get("/admin/messages", p),
  updateMessage: (id, body) => patch(`/admin/messages/${id}`, body),
  deleteMessage: (id) => del(`/admin/messages/${id}`),
  audit: (p) => get("/admin/audit", p),

  categories: () => get("/admin/categories"),
  saveCategory: (id, fd) => (id ? put(`/admin/categories/${id}`, fd) : post("/admin/categories", fd)),
  deleteCategory: (id) => del(`/admin/categories/${id}`),
  importCategories: () => post("/admin/categories/import"),
  coupons: (p) => get("/admin/coupons", p),
  saveCoupon: (id, body) => (id ? put(`/admin/coupons/${id}`, body) : post("/admin/coupons", body)),
  deleteCoupon: (id) => del(`/admin/coupons/${id}`),
  reviews: (p) => get("/admin/reviews", p),
  updateReview: (id, body) => patch(`/admin/reviews/${id}`, body),
  deleteReview: (id) => del(`/admin/reviews/${id}`),
  pages: () => get("/admin/pages"),
  page: (id) => get(`/admin/pages/${id}`),
  savePage: (id, body) => (id ? put(`/admin/pages/${id}`, body) : post("/admin/pages", body)),
  deletePage: (id) => del(`/admin/pages/${id}`),
  subscribers: (p) => get("/admin/subscribers", p),
  deleteSubscriber: (id) => del(`/admin/subscribers/${id}`),
  downloadSubscribers: () => http.get("/admin/subscribers/export", { responseType: "blob" }).then((r) => r.data),
};

export const assetUrl = (u) => (!u ? "" : /^(https?:|data:|blob:)/i.test(u) ? u : `${API_BASE_URL}/${String(u).replace(/^\/+/, "")}`);
