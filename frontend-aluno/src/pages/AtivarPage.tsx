import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, type Ativacao, type AtivacaoResultado } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function AtivarPage() {
  const { access } = useAuth();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [jaTemPlano, setJaTemPlano] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiRequest<Ativacao[]>("/aluno/ativacoes/", { token: access })
      .then((lista) => setJaTemPlano(lista.some((a) => a.ativo)))
      .catch(() => setJaTemPlano(false));
  }, [access]);

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
      setOk(`Plano "${data.plano.nome}" ativado.`);
      setTimeout(() => navigate("/meus-cursos"), 800);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Falha ao ativar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1>Ativar plano</h1>
      <p className="page-lead">
        Cole o token-key recebido no WhatsApp após a aquisição.
        {jaTemPlano && " Você já tem plano ativo; pode ativar outro token para somar cursos."}
      </p>
      <form className="portal-form portal-form--narrow" onSubmit={onSubmit}>
        <label>
          Código
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            required
            autoComplete="off"
          />
        </label>
        {erro && <p className="form-erro">{erro}</p>}
        {ok && <p className="form-ok">{ok}</p>}
        <button className="btn btn--primary" type="submit" disabled={enviando}>
          {enviando ? "Ativando…" : "Ativar"}
        </button>
      </form>
      <p className="portal-auth__foot">
        <Link to="/meus-cursos">Ver meus cursos</Link>
      </p>
    </div>
  );
}
