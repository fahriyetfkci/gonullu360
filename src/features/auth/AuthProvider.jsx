import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearAccessToken,
  getCurrentUser,
  loginWithPassword,
  logoutSession,
  refreshSession
} from "./services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  const establishUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "ADMIN") {
      throw Object.assign(new Error("Admin role required"), { response: { status: 403 } });
    }
    setUser(currentUser);
    setStatus("authenticated");
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        await refreshSession();
        const currentUser = await getCurrentUser();
        if (!active) return;
        if (currentUser?.role !== "ADMIN") throw new Error("Admin role required");
        setUser(currentUser);
        setStatus("authenticated");
      } catch {
        if (!active) return;
        clearAccessToken();
        setUser(null);
        setStatus("anonymous");
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function expireSession() {
      setUser(null);
      setStatus("anonymous");
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
  }, []);

  const login = useCallback(async (email, password) => {
    await loginWithPassword(email, password);
    try {
      return await establishUser();
    } catch (error) {
      await logoutSession().catch(() => undefined);
      throw error;
    }
  }, [establishUser]);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      setUser(null);
      setStatus("anonymous");
      window.location.hash = "";
    }
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
