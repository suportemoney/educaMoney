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

const ACCESS_KEY = "em_aluno_access";
const REFRESH_KEY = "em_aluno_refresh";

type AuthContextValue = {
  user: User | null;
  access: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  consumeHandoff: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

function isAluno(user: User): boolean {
  return user.papel === "aluno" && !user.is_superuser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | null>(() => getStoredTokens().access);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (token: string, me?: User) => {
    const userData = me || (await apiRequest<User>("/auth/me/", { token }));
    if (!isAluno(userData)) {
      clearTokens();
      setUser(null);
      setAccess(null);
      throw new Error("Portal restrito a alunos.");
    }
    setUser(userData);
    setAccess(token);
  }, []);

  useEffect(() => {
    const { access: token } = getStoredTokens();
    if (!token) {
      setLoading(false);
      return;
    }
    applySession(token)
      .catch(() => {
        clearTokens();
        setUser(null);
        setAccess(null);
      })
      .finally(() => setLoading(false));
  }, [applySession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await apiRequest<{ access: string; refresh: string }>(
        "/auth/login/",
        { method: "POST", body: { username, password } }
      );
      saveTokens(data.access, data.refresh);
      await applySession(data.access);
    },
    [applySession]
  );

  const consumeHandoff = useCallback(
    async (code: string) => {
      const data = await apiRequest<{
        access: string;
        refresh: string;
        user: User;
      }>("/auth/portal-handoff/consume/", {
        method: "POST",
        body: { code },
      });
      saveTokens(data.access, data.refresh);
      await applySession(data.access, data.user);
    },
    [applySession]
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
        /* limpa local mesmo assim */
      }
    }
    clearTokens();
    setUser(null);
    setAccess(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { access: token } = getStoredTokens();
    if (!token) return;
    await applySession(token);
  }, [applySession]);

  const value = useMemo(
    () => ({ user, access, loading, login, consumeHandoff, logout, refreshUser }),
    [user, access, loading, login, consumeHandoff, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
