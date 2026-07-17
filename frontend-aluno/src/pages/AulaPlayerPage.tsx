import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  apiRequest,
  type AulaAluno,
  type CursoDetalhe,
  type ProgressoAula,
  type QuizAluno,
  type TentativaQuiz,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatTempo(seg: number): string {
  const s = Math.max(0, Math.floor(seg || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Margem no fim do vídeo para liberar "Concluir". */
const FIM_TOLERANCIA_S = 2;

export function AulaPlayerPage() {
  const { aulaId } = useParams<{ aulaId: string }>();
  const { access } = useAuth();
  const [aula, setAula] = useState<AulaAluno | null>(null);
  const [curso, setCurso] = useState<CursoDetalhe | null>(null);
  const [quiz, setQuiz] = useState<QuizAluno | null>(null);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<TentativaQuiz | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSent = useRef(0);
  const resumed = useRef(false);
  const maxAssistidoRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxAssistido, setMaxAssistido] = useState(0);
  const [muted, setMuted] = useState(false);

  const jaConcluida = Boolean(aula?.progresso?.concluida);
  const semVideo = Boolean(aula && !aula.video_url);
  const assistiuTudo =
    semVideo ||
    jaConcluida ||
    (duration > 0 && maxAssistido >= duration - FIM_TOLERANCIA_S);

  const carregar = useCallback(() => {
    if (!access || !aulaId) return;
    resumed.current = false;
    maxAssistidoRef.current = 0;
    setMaxAssistido(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    setResultado(null);
    setRespostas({});
    setErro(null);
    apiRequest<AulaAluno>(`/aluno/aulas/${aulaId}/`, { token: access })
      .then(async (a) => {
        setAula(a);
        const pos = a.progresso?.posicao_segundos || 0;
        maxAssistidoRef.current = pos;
        setMaxAssistido(pos);
        if (a.curso_id != null) {
          apiRequest<CursoDetalhe>(`/aluno/cursos/${a.curso_id}/`, {
            token: access,
          })
            .then(setCurso)
            .catch(() => setCurso(null));
        } else {
          setCurso(null);
        }
        if (a.quiz) {
          const q = await apiRequest<QuizAluno>(`/aluno/aulas/${aulaId}/quiz/`, {
            token: access,
          });
          setQuiz(q);
        } else {
          setQuiz(null);
        }
      })
      .catch((e: Error) => setErro(e.message));
  }, [access, aulaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function patchProgresso(body: {
    posicao_segundos?: number;
    concluida?: boolean;
  }) {
    if (!access || !aulaId) return null;
    return apiRequest<ProgressoAula>(`/aluno/aulas/${aulaId}/progresso/`, {
      method: "PATCH",
      token: access,
      body,
    });
  }

  function avancarMaxAssistido(t: number) {
    if (t > maxAssistidoRef.current) {
      maxAssistidoRef.current = t;
      setMaxAssistido(t);
    }
  }

  function onTimeUpdate() {
    const el = videoRef.current;
    if (!el || !access || !aulaId) return;

    // Trava velocidade (não pode acelerar)
    if (el.playbackRate !== 1) {
      el.playbackRate = 1;
    }

    const t = el.currentTime;
    setCurrentTime(t);

    if (!jaConcluida) {
      // Só conta avanço contínuo; salto à frente é rejeitado
      if (t <= maxAssistidoRef.current + 1.25) {
        avancarMaxAssistido(t);
      } else {
        el.currentTime = maxAssistidoRef.current;
        return;
      }
    }

    const agora = Date.now();
    if (agora - lastSent.current < 5000) return;
    lastSent.current = agora;
    const pos = Math.floor(maxAssistidoRef.current);
    patchProgresso({ posicao_segundos: pos }).catch(() => undefined);
  }

  function onLoadedMetadata() {
    const el = videoRef.current;
    if (!el) return;
    const dur = el.duration || 0;
    setDuration(dur);
    if (Number.isFinite(dur) && dur > 0 && jaConcluida) {
      avancarMaxAssistido(dur);
    }
    if (!aula || resumed.current) return;
    const pos = Math.min(
      aula.progresso?.posicao_segundos || 0,
      maxAssistidoRef.current
    );
    if (pos > 0 && pos < (dur || Infinity) - 2) {
      el.currentTime = pos;
      setCurrentTime(pos);
    }
    resumed.current = true;
  }

  function onSeeking() {
    const el = videoRef.current;
    if (!el || jaConcluida) return;
    if (el.currentTime > maxAssistidoRef.current + 0.35) {
      el.currentTime = maxAssistidoRef.current;
    }
  }

  function onRateChange() {
    const el = videoRef.current;
    if (el && el.playbackRate !== 1) {
      el.playbackRate = 1;
    }
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }

  function seekNaBarra(clientX: number, track: HTMLElement) {
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    let alvo = ratio * duration;
    if (!jaConcluida) {
      // Não pode pular além do já assistido
      alvo = Math.min(alvo, maxAssistidoRef.current);
    }
    el.currentTime = alvo;
    setCurrentTime(alvo);
  }

  async function concluir() {
    if (!access || !aulaId) return;
    if (!assistiuTudo) {
      setErro("Assista o vídeo até o final para concluir a aula.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const pos = Math.floor(maxAssistidoRef.current || currentTime);
      const prog = await patchProgresso({
        concluida: true,
        posicao_segundos: pos,
      });
      if (prog && aula) {
        setAula({ ...aula, progresso: prog });
      }
      if (aula?.curso_id != null && access) {
        apiRequest<CursoDetalhe>(`/aluno/cursos/${aula.curso_id}/`, {
          token: access,
        })
          .then(setCurso)
          .catch(() => undefined);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function enviarQuiz() {
    if (!access || !aulaId || !quiz) return;
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        respostas: quiz.perguntas.map((p) => ({
          pergunta_id: p.id,
          alternativa_id: respostas[p.id],
        })),
      };
      if (payload.respostas.some((r) => !r.alternativa_id)) {
        throw new Error("Responda todas as perguntas.");
      }
      const t = await apiRequest<TentativaQuiz>(`/aluno/aulas/${aulaId}/quiz/`, {
        method: "POST",
        token: access,
        body: payload,
      });
      setResultado(t);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no quiz");
    } finally {
      setSalvando(false);
    }
  }

  const aulaAtualId = Number(aulaId);
  const pctAssistido = duration > 0 ? Math.min(100, (maxAssistido / duration) * 100) : 0;
  const pctAtual = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="player-page">
      <div className="page-head">
        <div>
          {aula?.curso_id != null && (
            <Link
              to={`/meus-cursos/${aula.curso_id}`}
              className="btn btn--ghost btn--small"
            >
              ← Voltar ao curso
            </Link>
          )}
          <h1 style={{ marginTop: "0.75rem" }}>{aula?.titulo || "Aula"}</h1>
          {aula?.modulo_titulo && (
            <p className="page-lead">{aula.modulo_titulo}</p>
          )}
        </div>
      </div>
      {erro && <p className="form-erro">{erro}</p>}
      {!aula && !erro && <p className="portal-muted">Carregando…</p>}
      {aula && (
        <div className="player-layout">
          <div className="player-layout__main">
            <div className="player-frame">
              {aula.video_url ? (
                <>
                  <video
                    ref={videoRef}
                    key={aula.id}
                    src={aula.video_url}
                    playsInline
                    controls={false}
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate"
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onLoadedMetadata}
                    onSeeking={onSeeking}
                    onRateChange={onRateChange}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => {
                      const el = videoRef.current;
                      if (el) avancarMaxAssistido(el.duration || maxAssistidoRef.current);
                      setPlaying(false);
                    }}
                    onClick={togglePlay}
                  />
                  <div className="vbar">
                    <button
                      type="button"
                      className="vbar__btn"
                      onClick={togglePlay}
                      aria-label={playing ? "Pausar" : "Reproduzir"}
                    >
                      {playing ? "❚❚" : "▶"}
                    </button>
                    <div
                      className="vbar__track"
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={Math.floor(duration)}
                      aria-valuenow={Math.floor(currentTime)}
                      aria-label="Progresso do vídeo"
                      tabIndex={0}
                      onClick={(e) => seekNaBarra(e.clientX, e.currentTarget)}
                      onKeyDown={(e) => {
                        const el = videoRef.current;
                        if (!el) return;
                        const step = e.key === "ArrowRight" ? 5 : e.key === "ArrowLeft" ? -5 : 0;
                        if (!step) return;
                        e.preventDefault();
                        let alvo = el.currentTime + step;
                        if (!jaConcluida) {
                          alvo = Math.min(alvo, maxAssistidoRef.current);
                        }
                        alvo = Math.max(0, Math.min(alvo, duration || alvo));
                        el.currentTime = alvo;
                        setCurrentTime(alvo);
                      }}
                    >
                      <div
                        className="vbar__watched"
                        style={{ width: `${pctAssistido}%` }}
                      />
                      <div
                        className="vbar__played"
                        style={{ width: `${pctAtual}%` }}
                      />
                      <div
                        className="vbar__thumb"
                        style={{ left: `${pctAtual}%` }}
                      />
                    </div>
                    <span className="vbar__time">
                      {formatTempo(currentTime)} / {formatTempo(duration)}
                    </span>
                    <button
                      type="button"
                      className="vbar__btn"
                      onClick={() => {
                        const el = videoRef.current;
                        if (!el) return;
                        el.muted = !el.muted;
                        setMuted(el.muted);
                      }}
                      aria-label={muted ? "Ativar som" : "Silenciar"}
                    >
                      {muted ? "Mudo" : "Som"}
                    </button>
                    <button
                      type="button"
                      className="vbar__btn"
                      onClick={() => {
                        const frame = videoRef.current?.closest(".player-frame");
                        if (!frame) return;
                        if (document.fullscreenElement) {
                          document.exitFullscreen().catch(() => undefined);
                        } else {
                          frame.requestFullscreen?.().catch(() => undefined);
                        }
                      }}
                      aria-label="Tela cheia"
                    >
                      Cheia
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-box">
                  <p>Vídeo ainda não disponível para esta aula.</p>
                </div>
              )}
            </div>
            {aula.video_url && !jaConcluida && (
              <p className="player-hint">
                {assistiuTudo
                  ? "Você assistiu até o fim — pode concluir a aula."
                  : "Assista o vídeo por completo (sem pular ou acelerar) para liberar Concluir."}
              </p>
            )}
            {aula.descricao && <p className="aula-desc">{aula.descricao}</p>}

            {(aula.materiais || []).length > 0 && (
              <section className="bento-cell" style={{ marginTop: "1rem" }}>
                <h2>Materiais</h2>
                <ul className="aula-list">
                  {aula.materiais!.map((m) => (
                    <li key={m.id}>
                      {m.arquivo_url ? (
                        <a href={m.arquivo_url} target="_blank" rel="noreferrer">
                          {m.titulo}
                        </a>
                      ) : (
                        m.titulo
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {quiz && (
              <section className="bento-cell" style={{ marginTop: "1rem" }}>
                <h2>{quiz.titulo}</h2>
                <p className="portal-muted">
                  Nota mínima: {quiz.nota_minima}%
                  {quiz.aprovado ? " · Você já foi aprovado" : ""}
                  {quiz.ultima_nota != null
                    ? ` · Última nota: ${quiz.ultima_nota}%`
                    : ""}
                </p>
                {resultado && (
                  <p className={resultado.aprovado ? "form-ok" : "form-erro"}>
                    Nota {resultado.nota}% —{" "}
                    {resultado.aprovado ? "Aprovado" : "Reprovado"}
                  </p>
                )}
                {!quiz.aprovado &&
                  quiz.perguntas.map((p) => (
                    <fieldset
                      key={p.id}
                      style={{ marginBottom: "1rem", border: "none" }}
                    >
                      <legend>{p.enunciado}</legend>
                      {p.alternativas.map((a) => (
                        <label key={a.id} className="check-row">
                          <input
                            type="radio"
                            name={`perg-${p.id}`}
                            checked={respostas[p.id] === a.id}
                            onChange={() =>
                              setRespostas((r) => ({ ...r, [p.id]: a.id }))
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
                    onClick={enviarQuiz}
                    disabled={salvando}
                  >
                    {salvando ? "Enviando…" : "Enviar respostas"}
                  </button>
                )}
              </section>
            )}

            <div className="player-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={concluir}
                disabled={
                  salvando ||
                  aula.progresso?.concluida ||
                  (!semVideo && !assistiuTudo)
                }
                title={
                  !assistiuTudo && !jaConcluida
                    ? "Assista o vídeo até o final"
                    : undefined
                }
              >
                {aula.progresso?.concluida
                  ? "Aula concluída"
                  : salvando
                    ? "Salvando…"
                    : !assistiuTudo
                      ? "Assista até o fim"
                      : "Concluir aula"}
              </button>
              <div className="player-nav">
                {aula.aula_anterior_id != null ? (
                  <Link
                    to={`/aulas/${aula.aula_anterior_id}`}
                    className="btn btn--ghost btn--small"
                  >
                    Anterior
                  </Link>
                ) : (
                  <span />
                )}
                {aula.aula_proxima_id != null ? (
                  <Link
                    to={`/aulas/${aula.aula_proxima_id}`}
                    className="btn btn--ghost btn--small"
                  >
                    Próxima
                  </Link>
                ) : aula.proxima_bloqueada ? (
                  <span className="portal-muted">Aprove o quiz para avançar</span>
                ) : (
                  <span />
                )}
              </div>
            </div>
          </div>

          <aside className="player-sidebar" aria-label="Conteúdo do curso">
            <div className="player-sidebar__head">
              <h2>{curso?.titulo || "Conteúdo"}</h2>
              {curso && (
                <p className="portal-muted">
                  {curso.aulas_concluidas}/{curso.aulas_total} aulas ·{" "}
                  {curso.progresso_pct}%
                </p>
              )}
            </div>
            {!curso && <p className="portal-muted">Carregando outline…</p>}
            {curso && curso.modulos.length === 0 && (
              <p className="portal-muted">Nenhum módulo publicado.</p>
            )}
            <div className="player-sidebar__mods">
              {curso?.modulos.map((m) => {
                const atual = m.id === aula.modulo_id;
                return (
                  <section
                    key={m.id}
                    className={`player-mod${atual ? " player-mod--atual" : ""}`}
                  >
                    <h3 className="player-mod__title">{m.titulo}</h3>
                    <ul className="player-mod__list">
                      {m.aulas.map((a) => {
                        const ativa = a.id === aulaAtualId;
                        return (
                          <li key={a.id}>
                            <Link
                              to={`/aulas/${a.id}`}
                              className={`player-mod__aula${ativa ? " player-mod__aula--ativa" : ""}${a.progresso?.concluida ? " player-mod__aula--ok" : ""}`}
                              aria-current={ativa ? "page" : undefined}
                            >
                              <span className="player-mod__mark" aria-hidden>
                                {a.progresso?.concluida ? "✓" : ativa ? "▶" : "○"}
                              </span>
                              <span className="player-mod__aula-titulo">
                                {a.titulo}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    {(m.atividades?.length ?? 0) > 0 && (
                      <ul className="player-mod__atividades" aria-label="Atividades do módulo">
                        {m.atividades!.map((at) => (
                          <li key={at.id} className="player-mod__atividade">
                            <span className="player-mod__mark" aria-hidden>
                              {at.aprovado ? "✓" : "◇"}
                            </span>
                            <span>
                              {at.titulo}
                              {at.aprovado ? (
                                <span className="portal-muted"> · ok</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
