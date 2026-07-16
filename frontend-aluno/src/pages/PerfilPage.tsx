import { useState, type FormEvent } from "react";
import { apiFormData, apiRequest, type User } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function PerfilPage() {
  const { user, access, refreshUser } = useAuth();
  const [nome, setNome] = useState(user?.first_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [foto, setFoto] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      if (foto) {
        const fd = new FormData();
        fd.append("first_name", nome);
        fd.append("bio", bio);
        fd.append("foto", foto);
        await apiFormData<User>("/auth/me/", {
          method: "PATCH",
          token: access,
          formData: fd,
        });
      } else {
        await apiRequest<User>("/auth/me/", {
          method: "PATCH",
          token: access,
          body: { first_name: nome, bio },
        });
      }
      await refreshUser();
      setMsg("Perfil atualizado.");
      setFoto(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Perfil</h1>
          <p className="page-lead">Dados da sua conta no portal.</p>
        </div>
      </div>
      <div className="perfil-grid">
        <section className="bento-cell">
          <div className="perfil-avatar">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="" />
            ) : (
              <span>{(user?.first_name || user?.username || "?").slice(0, 1)}</span>
            )}
          </div>
          <h2>{user?.first_name || user?.username}</h2>
          <p className="portal-muted">{user?.email}</p>
        </section>
        <section className="bento-cell">
          <h2>Identificação</h2>
          <dl className="perfil-dl">
            <div>
              <dt>RA</dt>
              <dd>{user?.ra || "—"}</dd>
            </div>
            <div>
              <dt>Usuário</dt>
              <dd>{user?.username}</dd>
            </div>
          </dl>
          <form className="form-grid" onSubmit={salvar} style={{ marginTop: "1rem" }}>
            <label>
              Nome
              <input value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label>
              Bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </label>
            <label>
              Foto
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {erro && <p className="form-erro">{erro}</p>}
            {msg && <p className="form-ok">{msg}</p>}
            <button className="btn btn--primary" type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
