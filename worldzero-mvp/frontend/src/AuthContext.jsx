import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, logout as apiLogout, loginUrl } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((data) => {
        setAccount(data);
        setCharacter(data.character || null);
      })
      .catch(() => {
        setAccount(null);
        setCharacter(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = loginUrl();
  };

  const logout = async () => {
    await apiLogout();
    setAccount(null);
    setCharacter(null);
    window.location.href = "/";
  };

  const refreshAuth = async () => {
    try {
      const data = await fetchMe();
      setAccount(data);
      setCharacter(data.character || null);
    } catch (_) {
      setAccount(null);
      setCharacter(null);
    }
  };

  return (
    <AuthContext.Provider value={{ account, character, loading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
