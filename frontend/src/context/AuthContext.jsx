import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('dv_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authAPI.me();
      setUser(data);
    } catch (err) {
      // Chỉ xoá token khi server trả 401 (token hết hạn / không hợp lệ)
      // Không xoá khi lỗi mạng hoặc lỗi server (500)
      if (err.response?.status === 401) {
        localStorage.removeItem('dv_token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('dv_token', data.token);
    setUser(data.user);
    setLoading(false); // đảm bảo loading = false ngay sau login
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('dv_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useIsAdmin = () => useContext(AuthContext)?.user?.role === 'admin';
export const useIsEditor = () => ['admin','editor'].includes(useContext(AuthContext)?.user?.role);
