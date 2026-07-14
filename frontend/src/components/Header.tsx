import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "./BrandLogo";

export function Header() {
  const { user, logout, loading } = useAuth();

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
            <>
              <NavLink to="/meus-cursos">Meus cursos</NavLink>
              <NavLink to="/ativar">Ativar plano</NavLink>
              <span className="nav-user">
                Olá, {user.first_name || user.username}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => logout()}
              >
                Sair
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
