import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, type AtivacaoResultado } from "../api/client";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";

export function AtivarPage() {
  const { access } = useAuth();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setErro(null);
    setOk(null);
    setEnviando(true);
    try {
      const data = await apiRequest<AtivacaoResultado>("/ativacao/", {
        method: "POST",
        token: access,
        body: { codigo: codigo.trim() },
      });
      setOk(`Plano "${data.plano.nome}" ativado. ${data.cursos.length} curso(s) liberados.`);
      setTimeout(() => navigate("/meus-cursos"), 900);
    } catch (err) {
      if (err instanceof ApiError) {
        setErro(err.message);
      } else {
        setErro("Não foi possível ativar o token.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page-shell page-shell--auth">
      <Header />
      <main className="auth-panel">
        <h1>Ativar plano</h1>
        <p className="auth-panel__lead">
          Cole o token-key que você recebeu no WhatsApp após a aquisição.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Código do token
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              required
              autoComplete="off"
            />
          </label>
          {erro && (
            <p className="form-erro" role="alert">
              {erro}
            </p>
          )}
          {ok && (
            <p className="form-ok" role="status">
              {ok}
            </p>
          )}
          <button className="btn btn--primary" type="submit" disabled={enviando}>
            {enviando ? "Ativando…" : "Ativar"}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/meus-cursos">Ver meus cursos</Link>
        </p>
      </main>
    </div>
  );
}
