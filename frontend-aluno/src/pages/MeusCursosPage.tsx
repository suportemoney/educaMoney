import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  type CategoriaAluno,
  type CursoAluno,
  type SubcategoriaAluno,
} from "../api/client";
import { CursoCard } from "../components/CursoCard";
import { useAuth } from "../context/AuthContext";

type Catalogo = {
  cursos: CursoAluno[];
  categorias: CategoriaAluno[];
  subcategorias: SubcategoriaAluno[];
};

type StatusFiltro = "todos" | "andamento" | "nao_iniciados" | "concluidos";

function matchStatus(c: CursoAluno, status: StatusFiltro): boolean {
  const pct = c.progresso_pct || 0;
  if (status === "todos") return true;
  if (status === "andamento") return pct > 0 && pct < 100;
  if (status === "nao_iniciados") return pct === 0;
  if (status === "concluidos") return pct >= 100 || !!c.certificado_codigo;
  return true;
}

export function MeusCursosPage() {
  const { access } = useAuth();
  const [data, setData] = useState<Catalogo | null>(null);
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!access) return;
    const params = new URLSearchParams();
    params.set("tipo", "curso");
    if (cat) params.set("categoria", cat);
    if (sub) params.set("subcategoria", sub);
    if (qDebounced) params.set("q", qDebounced);
    setCarregando(true);
    setErro(null);
    apiRequest<Catalogo>(`/aluno/catalogo/?${params.toString()}`, { token: access })
      .then(setData)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [access, cat, sub, qDebounced]);

  const subsFiltradas = useMemo(
    () =>
      (data?.subcategorias || []).filter(
        (s) => !cat || String(s.categoria) === cat
      ),
    [data, cat]
  );

  const cursosApi = data?.cursos || [];
  const cursosFiltrados = useMemo(
    () => cursosApi.filter((c) => matchStatus(c, status)),
    [cursosApi, status]
  );

  const resumo = useMemo(() => {
    const n = cursosApi.length;
    const andamento = cursosApi.filter(
      (c) => (c.progresso_pct || 0) > 0 && (c.progresso_pct || 0) < 100
    ).length;
    const concluidos = cursosApi.filter(
      (c) => (c.progresso_pct || 0) >= 100 || !!c.certificado_codigo
    ).length;
    return { n, andamento, concluidos };
  }, [cursosApi]);

  const continuarFaixa = useMemo(() => {
    return [...cursosApi]
      .filter((c) => (c.progresso_pct || 0) > 0 && (c.progresso_pct || 0) < 100)
      .sort((a, b) => {
        const ta = a.ultima_atividade_em || "";
        const tb = b.ultima_atividade_em || "";
        return tb.localeCompare(ta);
      })
      .slice(0, 3);
  }, [cursosApi]);

  const temFiltros =
    !!cat || !!sub || !!qDebounced || status !== "todos";
  const semPlano = !carregando && data && cursosApi.length === 0 && !temFiltros;
  const filtroVazio =
    !carregando && data && cursosApi.length > 0 && cursosFiltrados.length === 0;

  function limparFiltros() {
    setCat("");
    setSub("");
    setQ("");
    setQDebounced("");
    setStatus("todos");
  }

  return (
    <div>
      <div className="page-head page-head--split">
        <div>
          <h1>Meus cursos</h1>
          <p className="page-lead">
            Sua biblioteca de vídeos liberada pelo plano. Continue de onde parou.
          </p>
        </div>
        {semPlano && (
          <Link to="/ativar" className="btn btn--primary btn--small">
            Ativar plano
          </Link>
        )}
      </div>

      {!semPlano && (
        <>
          <p className="meus-cursos__resumo portal-muted">
            {resumo.n} curso{resumo.n === 1 ? "" : "s"} · {resumo.andamento} em
            andamento · {resumo.concluidos} concluído
            {resumo.concluidos === 1 ? "" : "s"}
          </p>

          {continuarFaixa.length > 0 && (
            <section className="meus-cursos__continuar">
              <h2 className="meus-cursos__section-title">Continuar de onde parou</h2>
              <div className="curso-grid curso-grid--continuar">
                {continuarFaixa.map((c, i) => (
                  <CursoCard
                    key={c.id}
                    curso={c}
                    compact
                    className={`animate-delay-${Math.min(i, 3)}`}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="filter-bar">
            <input
              placeholder="Buscar curso…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar curso"
            />
            <select
              value={cat}
              onChange={(e) => {
                setCat(e.target.value);
                setSub("");
              }}
              aria-label="Categoria"
            >
              <option value="">Todas categorias</option>
              {(data?.categorias || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
            <select
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              aria-label="Subcategoria"
            >
              <option value="">Todas subcategorias</option>
              {subsFiltradas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo}
                </option>
              ))}
            </select>
          </div>

          <div className="chip-row" role="group" aria-label="Filtrar por status">
            {(
              [
                ["todos", "Todos"],
                ["andamento", "Em andamento"],
                ["nao_iniciados", "Não iniciados"],
                ["concluidos", "Concluídos"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip${status === id ? " chip--active" : ""}`}
                onClick={() => setStatus(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {erro && <p className="form-erro">{erro}</p>}

      {carregando && (
        <div className="curso-grid" aria-busy="true" aria-label="Carregando cursos">
          {[0, 1, 2].map((i) => (
            <div key={i} className="curso-card curso-card--skeleton" />
          ))}
        </div>
      )}

      {semPlano && (
        <div className="empty-box">
          <p>Você ainda não tem cursos liberados.</p>
          <p className="portal-muted">
            Ative um plano com um token para acessar a biblioteca de vídeos.
          </p>
          <Link to="/ativar" className="btn btn--primary">
            Ativar plano
          </Link>
        </div>
      )}

      {filtroVazio && (
        <div className="empty-box">
          <p>Nenhum curso com esses filtros.</p>
          <button type="button" className="btn btn--ghost" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      )}

      {!carregando && !semPlano && cursosFiltrados.length > 0 && (
        <div className="curso-grid">
          {cursosFiltrados.map((c, i) => (
            <CursoCard
              key={c.id}
              curso={c}
              className={`animate-delay-${Math.min(i, 3)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
