import { useEffect, useState } from "react";
import { apiRequest, type AtivacaoAdmin } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export function AtivacoesPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<AtivacaoAdmin[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sel, setSel] = useState<AtivacaoAdmin | null>(null);
  const [dias, setDias] = useState(30);

  async function carregar() {
    if (!access) return;
    const list = await apiRequest<AtivacaoAdmin[]>("/admin/ativacoes/", {
      token: access,
    });
    setItens(list);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function estender() {
    if (!access || !sel) return;
    await apiRequest(`/admin/ativacoes/${sel.id}/estender/`, {
      method: "POST",
      token: access,
      body: { dias },
    });
    setSel(null);
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Ativações</h1>
      </div>
      <p className="page-lead">Estenda a validade após renovação via WhatsApp.</p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Plano</th>
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
                  {a.valido_ate
                    ? new Date(a.valido_ate).toLocaleDateString("pt-BR")
                    : "Sem prazo"}
                </td>
                <td>{a.vigente ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => setSel(a)}
                  >
                    Estender
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        aberto={!!sel}
        titulo="Estender validade"
        onFechar={() => setSel(null)}
      >
        <label>
          Dias a adicionar
          <input
            type="number"
            min={1}
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
          />
        </label>
        <button type="button" className="btn btn--primary" onClick={estender}>
          Confirmar
        </button>
      </Modal>
    </div>
  );
}
