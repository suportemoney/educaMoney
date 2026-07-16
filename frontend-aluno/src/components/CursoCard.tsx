import { Link } from "react-router-dom";
import { glyphForIconKey, type CursoAluno } from "../api/client";

type Props = {
  curso: CursoAluno;
  className?: string;
};

export function CursoCard({ curso, className = "" }: Props) {
  return (
    <article className={`curso-card animate-fade-up ${className}`}>
      <div className="curso-card__icon" data-key={curso.icone_key || "default"}>
        {curso.icone_url ? (
          <img src={curso.icone_url} alt="" />
        ) : (
          <span aria-hidden>{glyphForIconKey(curso.icone_key)}</span>
        )}
      </div>
      <div className="curso-card__body">
        <div className="curso-card__meta">
          {curso.categoria_titulo && <span>{curso.categoria_titulo}</span>}
          {curso.subcategoria_titulo && <span>{curso.subcategoria_titulo}</span>}
        </div>
        <h3>{curso.titulo}</h3>
        <p>{curso.descricao}</p>
        <div className="progress-block">
          <div className="progress-bar" aria-hidden>
            <span style={{ width: `${curso.progresso_pct || 0}%` }} />
          </div>
          <span className="portal-muted">
            {curso.aulas_concluidas || 0}/{curso.aulas_total || 0} · {curso.progresso_pct || 0}%
          </span>
        </div>
        <Link to={`/meus-cursos/${curso.id}`} className="btn btn--ghost btn--small">
          {(curso.progresso_pct || 0) > 0 ? "Continuar" : "Começar"}
        </Link>
      </div>
    </article>
  );
}
