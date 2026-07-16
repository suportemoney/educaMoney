import { useEffect, useState } from "react";
import { apiRequest, type FinancasPayload } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function FinancasPage() {
  const { access } = useAuth();
  const [data, setData] = useState<FinancasPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!access) return;
    apiRequest<FinancasPayload>("/aluno/financas/", { token: access })
      .then(setData)
      .catch((e: Error) => setErro(e.message));
  }, [access]);

  const vigente = data?.vigentes?.[0];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Finanças</h1>
          <p className="page-lead">Plano, validade e solicitações por WhatsApp.</p>
        </div>
      </div>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="financas-grid">
        <section className="bento-cell">
          <h2>Status do plano</h2>
          {vigente ? (
            <>
              <p className="stat-value" style={{ fontSize: "1.4rem" }}>
                {vigente.plano_nome}
              </p>
              <p className="portal-muted">
                Válido até:{" "}
                {vigente.valido_ate
                  ? new Date(vigente.valido_ate).toLocaleDateString("pt-BR")
                  : "sem prazo"}
              </p>
            </>
          ) : (
            <p className="portal-muted">Nenhum plano vigente.</p>
          )}
        </section>
        <section className="bento-cell">
          <h2>Ações</h2>
          <div className="dash-actions">
            {data?.whatsapp_upgrade && (
              <a
                className="btn btn--primary"
                href={data.whatsapp_upgrade}
                target="_blank"
                rel="noreferrer"
              >
                Upgrade de plano
              </a>
            )}
            {data?.whatsapp_renovar && (
              <a
                className="btn btn--ghost"
                href={data.whatsapp_renovar}
                target="_blank"
                rel="noreferrer"
              >
                Renovar / estender
              </a>
            )}
          </div>
        </section>
        <section className="bento-cell bento-cell--wide">
          <h2>Histórico de ativações</h2>
          <ul className="hist-list">
            {(data?.ativacoes || []).map((a) => (
              <li key={a.id}>
                <strong>{a.plano_nome}</strong>
                <span className="portal-muted">
                  {new Date(a.data_ativacao).toLocaleDateString("pt-BR")}
                  {a.valido_ate
                    ? ` · até ${new Date(a.valido_ate).toLocaleDateString("pt-BR")}`
                    : ""}
                  {a.vigente ? " · vigente" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
