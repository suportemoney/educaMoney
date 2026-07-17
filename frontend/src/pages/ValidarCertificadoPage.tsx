import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { Header } from "../components/Header";

type CertificadoPublico = {
  valido?: boolean;
  codigo: string;
  curso_titulo: string;
  usuario_nome: string;
  emitido_em: string;
};

export function ValidarCertificadoPage() {
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<CertificadoPublico | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    document.title = "Validar certificado — EducaMoney";
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const c = codigo.trim();
    if (!c) return;
    setBuscando(true);
    setErro(null);
    setResultado(null);
    setInvalido(false);
    try {
      const data = await apiRequest<CertificadoPublico>(
        `/public/certificados/${encodeURIComponent(c)}/`
      );
      setResultado(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setInvalido(true);
      } else {
        setErro(err instanceof Error ? err.message : "Falha na consulta.");
      }
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="page-shell">
      <Header />
      <main className="legal-page">
        <h1>Validar certificado</h1>
        <p className="legal-page__lead">
          Informe o código impresso no certificado para conferir a autenticidade.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Código
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex.: EM-XXXX-XXXX"
              required
              autoComplete="off"
            />
          </label>
          {erro && <p className="form-erro">{erro}</p>}
          <button className="btn btn--primary" type="submit" disabled={buscando}>
            {buscando ? "Consultando…" : "Validar"}
          </button>
        </form>

        {resultado && (
          <div className="cert-result cert-result--ok" role="status">
            <h2>Certificado válido</h2>
            <p>
              <strong>{resultado.usuario_nome}</strong> concluiu{" "}
              <strong>{resultado.curso_titulo}</strong>.
            </p>
            <p className="legal-page__muted">
              Código {resultado.codigo} · emitido em{" "}
              {new Date(resultado.emitido_em).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}

        {invalido && (
          <div className="cert-result cert-result--bad" role="alert">
            <h2>Certificado não encontrado</h2>
            <p>O código informado é inválido ou foi revogado.</p>
          </div>
        )}

        <p className="legal-page__back">
          <Link to="/">Voltar à página inicial</Link>
        </p>
      </main>
    </div>
  );
}
