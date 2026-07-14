import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, type Curso, type Plano, type User } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const vazio = {
  titulo: "",
  descricao: "",
  ativo: true,
  ordem: 0,
  instrutor_id: null as number | null,
  plano_ids: [] as number[],
};

export function CursosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<Curso[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [instrutores, setInstrutores] = useState<User[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Curso | null>(null);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const [c, p, i] = await Promise.all([
      apiRequest<Curso[]>("/admin/cursos/", { token: access }),
      apiRequest<Plano[]>("/admin/planos/", { token: access }).catch(() =>
        apiRequest<Plano[]>("/public/planos/")
      ),
      apiRequest<User[]>("/admin/instrutores/", { token: access }),
    ]);
    setItens(c);
    setPlanos(p);
    setInstrutores(i);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  function abrirNovo() {
    setEditando(null);
    setForm(vazio);
    setModalAberto(true);
  }

  function abrirEditar(c: Curso) {
    setEditando(c);
    setForm({
      titulo: c.titulo,
      descricao: c.descricao,
      ativo: c.ativo,
      ordem: c.ordem,
      instrutor_id: c.instrutor_id,
      plano_ids: c.plano_ids || [],
    });
    setModalAberto(true);
  }

  function togglePlano(id: number) {
    setForm((f) => ({
      ...f,
      plano_ids: f.plano_ids.includes(id)
        ? f.plano_ids.filter((x) => x !== id)
        : [...f.plano_ids, id],
    }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    const body = {
      titulo: form.titulo,
      descricao: form.descricao,
      ativo: form.ativo,
      ordem: form.ordem,
      instrutor_id: form.instrutor_id,
      plano_ids: form.plano_ids,
    };
    try {
      if (editando) {
        await apiRequest(`/admin/cursos/${editando.id}/`, {
          method: "PATCH",
          token: access,
          body,
        });
      } else {
        await apiRequest("/admin/cursos/", {
          method: "POST",
          token: access,
          body,
        });
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c: Curso) {
    if (!access || !confirm(`Excluir (inativar) "${c.titulo}"?`)) return;
    await apiRequest(`/admin/cursos/${c.id}/`, {
      method: "PATCH",
      token: access,
      body: { ativo: false },
    });
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Cursos</h1>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovo}>
          Novo
        </button>
      </div>
      <p className="page-lead">Associe planos e instrutor. Cursos ativos saem na landing.</p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Instrutor</th>
              <th>Planos</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((c) => (
              <tr key={c.id}>
                <td>{c.titulo}</td>
                <td>{c.instrutor_nome || "—"}</td>
                <td>{(c.plano_ids || []).length}</td>
                <td>{c.ativo ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => abrirEditar(c)}>
                    Editar
                  </button>
                  {c.ativo && (
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => excluir(c)}>
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
        aberto={modalAberto}
        titulo={editando ? "Editar curso" : "Novo curso"}
        onFechar={() => setModalAberto(false)}
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
              required
              rows={3}
            />
          </label>
          <label>
            Instrutor
            <select
              value={form.instrutor_id ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  instrutor_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">— nenhum —</option>
              {instrutores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.first_name || i.username}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="check-group">
            <legend>Planos</legend>
            {planos.map((p) => (
              <label key={p.id} className="check-row">
                <input
                  type="checkbox"
                  checked={form.plano_ids.includes(p.id)}
                  onChange={() => togglePlano(p.id)}
                />
                {p.nome}
              </label>
            ))}
          </fieldset>
          <label>
            Ordem
            <input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Ativo
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
