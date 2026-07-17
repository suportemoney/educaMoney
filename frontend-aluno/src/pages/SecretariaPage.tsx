import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, type Ticket } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function SecretariaPage() {
  const { access } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function carregar() {
    if (!access) return;
    setTickets(
      await apiRequest<Ticket[]>("/aluno/secretaria/tickets/", { token: access })
    );
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setErro(null);
    setOk(null);
    try {
      await apiRequest("/aluno/secretaria/tickets/", {
        method: "POST",
        token: access,
        body: { assunto, mensagem },
      });
      setAssunto("");
      setMensagem("");
      setOk("Ticket enviado.");
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha");
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Secretaria</h1>
          <p className="page-lead">Abra um chamado ou acompanhe respostas.</p>
        </div>
      </div>
      <div className="secretaria-grid">
        <section className="bento-cell">
          <h2>Novo ticket</h2>
          <form className="portal-form" onSubmit={enviar}>
            <label>
              Assunto
              <input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                required
              />
            </label>
            <label>
              Mensagem
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                required
                rows={5}
              />
            </label>
            {erro && <p className="form-erro">{erro}</p>}
            {ok && <p className="form-ok">{ok}</p>}
            <button className="btn btn--primary" type="submit">
              Enviar
            </button>
          </form>
        </section>
        <section className="bento-cell">
          <h2>Seus tickets</h2>
          {tickets.length === 0 ? (
            <div className="empty-box empty-box--inline">
              <p>Nenhum ticket ainda.</p>
              <p className="portal-muted">
                Abra um chamado ao lado para falar com a secretaria.
              </p>
            </div>
          ) : (
            <ul className="hist-list">
              {tickets.map((t) => (
                <li key={t.id}>
                  <strong>
                    {t.assunto} · {t.status}
                  </strong>
                  <span className="portal-muted">{t.mensagem}</span>
                  {t.resposta && (
                    <span className="ticket-reply">Resposta: {t.resposta}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
