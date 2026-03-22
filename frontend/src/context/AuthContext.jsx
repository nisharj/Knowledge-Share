import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("kh_token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("kh_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });

    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem("kh_token", response.data.token);
    localStorage.setItem("kh_user", JSON.stringify(response.data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("kh_token");
    localStorage.removeItem("kh_user");
    setAuthToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
