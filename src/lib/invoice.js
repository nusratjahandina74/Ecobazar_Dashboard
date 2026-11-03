import { api } from "./api";
import { bdt, dateTime, ZONES } from "./format";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const invoiceHtml = (o, store) => {
  const a = o.shippingAddress || {};
  const cod = o.paymentMethod === "cod" && o.paymentStatus !== "Paid";
  return `<section class="inv">
  <header><div><h1>${esc(store?.name || "EcoBazaar")}</h1><p>${esc([store?.address, store?.phone, store?.email].filter(Boolean).join(" | "))}</p></div>
  <div class="r"><h2>INVOICE</h2><p><b>${esc(o.orderNumber || o._id)}</b></p><p>${esc(dateTime(o.createdAt))}</p></div></header>
  <div class="grid"><div><h3>Bill / ship to</h3><p><b>${esc(a.name)}</b></p><p>${esc(a.phone)}</p><p>${esc([a.address1, a.address2 && a.address2 !== "N/A" ? a.address2 : "", a.city, a.postcode].filter(Boolean).join(", "))}</p></div>
  <div class="r"><h3>Payment</h3><p>${o.paymentMethod === "cod" ? "Cash on delivery" : "Online payment"} - ${esc(o.paymentStatus)}</p><p>${esc(ZONES[o.deliveryZone] || "")}</p>${o.courier?.trackingCode ? `<p>Courier: ${esc(o.courier.provider)} ${esc(o.courier.trackingCode)}</p>` : ""}</div></div>
  <table><thead><tr><th>Item</th><th class="n">Price</th><th class="n">Qty</th><th class="n">Total</th></tr></thead><tbody>
  ${o.products.map((p) => `<tr><td>${esc(p.title)}${p.variantLabel ? ` <small>(${esc(p.variantLabel)})</small>` : ""}${p.sku ? `<br><small>SKU ${esc(p.sku)}</small>` : ""}</td><td class="n">${bdt(p.price)}</td><td class="n">${p.quantity}</td><td class="n">${bdt(p.totalPrice)}</td></tr>`).join("")}
  </tbody></table>
  <table class="sum"><tr><td>Subtotal</td><td class="n">${bdt(o.subtotal ?? o.totalAmount)}</td></tr>${o.discountAmount > 0 ? `<tr><td>Coupon ${esc(o.couponCode)}</td><td class="n">-${bdt(o.discountAmount)}</td></tr>` : ""}<tr><td>Delivery charge</td><td class="n">${bdt(o.deliveryCharge)}</td></tr><tr class="t"><td>Total</td><td class="n">${bdt(o.totalAmount)}</td></tr>${cod ? `<tr class="t"><td>Collect in cash</td><td class="n">${bdt(o.totalAmount)}</td></tr>` : ""}</table>
  <p class="foot">Thank you for shopping with ${esc(store?.name || "EcoBazaar")}.</p></section>`;
};

const CSS = `*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#14221a;margin:0;font-size:13px}
.inv{padding:28px 32px;page-break-after:always;max-width:780px;margin:0 auto}.inv:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;border-bottom:2px solid #14221a;padding-bottom:12px;margin-bottom:16px}
h1{margin:0;font-size:22px}h2{margin:0;font-size:20px;letter-spacing:.08em}h3{margin:0 0 4px;font-size:12px;color:#5b6b61}p{margin:2px 0}.r{text-align:right}
.grid{display:flex;justify-content:space-between;gap:24px;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-bottom:12px}
th,td{padding:8px 6px;border-bottom:1px solid #dfe7e1;text-align:left;vertical-align:top}th{font-size:11px;color:#5b6b61;background:#f6f8f6}.n{text-align:right}small{color:#5b6b61}
.sum{width:50%;margin-left:auto}.sum .t td{font-weight:700;font-size:15px;border-top:2px solid #14221a}.foot{text-align:center;color:#5b6b61;margin-top:24px}
@page{size:A5 portrait;margin:8mm}@media print{.inv{padding:0}}`;

/** Fetch up to 100 orders and open the browser print dialog (one invoice per page). */
export async function printInvoices(ids) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Pop-up blocked. Allow pop-ups for this site to print invoices.");
  win.document.write("<p style='font-family:sans-serif;padding:24px'>Preparing invoices...</p>");
  try {
    const { data } = await api.invoices(ids);
    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoices (${data.orders.length})</title><style>${CSS}</style></head><body>${data.orders.map((o) => invoiceHtml(o, data.store)).join("")}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  } catch (e) { win.close(); throw e; }
}
