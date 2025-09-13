/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthState = {
  token: string | null;
  setToken: (t: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("adm_token")
  );

  useEffect(() => {
    if (token) localStorage.setItem("adm_token", token);
    else localStorage.removeItem("adm_token");
  }, [token]);

  const logout = () => setToken(null);

  const value = useMemo(
    () => ({ token, setToken, isAuthenticated: Boolean(token), logout }),
    [token]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
