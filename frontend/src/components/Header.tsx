import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiRequest, type Ativacao } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "./BrandLogo";

const PORTAL_URL =
  (import.meta.env.VITE_ALUNO_PORTAL_URL as string | undefined) ||
  "/portal/";

export function Header() {
  const { user, access, logout, loading } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [temPlanoAtivo, setTemPlanoAtivo] = useState(false);
  const [handoffErro, setHandoffErro] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!access || !user) {
      setTemPlanoAtivo(false);
      return;
    }
    apiRequest<Ativacao[]>("/aluno/ativacoes/", { token: access })
      .then((lista) => setTemPlanoAtivo(lista.some((a) => a.ativo)))
      .catch(() => setTemPlanoAtivo(false));
  }, [access, user]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function irAoPortal(destino: "" | "ativar" = "") {
    setHandoffErro(null);
    if (!access) return;
    try {
      const data = await apiRequest<{ portal_url: string; code: string }>(
        "/auth/portal-handoff/",
        { method: "POST", token: access }
      );
      const base = PORTAL_URL.replace(/\/?$/, "/");
      // Usa URL do backend (com code) ou monta path local + path destino
      let url = data.portal_url;
      if (destino === "ativar") {
        url = `${base}login?code=${encodeURIComponent(data.code)}&next=/ativar`;
      }
      window.location.href = url;
    } catch {
      setHandoffErro("Não foi possível abrir o portal.");
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandLogo size="header" />
        <nav className="site-nav" aria-label="Principal">
          <a href="/#planos">Planos</a>
          <a href="/#cursos">Cursos</a>
          {!loading && !user && (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/cadastro" className="btn btn--primary btn--small">
                Cadastrar
              </NavLink>
            </>
          )}
          {!loading && user && (
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-menu__trigger"
                aria-expanded={menuAberto}
                aria-haspopup="menu"
                onClick={() => setMenuAberto((v) => !v)}
              >
                {user.first_name || user.username}
                <span className="user-menu__caret" aria-hidden="true" />
              </button>
              {menuAberto && (
                <div className="user-menu__panel" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => irAoPortal("")}
                  >
                    Portal do aluno
                  </button>
                  {!temPlanoAtivo && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => irAoPortal("ativar")}
                    >
                      Ativar plano
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuAberto(false);
                      logout();
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
              {handoffErro && <span className="user-menu__erro">{handoffErro}</span>}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
