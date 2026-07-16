import { useEffect, useState, type FormEvent } from "react";
import { apiFormData, apiRequest, type Papel, type User } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const PAPEIS: Papel[] = ["administrador", "gestor", "pr", "instrutor", "merchant"];

export function UsuariosPage() {
  const { access } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtroPapel, setFiltroPapel] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<User | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    password: "",
    papel: "instrutor" as Papel,
    bio: "",
    is_active: true,
  });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filtroPapel) params.set("papel", filtroPapel);
    if (filtroAtivo) params.set("ativo", filtroAtivo);
    const qs = params.toString();
    setUsers(
      await apiRequest<User[]>(`/auth/admin/usuarios/${qs ? `?${qs}` : ""}`, {
        token: access,
      })
    );
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  const total = users.length;
  const ativos = users.filter((u) => u.is_active !== false).length;

  function abrirNovo() {
    setEditando(null);
    setFotoFile(null);
    setForm({
      username: "",
      email: "",
      first_name: "",
      password: "",
      papel: "instrutor",
      bio: "",
      is_active: true,
    });
    setModalAberto(true);
  }

  function abrirEditar(u: User) {
    setEditando(u);
    setFotoFile(null);
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      password: "",
      papel: u.papel === "aluno" ? "instrutor" : u.papel,
      bio: u.bio || "",
      is_active: u.is_active !== false,
    });
    setModalAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    try {
      if (editando) {
        if (fotoFile) {
          const fd = new FormData();
          fd.append("email", form.email);
          fd.append("first_name", form.first_name);
          fd.append("papel", form.papel);
          fd.append("bio", form.bio);
          fd.append("is_active", form.is_active ? "true" : "false");
          if (form.password) fd.append("password", form.password);
          fd.append("foto", fotoFile);
          await apiFormData(`/auth/admin/usuarios/${editando.id}/`, {
            method: "PATCH",
            token: access,
            formData: fd,
          });
        } else {
          const body: Record<string, unknown> = {
            email: form.email,
            first_name: form.first_name,
            papel: form.papel,
            bio: form.bio,
            is_active: form.is_active,
          };
          if (form.password) body.password = form.password;
          await apiRequest(`/auth/admin/usuarios/${editando.id}/`, {
            method: "PATCH",
            token: access,
            body,
          });
        }
      } else {
        await apiRequest("/auth/admin/usuarios/", {
          method: "POST",
          token: access,
          body: {
            username: form.username,
            email: form.email,
            first_name: form.first_name,
            password: form.password,
            papel: form.papel,
            bio: form.bio,
          },
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

  async function excluir(u: User) {
    if (!access) return;
    if (!confirm(`Excluir (desativar) usuário "${u.username}"?`)) return;
    try {
      await apiRequest(`/auth/admin/usuarios/${u.id}/`, {
        method: "PATCH",
        token: access,
        body: { is_active: false },
      });
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao excluir");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Usuários</h1>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovo}>
          Novo
        </button>
      </div>
      <p className="page-lead">Staff do painel (gestores, PR, instrutores e merchants). Alunos ficam em Alunos.</p>
      <div className="stat-chips">
        <span className="stat-chip">
          Total <strong>{total}</strong>
        </span>
        <span className="stat-chip">
          Ativos <strong>{ativos}</strong>
        </span>
      </div>
      {erro && <p className="form-erro">{erro}</p>}
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          carregar().catch((err: Error) => setErro(err.message));
        }}
      >
        <label>
          Busca
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, usuário ou e-mail…"
          />
        </label>
        <label>
          Papel
          <select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)}>
            <option value="">Todos</option>
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </select>
        </label>
        <button type="submit" className="btn btn--primary btn--small">
          Filtrar
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Usuário</th>
              <th>Papel</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.foto_url ? (
                    <img src={u.foto_url} alt="" className="table-avatar" />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{u.first_name || "—"}</td>
                <td>{u.email || "—"}</td>
                <td>{u.username}</td>
                <td>
                  <span className={`badge badge--${u.papel}`}>{u.papel}</span>
                </td>
                <td>{u.is_active === false ? "Não" : "Sim"}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrirEditar(u)}
                  >
                    Editar
                  </button>
                  {u.is_active !== false && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => excluir(u)}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum usuário staff encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalAberto}
        titulo={editando ? "Editar usuário" : "Novo usuário"}
        onFechar={() => setModalAberto(false)}
      >
        <form className="form-grid" onSubmit={salvar}>
          {!editando && (
            <label>
              Usuário
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </label>
          )}
          <label>
            Nome
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Senha {editando ? "(opcional — reset)" : ""}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editando}
              minLength={editando && !form.password ? undefined : 8}
              placeholder={editando ? "Deixe vazio para manter" : ""}
            />
          </label>
          <label>
            Papel
            <select
              value={form.papel}
              onChange={(e) => setForm({ ...form, papel: e.target.value as Papel })}
            >
              {PAPEIS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bio
            <input
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>
          {editando && (
            <>
              <label>
                Foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                />
              </label>
              {editando.foto_url && !fotoFile && (
                <img src={editando.foto_url} alt="" className="table-avatar" />
              )}
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Conta ativa
              </label>
            </>
          )}
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
