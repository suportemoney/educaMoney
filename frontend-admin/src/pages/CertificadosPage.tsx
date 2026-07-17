import { useEffect, useState } from "react";
import { apiRequest, type CertificadoAdmin, type Curso } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function CertificadosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<CertificadoAdmin[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [ra, setRa] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (!access) return;
    const params = new URLSearchParams();
    if (cursoId) params.set("curso", cursoId);
    if (ra.trim()) params.set("ra", ra.trim());
    const qs = params.toString() ? `?${params}` : "";
    const [list, cs] = await Promise.all([
      apiRequest<CertificadoAdmin[]>(`/admin/certificados/${qs}`, { token: access }),
      apiRequest<Curso[]>("/admin/cursos/", { token: access }),
    ]);
    setItens(list);
    setCursos(cs);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function revogar(c: CertificadoAdmin) {
    if (!access || !confirm(`Revogar certificado ${c.codigo}?`)) return;
    await apiRequest(`/admin/certificados/${c.id}/revogar/`, {
      method: "POST",
      token: access,
    });
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Certificados</h1>
      </div>
      <p className="page-lead">Lista e revogação. Emissão automática pelo aluno ao concluir o curso.</p>
      {erro && <p className="form-erro">{erro}</p>}
      <form
        className="form-grid"
        style={{ maxWidth: 560, marginBottom: "1rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          carregar().catch((err: Error) => setErro(err.message));
        }}
      >
        <label>
          Curso
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
            <option value="">Todos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          RA
          <input value={ra} onChange={(e) => setRa(e.target.value)} placeholder="EM2026…" />
        </label>
        <button type="submit" className="btn btn--primary btn--small">
          Filtrar
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Aluno</th>
              <th>RA</th>
              <th>CPF</th>
              <th>Nascimento</th>
              <th>Curso</th>
              <th>Emitido</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((c) => (
              <tr key={c.id}>
                <td>{c.codigo}</td>
                <td>{c.usuario_nome}</td>
                <td>{c.usuario_ra || "—"}</td>
                <td>{c.usuario_cpf_formatado || c.usuario_cpf || "—"}</td>
                <td>
                  {c.usuario_data_nascimento
                    ? new Date(
                        c.usuario_data_nascimento + "T12:00:00"
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td>{c.curso_titulo}</td>
                <td>{new Date(c.emitido_em).toLocaleDateString("pt-BR")}</td>
                <td>{c.revogado ? "Revogado" : "Válido"}</td>
                <td className="td-actions">
                  {!c.revogado && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => revogar(c)}
                    >
                      Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhum certificado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
