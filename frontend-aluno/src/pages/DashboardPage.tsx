import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  type Ativacao,
  type CertificadoAluno,
  type CursoAluno,
  type FinancasPayload,
} from "../api/client";
import { CursoCard } from "../components/CursoCard";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { access, user } = useAuth();
  const [cursos, setCursos] = useState<CursoAluno[]>([]);
  const [ativacoes, setAtivacoes] = useState<Ativacao[]>([]);
  const [financas, setFinancas] = useState<FinancasPayload | null>(null);
  const [certs, setCerts] = useState<CertificadoAluno[]>([]);

  useEffect(() => {
    if (!access) return;
    Promise.all([
      apiRequest<CursoAluno[]>("/aluno/meus-cursos/", { token: access }),
      apiRequest<Ativacao[]>("/aluno/ativacoes/", { token: access }),
      apiRequest<FinancasPayload>("/aluno/financas/", { token: access }).catch(() => null),
      apiRequest<CertificadoAluno[]>("/aluno/certificados/", { token: access }).catch(
        () => []
      ),
    ]).then(([c, a, f, cert]) => {
      setCursos(c);
      setAtivacoes(a.filter((x) => x.vigente ?? x.ativo));
      setFinancas(f);
      setCerts(cert);
    });
  }, [access]);

  const media =
    cursos.length > 0
      ? Math.round(
          cursos.reduce((s, c) => s + (c.progresso_pct || 0), 0) / cursos.length
        )
      : 0;
  const destaque = cursos.slice(0, 3);
  const planoNome = ativacoes[0]?.plano_nome;
  const emAndamento = cursos.filter(
    (c) => (c.progresso_pct || 0) > 0 && (c.progresso_pct || 0) < 100
  ).length;

  return (
    <div className="bento-dash">
      <section className="bento-cell bento-cell--welcome animate-fade-up">
        <p className="eyebrow">Portal do aluno</p>
        <h1>Olá, {user?.first_name || user?.username}</h1>
        <div className="welcome-meta">
          <span>
            RA <strong>{user?.ra || "—"}</strong>
          </span>
          <span>
            {ativacoes.length
              ? `${ativacoes.length} plano vigente`
              : "Sem plano ativo"}
          </span>
          {planoNome && <span className="welcome-pill">{planoNome}</span>}
        </div>
      </section>

      <section className="bento-cell bento-cell--stat animate-fade-up animate-delay-1">
        <span className="stat-label">Progresso médio</span>
        <strong className="stat-value">{media}%</strong>
        <div className="progress-bar">
          <span style={{ width: `${media}%` }} />
        </div>
      </section>

      <section className="bento-cell bento-cell--stat animate-fade-up animate-delay-1">
        <span className="stat-label">Cursos liberados</span>
        <strong className="stat-value">{cursos.length}</strong>
        <Link to="/catalogo" className="btn btn--ghost btn--small">
          Abrir catálogo
        </Link>
      </section>

      <section className="bento-cell bento-cell--stat animate-fade-up animate-delay-1">
        <span className="stat-label">Certificados</span>
        <strong className="stat-value">{certs.length}</strong>
        <span className="portal-muted">
          {emAndamento > 0 ? `${emAndamento} em andamento` : "Em dia"}
        </span>
      </section>

      <section className="bento-cell bento-cell--full animate-fade-up animate-delay-2">
        <div className="cell-head">
          <h2>Continuar estudando</h2>
          <Link to="/catalogo">Catálogo</Link>
        </div>
        {destaque.length === 0 ? (
          <div className="empty-box empty-box--inline">
            <p>Ative um plano para liberar cursos.</p>
            <Link to="/ativar" className="btn btn--primary">
              Ativar plano
            </Link>
          </div>
        ) : (
          <div className="curso-grid curso-grid--dash">
            {destaque.map((c, i) => (
              <CursoCard key={c.id} curso={c} className={`animate-delay-${i}`} />
            ))}
          </div>
        )}
      </section>

      <section className="bento-cell animate-fade-up animate-delay-2">
        <h2>Finanças</h2>
        <p className="portal-muted">Upgrade ou renovação via WhatsApp.</p>
        <div className="dash-actions">
          <Link to="/financas" className="btn btn--primary btn--small">
            Abrir finanças
          </Link>
          {financas?.whatsapp_renovar && (
            <a
              className="btn btn--ghost btn--small"
              href={financas.whatsapp_renovar}
              target="_blank"
              rel="noreferrer"
            >
              Renovar
            </a>
          )}
        </div>
      </section>

      <section className="bento-cell animate-fade-up animate-delay-2">
        <h2>Conjuntos</h2>
        <p className="portal-muted">Trilhas curadas do seu catálogo.</p>
        <Link to="/conjuntos" className="btn btn--ghost btn--small">
          Ver conjuntos
        </Link>
      </section>

      <section className="bento-cell animate-fade-up animate-delay-2">
        <h2>Secretaria</h2>
        <p className="portal-muted">Dúvidas e suporte administrativo.</p>
        <Link to="/secretaria" className="btn btn--ghost btn--small">
          Abrir secretaria
        </Link>
      </section>
    </div>
  );
}
