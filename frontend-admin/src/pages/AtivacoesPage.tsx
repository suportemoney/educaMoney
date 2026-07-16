import { useEffect, useMemo, useState } from "react";
import { apiRequest, type AtivacaoAdmin, type Plano } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Preview client-side da fórmula B (servidor valida de novo no POST). */
export function previewValorUpgrade(
  planoOrigem: Plano,
  planoDestino: Plano,
  validoAte: string | null
): { diasRestantes: number; valor: number } | null {
  if (!validoAte) return null;
  const fim = new Date(validoAte).getTime();
  const agora = Date.now();
  if (fim < agora) return null;
  const diasRestantes = Math.max(0, Math.ceil((fim - agora) / 86400000));
  if (diasRestantes < 1) return null;
  const precoAntigo = Number(planoOrigem.preco_referencia);
  const precoNovo = Number(planoDestino.preco_referencia);
  const duracao = Math.max(1, planoOrigem.duracao_dias || 1);
  const diff = precoNovo - precoAntigo;
  if (diff <= 0) return { diasRestantes, valor: 0 };
  const valor = Math.round((diff * diasRestantes) / duracao * 100) / 100;
  return { diasRestantes, valor };
}

export function AtivacoesPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<AtivacaoAdmin[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtroVigente, setFiltroVigente] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("");
  const [estenderSel, setEstenderSel] = useState<AtivacaoAdmin | null>(null);
  const [upgradeSel, setUpgradeSel] = useState<AtivacaoAdmin | null>(null);
  const [dias, setDias] = useState(30);
  const [planoDestinoId, setPlanoDestinoId] = useState<number | "">("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filtroVigente) params.set("vigente", filtroVigente);
    if (filtroPlano) params.set("plano_id", filtroPlano);
    const qs = params.toString();
    const [list, p] = await Promise.all([
      apiRequest<AtivacaoAdmin[]>(`/admin/ativacoes/${qs ? `?${qs}` : ""}`, {
        token: access,
      }),
      apiRequest<Plano[]>("/admin/planos/", { token: access }),
    ]);
    setItens(list);
    setPlanos(p);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  const vigentes = itens.filter((a) => a.vigente).length;

  const planosUpgrade = useMemo(() => {
    if (!upgradeSel) return [];
    const origem = planos.find((p) => p.id === upgradeSel.plano);
    if (!origem) return [];
    const preco = Number(origem.preco_referencia);
    return planos.filter((p) => p.ativo && Number(p.preco_referencia) > preco);
  }, [upgradeSel, planos]);

  const preview = useMemo(() => {
    if (!upgradeSel || !planoDestinoId) return null;
    const origem = planos.find((p) => p.id === upgradeSel.plano);
    const destino = planos.find((p) => p.id === planoDestinoId);
    if (!origem || !destino) return null;
    return previewValorUpgrade(origem, destino, upgradeSel.valido_ate);
  }, [upgradeSel, planoDestinoId, planos]);

  function previewNovaData(): string {
    if (!estenderSel) return "—";
    const agora = new Date();
    const base =
      estenderSel.valido_ate && new Date(estenderSel.valido_ate) > agora
        ? new Date(estenderSel.valido_ate)
        : agora;
    const nova = new Date(base);
    nova.setDate(nova.getDate() + (dias || 0));
    return nova.toLocaleDateString("pt-BR");
  }

  async function confirmarEstender() {
    if (!access || !estenderSel) return;
    setSalvando(true);
    setErro(null);
    try {
      await apiRequest(`/admin/ativacoes/${estenderSel.id}/estender/`, {
        method: "POST",
        token: access,
        body: { dias },
      });
      setEstenderSel(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao estender");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarUpgrade() {
    if (!access || !upgradeSel || !planoDestinoId) return;
    const destino = planos.find((p) => p.id === planoDestinoId);
    if (
      !confirm(
        `Upgrade de "${upgradeSel.plano_nome}" para "${destino?.nome}"?\n` +
          `Mesmo vencimento. Valor estimado: ${
            preview ? formatBRL(preview.valor) : "—"
          }.`
      )
    ) {
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await apiRequest(`/admin/ativacoes/${upgradeSel.id}/upgrade/`, {
        method: "POST",
        token: access,
        body: { plano_id: planoDestinoId },
      });
      setUpgradeSel(null);
      setPlanoDestinoId("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upgrade");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Ativações</h1>
      </div>
      <p className="page-lead">
        Estenda a validade ou faça upgrade de plano (mesmo vencimento, valor diferencial
        proporcional).
      </p>
      <div className="stat-chips">
        <span className="stat-chip">
          Lista <strong>{itens.length}</strong>
        </span>
        <span className="stat-chip">
          Vigentes <strong>{vigentes}</strong>
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
            placeholder="Aluno, e-mail ou token…"
          />
        </label>
        <label>
          Vigência
          <select value={filtroVigente} onChange={(e) => setFiltroVigente(e.target.value)}>
            <option value="">Todas</option>
            <option value="1">Vigentes</option>
            <option value="0">Encerradas</option>
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
        <button type="submit" className="btn btn--primary btn--small">
          Filtrar
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Plano</th>
              <th>Token</th>
              <th>Ativado em</th>
              <th>Válido até</th>
              <th>Vigente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((a) => (
              <tr key={a.id}>
                <td>{a.usuario_nome}</td>
                <td>{a.plano_nome}</td>
                <td>
                  <code>{a.token_codigo || "—"}</code>
                </td>
                <td>
                  {a.data_ativacao
                    ? new Date(a.data_ativacao).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td>
                  {a.valido_ate
                    ? new Date(a.valido_ate).toLocaleDateString("pt-BR")
                    : "Sem prazo"}
                </td>
                <td>
                  <span className={`badge ${a.vigente ? "badge--ok" : "badge--off"}`}>
                    {a.vigente ? "Sim" : "Não"}
                  </span>
                </td>
                <td className="td-actions">
                  {a.vigente && (
                    <>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setDias(30);
                          setEstenderSel(a);
                        }}
                      >
                        Estender
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setPlanoDestinoId("");
                          setUpgradeSel(a);
                        }}
                      >
                        Upgrade
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma ativação encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={!!estenderSel}
        titulo="Estender validade"
        onFechar={() => setEstenderSel(null)}
      >
        {estenderSel && (
          <div className="form-grid">
            <p>
              {estenderSel.usuario_nome} — {estenderSel.plano_nome}
              <br />
              Atual:{" "}
              {estenderSel.valido_ate
                ? new Date(estenderSel.valido_ate).toLocaleDateString("pt-BR")
                : "sem prazo"}
            </p>
            <label>
              Dias a adicionar
              <input
                type="number"
                min={1}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
              />
            </label>
            <p className="page-lead">Nova data prevista: {previewNovaData()}</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={confirmarEstender}
              disabled={salvando || dias < 1}
            >
              {salvando ? "Salvando…" : "Confirmar"}
            </button>
          </div>
        )}
      </Modal>

      <Modal
        aberto={!!upgradeSel}
        titulo="Upgrade de plano"
        onFechar={() => {
          setUpgradeSel(null);
          setPlanoDestinoId("");
        }}
      >
        {upgradeSel && (
          <div className="form-grid">
            <p>
              {upgradeSel.usuario_nome} — plano atual <strong>{upgradeSel.plano_nome}</strong>
              <br />
              Vencimento mantido:{" "}
              {upgradeSel.valido_ate
                ? new Date(upgradeSel.valido_ate).toLocaleDateString("pt-BR")
                : "sem prazo (upgrade indisponível)"}
            </p>
            {!upgradeSel.valido_ate && (
              <p className="form-erro">
                Defina um vencimento (Estender) antes de fazer upgrade.
              </p>
            )}
            <label>
              Novo plano
              <select
                value={planoDestinoId}
                onChange={(e) =>
                  setPlanoDestinoId(e.target.value ? Number(e.target.value) : "")
                }
                required
              >
                <option value="">Selecione…</option>
                {planosUpgrade.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} —{" "}
                    {Number(p.preco_referencia).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </option>
                ))}
              </select>
            </label>
            {planosUpgrade.length === 0 && (
              <p className="page-lead">Não há plano mais caro disponível para upgrade.</p>
            )}
            {preview && (
              <p className="page-lead">
                Dias restantes: <strong>{preview.diasRestantes}</strong>
                <br />
                Valor proporcional estimado: <strong>{formatBRL(preview.valor)}</strong>
                <br />
                (diferença de preço × dias / duração do plano atual)
              </p>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={confirmarUpgrade}
              disabled={
                salvando || !planoDestinoId || !upgradeSel.valido_ate || !preview
              }
            >
              {salvando ? "Aplicando…" : "Confirmar upgrade"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
