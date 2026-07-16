import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(username.trim(), password);
      navigate(from || "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErro("Usuário ou senha inválidos.");
      } else {
        setErro("Falha ao entrar. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page-shell page-shell--auth">
      <Header />
      <main className="auth-panel">
        <h1>Entrar</h1>
        <p className="auth-panel__lead">
          Acesse sua conta. Depois use o menu do seu nome para abrir o portal do
          aluno.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Usuário
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {erro && (
            <p className="form-erro" role="alert">
              {erro}
            </p>
          )}
          <button className="btn btn--primary" type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="auth-switch">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </main>
    </div>
  );
}
