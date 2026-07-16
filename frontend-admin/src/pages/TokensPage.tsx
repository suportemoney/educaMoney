import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest, type Plano, type TokenKey } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

function formatBRL(valor: string | number | null | undefined): string {
  if (valor == null || valor === "") return "—";
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  if (Number.isNaN(n)) return String(valor);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TokensPage() {
  const { access } = useAuth();
  const [tokens, setTokens] = useState<TokenKey[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoId, setPlanoId] = useState<number | "">("");
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [q, setQ] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("");

  async function carregar() {
    if (!access) return;
    const [t, p] = await Promise.all([
      apiRequest<TokenKey[]>("/admin/tokens/", { token: access }),
      apiRequest<Plano[]>("/admin/planos/", { token: access }),
    ]);
    setTokens(t);
    setPlanos(p);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return tokens.filter((t) => {
      if (filtroStatus && t.status !== filtroStatus) return false;
      if (filtroPlano && String(t.plano) !== filtroPlano) return false;
      if (!termo) return true;
      return (
        t.codigo.toLowerCase().includes(termo) ||
        (t.plano_nome || "").toLowerCase().includes(termo)
      );
    });
  }, [tokens, q, filtroStatus, filtroPlano]);

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
    try {
      await apiRequest(`/admin/tokens/${id}/revogar/`, {
        method: "POST",
        token: access,
      });
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao revogar");
    }
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      setErro("Não foi possível copiar o código.");
    }
  }

  const planosAtivos = planos.filter((p) => p.ativo);

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
        Gere códigos vinculados a um plano. O aluno ativa em /ativar no site. Tokens de
        upgrade aparecem com valor proporcional.
      </p>
      <div className="stat-chips">
        <span className="stat-chip">
          Lista <strong>{filtrados.length}</strong>
        </span>
        <span className="stat-chip">
          Disponíveis{" "}
          <strong>{filtrados.filter((t) => t.status === "disponivel").length}</strong>
        </span>
      </div>
      {erro && <p className="form-erro">{erro}</p>}
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label>
          Busca
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código ou plano…"
          />
        </label>
        <label>
          Status
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="disponivel">Disponível</option>
            <option value="usado">Usado</option>
            <option value="revogado">Revogado</option>
          </select>
        </label>
        <label>
          Plano
          <select value={filtroPlano} onChange={(e) => setFiltroPlano(e.target.value)}>
            <option value="">Todos</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Origem</th>
              <th>Valor</th>
              <th>Criado</th>
              <th>Usado por</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.codigo}</code>{" "}
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => copiar(t.codigo)}
                    title="Copiar"
                  >
                    Copiar
                  </button>
                </td>
                <td>{t.plano_nome}</td>
                <td>
                  <span className={`badge badge--token-${t.status}`}>{t.status}</span>
                </td>
                <td>{t.origem === "upgrade" ? "Upgrade" : "Gerado"}</td>
                <td>{formatBRL(t.valor_proporcional)}</td>
                <td>
                  {t.criado_em
                    ? new Date(t.criado_em).toLocaleString("pt-BR")
                    : "—"}
                  {t.criado_por_nome ? ` · ${t.criado_por_nome}` : ""}
                </td>
                <td>
                  {t.usado_por_nome || "—"}
                  {t.usado_em
                    ? ` · ${new Date(t.usado_em).toLocaleDateString("pt-BR")}`
                    : ""}
                </td>
                <td className="td-actions">
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
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhum token encontrado.</td>
              </tr>
            )}
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
              {planosAtivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {formatBRL(p.preco_referencia)}
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
