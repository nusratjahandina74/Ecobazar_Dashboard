import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingBag, Package, Users, Image, MessageSquare, Settings, ShieldCheck, History, LogOut, Menu, X, ExternalLink, Tags, TicketPercent, Star, FileText, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, STORE_URL } from "../lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard:read", end: true },
  { to: "/orders", label: "Orders", icon: ShoppingBag, perm: "orders:read" },
  { to: "/products", label: "Products", icon: Package, perm: "products:read" },
  { to: "/categories", label: "Categories", icon: Tags, perm: "categories:write" },
  { to: "/customers", label: "Customers", icon: Users, perm: "customers:read" },
  { to: "/coupons", label: "Coupons", icon: TicketPercent, perm: "coupons:write" },
  { to: "/reviews", label: "Reviews", icon: Star, perm: "reviews:read", badge: "reviews" },
  { to: "/banners", label: "Banners", icon: Image, perm: "banners:write" },
  { to: "/pages", label: "Pages", icon: FileText, perm: "pages:write" },
  { to: "/messages", label: "Messages", icon: MessageSquare, perm: "messages:read", badge: "messages" },
  { to: "/subscribers", label: "Subscribers", icon: Mail, perm: "subscribers:read" },
  { to: "/settings", label: "Settings", icon: Settings, perm: "settings:read" },
  { to: "/team", label: "Team & roles", icon: ShieldCheck, perm: "team:write" },
  { to: "/activity", label: "Activity log", icon: History, perm: "audit:read" },
];

function Sidebar({ onNavigate, unread, pendingReviews }) {
  const { can, user, logout } = useAuth();
  return (
    <div className="flex flex-col h-full bg-forest text-white">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-white/10">
        <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-lg" />
        <div className="leading-tight"><p className="font-bold">EcoBazaar</p><p className="text-[11px] text-white/60">Admin dashboard</p></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Main">
        {NAV.filter((n) => can(n.perm)).map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-white/15 text-white" : "text-white/70"}`}>
            <Icon size={18} /><span className="flex-1">{label}</span>
            {(() => { const n = badge === "reviews" ? pendingReviews : badge ? unread : 0; return n > 0 ? <span className="rounded-full bg-leaf px-2 py-0.5 text-[11px] font-bold">{n}</span> : null; })()}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <a href={STORE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70"><ExternalLink size={16} /> View store</a>
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-leaf flex items-center justify-center text-sm font-bold">{(user?.firstName || user?.email || "A")[0].toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{user?.firstName || user?.email}</p><p className="text-xs text-white/60 capitalize">{user?.role}</p></div>
          <button onClick={logout} aria-label="Sign out" title="Sign out" className="p-1.5 text-white/70"><LogOut size={17} /></button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();
  const location = useLocation();
  const { data } = useQuery({ queryKey: ["messages-unread"], queryFn: () => api.messages({ limit: 1, unread: "true" }), enabled: can("messages:read"), refetchInterval: 60000, staleTime: 30000 });
  const { data: rv } = useQuery({ queryKey: ["reviews-pending"], queryFn: () => api.reviews({ limit: 1, status: "pending" }), enabled: can("reviews:read"), refetchInterval: 60000, staleTime: 30000 });
  const unread = data?.unread || 0; const pendingReviews = rv?.pending || 0;

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30"><Sidebar unread={unread} pendingReviews={pendingReviews} /></aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-forest/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="relative w-72 max-w-[85vw]"><Sidebar unread={unread} pendingReviews={pendingReviews} onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-4 right-3 text-white/80"><X size={20} /></button>
          </aside>
        </div>
      )}
      <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 bg-white border-b border-line">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1.5 -ml-1.5"><Menu size={22} /></button>
        <img src="/favicon.svg" alt="" className="w-7 h-7 rounded-md" /><span className="font-bold">EcoBazaar Admin</span>
      </header>
      <main key={location.pathname.split("/")[1]} className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1500px] mx-auto"><Outlet /></main>
    </div>
  );
}
