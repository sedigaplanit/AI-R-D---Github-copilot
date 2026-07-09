import React, { createContext, useState, useEffect } from "react";
import api from "../api/apiClient";

// Create Context
const AuthContext = createContext();

// AuthProvider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // true while checking session on mount

  // Restore session from the server cookie on every app load
  useEffect(() => {
    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  // Called after a successful API login/signup with the returned user object
  const login = (userData) => setUser(userData);

  // Called after a successful API logout
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
