import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  glyphForIconKey,
  type ConjuntoAluno,
  type ConjuntoCursoAluno,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

/** Destino do CTA Continuar: player se houver aula, senão detalhe do curso. */
function linkContinuar(c: ConjuntoCursoAluno): string {
  if (c.continuar_aula_id) return `/aulas/${c.continuar_aula_id}`;
  return `/meus-cursos/${c.id}`;
}

/** Primeiro curso liberado ainda incompleto, ou o primeiro liberado. */
function cursoContinuar(conjunto: ConjuntoAluno): ConjuntoCursoAluno | null {
  const liberados = conjunto.cursos.filter((c) => c.liberado);
  if (liberados.length === 0) return null;
  const incompleto = liberados.find((c) => (c.progresso_pct ?? 0) < 100);
  return incompleto || liberados[0];
}

export function ConjuntosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<ConjuntoAluno[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!access) return;
    setCarregando(true);
    apiRequest<ConjuntoAluno[]>("/aluno/conjuntos/", { token: access })
      .then(setItens)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [access]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Conjuntos</h1>
          <p className="page-lead">Trilhas curadas. O plano continua liberando o acesso.</p>
        </div>
      </div>
      {erro && <p className="form-erro">{erro}</p>}

      {carregando && (
        <p className="portal-muted" aria-busy="true">
          Carregando conjuntos…
        </p>
      )}

      {!carregando && itens.length === 0 && !erro && (
        <div className="empty-box">
          <p>Nenhum conjunto disponível no momento.</p>
          <p className="portal-muted">
            As trilhas curadas aparecem aqui quando forem publicadas.
          </p>
        </div>
      )}

      <div className="conjunto-grid">
        {itens.map((j) => {
          const pct = j.progresso_pct ?? 0;
          const concluidos = j.cursos_concluidos ?? j.cursos.filter((c) => (c.progresso_pct ?? 0) >= 100).length;
          const total = j.cursos_total ?? j.cursos.length;
          const destino = cursoContinuar(j);

          return (
            <article key={j.id} className="conjunto-card animate-fade-up">
              <div className="conjunto-card__head">
                <div className="curso-card__icon">
                  {j.icone_url ? (
                    <img src={j.icone_url} alt="" />
                  ) : (
                    <span>{glyphForIconKey(j.icone_key)}</span>
                  )}
                </div>
                <div>
                  <span className="portal-muted">{j.categoria_titulo}</span>
                  <h2>{j.titulo}</h2>
                </div>
              </div>
              <p>{j.descricao}</p>

              <div className="progress-block">
                <div className="progress-bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                </div>
                <p className="portal-muted">
                  {concluidos}/{total} cursos · {pct}%
                </p>
              </div>

              <ul className="conjunto-checklist">
                {j.cursos.map((c) => {
                  const cPct = c.progresso_pct ?? 0;
                  return (
                    <li key={c.id} className="conjunto-checklist__item">
                      <span className="conjunto-checklist__mark" aria-hidden>
                        {cPct >= 100 ? "✓" : c.liberado ? "○" : "🔒"}
                      </span>
                      <div className="conjunto-checklist__body">
                        {c.liberado ? (
                          <Link to={`/meus-cursos/${c.id}`}>{c.titulo}</Link>
                        ) : (
                          <span>
                            {c.titulo}{" "}
                            <span className="portal-muted">(bloqueado)</span>
                          </span>
                        )}
                        {c.liberado && (
                          <span className="portal-muted">{cPct}%</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {destino && (
                <Link to={linkContinuar(destino)} className="btn btn--primary btn--small">
                  Continuar
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
