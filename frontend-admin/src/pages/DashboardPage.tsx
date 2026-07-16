import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest, type DashboardPayload } from "../api/client";
import { useAuth } from "../context/AuthContext";

function papelLabel(papel: DashboardPayload["papel"]) {
  const map = {
    administrador: "Administrador",
    gestor: "Gestor",
    pr: "PR",
    instrutor: "Instrutor",
    merchant: "Merchant",
    aluno: "Aluno",
  };
  return map[papel] || papel;
}

export function DashboardPage() {
  const { access } = useAuth();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!access) return;
    apiRequest<DashboardPayload>("/auth/admin/dashboard/", { token: access })
      .then(setData)
      .catch((e: Error) => setErro(e.message));
  }, [access]);

  if (erro) return <p className="form-erro">{erro}</p>;
  if (!data) return <p>Carregando dashboard…</p>;

  return (
    <div className="dashboard-admin">
      <section className="dashboard-admin__hero">
        <div>
          <p className="dashboard-admin__eyebrow">Resumo executivo</p>
          <h1>{data.titulo}</h1>
          <p className="page-lead">{data.mensagem}</p>
        </div>
        <div className="dashboard-admin__role-card">
          <span className="dashboard-admin__role-label">Perfil atual</span>
          <strong>{papelLabel(data.papel)}</strong>
        </div>
      </section>

      <section className="metric-grid">
        {data.metricas.map((m) => (
          <article key={m.label} className="metric-card metric-card--executive">
            <span className="metric-card__label">{m.label}</span>
            <strong className="metric-card__value">{m.valor}</strong>
            {m.detalhe && <p className="metric-card__detail">{m.detalhe}</p>}
          </article>
        ))}
      </section>

      <div className="dashboard-admin__grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2>Status da operação</h2>
            <span className="badge">Ao vivo</span>
          </div>
          <div className="dashboard-status-list">
            {data.status_operacao.map((item) => (
              <article
                key={item.label}
                className={`dashboard-status-item dashboard-status-item--${item.tone || "default"}`}
              >
                <span>{item.label}</span>
                <strong>{item.valor}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2>Ações rápidas</h2>
          </div>
          <div className="dashboard-shortcuts">
            {data.atalhos.map((atalho) => (
              <Link
                key={atalho.label}
                to={atalho.to}
                className={`dashboard-shortcut dashboard-shortcut--${atalho.tone || "default"}`}
              >
                <strong>{atalho.label}</strong>
                <span>Abrir tela</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="dashboard-panel">
        <div className="dashboard-panel__head">
          <h2>Atenção</h2>
        </div>
        <ul className="dashboard-insights">
          {data.insights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
