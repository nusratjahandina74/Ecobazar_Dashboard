export const bdt = (n) => `৳${Math.round(Number(n) || 0).toLocaleString("en-BD")}`;
export const compactBdt = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `৳${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `৳${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `৳${(v / 1000).toFixed(1)}k`;
  return `৳${Math.round(v)}`;
};
export const num = (n) => (Number(n) || 0).toLocaleString("en-BD");
const TZ = "Asia/Dhaka";
export const dateTime = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ }) : "-");
export const dateOnly = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }) : "-");
export const timeAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`;
};
export const fullName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "-" : "-");

// Backend status "Order Placed" is shown to the client as "Pending".
export const ORDER_STATUS = [
  { key: "pending", value: "Order Placed", label: "Pending", tone: "amber" },
  { key: "processing", value: "Processing", label: "Processing", tone: "blue" },
  { key: "shipped", value: "Shipped", label: "Shipped", tone: "violet" },
  { key: "delivered", value: "Delivered", label: "Delivered", tone: "green" },
  { key: "cancelled", value: "Cancelled", label: "Cancelled", tone: "red" },
];
export const orderStatusMeta = (value) => ORDER_STATUS.find((s) => s.value === value || s.key === value) || ORDER_STATUS[0];
export const PRODUCT_STATUS = [
  { value: "active", label: "Active", tone: "green" },
  { value: "pending", label: "Pending", tone: "amber" },
  { value: "inactive", label: "Inactive", tone: "gray" },
];
export const PAYMENT_STATUS_TONE = { Paid: "green", Pending: "amber", Failed: "red", Cancelled: "red", Refunded: "gray" };
export const ZONES = { inside_dhaka: "Inside Dhaka", outside_dhaka: "Outside Dhaka" };
export const PROVIDERS = [{ value: "steadfast", label: "Steadfast" }, { value: "pathao", label: "Pathao" }];

// which forward moves are allowed from a status (mirrors the server state machine)
export const nextStatuses = (value) => {
  const flow = ["Order Placed", "Processing", "Shipped", "Delivered"];
  if (value === "Delivered" || value === "Cancelled") return [];
  const i = flow.indexOf(value);
  return [...flow.slice(i + 1), "Cancelled"];
};
