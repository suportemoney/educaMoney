import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest, type Plano } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

function beneficiosParaTexto(lista: string[] | undefined): string {
  return (lista || []).join("\n");
}

function textoParaBeneficios(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function formatBRL(valor: string | number): string {
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  if (Number.isNaN(n)) return String(valor);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const vazio = {
  nome: "",
  descricao: "",
  preco_referencia: "0.00",
  beneficiosTexto: "",
  duracao_dias: 365,
  ativo: true,
  ordem: 0,
};

export function PlanosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<Plano[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const data = await apiRequest<Plano[]>("/admin/planos/", { token: access });
    setItens(data);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return itens.filter((p) => {
      if (filtroAtivo === "1" && !p.ativo) return false;
      if (filtroAtivo === "0" && p.ativo) return false;
      if (!termo) return true;
      return (
        p.nome.toLowerCase().includes(termo) ||
        (p.descricao || "").toLowerCase().includes(termo)
      );
    });
  }, [itens, q, filtroAtivo]);

  const ativos = filtrados.filter((p) => p.ativo).length;

  function abrirNovo() {
    setEditando(null);
    setForm(vazio);
    setModalAberto(true);
  }

  function abrirEditar(p: Plano) {
    setEditando(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao,
      preco_referencia: p.preco_referencia,
      beneficiosTexto: beneficiosParaTexto(p.beneficios),
      duracao_dias: p.duracao_dias ?? 365,
      ativo: p.ativo,
      ordem: p.ordem,
    });
    setModalAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    const body = {
      nome: form.nome,
      descricao: form.descricao,
      preco_referencia: form.preco_referencia,
      beneficios: textoParaBeneficios(form.beneficiosTexto),
      duracao_dias: form.duracao_dias,
      ativo: form.ativo,
      ordem: form.ordem,
    };
    try {
      if (editando) {
        await apiRequest(`/admin/planos/${editando.id}/`, {
          method: "PATCH",
          token: access,
          body,
        });
      } else {
        await apiRequest("/admin/planos/", {
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

  async function excluir(p: Plano) {
    if (!access) return;
    if (!confirm(`Excluir (inativar) plano "${p.nome}"?`)) return;
    await apiRequest(`/admin/planos/${p.id}/`, {
      method: "PATCH",
      token: access,
      body: { ativo: false },
    });
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Planos</h1>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovo}>
          Novo
        </button>
      </div>
      <p className="page-lead">
        Título, preço e benefícios do card na landing (uma linha por item).
      </p>
      <div className="stat-chips">
        <span className="stat-chip">
          Total <strong>{filtrados.length}</strong>
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
        }}
      >
        <label>
          Busca
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou descrição…"
          />
        </label>
        <label>
          Status
          <select value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </select>
        </label>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Preço</th>
              <th>Dias</th>
              <th>Benefícios</th>
              <th>Ordem</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{formatBRL(p.preco_referencia)}</td>
                <td>{p.duracao_dias ?? 365}</td>
                <td>{(p.beneficios || []).length}</td>
                <td>{p.ordem}</td>
                <td>
                  <span className={`badge ${p.ativo ? "badge--ok" : "badge--off"}`}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrirEditar(p)}
                  >
                    Editar
                  </button>
                  {p.ativo && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => excluir(p)}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum plano encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalAberto}
        titulo={editando ? "Editar plano" : "Novo plano"}
        onFechar={() => setModalAberto(false)}
      >
        <form className="form-grid" onSubmit={salvar}>
          <label>
            Nome (título do card)
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </label>
          <label>
            Descrição curta
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
              rows={2}
            />
          </label>
          <label>
            Benefícios (um por linha)
            <textarea
              value={form.beneficiosTexto}
              onChange={(e) => setForm({ ...form, beneficiosTexto: e.target.value })}
              rows={7}
              placeholder={"Tudo do plano anterior\nAcesso aos cursos X\nSuporte prioritário"}
              required
            />
          </label>
          <label>
            Preço referência
            <input
              value={form.preco_referencia}
              onChange={(e) => setForm({ ...form, preco_referencia: e.target.value })}
              required
            />
          </label>
          <label>
            Duração (dias de validade)
            <input
              type="number"
              min={1}
              value={form.duracao_dias}
              onChange={(e) =>
                setForm({ ...form, duracao_dias: Number(e.target.value) || 365 })
              }
              required
            />
          </label>
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
            Ativo (visível na landing)
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
