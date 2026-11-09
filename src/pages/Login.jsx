import { useState } from "react";
import { Navigate } from "react-router";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Input } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true); setError("");
    try { await login(email.trim(), password); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-forest text-white p-12">
        <div className="flex items-center gap-3"><img src="/favicon.svg" alt="" className="w-10 h-10 rounded-xl" /><span className="text-xl font-bold">EcoBazaar</span></div>
        <div>
          <h1 className="text-4xl font-bold leading-tight max-w-md">Manage Your Whole Business from One Central Hub.</h1>
          <p className="mt-4 text-white/70 max-w-md">A powerful all-in-one platform to manage orders, inventory, courier tracking, and business analytics seamlessly.</p>
        </div>
        <p className="text-sm text-white/50">Admin access only</p>
      </div>
      <div className="flex items-center justify-center px-5 py-12 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" noValidate>
          <div className="lg:hidden flex items-center gap-3 mb-2"><img src="/favicon.svg" alt="" className="w-10 h-10 rounded-xl" /><span className="text-xl font-bold">EcoBazaar <span className="font-medium text-slate">Admin</span></span></div>
          <div><h2 className="text-2xl font-bold">Sign in</h2><p className="text-sm text-slate mt-1">Use your admin, manager or staff account.</p></div>
          <Field label="Email">{(id) => (
            <div className="relative"><Mail size={16} className="absolute left-3 top-3 text-slate/60" /><Input id={id} type="email" autoComplete="username" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          )}</Field>
          <Field label="Password">{(id) => (
            <div className="relative"><Lock size={16} className="absolute left-3 top-3 text-slate/60" />
              <Input id={id} type={show ? "text" : "password"} autoComplete="current-password" className="pl-9 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-2.5 text-slate">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
          )}</Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
          {busy && <p className="text-xs text-slate text-center">The server may take up to 30 seconds to wake up.</p>}
        </form>
      </div>
    </div>
  );
}
