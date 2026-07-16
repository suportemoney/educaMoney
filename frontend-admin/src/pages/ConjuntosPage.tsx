import { useEffect, useState, type FormEvent } from "react";
import {
  apiRequest,
  type Categoria,
  type ConjuntoAdmin,
  type Curso,
} from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export function ConjuntosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<ConjuntoAdmin[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<ConjuntoAdmin | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: 0,
    icone_key: "",
    ordem: 0,
    ativo: true,
    curso_ids: [] as number[],
  });

  async function carregar() {
    if (!access) return;
    const [j, c, cu] = await Promise.all([
      apiRequest<ConjuntoAdmin[]>("/admin/conjuntos/", { token: access }),
      apiRequest<Categoria[]>("/admin/categorias/", { token: access }),
      apiRequest<Curso[]>("/admin/cursos/", { token: access }),
    ]);
    setItens(j);
    setCats(c);
    setCursos(cu);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  function abrirNovo() {
    setEdit(null);
    setForm({
      titulo: "",
      descricao: "",
      categoria: cats[0]?.id || 0,
      icone_key: "",
      ordem: 0,
      ativo: true,
      curso_ids: [],
    });
    setModal(true);
  }

  function abrirEditar(j: ConjuntoAdmin) {
    setEdit(j);
    setForm({
      titulo: j.titulo,
      descricao: j.descricao,
      categoria: j.categoria,
      icone_key: j.icone_key || "",
      ordem: j.ordem,
      ativo: j.ativo,
      curso_ids: j.curso_ids || [],
    });
    setModal(true);
  }

  function toggleCurso(id: number) {
    setForm((f) => ({
      ...f,
      curso_ids: f.curso_ids.includes(id)
        ? f.curso_ids.filter((x) => x !== id)
        : [...f.curso_ids, id],
    }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    try {
      if (edit) {
        await apiRequest(`/admin/conjuntos/${edit.id}/`, {
          method: "PATCH",
          token: access,
          body: form,
        });
      } else {
        await apiRequest("/admin/conjuntos/", {
          method: "POST",
          token: access,
          body: form,
        });
      }
      setModal(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Conjuntos</h1>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovo}>
          Novo
        </button>
      </div>
      <p className="page-lead">Trilhas de curadoria (não substituem o plano de acesso).</p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Cursos</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((j) => (
              <tr key={j.id}>
                <td>{j.titulo}</td>
                <td>{j.categoria_titulo}</td>
                <td>{(j.curso_ids || []).length}</td>
                <td>{j.ativo ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrirEditar(j)}
                  >
                    Editar
                  </button>
                  {j.ativo && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => {
                        if (!confirm(`Excluir (inativar) conjunto "${j.titulo}"?`)) return;
                        apiRequest(`/admin/conjuntos/${j.id}/`, {
                          method: "DELETE",
                          token: access,
                        }).then(carregar);
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modal}
        titulo={edit ? "Editar conjunto" : "Novo conjunto"}
        onFechar={() => setModal(false)}
      >
        <form className="form-grid" onSubmit={salvar}>
          <label>
            Título
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Descrição
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={3}
            />
          </label>
          <label>
            Categoria
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: Number(e.target.value) })}
              required
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ícone key
            <input
              value={form.icone_key}
              onChange={(e) => setForm({ ...form, icone_key: e.target.value })}
            />
          </label>
          <fieldset className="check-group">
            <legend>Cursos</legend>
            {cursos.map((c) => (
              <label key={c.id} className="check-row">
                <input
                  type="checkbox"
                  checked={form.curso_ids.includes(c.id)}
                  onChange={() => toggleCurso(c.id)}
                />
                {c.titulo}
              </label>
            ))}
          </fieldset>
          <button className="btn btn--primary" type="submit">
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
