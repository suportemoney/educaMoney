import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  apiFormData,
  apiRequest,
  type Curso,
  type Plano,
  type Subcategoria,
  type User,
} from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const vazio = {
  titulo: "",
  descricao: "",
  ativo: true,
  ordem: 0,
  instrutor_id: null as number | null,
  plano_ids: [] as number[],
  subcategoria_id: null as number | null,
  icone_key: "",
  capaFile: null as File | null,
};

export function CursosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<Curso[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [instrutores, setInstrutores] = useState<User[]>([]);
  const [subs, setSubs] = useState<Subcategoria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Curso | null>(null);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const [c, p, i, s] = await Promise.all([
      apiRequest<Curso[]>("/admin/cursos/", { token: access }),
      apiRequest<Plano[]>("/admin/planos/", { token: access }).catch(() =>
        apiRequest<Plano[]>("/public/planos/")
      ),
      apiRequest<User[]>("/admin/instrutores/", { token: access }),
      apiRequest<Subcategoria[]>("/admin/subcategorias/", { token: access }),
    ]);
    setItens(c);
    setPlanos(p);
    setInstrutores(i);
    setSubs(s);
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
      subcategoria_id: c.subcategoria_id,
      icone_key: c.icone_key || "",
      capaFile: null,
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
    const fd = new FormData();
    fd.append("titulo", form.titulo);
    fd.append("descricao", form.descricao);
    fd.append("ativo", form.ativo ? "true" : "false");
    fd.append("ordem", String(form.ordem));
    fd.append("icone_key", form.icone_key);
    if (form.instrutor_id != null) fd.append("instrutor_id", String(form.instrutor_id));
    if (form.subcategoria_id != null) {
      fd.append("subcategoria_id", String(form.subcategoria_id));
    }
    form.plano_ids.forEach((id) => fd.append("plano_ids", String(id)));
    if (form.capaFile) fd.append("capa", form.capaFile);
    try {
      if (editando) {
        await apiFormData(`/admin/cursos/${editando.id}/`, {
          method: "PATCH",
          token: access,
          formData: fd,
        });
      } else {
        await apiFormData("/admin/cursos/", {
          method: "POST",
          token: access,
          formData: fd,
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
                  <Link
                    to={`/cursos/${c.id}/conteudo`}
                    className="btn btn--ghost btn--small"
                  >
                    Conteúdo
                  </Link>
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
            Subcategoria
            <select
              value={form.subcategoria_id ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  subcategoria_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">— nenhuma —</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.categoria_titulo} / {s.titulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ícone key
            <input
              value={form.icone_key}
              onChange={(e) => setForm({ ...form, icone_key: e.target.value })}
              placeholder="wallet, chart, shield…"
            />
          </label>
          <label>
            Capa (jpg/png/webp)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              onChange={(e) =>
                setForm({ ...form, capaFile: e.target.files?.[0] ?? null })
              }
            />
            {editando?.capa_url && !form.capaFile && (
              <span className="field-hint">Já há capa. Envie outra para substituir.</span>
            )}
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
