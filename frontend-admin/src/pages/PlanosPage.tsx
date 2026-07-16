import { useEffect, useState, type FormEvent } from "react";
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
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Preço</th>
              <th>Dias</th>
              <th>Benefícios</th>
              <th>Ordem</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.preco_referencia}</td>
                <td>{p.duracao_dias ?? 365}</td>
                <td>{(p.beneficios || []).length}</td>
                <td>{p.ordem}</td>
                <td>{p.ativo ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => abrirEditar(p)}>
                    Editar
                  </button>
                  {p.ativo && (
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => excluir(p)}>
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
