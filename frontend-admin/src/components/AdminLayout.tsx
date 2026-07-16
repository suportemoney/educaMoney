import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Papel } from "../api/client";

type NavItem = {
  to: string;
  label: string;
  papeis: Papel[];
  icon: string;
};

type NavGroup = {
  id: string;
  label: string;
  itens: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "geral",
    label: "Visão geral",
    itens: [
      {
        to: "/",
        label: "Dashboard",
        icon: "dash",
        papeis: ["administrador", "gestor", "pr", "instrutor", "merchant"],
      },
    ],
  },
  {
    id: "pessoas",
    label: "Pessoas",
    itens: [
      {
        to: "/usuarios",
        label: "Usuários",
        icon: "users",
        papeis: ["administrador", "gestor"],
      },
      {
        to: "/alunos",
        label: "Alunos",
        icon: "student",
        papeis: ["administrador", "gestor"],
      },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    itens: [
      {
        to: "/cursos",
        label: "Cursos",
        icon: "course",
        papeis: ["administrador", "gestor", "pr"],
      },
      {
        to: "/categorias",
        label: "Categorias",
        icon: "tag",
        papeis: ["administrador", "gestor", "pr"],
      },
      {
        to: "/conjuntos",
        label: "Conjuntos",
        icon: "stack",
        papeis: ["administrador", "gestor", "pr"],
      },
      {
        to: "/certificados",
        label: "Certificados",
        icon: "cert",
        papeis: ["administrador", "gestor"],
      },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    itens: [
      {
        to: "/planos",
        label: "Planos",
        icon: "plan",
        papeis: ["administrador", "gestor"],
      },
      {
        to: "/tokens",
        label: "Tokens",
        icon: "key",
        papeis: ["administrador", "gestor", "merchant"],
      },
      {
        to: "/ativacoes",
        label: "Ativações",
        icon: "check",
        papeis: ["administrador", "gestor", "merchant"],
      },
      {
        to: "/integracao",
        label: "Integração",
        icon: "chat",
        papeis: ["administrador", "gestor"],
      },
    ],
  },
  {
    id: "suporte",
    label: "Suporte",
    itens: [
      {
        to: "/secretaria",
        label: "Secretaria",
        icon: "mail",
        papeis: ["administrador", "gestor"],
      },
    ],
  },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dash":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "student":
      return (
        <svg {...common}>
          <path d="M22 10 12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
        </svg>
      );
    case "course":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l8.59-8.59a1 1 0 0 0 0-1.41L12 2z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "stack":
      return (
        <svg {...common}>
          <path d="m12 2 9 4.5-9 4.5L3 6.5 12 2z" />
          <path d="m3 12 9 4.5 9-4.5" />
          <path d="m3 17.5 9 4.5 9-4.5" />
        </svg>
      );
    case "cert":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="6" />
          <path d="M8.5 13.5 7 22l5-2 5 2-1.5-8.5" />
        </svg>
      );
    case "plan":
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-9.6 9.6" />
          <path d="m15.5 7.5 3 3L22 7l-3-3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 7L2 7" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function papelLabel(papel: string) {
  const map: Record<string, string> = {
    administrador: "Admin",
    gestor: "Gestor",
    pr: "PR",
    instrutor: "Instrutor",
    merchant: "Merchant",
  };
  return map[papel] || papel;
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const papel = user?.papel || "aluno";
  const [menuAberto, setMenuAberto] = useState(false);

  const grupos = NAV_GROUPS.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => user?.is_superuser || i.papeis.includes(papel)),
  })).filter((g) => g.itens.length > 0);

  // Fecha o drawer ao navegar
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <div className={`admin-shell${menuAberto ? " admin-shell--nav-open" : ""}`}>
      <button
        type="button"
        className="admin-nav-toggle"
        aria-expanded={menuAberto}
        aria-controls="admin-sidebar"
        onClick={() => setMenuAberto((v) => !v)}
      >
        <span className="admin-nav-toggle__bars" aria-hidden />
        Menu
      </button>

      {menuAberto && (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label="Fechar menu"
          onClick={fecharMenu}
        />
      )}

      <aside id="admin-sidebar" className="admin-sidebar">
        <div className="admin-sidebar__top">
          <div className="admin-brand">
            <span className="admin-brand__mark" aria-hidden>
              EM
            </span>
            <div>
              <div className="admin-brand__name">EducaMoney</div>
              <p className="admin-brand__sub">Painel</p>
            </div>
          </div>
          <button
            type="button"
            className="admin-sidebar__close"
            onClick={fecharMenu}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <nav className="admin-nav" aria-label="Principal">
          {grupos.map((grupo) => (
            <div key={grupo.id} className="admin-nav__group">
              <p className="admin-nav__group-label">{grupo.label}</p>
              <div className="admin-nav__group-links">
                {grupo.itens.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={fecharMenu}
                    className={({ isActive }) =>
                      isActive ? "admin-nav__link active" : "admin-nav__link"
                    }
                  >
                    <span className="admin-nav__icon">
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="admin-nav__text">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <div className="admin-sidebar__user">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="" className="admin-avatar" />
            ) : (
              <div className="admin-avatar admin-avatar--fallback">
                {(user?.first_name || user?.username || "?").slice(0, 1)}
              </div>
            )}
            <div className="admin-sidebar__user-meta">
              <strong>{user?.first_name || user?.username}</strong>
              <span className="admin-papel">{papelLabel(papel)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--small admin-sidebar__logout"
            onClick={() => logout()}
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            <span className="admin-topbar__eyebrow">Painel</span>
            <strong>EducaMoney</strong>
          </div>
          <div className="admin-user admin-user--top">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="" className="admin-avatar" />
            ) : (
              <div className="admin-avatar admin-avatar--fallback">
                {(user?.first_name || user?.username || "?").slice(0, 1)}
              </div>
            )}
            <div>
              <strong>{user?.first_name || user?.username}</strong>
              <span className="admin-papel">{papelLabel(papel)}</span>
            </div>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
