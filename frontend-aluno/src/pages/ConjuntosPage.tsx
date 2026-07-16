import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  glyphForIconKey,
  type ConjuntoAluno,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ConjuntosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<ConjuntoAluno[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!access) return;
    apiRequest<ConjuntoAluno[]>("/aluno/conjuntos/", { token: access })
      .then(setItens)
      .catch((e: Error) => setErro(e.message));
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
      <div className="conjunto-grid">
        {itens.map((j) => (
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
            <div className="chip-row">
              {j.cursos.map((c) =>
                c.liberado ? (
                  <Link key={c.id} to={`/meus-cursos/${c.id}`} className="chip chip--ok">
                    {c.titulo}
                  </Link>
                ) : (
                  <span key={c.id} className="chip">
                    {c.titulo} (bloqueado)
                  </span>
                )
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
