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

export function MeusCursosPage() {
  const { access } = useAuth();
  const [data, setData] = useState<Catalogo | null>(null);
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [q, setQ] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!access) return;
    const params = new URLSearchParams();
    if (cat) params.set("categoria", cat);
    if (sub) params.set("subcategoria", sub);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    setCarregando(true);
    apiRequest<Catalogo>(`/aluno/catalogo/${qs ? `?${qs}` : ""}`, { token: access })
      .then(setData)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [access, cat, sub, q]);

  const subsFiltradas = useMemo(
    () =>
      (data?.subcategorias || []).filter(
        (s) => !cat || String(s.categoria) === cat
      ),
    [data, cat]
  );

  const temPlano = (data?.cursos.length || 0) > 0;

  return (
    <div>
      <div className="page-head page-head--split">
        <div>
          <h1>Meus cursos</h1>
          <p className="page-lead">Biblioteca liberada pelo seu plano, com filtros.</p>
        </div>
        {!temPlano && !carregando && (
          <Link to="/ativar" className="btn btn--ghost btn--small">
            Ativar plano
          </Link>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Buscar curso…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setSub("");
          }}
        >
          <option value="">Todas categorias</option>
          {(data?.categorias || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.titulo}
            </option>
          ))}
        </select>
        <select value={sub} onChange={(e) => setSub(e.target.value)}>
          <option value="">Todas subcategorias</option>
          {subsFiltradas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.titulo}
            </option>
          ))}
        </select>
      </div>

      {erro && <p className="form-erro">{erro}</p>}
      {carregando && <p className="portal-muted">Carregando…</p>}
      {!carregando && data && data.cursos.length === 0 && (
        <div className="empty-box">
          <p>Nenhum curso liberado com esses filtros.</p>
          <Link to="/ativar" className="btn btn--primary">
            Ativar plano
          </Link>
        </div>
      )}
      <div className="curso-grid">
        {(data?.cursos || []).map((c, i) => (
          <CursoCard
            key={c.id}
            curso={c}
            className={`animate-delay-${Math.min(i, 3)}`}
          />
        ))}
      </div>
    </div>
  );
}
