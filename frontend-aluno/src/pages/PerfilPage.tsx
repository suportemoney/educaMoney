import { useEffect, useState, type FormEvent } from "react";
import { apiFormData, type User } from "../api/client";
import { useAuth } from "../context/AuthContext";

const DOC_TIPOS = [
  { value: "rg", label: "Carteira de identidade (RG)" },
  { value: "cnh", label: "CNH" },
  { value: "passaporte", label: "Passaporte" },
] as const;

function soDigitos(v: string): string {
  return v.replace(/\D/g, "").slice(0, 11);
}

function formatCpfInput(v: string): string {
  const d = soDigitos(v);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function PerfilPage() {
  const { user, access, refreshUser } = useAuth();
  const [nome, setNome] = useState(user?.first_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [foto, setFoto] = useState<File | null>(null);
  const [cpf, setCpf] = useState(user?.cpf_formatado || user?.cpf || "");
  const [nascimento, setNascimento] = useState(user?.data_nascimento || "");
  const [docTipo, setDocTipo] = useState(user?.documento_tipo || "");
  const [docPdf, setDocPdf] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNome(user.first_name || "");
    setBio(user.bio || "");
    setCpf(user.cpf_formatado || user.cpf || "");
    setNascimento(user.data_nascimento || "");
    setDocTipo(user.documento_tipo || "");
  }, [user]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("first_name", nome);
      fd.append("bio", bio);
      fd.append("cpf", soDigitos(cpf));
      fd.append("data_nascimento", nascimento);
      fd.append("documento_tipo", docTipo);
      if (foto) fd.append("foto", foto);
      if (docPdf) fd.append("documento_arquivo", docPdf);
      await apiFormData<User>("/auth/me/", {
        method: "PATCH",
        token: access,
        formData: fd,
      });
      await refreshUser();
      setMsg("Perfil atualizado.");
      setFoto(null);
      setDocPdf(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const completo = Boolean(user?.dados_certificado_completos);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Perfil</h1>
          <p className="page-lead">
            Dados da conta e documentos exigidos para emitir certificado.
          </p>
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
          <p className={completo ? "form-ok" : "portal-muted"} style={{ marginTop: "0.75rem" }}>
            {completo
              ? "Dados para certificado completos."
              : "Faltam dados legais para emitir certificado."}
          </p>
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
              Nome completo (como no documento)
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
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

            <h3 style={{ margin: "0.5rem 0 0" }}>Dados para certificado</h3>
            <p className="portal-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              CPF, nascimento e um documento de identidade em PDF (RG, CNH ou
              passaporte) são obrigatórios para emissão legal do certificado.
            </p>
            <label>
              CPF
              <input
                value={cpf}
                onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
              />
            </label>
            <label>
              Data de nascimento
              <input
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                required
              />
            </label>
            <label>
              Tipo de documento
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(e.target.value)}
                required
              >
                <option value="">Selecione…</option>
                {DOC_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Documento (PDF)
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setDocPdf(e.target.files?.[0] ?? null)}
                required={!user?.documento_url}
              />
            </label>
            {user?.documento_url && (
              <p className="portal-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Documento atual:{" "}
                <a href={user.documento_url} target="_blank" rel="noreferrer">
                  ver PDF
                </a>
                {user.documento_tipo
                  ? ` (${DOC_TIPOS.find((t) => t.value === user.documento_tipo)?.label || user.documento_tipo})`
                  : ""}
              </p>
            )}

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
