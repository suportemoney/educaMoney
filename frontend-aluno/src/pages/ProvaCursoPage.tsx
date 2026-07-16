import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  apiRequest,
  type QuizAluno,
  type TentativaQuiz,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ProvaCursoPage() {
  const { cursoId } = useParams<{ cursoId: string }>();
  const { access } = useAuth();
  const [quiz, setQuiz] = useState<QuizAluno | null>(null);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<TentativaQuiz | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!access || !cursoId) return;
    setCarregando(true);
    apiRequest<QuizAluno | null>(`/aluno/cursos/${cursoId}/prova/`, {
      token: access,
    })
      .then(setQuiz)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [access, cursoId]);

  async function enviar() {
    if (!access || !cursoId || !quiz) return;
    setEnviando(true);
    setErro(null);
    try {
      const t = await apiRequest<TentativaQuiz>(`/aluno/cursos/${cursoId}/prova/`, {
        method: "POST",
        token: access,
        body: {
          respostas: quiz.perguntas.map((p) => ({
            pergunta_id: p.id,
            alternativa_id: respostas[p.id],
          })),
        },
      });
      setResultado(t);
      setQuiz({ ...quiz, aprovado: t.aprovado || quiz.aprovado, ultima_nota: t.nota });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na prova");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to={`/meus-cursos/${cursoId}`} className="btn btn--ghost btn--small">
            ← Voltar ao curso
          </Link>
          <h1 style={{ marginTop: "0.75rem" }}>Prova do curso</h1>
        </div>
      </div>
      {erro && <p className="form-erro">{erro}</p>}
      {carregando && <p className="portal-muted">Carregando…</p>}
      {!carregando && !quiz && (
        <div className="empty-box">
          <p>Este curso ainda não tem prova avaliadora.</p>
        </div>
      )}
      {quiz && (
        <section className="bento-cell">
          <h2>{quiz.titulo}</h2>
          <p className="portal-muted">
            Nota mínima: {quiz.nota_minima}%
            {quiz.aprovado ? " · Você já foi aprovado" : ""}
            {quiz.ultima_nota != null ? ` · Última nota: ${quiz.ultima_nota}%` : ""}
          </p>
          {resultado && (
            <p className={resultado.aprovado ? "form-ok" : "form-erro"}>
              Nota {resultado.nota}% — {resultado.aprovado ? "Aprovado" : "Reprovado"}
            </p>
          )}
          {!quiz.aprovado &&
            quiz.perguntas.map((p) => (
              <fieldset key={p.id} style={{ marginBottom: "1rem", border: "none" }}>
                <legend>{p.enunciado}</legend>
                {p.alternativas.map((a) => (
                  <label key={a.id} className="check-row">
                    <input
                      type="radio"
                      name={`perg-${p.id}`}
                      checked={respostas[p.id] === a.id}
                      onChange={() =>
                        setRespostas((prev) => ({ ...prev, [p.id]: a.id }))
                      }
                    />
                    {a.texto}
                  </label>
                ))}
              </fieldset>
            ))}
          {!quiz.aprovado && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={
                enviando ||
                quiz.perguntas.some((p) => respostas[p.id] == null)
              }
              onClick={enviar}
            >
              {enviando ? "Enviando…" : "Enviar respostas"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
