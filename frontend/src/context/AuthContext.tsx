import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, type User } from "../api/client";

const ACCESS_KEY = "em_access";
const REFRESH_KEY = "em_refresh";

type AuthContextValue = {
  user: User | null;
  access: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    first_name: string;
    password: string;
    password_confirm: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredTokens() {
  return {
    access: localStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(() => getStoredTokens().access);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (token: string) => {
    const me = await apiRequest<User>("/auth/me/", { token });
    setUser(me);
    setAccess(token);
  }, []);

  useEffect(() => {
    const { access: token } = getStoredTokens();
    if (!token) {
      setLoading(false);
      return;
    }
    loadMe(token)
      .catch(() => {
        clearTokens();
        setUser(null);
        setAccess(null);
      })
      .finally(() => setLoading(false));
  }, [loadMe]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await apiRequest<{ access: string; refresh: string }>(
        "/auth/login/",
        { method: "POST", body: { username, password } }
      );
      saveTokens(data.access, data.refresh);
      await loadMe(data.access);
    },
    [loadMe]
  );

  const register = useCallback(
    async (payload: {
      username: string;
      email: string;
      first_name: string;
      password: string;
      password_confirm: string;
    }) => {
      const data = await apiRequest<{
        user: User;
        access: string;
        refresh: string;
      }>("/auth/register/", { method: "POST", body: payload });
      saveTokens(data.access, data.refresh);
      setUser(data.user);
      setAccess(data.access);
    },
    []
  );

  const logout = useCallback(async () => {
    const { access: token, refresh } = getStoredTokens();
    if (token && refresh) {
      try {
        await apiRequest("/auth/logout/", {
          method: "POST",
          token,
          body: { refresh },
        });
      } catch {
        // Limpa sessão local mesmo se a blacklist falhar
      }
    }
    clearTokens();
    setUser(null);
    setAccess(null);
  }, []);

  const value = useMemo(
    () => ({ user, access, loading, login, register, logout }),
    [user, access, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
