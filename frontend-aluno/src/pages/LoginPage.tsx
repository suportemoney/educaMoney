import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login, consumeHandoff, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(Boolean(params.get("code")));

  useEffect(() => {
    const code = params.get("code");
    if (!code || user) return;
    setHandoffBusy(true);
    const next = params.get("next") || "/";
    consumeHandoff(code)
      .then(() => navigate(next.startsWith("/") ? next : "/", { replace: true }))
      .catch((e: Error) => {
        setErro(e.message || "Falha ao entrar pelo site.");
        setHandoffBusy(false);
      });
  }, [params, consumeHandoff, navigate, user]);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [loading, user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErro(err.message.includes("Portal") ? err.message : "Usuário ou senha inválidos.");
      } else if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Falha ao entrar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (handoffBusy) {
    return (
      <div className="portal-auth">
        <p>Entrando no portal…</p>
      </div>
    );
  }

  return (
    <div className="portal-auth">
      <div className="portal-auth__panel">
        <h1>Portal do aluno</h1>
        <p className="portal-auth__lead">
          Use sua conta EducaMoney. Se veio do site, o acesso é automático.
        </p>
        <form className="portal-form" onSubmit={onSubmit}>
          <label>
            Usuário
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {erro && <p className="form-erro">{erro}</p>}
          <button className="btn btn--primary" type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="portal-auth__foot">
          <a href="/">Voltar ao site</a>
          {" · "}
          <Link to="/">Já autenticado?</Link>
        </p>
      </div>
    </div>
  );
}
