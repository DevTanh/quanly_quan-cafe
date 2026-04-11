import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';
import api from '../api/api';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // loading = true để chờ verify session
  const [loading, setLoading] = useState(true);

  // ✅ Logout
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // ignore lỗi
    } finally {
      setUser(null);
    }
  }, []);

  // ✅ Verify session khi reload trang
  useEffect(() => {
    const verifySession = async () => {
      try {
        // Cookie sẽ tự được gửi kèm request
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        // Không có cookie hoặc token hết hạn
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  // ✅ Lắng nghe logout từ interceptor (refresh fail)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  // ✅ Login
  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });

    // Backend đã set cookie → chỉ cần lưu user vào state
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook dùng cho toàn app
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
