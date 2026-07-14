import { useEffect, useState } from "react";
import { apiRequest, type DashboardPayload } from "../api/client";
import { useAuth } from "../context/AuthContext";

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
    <div>
      <h1>{data.titulo}</h1>
      <p className="page-lead">{data.mensagem}</p>
      <div className="metric-grid">
        {data.metricas.map((m) => (
          <article key={m.label} className="metric-card">
            <span className="metric-card__label">{m.label}</span>
            <strong className="metric-card__value">{m.valor}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
