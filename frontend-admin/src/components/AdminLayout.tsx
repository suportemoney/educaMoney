import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Papel } from "../api/client";

type NavItem = { to: string; label: string; papeis: Papel[] };

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", papeis: ["administrador", "gestor", "pr", "instrutor", "merchant"] },
  { to: "/usuarios", label: "Usuários", papeis: ["administrador", "gestor"] },
  { to: "/alunos", label: "Alunos", papeis: ["administrador", "gestor"] },
  { to: "/planos", label: "Planos", papeis: ["administrador", "gestor"] },
  { to: "/integracao", label: "Integração", papeis: ["administrador", "gestor"] },
  { to: "/categorias", label: "Categorias", papeis: ["administrador", "gestor", "pr"] },
  { to: "/conjuntos", label: "Conjuntos", papeis: ["administrador", "gestor", "pr"] },
  { to: "/cursos", label: "Cursos", papeis: ["administrador", "gestor", "pr"] },
  { to: "/tokens", label: "Tokens", papeis: ["administrador", "gestor", "merchant"] },
  { to: "/ativacoes", label: "Ativações", papeis: ["administrador", "gestor", "merchant"] },
  { to: "/certificados", label: "Certificados", papeis: ["administrador", "gestor"] },
  { to: "/secretaria", label: "Secretaria", papeis: ["administrador", "gestor"] },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const papel = user?.papel || "aluno";

  const itens = NAV.filter(
    (i) => user?.is_superuser || i.papeis.includes(papel)
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">EducaMoney</div>
        <p className="admin-brand__sub">Painel</p>
        <nav className="admin-nav">
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive ? "admin-nav__link active" : "admin-nav__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-user">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="" className="admin-avatar" />
            ) : (
              <div className="admin-avatar admin-avatar--fallback">
                {(user?.first_name || user?.username || "?").slice(0, 1)}
              </div>
            )}
            <div>
              <strong>{user?.first_name || user?.username}</strong>
              <span className="admin-papel">{papel}</span>
            </div>
          </div>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => logout()}>
            Sair
          </button>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
