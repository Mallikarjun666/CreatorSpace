// frontend/src/context/AuthContext.jsx
// Holds the logged-in user for the whole app.
// - On page load: if a token is saved, asks the backend (/auth/me) who it belongs to
// - Provides login(), signup(), logout() to any component via useAuth()

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true while we are checking a saved token; pages should wait before redirecting
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  // Restore the session after a refresh
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        // expired or invalid token
        setToken(null);
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // api.js fires this when any request comes back 401 while logged in
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  // data = { name, email, password, role, company?, tools? }
  const signup = useCallback(async (data) => {
    const res = await api.signup(data);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}