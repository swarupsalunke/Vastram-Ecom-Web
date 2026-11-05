import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vastram_user") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("vastram_token")));
  useEffect(() => {
    if (!localStorage.getItem("vastram_token")) { setLoading(false); return; }
    api.get("/auth/me").then(({ data }) => {
      setUser(data.user); localStorage.setItem("vastram_user", JSON.stringify(data.user));
    }).catch(() => { localStorage.removeItem("vastram_token"); localStorage.removeItem("vastram_user"); setUser(null); })
      .finally(() => setLoading(false));
  }, []);
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("vastram_token", data.token);
    localStorage.setItem("vastram_user", JSON.stringify(data.user));
    setUser(data.user); return data.user;
  };
  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("vastram_token", data.token);
    localStorage.setItem("vastram_user", JSON.stringify(data.user));
    setUser(data.user); return data.user;
  };
  const logout = () => {
    localStorage.removeItem("vastram_token"); localStorage.removeItem("vastram_user"); setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
