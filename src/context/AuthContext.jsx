import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, token, setUnauthorizedHandler } from "../lib/api";

const AuthCtx = createContext(null);
const TEAM_ROLES = ["admin", "manager", "staff", "editor", "vendor"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [booting, setBooting] = useState(() => !!token.get());

  const logout = useCallback(() => { token.clear(); setUser(null); setPermissions([]); }, []);
  useEffect(() => { setUnauthorizedHandler(logout); return () => setUnauthorizedHandler(null); }, [logout]);

  const loadSession = useCallback(async () => {
    const [{ user: me }, p] = await Promise.all([api.me().then((r) => ({ user: r.user || r.data || r })), api.permissions()]);
    if (!TEAM_ROLES.includes(me.role)) throw new Error("This account does not have dashboard access.");
    setUser(me); setPermissions(p.data.permissions);
  }, []);

  useEffect(() => {
    if (!token.get()) return;
    loadSession().catch(() => token.clear()).finally(() => setBooting(false));
  }, [loadSession]);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    if (!TEAM_ROLES.includes(res.user.role)) throw new Error("This account does not have dashboard access.");
    token.set(res.accessToken);
    try { await loadSession(); } catch (e) { token.clear(); throw e; }
  }, [loadSession]);

  const can = useCallback((perm) => permissions.includes("*") || permissions.includes(perm), [permissions]);
  const value = useMemo(() => ({ user, booting, login, logout, can }), [user, booting, login, logout, can]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
