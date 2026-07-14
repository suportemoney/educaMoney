import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, type Papel, type User } from "../api/client";

const ACCESS_KEY = "em_admin_access";
const REFRESH_KEY = "em_admin_refresh";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  access: string | null;
};

const AuthContext = createContext<AuthCtx | null>(null);

function podeAcessarPainel(papel: Papel, isSuper: boolean) {
  return isSuper || papel !== "aluno";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(
    localStorage.getItem(ACCESS_KEY)
  );
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (token: string) => {
    const me = await apiRequest<User>("/auth/me/", { token });
    if (!podeAcessarPainel(me.papel, me.is_superuser)) {
      throw new Error("Sem permissão para o painel.");
    }
    setUser(me);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    loadMe(token)
      .catch(() => {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setAccess(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [loadMe]);

  const login = useCallback(
    async (username: string, password: string) => {
      const tokens = await apiRequest<{ access: string; refresh: string }>(
        "/auth/login/",
        { method: "POST", body: { username, password } }
      );
      localStorage.setItem(ACCESS_KEY, tokens.access);
      localStorage.setItem(REFRESH_KEY, tokens.refresh);
      setAccess(tokens.access);
      try {
        await loadMe(tokens.access);
      } catch (e) {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setAccess(null);
        throw e;
      }
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (token && refresh) {
      try {
        await apiRequest("/auth/logout/", {
          method: "POST",
          token,
          body: { refresh },
        });
      } catch {
        /* limpa local mesmo se falhar */
      }
    }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setAccess(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, access }),
    [user, loading, login, logout, access]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
