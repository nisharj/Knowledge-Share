import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../services/api";

const TOKEN_KEY = "kh_token";
const USER_KEY = "kh_user";

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (_error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(getStoredUser);
  const [authReady, setAuthReady] = useState(false);

  const persistAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthToken(null);
  };

  useEffect(() => {
    setAuthToken(token);

    const syncAuth = async () => {
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const nextUser = response.data.user;
        setUser(nextUser);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      } catch (_error) {
        clearAuth();
      } finally {
        setAuthReady(true);
      }
    };

    syncAuth();
  }, [token]);

  const register = async (name, email, password) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    persistAuth(response.data.token, response.data.user);
    return response.data.user;
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });

    persistAuth(response.data.token, response.data.user);
    return response.data.user;
  };

  const logout = () => {
    clearAuth();
  };

  const refreshUser = async () => {
    const response = await api.get("/auth/me");
    setUser(response.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    return response.data.user;
  };

  const toggleBookmark = async (resourceId) => {
    const response = await api.post(`/auth/bookmarks/${resourceId}`);
    setUser(response.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    return response.data;
  };

  const value = useMemo(
    () => ({
      token,
      user,
      authReady,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === "admin",
      register,
      login,
      logout,
      refreshUser,
      toggleBookmark,
    }),
    [authReady, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
