import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  apiRequest,
  type CertificadoAluno,
  type CursoDetalhe,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

export function CursoDetalhePage() {
  const { cursoId } = useParams<{ cursoId: string }>();
  const { access } = useAuth();
  const [curso, setCurso] = useState<CursoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [emitindo, setEmitindo] = useState(false);

  function carregar() {
    if (!access || !cursoId) return;
    setCarregando(true);
    apiRequest<CursoDetalhe>(`/aluno/cursos/${cursoId}/`, { token: access })
      .then(setCurso)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, [access, cursoId]);

  function primeiraAulaPendente(c: CursoDetalhe): number | null {
    for (const m of c.modulos) {
      for (const a of m.aulas) {
        if (!a.progresso?.concluida) return a.id;
      }
    }
    const primeira = c.modulos[0]?.aulas[0];
    return primeira?.id ?? null;
  }

  async function emitirCertificado() {
    if (!access || !cursoId) return;
    setEmitindo(true);
    setErro(null);
    try {
      const cert = await apiRequest<CertificadoAluno>("/aluno/certificados/", {
        method: "POST",
        token: access,
        body: { curso_id: Number(cursoId) },
      });
      setCurso((c) =>
        c
          ? {
              ...c,
              certificado: { codigo: cert.codigo, emitido_em: cert.emitido_em },
              certificado_elegivel: false,
            }
          : c
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao emitir");
    } finally {
      setEmitindo(false);
    }
  }

  const continuarId = curso ? primeiraAulaPendente(curso) : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/meus-cursos" className="btn btn--ghost btn--small">
            ← Meus cursos
          </Link>
          <h1 style={{ marginTop: "0.75rem" }}>{curso?.titulo || "Curso"}</h1>
        </div>
        {continuarId != null && (
          <Link to={`/aulas/${continuarId}`} className="btn btn--primary btn--small">
            {curso && curso.progresso_pct > 0 ? "Continuar" : "Começar"}
          </Link>
        )}
      </div>
      {curso && (
        <>
          <p className="page-lead">{curso.descricao}</p>
          <div className="progress-block">
            <div className="progress-bar" aria-hidden>
              <span style={{ width: `${curso.progresso_pct}%` }} />
            </div>
            <p className="portal-muted">
              {curso.aulas_concluidas}/{curso.aulas_total} aulas · {curso.progresso_pct}%
            </p>
          </div>
          {(curso.certificado || curso.certificado_elegivel || curso.prova) && (
            <div className="bento-cell" style={{ marginBottom: "1rem" }}>
              <h2>Certificado</h2>
              {curso.prova && (
                <p style={{ marginBottom: "0.75rem" }}>
                  Prova: {curso.prova.titulo}
                  {curso.prova.aprovado ? " · aprovada" : ""}{" "}
                  <Link
                    to={`/meus-cursos/${cursoId}/prova`}
                    className="btn btn--ghost btn--small"
                  >
                    {curso.prova.aprovado ? "Ver prova" : "Fazer prova"}
                  </Link>
                </p>
              )}
              {curso.certificado ? (
                <p>
                  Código <strong>{curso.certificado.codigo}</strong>{" "}
                  <a
                    className="btn btn--ghost btn--small"
                    href={`/api/aluno/certificados/${curso.certificado.codigo}/html/`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!access) return;
                      fetch(
                        `/api/aluno/certificados/${curso.certificado!.codigo}/html/`,
                        { headers: { Authorization: `Bearer ${access}` } }
                      )
                        .then((r) => r.text())
                        .then((html) => {
                          const w = window.open("", "_blank");
                          if (w) {
                            w.document.write(html);
                            w.document.close();
                          }
                        });
                    }}
                  >
                    Ver / imprimir
                  </a>
                </p>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={emitirCertificado}
                  disabled={emitindo || !curso.certificado_elegivel}
                >
                  {emitindo ? "Emitindo…" : "Emitir certificado"}
                </button>
              )}
              {curso.certificado_motivo && !curso.certificado && (
                <p className="portal-muted">
                  {curso.certificado_motivo}{" "}
                  {curso.certificado_motivo.toLowerCase().includes("perfil") ? (
                    <Link to="/perfil">Completar perfil</Link>
                  ) : null}
                </p>
              )}
            </div>
          )}
        </>
      )}
      {erro && <p className="form-erro">{erro}</p>}
      {carregando && <p className="portal-muted">Carregando…</p>}
      {curso && curso.modulos.length === 0 && (
        <div className="empty-box">
          <p>Este curso ainda não tem aulas publicadas.</p>
        </div>
      )}
      {curso?.modulos.map((m) => (
        <section key={m.id} className="modulo-block">
          <h2>{m.titulo}</h2>
          <ul className="aula-list">
            {m.aulas.map((a) => (
              <li key={a.id}>
                <Link to={`/aulas/${a.id}`} className="aula-list__link">
                  <span>
                    {a.progresso?.concluida ? "✓ " : ""}
                    {a.titulo}
                  </span>
                  <span className="portal-muted">Assistir</span>
                </Link>
              </li>
            ))}
          </ul>
          {(m.materiais?.length ?? 0) > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <h3 style={{ fontSize: "0.95rem" }}>Materiais</h3>
              <ul className="aula-list">
                {m.materiais!.map((mat) => (
                  <li key={mat.id}>
                    {mat.arquivo_url ? (
                      <a
                        href={mat.arquivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="aula-list__link"
                      >
                        <span>{mat.titulo}</span>
                        <span className="portal-muted">Baixar</span>
                      </a>
                    ) : (
                      <span>{mat.titulo}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(m.atividades?.length ?? 0) > 0 && (
            <p className="portal-muted" style={{ marginTop: "0.5rem" }}>
              Atividades:{" "}
              {m.atividades!.map((at) => (
                <span key={at.id}>
                  {at.titulo}
                  {at.aprovado ? " ✓" : ""}{" "}
                </span>
              ))}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
