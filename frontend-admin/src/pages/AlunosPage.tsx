import { useEffect, useState } from "react";
import { apiRequest, type AlunoAdmin } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export function AlunosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<AlunoAdmin[]>([]);
  const [q, setQ] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<AlunoAdmin | null>(null);
  const [dias, setDias] = useState(30);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const data = await apiRequest<AlunoAdmin[]>(
      `/admin/alunos/${params.toString() ? `?${params}` : ""}`,
      { token: access }
    );
    setItens(data);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function abrirDetalhe(id: number) {
    if (!access) return;
    const d = await apiRequest<AlunoAdmin>(`/admin/alunos/${id}/`, { token: access });
    setDetalhe(d);
  }

  async function toggleAtivo() {
    if (!access || !detalhe) return;
    setSalvando(true);
    try {
      const d = await apiRequest<AlunoAdmin>(`/admin/alunos/${detalhe.id}/`, {
        method: "PATCH",
        token: access,
        body: { is_active: !detalhe.is_active },
      });
      setDetalhe(d);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha");
    } finally {
      setSalvando(false);
    }
  }

  async function estender(ativacaoId: number) {
    if (!access || !confirm(`Estender ativação em ${dias} dias?`)) return;
    setSalvando(true);
    try {
      await apiRequest(`/admin/ativacoes/${ativacaoId}/estender/`, {
        method: "POST",
        token: access,
        body: { dias },
      });
      if (detalhe) await abrirDetalhe(detalhe.id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao estender");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Alunos</h1>
      </div>
      <p className="page-lead">Busca por nome, e-mail ou RA. Detalhe com progresso e validade.</p>
      {erro && <p className="form-erro">{erro}</p>}
      <form
        className="form-grid"
        style={{ maxWidth: 480, marginBottom: "1rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          carregar().catch((err: Error) => setErro(err.message));
        }}
      >
        <label>
          Busca
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="RA, nome, e-mail…" />
        </label>
        <button type="submit" className="btn btn--primary btn--small">
          Filtrar
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>RA</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Planos</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((a) => (
              <tr key={a.id}>
                <td>{a.ra || "—"}</td>
                <td>{a.first_name || a.username}</td>
                <td>{a.email}</td>
                <td>{(a.planos || []).join(", ") || "—"}</td>
                <td>{a.is_active ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrirDetalhe(a.id).catch((e: Error) => setErro(e.message))}
                  >
                    Detalhe
                  </button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum aluno encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={!!detalhe}
        titulo={detalhe ? `Aluno ${detalhe.ra || detalhe.username}` : "Aluno"}
        onFechar={() => setDetalhe(null)}
      >
        {detalhe && (
          <div className="form-grid">
            <p>
              <strong>{detalhe.first_name || detalhe.username}</strong>
              <br />
              {detalhe.email}
            </p>
            <button type="button" className="btn btn--ghost btn--small" onClick={toggleAtivo} disabled={salvando}>
              {detalhe.is_active ? "Inativar" : "Reativar"}
            </button>
            <h3>Ativações vigentes</h3>
            {(detalhe.ativacoes || []).length === 0 && <p>Nenhuma.</p>}
            {(detalhe.ativacoes || []).map((at) => (
              <div key={at.id} style={{ marginBottom: "0.75rem" }}>
                <div>
                  {at.plano_nome} — até{" "}
                  {at.valido_ate ? new Date(at.valido_ate).toLocaleDateString("pt-BR") : "sem prazo"}
                </div>
                <label>
                  Dias a estender
                  <input type="number" min={1} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
                </label>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={() => estender(at.id)}
                  disabled={salvando}
                >
                  Estender
                </button>
              </div>
            ))}
            <h3>Progresso</h3>
            <ul>
              {(detalhe.progresso || []).map((p) => (
                <li key={p.curso_id}>
                  {p.curso_titulo}: {p.progresso_pct}% ({p.aulas_concluidas}/{p.aulas_total})
                </li>
              ))}
              {(detalhe.progresso || []).length === 0 && <li>Sem cursos liberados.</li>}
            </ul>
            <h3>Certificados</h3>
            <ul>
              {(detalhe.certificados || []).map((c) => (
                <li key={c.id}>
                  {c.curso_titulo} — {c.codigo}
                  {c.revogado ? " (revogado)" : ""}
                </li>
              ))}
              {(detalhe.certificados || []).length === 0 && <li>Nenhum.</li>}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
