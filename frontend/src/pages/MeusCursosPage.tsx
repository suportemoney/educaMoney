import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, type CursoAluno } from "../api/client";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";

export function MeusCursosPage() {
  const { access } = useAuth();
  const [cursos, setCursos] = useState<CursoAluno[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!access) return;
    setCarregando(true);
    apiRequest<CursoAluno[]>("/aluno/meus-cursos/", { token: access })
      .then(setCursos)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [access]);

  return (
    <div className="page-shell">
      <Header />
      <main className="aluno-main">
        <div className="aluno-head">
          <h1>Meus cursos</h1>
          <Link to="/ativar" className="btn btn--primary btn--small">
            Ativar plano
          </Link>
        </div>
        <p className="page-lead">
          Cursos liberados pelos planos que você ativou com token-key.
        </p>
        {erro && <p className="form-erro">{erro}</p>}
        {carregando && <p className="muted">Carregando…</p>}
        {!carregando && cursos.length === 0 && (
          <div className="aluno-empty">
            <p>Você ainda não tem cursos liberados.</p>
            <Link to="/ativar" className="btn btn--primary">
              Ativar um token
            </Link>
          </div>
        )}
        {!carregando && cursos.length > 0 && (
          <ul className="course-list">
            {cursos.map((c) => (
              <li key={c.id} className="course-item">
                <h3>{c.titulo}</h3>
                <p>{c.descricao}</p>
                {c.instrutor_nome && (
                  <p className="course-item__meta">Instrutor: {c.instrutor_nome}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
