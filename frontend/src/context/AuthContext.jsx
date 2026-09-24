import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("fln_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("fln_access_token");
      if (token) {
        try {
          const res = await api.get("/auth/me");
          if (res.data.status === "success") {
            setUser(res.data.user);
            localStorage.setItem("fln_user", JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (usernameOrEmail, password) => {
    const res = await api.post("/auth/login", {
      username: usernameOrEmail,
      password,
    });

    if (res.data.status === "success") {
      const { user, access_token, refresh_token } = res.data;
      localStorage.setItem("fln_access_token", access_token);
      localStorage.setItem("fln_refresh_token", refresh_token);
      localStorage.setItem("fln_user", JSON.stringify(user));
      setUser(user);
      return user;
    }
    throw new Error(res.data.error || "Login failed");
  };

  const logout = async () => {
    try {
      if (localStorage.getItem("fln_access_token")) {
        await api.post("/auth/logout");
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("fln_access_token");
      localStorage.removeItem("fln_refresh_token");
      localStorage.removeItem("fln_user");
      setUser(null);
    }
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
