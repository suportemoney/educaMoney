import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, type Plano, type TokenKey } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export function TokensPage() {
  const { access } = useAuth();
  const [tokens, setTokens] = useState<TokenKey[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoId, setPlanoId] = useState<number | "">("");
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  async function carregar() {
    if (!access) return;
    const [t, p] = await Promise.all([
      apiRequest<TokenKey[]>("/admin/tokens/", { token: access }),
      apiRequest<Plano[]>("/admin/planos/", { token: access }),
    ]);
    setTokens(t);
    setPlanos(p.filter((x) => x.ativo));
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function gerar(e: FormEvent) {
    e.preventDefault();
    if (!access || !planoId) return;
    setGerando(true);
    setErro(null);
    try {
      await apiRequest("/admin/tokens/", {
        method: "POST",
        token: access,
        body: { plano_id: planoId },
      });
      setModalAberto(false);
      setPlanoId("");
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gerar");
    } finally {
      setGerando(false);
    }
  }

  async function revogar(id: number) {
    if (!access || !confirm("Revogar este token?")) return;
    await apiRequest(`/admin/tokens/${id}/revogar/`, {
      method: "POST",
      token: access,
    });
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Token-key</h1>
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={() => setModalAberto(true)}
        >
          Gerar
        </button>
      </div>
      <p className="page-lead">
        Gere códigos vinculados a um plano. O aluno ativa em /ativar no site.
      </p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Criado por</th>
              <th>Usado por</th>
              <th>Usado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.codigo}</code>
                </td>
                <td>{t.plano_nome}</td>
                <td>
                  <span className="badge">{t.status}</span>
                </td>
                <td>{t.criado_por_nome || "—"}</td>
                <td>{t.usado_por_nome || "—"}</td>
                <td>
                  {t.usado_em
                    ? new Date(t.usado_em).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td>
                  {t.status === "disponivel" && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => revogar(t.id)}
                    >
                      Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal aberto={modalAberto} titulo="Gerar token" onFechar={() => setModalAberto(false)}>
        <form className="form-grid" onSubmit={gerar}>
          <label>
            Plano
            <select
              value={planoId}
              onChange={(e) => setPlanoId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Selecione…</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn--primary" type="submit" disabled={gerando}>
            {gerando ? "Gerando…" : "Gerar código"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
