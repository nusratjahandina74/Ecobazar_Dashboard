import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { PageLoader, SplashScreen, EmptyState } from "./components/ui";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const Customers = lazy(() => import("./pages/Customers"));
const Banners = lazy(() => import("./pages/Banners"));
const Messages = lazy(() => import("./pages/Messages"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Categories = lazy(() => import("./pages/Categories"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Pages = lazy(() => import("./pages/Pages"));
const Subscribers = lazy(() => import("./pages/Subscribers"));
const Team = lazy(() => import("./pages/Team"));
const Activity = lazy(() => import("./pages/Activity"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } },
});

function Protected() {
  const { user, booting } = useAuth();
  if (booting) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}
function Guard({ perm, children }) {
  const { can } = useAuth();
  return can(perm) ? children : <EmptyState title="No access" text="Your role does not allow this page. Ask an admin to change your role." />;
}
const page = (perm, el) => <Guard perm={perm}><Suspense fallback={<PageLoader />}>{el}</Suspense></Guard>;

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <Protected />,
    children: [
      { index: true, element: page("dashboard:read", <Dashboard />) },
      { path: "orders", element: page("orders:read", <Orders />) },
      { path: "products", element: page("products:read", <Products />) },
      { path: "products/new", element: page("products:write", <ProductForm />) },
      { path: "products/:id/edit", element: page("products:write", <ProductForm />) },
      { path: "customers", element: page("customers:read", <Customers />) },
      { path: "banners", element: page("banners:write", <Banners />) },
      { path: "messages", element: page("messages:read", <Messages />) },
      { path: "settings", element: page("settings:read", <SettingsPage />) },
      { path: "categories", element: page("categories:write", <Categories />) },
      { path: "coupons", element: page("coupons:write", <Coupons />) },
      { path: "reviews", element: page("reviews:read", <Reviews />) },
      { path: "pages", element: page("pages:write", <Pages />) },
      { path: "subscribers", element: page("subscribers:read", <Subscribers />) },
      { path: "team", element: page("team:write", <Team />) },
      { path: "activity", element: page("audit:read", <Activity />) },
      { path: "*", element: <EmptyState title="Page not found" /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ToastProvider>
    </QueryClientProvider>
  );
}
