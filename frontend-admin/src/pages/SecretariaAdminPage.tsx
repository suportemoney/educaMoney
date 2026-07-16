import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, type TicketAdmin } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export function SecretariaAdminPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<TicketAdmin[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sel, setSel] = useState<TicketAdmin | null>(null);
  const [resposta, setResposta] = useState("");
  const [status, setStatus] = useState("em_andamento");

  async function carregar() {
    if (!access) return;
    setItens(await apiRequest<TicketAdmin[]>("/admin/tickets/", { token: access }));
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  function abrir(t: TicketAdmin) {
    setSel(t);
    setResposta(t.resposta || "");
    setStatus(t.status);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access || !sel) return;
    await apiRequest(`/admin/tickets/${sel.id}/`, {
      method: "PATCH",
      token: access,
      body: { resposta, status },
    });
    setSel(null);
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Secretaria</h1>
      </div>
      <p className="page-lead">Tickets abertos pelos alunos no portal.</p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>RA</th>
              <th>Assunto</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((t) => (
              <tr key={t.id}>
                <td>{t.usuario_nome}</td>
                <td>{t.usuario_ra || "—"}</td>
                <td>{t.assunto}</td>
                <td>{t.status}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrir(t)}
                  >
                    Responder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        aberto={!!sel}
        titulo={sel?.assunto || "Ticket"}
        onFechar={() => setSel(null)}
      >
        {sel && (
          <form className="form-grid" onSubmit={salvar}>
            <p className="page-lead">{sel.mensagem}</p>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em andamento</option>
                <option value="fechado">Fechado</option>
              </select>
            </label>
            <label>
              Resposta
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                rows={4}
              />
            </label>
            <button className="btn btn--primary" type="submit">
              Salvar
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
