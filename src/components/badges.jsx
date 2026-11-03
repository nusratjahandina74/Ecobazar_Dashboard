import { Badge } from "./ui";
import { orderStatusMeta, PAYMENT_STATUS_TONE, PRODUCT_STATUS } from "../lib/format";

export const OrderStatusBadge = ({ status }) => { const m = orderStatusMeta(status); return <Badge tone={m.tone}>{m.label}</Badge>; };
export const PaymentBadge = ({ status }) => <Badge tone={PAYMENT_STATUS_TONE[status] || "gray"}>{status}</Badge>;
export const ProductStatusBadge = ({ status }) => { const m = PRODUCT_STATUS.find((s) => s.value === status) || PRODUCT_STATUS[1]; return <Badge tone={m.tone}>{m.label}</Badge>; };
export const MethodBadge = ({ method }) => <Badge tone={method === "cod" ? "green" : "blue"}>{method === "cod" ? "Cash on delivery" : "Online"}</Badge>;
