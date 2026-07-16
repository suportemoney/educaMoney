import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  glyphForIconKey,
  type CatalogoResp,
} from "../api/client";
import { CursoCard } from "../components/CursoCard";
import { useAuth } from "../context/AuthContext";

type TipoFiltro = "all" | "curso" | "conjunto";

export function CatalogoPage() {
  const { access } = useAuth();
  const [data, setData] = useState<CatalogoResp | null>(null);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [tipo, setTipo] = useState<TipoFiltro>("all");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!access) return;
    const params = new URLSearchParams();
    if (cat) params.set("categoria", cat);
    if (sub) params.set("subcategoria", sub);
    if (qDebounced) params.set("q", qDebounced);
    if (tipo !== "all") params.set("tipo", tipo);
    const qs = params.toString();
    setCarregando(true);
    apiRequest<CatalogoResp>(`/aluno/catalogo/${qs ? `?${qs}` : ""}`, {
      token: access,
    })
      .then(setData)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [access, cat, sub, qDebounced, tipo]);

  const subsFiltradas = useMemo(
    () =>
      (data?.subcategorias || []).filter(
        (s) => !cat || String(s.categoria) === cat
      ),
    [data, cat]
  );

  const tags = data?.categorias || [];
  const total =
    (data?.cursos.length || 0) + (data?.conjuntos.length || 0);

  function limparFiltros() {
    setCat("");
    setSub("");
    setTipo("all");
    setQ("");
  }

  return (
    <div className="catalogo">
      <div className="page-head page-head--split">
        <div>
          <h1>Catálogo</h1>
          <p className="page-lead">
            Busque cursos e conjuntos. Use as tags ou o painel à direita para filtrar.
          </p>
        </div>
        <span className="catalogo-count">
          {carregando ? "…" : `${total} resultado(s)`}
        </span>
      </div>

      <div className="catalogo-layout">
        <div className="catalogo-main">
          <div className="catalogo-search">
            <input
              type="search"
              placeholder="Pesquisar por nome (curso ou conjunto)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="catalogo-tags" role="list">
            <button
              type="button"
              className={`tag-chip ${!cat ? "active" : ""}`}
              onClick={() => {
                setCat("");
                setSub("");
              }}
            >
              Todos
            </button>
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tag-chip ${cat === String(t.id) ? "active" : ""}`}
                onClick={() => {
                  setCat(String(t.id));
                  setSub("");
                }}
              >
                {t.titulo}
              </button>
            ))}
          </div>

          {erro && <p className="form-erro">{erro}</p>}
          {carregando && <p className="portal-muted">Carregando catálogo…</p>}

          {!carregando && total === 0 && (
            <div className="empty-box">
              <p>Nada encontrado com essa busca/filtro.</p>
              <button type="button" className="btn btn--ghost" onClick={limparFiltros}>
                Limpar filtros
              </button>
            </div>
          )}

          {!carregando && (data?.conjuntos.length || 0) > 0 && (
            <section className="catalogo-section">
              <h2>Conjuntos</h2>
              <div className="conjunto-grid">
                {data!.conjuntos.map((j) => (
                  <article key={`j-${j.id}`} className="conjunto-card animate-fade-up">
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
                        <h3>{j.titulo}</h3>
                      </div>
                    </div>
                    <p>{j.descricao}</p>
                    <div className="chip-row">
                      {j.cursos.slice(0, 4).map((c) =>
                        c.liberado ? (
                          <Link
                            key={c.id}
                            to={`/meus-cursos/${c.id}`}
                            className="chip chip--ok"
                          >
                            {c.titulo}
                          </Link>
                        ) : (
                          <span key={c.id} className="chip">
                            {c.titulo}
                          </span>
                        )
                      )}
                    </div>
                    <Link to="/conjuntos" className="btn btn--ghost btn--small">
                      Ver trilha
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!carregando && (data?.cursos.length || 0) > 0 && (
            <section className="catalogo-section">
              <h2>Cursos</h2>
              <div className="curso-grid">
                {data!.cursos.map((c, i) => (
                  <CursoCard
                    key={`c-${c.id}`}
                    curso={c}
                    className={`animate-delay-${Math.min(i, 3)}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="catalogo-aside" aria-label="Filtros do catálogo">
          <div className="catalogo-aside__card">
            <h2>Filtros</h2>
            <p className="portal-muted catalogo-aside__hint">
              Refine por tipo, categoria ou tag.
            </p>

            <fieldset className="filter-block">
              <legend>Tipo</legend>
              {(
                [
                  ["all", "Tudo"],
                  ["curso", "Só cursos"],
                  ["conjunto", "Só conjuntos"],
                ] as const
              ).map(([val, label]) => (
                <label key={val} className="check-row">
                  <input
                    type="radio"
                    name="tipo"
                    checked={tipo === val}
                    onChange={() => setTipo(val)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <fieldset className="filter-block">
              <legend>Categoria</legend>
              <label className="check-row">
                <input
                  type="radio"
                  name="cat"
                  checked={!cat}
                  onChange={() => {
                    setCat("");
                    setSub("");
                  }}
                />
                Todas
              </label>
              {(data?.categorias || []).map((c) => (
                <label key={c.id} className="check-row">
                  <input
                    type="radio"
                    name="cat"
                    checked={cat === String(c.id)}
                    onChange={() => {
                      setCat(String(c.id));
                      setSub("");
                    }}
                  />
                  {c.titulo}
                </label>
              ))}
            </fieldset>

            <fieldset className="filter-block">
              <legend>Tag / subcategoria</legend>
              <label className="check-row">
                <input
                  type="radio"
                  name="sub"
                  checked={!sub}
                  onChange={() => setSub("")}
                />
                Todas
              </label>
              {subsFiltradas.map((s) => (
                <label key={s.id} className="check-row">
                  <input
                    type="radio"
                    name="sub"
                    checked={sub === String(s.id)}
                    onChange={() => setSub(String(s.id))}
                  />
                  {s.titulo}
                </label>
              ))}
              {subsFiltradas.length === 0 && (
                <p className="portal-muted">Nenhuma tag nesta categoria.</p>
              )}
            </fieldset>

            <button type="button" className="btn btn--ghost btn--small" onClick={limparFiltros}>
              Limpar tudo
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
