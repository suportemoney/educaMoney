import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { Header } from "../components/Header";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { REGRAS_SENHA, senhaValida } from "../lib/password";

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Não foi possível cadastrar.";
  }
  const obj = data as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) {
      return String(val[0]);
    }
    if (typeof val === "string") {
      return val;
    }
  }
  return "Não foi possível cadastrar.";
}

const PASSOS = [
  {
    n: "01",
    titulo: "Escolha o plano",
    texto: "Na landing, compare e fale conosco no WhatsApp.",
  },
  {
    n: "02",
    titulo: "Receba o token",
    texto: "Após a aquisição, enviamos seu token-key exclusivo.",
  },
  {
    n: "03",
    titulo: "Ative e estude",
    texto: "Cole o código aqui e seus cursos aparecem liberados.",
  },
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const checklist = useMemo(
    () => REGRAS_SENHA.map((r) => ({ ...r, ok: r.ok(password) })),
    [password]
  );
  const senhaOk = senhaValida(password);
  const confirmOk = passwordConfirm.length > 0 && password === passwordConfirm;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!senhaOk) {
      setErro("A senha ainda não atende todas as regras.");
      return;
    }
    if (!confirmOk) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        password,
        password_confirm: passwordConfirm,
      });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErro(extractErrorMessage(err.data));
      } else {
        setErro("Falha no cadastro. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page-shell page-shell--register">
      <Header />
      <main className="register-stage">
        <section className="register-story" aria-labelledby="register-story-title">
          <div className="register-story__glow" aria-hidden="true" />
          <div className="register-story__orb register-story__orb--a" aria-hidden="true" />
          <div className="register-story__orb register-story__orb--b" aria-hidden="true" />

          <p className="register-kicker animate-fade-up">EducaMoney</p>
          <h1 id="register-story-title" className="register-headline animate-fade-up animate-delay-1">
            Sua conta é o ponto de partida
            <span className="register-headline__accent"> da liberdade financeira.</span>
          </h1>
          <p className="register-lead animate-fade-up animate-delay-2">
            Cadastre-se uma vez, receba seu RA e entre no portal do aluno para
            ativar o token e acompanhar os cursos.
          </p>

          <ol className="register-steps animate-fade-up animate-delay-3">
            {PASSOS.map((p) => (
              <li key={p.n} className="register-step">
                <span className="register-step__n">{p.n}</span>
                <div>
                  <strong>{p.titulo}</strong>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="register-form-panel animate-fade-up animate-delay-2" aria-label="Formulário de cadastro">
          <div className="register-form-panel__head">
            <h2>Criar conta</h2>
            <p>Depois do cadastro, use o menu do seu nome para abrir o portal.</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <label>
              Nome
              <input
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
            <div className="auth-form__row">
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
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </div>

            <PasswordInput
              label="Senha"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />

            <ul className="pwd-checklist" aria-live="polite">
              {checklist.map((r) => (
                <li key={r.id} className={r.ok ? "ok" : ""}>
                  <span className="pwd-checklist__mark" aria-hidden="true" />
                  {r.label}
                </li>
              ))}
            </ul>

            <PasswordInput
              label="Confirmar senha"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              autoComplete="new-password"
              required
            />
            {passwordConfirm.length > 0 && (
              <p className={confirmOk ? "pwd-match ok" : "pwd-match"}>
                {confirmOk ? "Senhas iguais." : "As senhas ainda não coincidem."}
              </p>
            )}

            {erro && (
              <p className="form-erro" role="alert">
                {erro}
              </p>
            )}

            <button
              className="btn btn--primary"
              type="submit"
              disabled={enviando || !senhaOk || !confirmOk}
            >
              {enviando ? "Criando sua conta…" : "Começar agora"}
            </button>
          </form>

          <p className="auth-switch">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
