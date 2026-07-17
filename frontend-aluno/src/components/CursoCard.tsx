import { Link } from "react-router-dom";
import { glyphForIconKey, type CursoAluno } from "../api/client";

type Props = {
  curso: CursoAluno;
  className?: string;
  /** Card menor para faixa "Continuar de onde parou" */
  compact?: boolean;
};

function statusCurso(curso: CursoAluno): {
  label: string;
  tone: "idle" | "run" | "done" | "cert";
} {
  if (curso.certificado_codigo) {
    return { label: "Certificado", tone: "cert" };
  }
  const pct = curso.progresso_pct || 0;
  if (pct >= 100) return { label: "Concluído", tone: "done" };
  if (pct > 0) return { label: "Em andamento", tone: "run" };
  return { label: "Não iniciado", tone: "idle" };
}

export function CursoCard({ curso, className = "", compact = false }: Props) {
  const status = statusCurso(curso);
  const pct = curso.progresso_pct || 0;
  const continuarHref = curso.continuar_aula_id
    ? `/aulas/${curso.continuar_aula_id}`
    : `/meus-cursos/${curso.id}`;
  const ctaLabel = pct > 0 && pct < 100 ? "Continuar" : pct >= 100 ? "Revisar" : "Começar";

  return (
    <article
      className={`curso-card curso-card--cover${compact ? " curso-card--compact" : ""} animate-fade-up ${className}`}
    >
      <div
        className="curso-card__cover"
        style={
          curso.capa_url
            ? { backgroundImage: `url(${curso.capa_url})` }
            : undefined
        }
        data-fallback={!curso.capa_url ? curso.icone_key || "default" : undefined}
      >
        {!curso.capa_url && (
          <div className="curso-card__cover-fallback">
            {curso.icone_url ? (
              <img src={curso.icone_url} alt="" />
            ) : (
              <span aria-hidden>{glyphForIconKey(curso.icone_key)}</span>
            )}
          </div>
        )}
        <div className="curso-card__badges">
          <span className={`curso-badge curso-badge--${status.tone}`}>{status.label}</span>
        </div>
      </div>

      <div className="curso-card__body">
        <div className="curso-card__meta">
          {curso.categoria_titulo && <span>{curso.categoria_titulo}</span>}
          {curso.subcategoria_titulo && <span>{curso.subcategoria_titulo}</span>}
          {curso.instrutor_nome && (
            <span className="curso-card__meta--muted">{curso.instrutor_nome}</span>
          )}
        </div>
        <h3>{curso.titulo}</h3>
        {!compact && curso.descricao && (
          <p className="curso-card__desc">{curso.descricao}</p>
        )}
        <div className="progress-block">
          <div className="progress-bar" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="portal-muted">
            {curso.aulas_concluidas || 0}/{curso.aulas_total || 0} aulas · {pct}%
          </span>
        </div>
        <div className="curso-card__ctas">
          <Link to={continuarHref} className="btn btn--primary btn--small">
            {ctaLabel}
          </Link>
          <Link to={`/meus-cursos/${curso.id}`} className="btn btn--ghost btn--small">
            Ver curso
          </Link>
        </div>
      </div>
    </article>
  );
}
