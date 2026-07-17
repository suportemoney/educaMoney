import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  apiFormData,
  apiRequest,
  type AlternativaAdmin,
  type AulaAdmin,
  type Curso,
  type MaterialAula,
  type Modulo,
  type PerguntaAdmin,
  type QuizAdmin,
} from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const moduloVazio = { titulo: "", ativo: true };
const aulaVazia = {
  titulo: "",
  descricao: "",
  ativo: true,
  videoFile: null as File | null,
};
const matVazio = { titulo: "", ordem: 0, ativo: true, arquivo: null as File | null };
const quizVazio = {
  titulo: "Atividade",
  nota_minima: 70,
  bloqueia_proxima: false,
  ativo: true,
};
const provaVazia = {
  titulo: "Prova avaliadora",
  nota_minima: 70,
  bloqueia_proxima: false,
  ativo: true,
};
const perguntaVazia = { enunciado: "", ordem: 0 };
const altVazia = { texto: "", correta: false, ordem: 0 };

type QuizEditorAlvo = "prova" | "atividade";

function quizValido(q: QuizAdmin | null | undefined): q is QuizAdmin {
  return !!q && typeof q.id === "number" && Number.isFinite(q.id);
}

/** Próxima ordem = 1 + maior existente (ou 0 se lista vazia). */
function proximaOrdem(itens: { ordem: number }[]): number {
  if (!itens.length) return 0;
  return Math.max(...itens.map((i) => i.ordem ?? 0)) + 1;
}

export function CursoConteudoPage() {
  const { cursoId } = useParams<{ cursoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { access } = useAuth();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloSel, setModuloSel] = useState<number | null>(null);
  const [aulas, setAulas] = useState<AulaAdmin[]>([]);
  const [materiais, setMateriais] = useState<MaterialAula[]>([]);
  const [atividades, setAtividades] = useState<QuizAdmin[]>([]);
  const [atividadeSel, setAtividadeSel] = useState<number | null>(null);
  const [prova, setProva] = useState<QuizAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [modalModulo, setModalModulo] = useState(false);
  const [editModulo, setEditModulo] = useState<Modulo | null>(null);
  const [formModulo, setFormModulo] = useState(moduloVazio);

  const [modalAula, setModalAula] = useState(false);
  const [editAula, setEditAula] = useState<AulaAdmin | null>(null);
  const [formAula, setFormAula] = useState(aulaVazia);

  const [modalMat, setModalMat] = useState(false);
  const [editMat, setEditMat] = useState<MaterialAula | null>(null);
  const [formMat, setFormMat] = useState(matVazio);

  const [modalQuiz, setModalQuiz] = useState(false);
  const [quizEditorAlvo, setQuizEditorAlvo] = useState<QuizEditorAlvo>("atividade");
  const [editQuizId, setEditQuizId] = useState<number | null>(null);
  const [formQuiz, setFormQuiz] = useState(quizVazio);

  const [modalPerg, setModalPerg] = useState(false);
  const [editPerg, setEditPerg] = useState<PerguntaAdmin | null>(null);
  const [formPerg, setFormPerg] = useState(perguntaVazia);
  const [pergQuizId, setPergQuizId] = useState<number | null>(null);

  const [modalAlt, setModalAlt] = useState(false);
  const [pergAltId, setPergAltId] = useState<number | null>(null);
  const [editAlt, setEditAlt] = useState<AlternativaAdmin | null>(null);
  const [formAlt, setFormAlt] = useState(altVazia);

  const [salvando, setSalvando] = useState(false);

  const moduloAtual = useMemo(
    () => modulos.find((m) => m.id === moduloSel) || null,
    [modulos, moduloSel]
  );
  const atividadeAtual = useMemo(
    () => atividades.find((a) => a.id === atividadeSel) || null,
    [atividades, atividadeSel]
  );

  const quizAvisos = useMemo(() => {
    const avisosDe = (q: QuizAdmin | null) => {
      if (!q) return [] as string[];
      const avisos: string[] = [];
      const pergs = q.perguntas || [];
      if (!pergs.length) avisos.push("Sem perguntas.");
      else if (pergs.some((p) => !(p.alternativas || []).some((a) => a.correta))) {
        avisos.push("Há pergunta sem alternativa correta (gabarito).");
      }
      return avisos;
    };
    return { prova: avisosDe(prova), atividade: avisosDe(atividadeAtual) };
  }, [prova, atividadeAtual]);

  function syncUrl(mid: number | null) {
    if (!cursoId) return;
    const params = new URLSearchParams();
    if (mid != null) params.set("modulo", String(mid));
    const qs = params.toString();
    navigate(`/cursos/${cursoId}/conteudo${qs ? `?${qs}` : ""}`, { replace: true });
  }

  function selecionarModulo(id: number) {
    const next = moduloSel === id ? null : id;
    setModuloSel(next);
    setAtividadeSel(null);
    syncUrl(next);
  }

  async function carregarCursoEModulos() {
    if (!access || !cursoId) return;
    const id = Number(cursoId);
    const [c, m, p] = await Promise.all([
      apiRequest<Curso>(`/admin/cursos/${id}/`, { token: access }),
      apiRequest<Modulo[]>(`/admin/cursos/${id}/modulos/`, { token: access }),
      apiRequest<QuizAdmin | null>(`/admin/cursos/${id}/prova/`, { token: access }),
    ]);
    setCurso(c);
    setModulos(Array.isArray(m) ? m : []);
    setProva(quizValido(p) ? p : null);

    const midQ = Number(searchParams.get("modulo") || "") || null;
    const mid = midQ && m.some((x) => x.id === midQ) ? midQ : null;
    setModuloSel(mid);
  }

  async function carregarModuloExtra(mid: number) {
    if (!access) return;
    const [listAulas, mats, atvs] = await Promise.all([
      apiRequest<AulaAdmin[]>(`/admin/modulos/${mid}/aulas/`, { token: access }),
      apiRequest<MaterialAula[]>(`/admin/modulos/${mid}/materiais/`, { token: access }),
      apiRequest<QuizAdmin[]>(`/admin/modulos/${mid}/atividades/`, { token: access }),
    ]);
    const aulasOk = Array.isArray(listAulas) ? listAulas : [];
    const matsOk = Array.isArray(mats) ? mats : [];
    const atvsOk = Array.isArray(atvs) ? atvs.filter(quizValido) : [];
    setAulas(aulasOk);
    setMateriais(matsOk);
    setAtividades(atvsOk);
    setAtividadeSel((prev) =>
      prev != null && atvsOk.some((x) => x.id === prev) ? prev : atvsOk[0]?.id ?? null
    );
  }

  async function recarregarProva() {
    if (!access || !cursoId) return;
    const p = await apiRequest<QuizAdmin | null>(`/admin/cursos/${cursoId}/prova/`, {
      token: access,
    });
    setProva(quizValido(p) ? p : null);
  }

  async function recarregarAtividades() {
    if (!access || moduloSel == null) return;
    const atvs = await apiRequest<QuizAdmin[]>(
      `/admin/modulos/${moduloSel}/atividades/`,
      { token: access }
    );
    const atvsOk = Array.isArray(atvs) ? atvs.filter(quizValido) : [];
    setAtividades(atvsOk);
    setAtividadeSel((prev) =>
      prev != null && atvsOk.some((x) => x.id === prev) ? prev : atvsOk[0]?.id ?? null
    );
  }

  useEffect(() => {
    carregarCursoEModulos().catch((e: Error) => setErro(e.message));
  }, [access, cursoId]);

  useEffect(() => {
    if (moduloSel == null) {
      setAulas([]);
      setMateriais([]);
      setAtividades([]);
      setAtividadeSel(null);
      return;
    }
    carregarModuloExtra(moduloSel).catch((e: Error) => setErro(e.message));
  }, [access, moduloSel]);

  function abrirNovoModulo() {
    setEditModulo(null);
    setFormModulo(moduloVazio);
    setModalModulo(true);
  }

  function abrirEditarModulo(m: Modulo) {
    setEditModulo(m);
    setFormModulo({ titulo: m.titulo, ativo: m.ativo });
    setModalModulo(true);
  }

  async function salvarModulo(e: FormEvent) {
    e.preventDefault();
    if (!access || !cursoId) return;
    setSalvando(true);
    setErro(null);
    try {
      if (editModulo) {
        await apiRequest(`/admin/modulos/${editModulo.id}/`, {
          method: "PATCH",
          token: access,
          body: formModulo,
        });
      } else {
        await apiRequest(`/admin/cursos/${cursoId}/modulos/`, {
          method: "POST",
          token: access,
          body: formModulo,
        });
      }
      setModalModulo(false);
      await carregarCursoEModulos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar módulo");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirModulo(m: Modulo) {
    if (!access || !confirm(`Excluir (inativar) o módulo "${m.titulo}"?`)) return;
    await apiRequest(`/admin/modulos/${m.id}/`, { method: "DELETE", token: access });
    if (moduloSel === m.id) {
      setModuloSel(null);
      syncUrl(null);
    }
    await carregarCursoEModulos();
  }

  function abrirNovaAula() {
    setEditAula(null);
    setFormAula(aulaVazia);
    setModalAula(true);
  }

  function abrirEditarAula(a: AulaAdmin) {
    setEditAula(a);
    setFormAula({
      titulo: a.titulo,
      descricao: a.descricao || "",
      ativo: a.ativo,
      videoFile: null,
    });
    setModalAula(true);
  }

  async function salvarAula(e: FormEvent) {
    e.preventDefault();
    if (!access || moduloSel == null) return;
    setSalvando(true);
    setErro(null);
    const fd = new FormData();
    fd.append("titulo", formAula.titulo);
    fd.append("descricao", formAula.descricao);
    fd.append("ativo", formAula.ativo ? "true" : "false");
    if (formAula.videoFile) fd.append("video", formAula.videoFile);
    try {
      if (editAula) {
        await apiFormData(`/admin/aulas/${editAula.id}/`, {
          method: "PATCH",
          token: access,
          formData: fd,
        });
      } else {
        await apiFormData(`/admin/modulos/${moduloSel}/aulas/`, {
          method: "POST",
          token: access,
          formData: fd,
        });
      }
      setModalAula(false);
      await carregarModuloExtra(moduloSel);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar aula");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirAula(a: AulaAdmin) {
    if (!access || !confirm(`Excluir (inativar) a aula "${a.titulo}"?`)) return;
    await apiRequest(`/admin/aulas/${a.id}/`, { method: "DELETE", token: access });
    if (moduloSel != null) await carregarModuloExtra(moduloSel);
  }

  const [dragModuloId, setDragModuloId] = useState<number | null>(null);
  const [dragAulaId, setDragAulaId] = useState<number | null>(null);

  async function reordenarModulos(ids: number[]) {
    if (!access || !cursoId) return;
    setModulos((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      return ids.map((id, i) => ({ ...map.get(id)!, ordem: i })).filter(Boolean);
    });
    try {
      await apiRequest(`/admin/cursos/${cursoId}/modulos/reordenar/`, {
        method: "POST",
        token: access,
        body: { ids },
      });
      await carregarCursoEModulos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao reordenar módulos");
      await carregarCursoEModulos();
    }
  }

  async function reordenarAulas(ids: number[]) {
    if (!access || moduloSel == null) return;
    setAulas((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      return ids.map((id, i) => ({ ...map.get(id)!, ordem: i })).filter(Boolean);
    });
    try {
      await apiRequest(`/admin/modulos/${moduloSel}/aulas/reordenar/`, {
        method: "POST",
        token: access,
        body: { ids },
      });
      await carregarModuloExtra(moduloSel);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao reordenar aulas");
      await carregarModuloExtra(moduloSel);
    }
  }

  function onDropModulo(targetId: number) {
    if (dragModuloId == null || dragModuloId === targetId) {
      setDragModuloId(null);
      return;
    }
    const ids = modulos.map((m) => m.id);
    const from = ids.indexOf(dragModuloId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragModuloId(null);
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, dragModuloId);
    setDragModuloId(null);
    reordenarModulos(ids);
  }

  function onDropAula(targetId: number) {
    if (dragAulaId == null || dragAulaId === targetId) {
      setDragAulaId(null);
      return;
    }
    const ids = aulas.map((a) => a.id);
    const from = ids.indexOf(dragAulaId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragAulaId(null);
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, dragAulaId);
    setDragAulaId(null);
    reordenarAulas(ids);
  }

  function formatDuracao(seg: number | null | undefined): string {
    if (seg == null || seg <= 0) return "—";
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
  }

  async function salvarMaterial(e: FormEvent) {
    e.preventDefault();
    if (!access || moduloSel == null) return;
    setSalvando(true);
    setErro(null);
    const fd = new FormData();
    fd.append("titulo", formMat.titulo);
    fd.append("ordem", String(formMat.ordem));
    fd.append("ativo", formMat.ativo ? "true" : "false");
    if (formMat.arquivo) fd.append("arquivo", formMat.arquivo);
    try {
      if (editMat) {
        await apiFormData(`/admin/materiais/${editMat.id}/`, {
          method: "PATCH",
          token: access,
          formData: fd,
        });
      } else {
        if (!formMat.arquivo) throw new Error("Envie um arquivo.");
        await apiFormData(`/admin/modulos/${moduloSel}/materiais/`, {
          method: "POST",
          token: access,
          formData: fd,
        });
      }
      setModalMat(false);
      await carregarModuloExtra(moduloSel);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar material");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMaterial(m: MaterialAula) {
    if (!access || !confirm(`Excluir material "${m.titulo}"?`)) return;
    await apiRequest(`/admin/materiais/${m.id}/`, { method: "DELETE", token: access });
    if (moduloSel != null) await carregarModuloExtra(moduloSel);
  }

  function abrirModalQuiz(alvo: QuizEditorAlvo, existente: QuizAdmin | null) {
    setQuizEditorAlvo(alvo);
    const ok = quizValido(existente) ? existente : null;
    setEditQuizId(ok?.id ?? null);
    setErro(null);
    if (ok) {
      setFormQuiz({
        titulo: ok.titulo,
        nota_minima: ok.nota_minima,
        bloqueia_proxima: ok.bloqueia_proxima,
        ativo: ok.ativo,
      });
    } else {
      setFormQuiz(alvo === "prova" ? provaVazia : quizVazio);
    }
    setModalQuiz(true);
  }

  async function salvarQuiz(e: FormEvent) {
    e.preventDefault();
    if (!access || !cursoId) return;
    setSalvando(true);
    setErro(null);
    try {
      if (quizEditorAlvo === "prova") {
        if (quizValido(prova)) {
          await apiRequest(`/admin/quizzes/${prova.id}/`, {
            method: "PATCH",
            token: access,
            body: formQuiz,
          });
        } else {
          await apiRequest(`/admin/cursos/${cursoId}/prova/`, {
            method: "POST",
            token: access,
            body: formQuiz,
          });
        }
        setModalQuiz(false);
        setEditQuizId(null);
        await recarregarProva();
      } else {
        if (moduloSel == null) {
          setErro("Selecione um módulo antes de salvar a atividade.");
          return;
        }
        if (editQuizId != null) {
          await apiRequest(`/admin/quizzes/${editQuizId}/`, {
            method: "PATCH",
            token: access,
            body: formQuiz,
          });
        } else {
          await apiRequest(`/admin/modulos/${moduloSel}/atividades/`, {
            method: "POST",
            token: access,
            body: formQuiz,
          });
        }
        setModalQuiz(false);
        setEditQuizId(null);
        await recarregarAtividades();
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirQuiz(q: QuizAdmin, alvo: QuizEditorAlvo) {
    if (!access || !confirm(`Inativar "${q.titulo}"?`)) return;
    await apiRequest(`/admin/quizzes/${q.id}/`, { method: "DELETE", token: access });
    if (alvo === "prova") await recarregarProva();
    else await recarregarAtividades();
  }

  async function salvarPergunta(e: FormEvent) {
    e.preventDefault();
    if (!access || pergQuizId == null) return;
    setSalvando(true);
    try {
      if (editPerg) {
        await apiRequest(`/admin/perguntas/${editPerg.id}/`, {
          method: "PATCH",
          token: access,
          body: formPerg,
        });
      } else {
        await apiRequest(`/admin/quizzes/${pergQuizId}/perguntas/`, {
          method: "POST",
          token: access,
          body: formPerg,
        });
      }
      setModalPerg(false);
      if (prova?.id === pergQuizId) await recarregarProva();
      else await recarregarAtividades();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar pergunta");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirPergunta(p: PerguntaAdmin, quizId: number) {
    if (!access || !confirm("Excluir pergunta?")) return;
    await apiRequest(`/admin/perguntas/${p.id}/`, { method: "DELETE", token: access });
    if (prova?.id === quizId) await recarregarProva();
    else await recarregarAtividades();
  }

  async function salvarAlt(e: FormEvent) {
    e.preventDefault();
    if (!access || pergAltId == null || pergQuizId == null) return;
    setSalvando(true);
    try {
      if (editAlt) {
        await apiRequest(`/admin/alternativas/${editAlt.id}/`, {
          method: "PATCH",
          token: access,
          body: formAlt,
        });
      } else {
        await apiRequest(`/admin/perguntas/${pergAltId}/alternativas/`, {
          method: "POST",
          token: access,
          body: formAlt,
        });
      }
      setModalAlt(false);
      setEditAlt(null);
      if (prova?.id === pergQuizId) await recarregarProva();
      else await recarregarAtividades();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar alternativa");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirAlt(id: number, quizId: number) {
    if (!access || !confirm("Excluir alternativa?")) return;
    await apiRequest(`/admin/alternativas/${id}/`, { method: "DELETE", token: access });
    if (prova?.id === quizId) await recarregarProva();
    else await recarregarAtividades();
  }

  function renderQuizPerguntas(q: QuizAdmin) {
    const avisos = q === prova ? quizAvisos.prova : quizAvisos.atividade;
    const perguntas = q.perguntas || [];

    return (
      <div className="quiz-perguntas">
        {avisos.map((a) => (
          <p key={a} className="form-erro">
            {a}
          </p>
        ))}
        <div className="page-head">
          <h4>Perguntas</h4>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => {
              setPergQuizId(q.id);
              setEditPerg(null);
              setFormPerg({
                enunciado: "",
                ordem: proximaOrdem(perguntas),
              });
              setModalPerg(true);
            }}
          >
            Nova pergunta
          </button>
        </div>

        {perguntas.length === 0 && (
          <p className="quiz-perguntas__empty">Nenhuma pergunta ainda.</p>
        )}

        <ul className="quiz-perguntas__list">
          {perguntas.map((p, idx) => {
            const alts = [...(p.alternativas || [])].sort(
              (a, b) => a.ordem - b.ordem || a.id - b.id
            );
            return (
              <li key={p.id} className="quiz-perg">
                <header className="quiz-perg__head">
                  <span className="quiz-perg__n">{idx + 1}</span>
                  <p className="quiz-perg__enunciado">{p.enunciado}</p>
                  <div className="quiz-perg__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => {
                        setPergQuizId(q.id);
                        setEditPerg(p);
                        setFormPerg({ enunciado: p.enunciado, ordem: p.ordem });
                        setModalPerg(true);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => excluirPergunta(p, q.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </header>

                <ul className="quiz-alts">
                  {alts.map((a, ai) => (
                    <li
                      key={a.id}
                      className={`quiz-alt${a.correta ? " quiz-alt--ok" : ""}`}
                    >
                      <span className="quiz-alt__letra" aria-hidden>
                        {String.fromCharCode(65 + ai)}
                      </span>
                      <span className="quiz-alt__texto">{a.texto}</span>
                      {a.correta && (
                        <span className="badge badge--ok quiz-alt__badge">correta</span>
                      )}
                      <div className="quiz-alt__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          title="Editar alternativa"
                          onClick={() => {
                            setPergQuizId(q.id);
                            setPergAltId(p.id);
                            setEditAlt(a);
                            setFormAlt({
                              texto: a.texto,
                              correta: a.correta,
                              ordem: a.ordem,
                            });
                            setModalAlt(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          title="Excluir alternativa"
                          onClick={() => excluirAlt(a.id, q.id)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="btn btn--ghost btn--small quiz-perg__add-alt"
                  onClick={() => {
                    setPergQuizId(q.id);
                    setPergAltId(p.id);
                    setEditAlt(null);
                    setFormAlt({
                      texto: "",
                      correta: false,
                      ordem: proximaOrdem(alts),
                    });
                    setModalAlt(true);
                  }}
                >
                  + Alternativa
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <nav className="breadcrumb" aria-label="Navegação">
        <Link to="/cursos">Cursos</Link>
        <span className="breadcrumb__sep">›</span>
        <span>{curso?.titulo || "…"}</span>
        {moduloAtual && (
          <>
            <span className="breadcrumb__sep">›</span>
            <span>{moduloAtual.titulo}</span>
          </>
        )}
      </nav>

      <div className="page-head">
        <div>
          <h1>Conteúdo{curso ? `: ${curso.titulo}` : ""}</h1>
        </div>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovoModulo}>
          Novo módulo
        </button>
      </div>
      <p className="page-lead">
        Curso → módulos (arraste para reordenar). No módulo: aulas, materiais e atividades.
        Vídeo: duração e conversão .webm automáticas. Prova avaliadora fora do módulo.
      </p>
      {erro && <p className="form-erro">{erro}</p>}

      <ol className="conteudo-cascade">
        <li className="conteudo-cascade__step">
          <header className="conteudo-cascade__head">
            <span className="conteudo-cascade__n">1</span>
            <div>
              <h2>Módulos</h2>
              <p className="conteudo-cascade__hint">
                Clique para abrir aulas, materiais e atividades
              </p>
            </div>
          </header>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="td-drag" aria-label="Arrastar"></th>
                  <th>Módulo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr
                    key={m.id}
                    className={moduloSel === m.id ? "row-selected" : undefined}
                    draggable
                    onDragStart={(e) => {
                      setDragModuloId(m.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDropModulo(m.id);
                    }}
                    onClick={() => selecionarModulo(m.id)}
                  >
                    <td className="td-drag" title="Arraste para reordenar">
                      ⋮⋮
                    </td>
                    <td>{m.titulo}</td>
                    <td>
                      <span className={`badge ${m.ativo ? "badge--ok" : "badge--off"}`}>
                        {m.ativo ? "Ativo" : "Off"}
                      </span>
                    </td>
                    <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => abrirEditarModulo(m)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => excluirModulo(m)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {modulos.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      Nenhum módulo.{" "}
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={abrirNovoModulo}
                      >
                        Novo módulo
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </li>

        {moduloSel != null && (
          <li className="conteudo-cascade__step conteudo-cascade__step--nested">
            <header className="conteudo-cascade__head">
              <span className="conteudo-cascade__n">2</span>
              <div>
                <h2>Módulo: {moduloAtual?.titulo}</h2>
                <p className="conteudo-cascade__hint">Aulas · Materiais · Atividades</p>
              </div>
            </header>

            <div className="conteudo-modulo-grid">
              <section className="conteudo-cascade__child">
                <div className="page-head">
                  <h3>Aulas</h3>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={abrirNovaAula}
                  >
                    Nova aula
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="td-drag" aria-label="Arrastar"></th>
                        <th>Título</th>
                        <th>Vídeo</th>
                        <th>Duração</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {aulas.map((a) => (
                        <tr
                          key={a.id}
                          draggable
                          onDragStart={(e) => {
                            setDragAulaId(a.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            onDropAula(a.id);
                          }}
                        >
                          <td className="td-drag" title="Arraste para reordenar">
                            ⋮⋮
                          </td>
                          <td>
                            {a.titulo}{" "}
                            <span className={`badge ${a.ativo ? "badge--ok" : "badge--off"}`}>
                              {a.ativo ? "Ativo" : "Off"}
                            </span>
                          </td>
                          <td>{a.video_url ? "Sim" : "—"}</td>
                          <td>{formatDuracao(a.duracao_segundos)}</td>
                          <td className="td-actions">
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => abrirEditarAula(a)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => excluirAula(a)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                      {aulas.length === 0 && (
                        <tr>
                          <td colSpan={5}>Nenhuma aula.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="conteudo-cascade__child">
                <div className="page-head">
                  <h3>Materiais</h3>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => {
                      setEditMat(null);
                      setFormMat(matVazio);
                      setModalMat(true);
                    }}
                  >
                    Novo material
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Arquivo</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {materiais.map((m) => (
                        <tr key={m.id}>
                          <td>{m.titulo}</td>
                          <td>
                            {m.arquivo_url ? (
                              <a href={m.arquivo_url} target="_blank" rel="noreferrer">
                                Abrir
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="td-actions">
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => {
                                setEditMat(m);
                                setFormMat({
                                  titulo: m.titulo,
                                  ordem: m.ordem,
                                  ativo: m.ativo,
                                  arquivo: null,
                                });
                                setModalMat(true);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => excluirMaterial(m)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                      {materiais.length === 0 && (
                        <tr>
                          <td colSpan={3}>Nenhum material.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="conteudo-cascade__child">
                <div className="page-head">
                  <h3>Atividades</h3>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => abrirModalQuiz("atividade", null)}
                  >
                    Nova atividade
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Nota mín.</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {atividades.map((a) => (
                        <tr
                          key={a.id}
                          className={atividadeSel === a.id ? "row-selected" : undefined}
                          onClick={() => setAtividadeSel(a.id)}
                        >
                          <td>{a.titulo}</td>
                          <td>{a.nota_minima}%</td>
                          <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => abrirModalQuiz("atividade", a)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => excluirQuiz(a, "atividade")}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                      {atividades.length === 0 && (
                        <tr>
                          <td colSpan={3}>Nenhuma atividade.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {atividadeAtual && (
                  <div className="conteudo-cascade__quiz-body">
                    <p className="page-lead">
                      {atividadeAtual.titulo} — nota mín. {atividadeAtual.nota_minima}%
                    </p>
                    {renderQuizPerguntas(atividadeAtual)}
                  </div>
                )}
              </section>
            </div>
          </li>
        )}

        <li className="conteudo-cascade__step">
          <header className="conteudo-cascade__head">
            <span className="conteudo-cascade__n">★</span>
            <div>
              <h2>Prova avaliadora do curso</h2>
              <p className="conteudo-cascade__hint">
                Fora dos módulos · aprovação libera o certificado
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={() => abrirModalQuiz("prova", prova)}
              >
                {quizValido(prova) ? "Editar prova" : "Nova prova"}
              </button>
              {quizValido(prova) && (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => excluirQuiz(prova, "prova")}
                >
                  Excluir
                </button>
              )}
            </div>
          </header>
          {!quizValido(prova) && (
            <p className="page-lead">
              Nenhuma prova cadastrada. Sem prova, o certificado usa o fluxo legado (quizzes de
              aula, se houver).
            </p>
          )}
          {quizValido(prova) && (
            <div className="conteudo-cascade__quiz-body">
              <p className="page-lead">
                {prova.titulo} — nota mín. {prova.nota_minima}%
              </p>
              {renderQuizPerguntas(prova)}
            </div>
          )}
        </li>
      </ol>

      <Modal
        aberto={modalModulo}
        titulo={editModulo ? "Editar módulo" : "Novo módulo"}
        onFechar={() => setModalModulo(false)}
      >
        <form className="form-grid" onSubmit={salvarModulo}>
          <label>
            Título
            <input
              value={formModulo.titulo}
              onChange={(e) => setFormModulo({ ...formModulo, titulo: e.target.value })}
              required
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={formModulo.ativo}
              onChange={(e) =>
                setFormModulo({ ...formModulo, ativo: e.target.checked })
              }
            />
            Ativo
          </label>
          <p className="page-lead" style={{ margin: 0, fontSize: "0.85rem" }}>
            A ordem é definida ao criar; arraste na lista para reordenar.
          </p>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        aberto={modalAula}
        titulo={editAula ? "Editar aula" : "Nova aula"}
        onFechar={() => setModalAula(false)}
      >
        <form className="form-grid" onSubmit={salvarAula}>
          <label>
            Título
            <input
              value={formAula.titulo}
              onChange={(e) => setFormAula({ ...formAula, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Descrição
            <textarea
              value={formAula.descricao}
              onChange={(e) => setFormAula({ ...formAula, descricao: e.target.value })}
              rows={3}
            />
          </label>
          <label>
            Vídeo (.mp4 / .webm)
            <input
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              onChange={(e) =>
                setFormAula({ ...formAula, videoFile: e.target.files?.[0] ?? null })
              }
            />
          </label>
          {editAula?.duracao_segundos != null && (
            <p className="page-lead" style={{ margin: 0, fontSize: "0.85rem" }}>
              Duração atual: {formatDuracao(editAula.duracao_segundos)} (calculada pelo
              sistema)
            </p>
          )}
          <p className="page-lead" style={{ margin: 0, fontSize: "0.85rem" }}>
            Ao enviar .mp4, o servidor mede a duração e converte para .webm quando possível.
            Ordem: arraste na lista de aulas.
          </p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={formAula.ativo}
              onChange={(e) => setFormAula({ ...formAula, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? (formAula.videoFile ? "Processando vídeo…" : "Salvando…") : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        aberto={modalMat}
        titulo={editMat ? "Editar material" : "Novo material"}
        onFechar={() => setModalMat(false)}
      >
        <form className="form-grid" onSubmit={salvarMaterial}>
          <label>
            Título
            <input
              value={formMat.titulo}
              onChange={(e) => setFormMat({ ...formMat, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Arquivo (pdf/zip/imagem)
            <input
              type="file"
              accept=".pdf,.zip,.png,.jpg,.jpeg,.webp"
              onChange={(e) =>
                setFormMat({ ...formMat, arquivo: e.target.files?.[0] ?? null })
              }
              required={!editMat}
            />
          </label>
          <label>
            Ordem
            <input
              type="number"
              value={formMat.ordem}
              onChange={(e) =>
                setFormMat({ ...formMat, ordem: Number(e.target.value) })
              }
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={formMat.ativo}
              onChange={(e) => setFormMat({ ...formMat, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        aberto={modalQuiz}
        titulo={
          quizEditorAlvo === "prova"
            ? editQuizId
              ? "Editar prova"
              : "Nova prova"
            : editQuizId
              ? "Editar atividade"
              : "Nova atividade"
        }
        onFechar={() => {
          setModalQuiz(false);
          setEditQuizId(null);
        }}
      >
        <form className="form-grid" onSubmit={salvarQuiz}>
          {erro && <p className="form-erro">{erro}</p>}
          <label>
            Título
            <input
              value={formQuiz.titulo}
              onChange={(e) => setFormQuiz({ ...formQuiz, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Nota mínima (%)
            <input
              type="number"
              min={0}
              max={100}
              value={formQuiz.nota_minima}
              onChange={(e) =>
                setFormQuiz({ ...formQuiz, nota_minima: Number(e.target.value) })
              }
            />
          </label>
          {quizEditorAlvo === "atividade" && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={formQuiz.bloqueia_proxima}
                onChange={(e) =>
                  setFormQuiz({ ...formQuiz, bloqueia_proxima: e.target.checked })
                }
              />
              Bloqueia avanço (legado)
            </label>
          )}
          <label className="check-row">
            <input
              type="checkbox"
              checked={formQuiz.ativo}
              onChange={(e) => setFormQuiz({ ...formQuiz, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        aberto={modalPerg}
        titulo={editPerg ? "Editar pergunta" : "Nova pergunta"}
        onFechar={() => setModalPerg(false)}
      >
        <form className="form-grid" onSubmit={salvarPergunta}>
          {erro && <p className="form-erro">{erro}</p>}
          <label>
            Enunciado
            <textarea
              value={formPerg.enunciado}
              onChange={(e) => setFormPerg({ ...formPerg, enunciado: e.target.value })}
              required
              rows={3}
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        aberto={modalAlt}
        titulo={editAlt ? "Editar alternativa" : "Nova alternativa"}
        onFechar={() => {
          setModalAlt(false);
          setEditAlt(null);
        }}
      >
        <form className="form-grid" onSubmit={salvarAlt}>
          {erro && <p className="form-erro">{erro}</p>}
          <label>
            Texto
            <input
              value={formAlt.texto}
              onChange={(e) => setFormAlt({ ...formAlt, texto: e.target.value })}
              required
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={formAlt.correta}
              onChange={(e) => setFormAlt({ ...formAlt, correta: e.target.checked })}
            />
            Correta
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
