import { useEffect, useState, type FormEvent } from "react";
import {
  apiRequest,
  type Categoria,
  type Subcategoria,
} from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export function CategoriasPage() {
  const { access } = useAuth();
  const [cats, setCats] = useState<Categoria[]>([]);
  const [subs, setSubs] = useState<Subcategoria[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalCat, setModalCat] = useState(false);
  const [editCat, setEditCat] = useState<Categoria | null>(null);
  const [formCat, setFormCat] = useState({
    titulo: "",
    ordem: 0,
    ativo: true,
    icone_key: "",
  });
  const [modalSub, setModalSub] = useState(false);
  const [editSub, setEditSub] = useState<Subcategoria | null>(null);
  const [formSub, setFormSub] = useState({ titulo: "", ordem: 0, ativo: true });

  async function carregar() {
    if (!access) return;
    const [c, s] = await Promise.all([
      apiRequest<Categoria[]>("/admin/categorias/", { token: access }),
      apiRequest<Subcategoria[]>("/admin/subcategorias/", { token: access }),
    ]);
    setCats(c);
    setSubs(s);
    if (c.length && (sel == null || !c.some((x) => x.id === sel))) setSel(c[0].id);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function salvarCat(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    try {
      if (editCat) {
        await apiRequest(`/admin/categorias/${editCat.id}/`, {
          method: "PATCH",
          token: access,
          body: formCat,
        });
      } else {
        await apiRequest("/admin/categorias/", {
          method: "POST",
          token: access,
          body: formCat,
        });
      }
      setModalCat(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha");
    }
  }

  async function salvarSub(e: FormEvent) {
    e.preventDefault();
    if (!access || sel == null) return;
    try {
      if (editSub) {
        await apiRequest(`/admin/subcategorias/${editSub.id}/`, {
          method: "PATCH",
          token: access,
          body: { ...formSub, categoria: sel },
        });
      } else {
        await apiRequest("/admin/subcategorias/", {
          method: "POST",
          token: access,
          body: { ...formSub, categoria: sel },
        });
      }
      setModalSub(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha");
    }
  }

  const subsFiltrados = subs.filter((s) => s.categoria === sel);

  return (
    <div>
      <div className="page-head">
        <h1>Categorias</h1>
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={() => {
            setEditCat(null);
            setFormCat({ titulo: "", ordem: 0, ativo: true, icone_key: "" });
            setModalCat(true);
          }}
        >
          Nova categoria
        </button>
      </div>
      <p className="page-lead">Organize o catálogo em categorias e subcategorias.</p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Ícone key</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr
                key={c.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSel(c.id)}
              >
                <td>{c.titulo}</td>
                <td>{c.icone_key || "—"}</td>
                <td>{c.ativo ? "Sim" : "Não"}</td>
                <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => {
                      setEditCat(c);
                      setFormCat({
                        titulo: c.titulo,
                        ordem: c.ordem,
                        ativo: c.ativo,
                        icone_key: c.icone_key || "",
                      });
                      setModalCat(true);
                    }}
                  >
                    Editar
                  </button>
                  {c.ativo && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => {
                        if (!confirm(`Excluir (inativar) categoria "${c.titulo}"?`)) return;
                        apiRequest(`/admin/categorias/${c.id}/`, {
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

      {sel != null && (
        <>
          <div className="page-head" style={{ marginTop: "1.5rem" }}>
            <h2>Subcategorias</h2>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                setEditSub(null);
                setFormSub({ titulo: "", ordem: 0, ativo: true });
                setModalSub(true);
              }}
            >
              Nova subcategoria
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Ordem</th>
                  <th>Ativo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subsFiltrados.map((s) => (
                  <tr key={s.id}>
                    <td>{s.titulo}</td>
                    <td>{s.ordem}</td>
                    <td>{s.ativo ? "Sim" : "Não"}</td>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setEditSub(s);
                          setFormSub({
                            titulo: s.titulo,
                            ordem: s.ordem,
                            ativo: s.ativo,
                          });
                          setModalSub(true);
                        }}
                      >
                        Editar
                      </button>
                      {s.ativo && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => {
                            if (!confirm(`Excluir (inativar) subcategoria "${s.titulo}"?`)) return;
                            apiRequest(`/admin/subcategorias/${s.id}/`, {
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
        </>
      )}

      <Modal
        aberto={modalCat}
        titulo={editCat ? "Editar categoria" : "Nova categoria"}
        onFechar={() => setModalCat(false)}
      >
        <form className="form-grid" onSubmit={salvarCat}>
          <label>
            Título
            <input
              value={formCat.titulo}
              onChange={(e) => setFormCat({ ...formCat, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Ícone key
            <input
              value={formCat.icone_key}
              onChange={(e) => setFormCat({ ...formCat, icone_key: e.target.value })}
              placeholder="wallet, chart…"
            />
          </label>
          <label>
            Ordem
            <input
              type="number"
              value={formCat.ordem}
              onChange={(e) => setFormCat({ ...formCat, ordem: Number(e.target.value) })}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={formCat.ativo}
              onChange={(e) => setFormCat({ ...formCat, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button className="btn btn--primary" type="submit">
            Salvar
          </button>
        </form>
      </Modal>

      <Modal
        aberto={modalSub}
        titulo={editSub ? "Editar subcategoria" : "Nova subcategoria"}
        onFechar={() => setModalSub(false)}
      >
        <form className="form-grid" onSubmit={salvarSub}>
          <label>
            Título
            <input
              value={formSub.titulo}
              onChange={(e) => setFormSub({ ...formSub, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Ordem
            <input
              type="number"
              value={formSub.ordem}
              onChange={(e) => setFormSub({ ...formSub, ordem: Number(e.target.value) })}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={formSub.ativo}
              onChange={(e) => setFormSub({ ...formSub, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button className="btn btn--primary" type="submit">
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
