import React, { createContext, useState } from "react";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // Restore user from localStorage on mount (JWT-backed, works across refreshes)
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; }
    catch { return null; }
  });

  // Called after a successful API login/signup — persists both user and token
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("jwt_token", token);
  };

  // Called on logout — clears everything from localStorage
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("jwt_token");
  };

  // Called after profile update — refreshes local user + token
  const updateUser = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    if (token) localStorage.setItem("jwt_token", token);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
