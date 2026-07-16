import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { apiRequest, type Ativacao } from "../api/client";
import { useAuth } from "../context/AuthContext";

const SIDEBAR_KEY = "em_aluno_sidebar_expanded";

type NavItem = { to: string; label: string; icon: string; end?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

function buildNav(temPlanoAtivo: boolean): NavGroup[] {
  const estudo: NavItem[] = [
    { to: "/", label: "Início", icon: "⌂", end: true },
    { to: "/catalogo", label: "Catálogo", icon: "▦" },
    { to: "/meus-cursos", label: "Meus cursos", icon: "▶" },
    { to: "/conjuntos", label: "Conjuntos", icon: "◈" },
  ];
  const conta: NavItem[] = [
    { to: "/financas", label: "Finanças", icon: "◎" },
    { to: "/perfil", label: "Perfil", icon: "☺" },
  ];
  if (!temPlanoAtivo) {
    conta.push({ to: "/ativar", label: "Ativar plano", icon: "✦" });
  }
  return [
    { id: "estudo", label: "Estudo", items: estudo },
    { id: "conta", label: "Conta", items: conta },
    {
      id: "suporte",
      label: "Suporte",
      items: [{ to: "/secretaria", label: "Secretaria", icon: "✉" }],
    },
  ];
}

export function PortalLayout() {
  const { user, access, logout } = useAuth();
  const location = useLocation();
  const [temPlanoAtivo, setTemPlanoAtivo] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved === null ? true : saved === "1";
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    estudo: true,
    conta: true,
    suporte: true,
  });

  useEffect(() => {
    if (!access) return;
    apiRequest<Ativacao[]>("/aluno/ativacoes/", { token: access })
      .then((list) => setTemPlanoAtivo(list.some((a) => a.vigente ?? a.ativo)))
      .catch(() => setTemPlanoAtivo(false));
  }, [access]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, expanded ? "1" : "0");
  }, [expanded]);

  const groups = useMemo(() => buildNav(temPlanoAtivo), [temPlanoAtivo]);

  // Abre automaticamente o grupo da rota atual
  useEffect(() => {
    for (const g of groups) {
      if (g.items.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) || location.pathname === i.to))) {
        setOpenGroups((prev) => ({ ...prev, [g.id]: true }));
      }
    }
  }, [location.pathname, groups]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className={`portal-shell ${expanded ? "" : "portal-shell--collapsed"}`}>
      <aside className="portal-sidebar" aria-label="Menu do portal">
        <div className="sidebar-head">
          <div className="sidebar-brand-block">
            <div className="portal-brand">{expanded ? "EducaMoney" : "EM"}</div>
            {expanded && <p className="portal-brand__sub">Portal do aluno</p>}
            {expanded && user?.ra && <p className="portal-ra">RA {user.ra}</p>}
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            title={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? "⟨" : "⟩"}
          </button>
        </div>

        <nav className="portal-nav">
          {groups.map((group) => {
            const open = openGroups[group.id] ?? true;
            return (
              <div key={group.id} className="nav-group">
                {expanded ? (
                  <button
                    type="button"
                    className="nav-group__title"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={open}
                  >
                    <span>{group.label}</span>
                    <span className="nav-group__chev">{open ? "▾" : "▸"}</span>
                  </button>
                ) : (
                  <div className="nav-group__title nav-group__title--mini" title={group.label}>
                    ·
                  </div>
                )}
                {(open || !expanded) && (
                  <div className="nav-group__items">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => (isActive ? "active" : "")}
                        title={item.label}
                      >
                        <span className="nav-icon" aria-hidden>
                          {item.icon}
                        </span>
                        {expanded && <span className="nav-label">{item.label}</span>}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <div>
            <strong>{user?.first_name || user?.username}</strong>
            <span className="portal-muted">{user?.email}</span>
          </div>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => logout()}>
            Sair
          </button>
        </header>
        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
