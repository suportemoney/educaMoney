import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  buildWhatsAppUrl,
  formatPreco,
  type Curso,
  type Plano,
  type PublicConfig,
} from "../api/client";
import { BrandLogo } from "../components/BrandLogo";
import { Header } from "../components/Header";
import { fetchCacheMode } from "../lib/version";

export function LandingPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [waTelefone, setWaTelefone] = useState("");
  const [waMensagem, setWaMensagem] = useState("");
  const [nomeSite, setNomeSite] = useState("EducaMoney");
  const [appVersion, setAppVersion] = useState("…");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const cache = fetchCacheMode();
    Promise.all([
      apiRequest<Plano[]>("/public/planos/", { cache }),
      apiRequest<Curso[]>("/public/cursos/", { cache }),
      apiRequest<PublicConfig>("/public/config/", { cache }),
    ])
      .then(([p, c, cfg]) => {
        setPlanos(p);
        setCursos(c);
        setWaTelefone(cfg.whatsapp_telefone || "");
        setWaMensagem(cfg.whatsapp_mensagem || "");
        setNomeSite(cfg.nome_site || "EducaMoney");
        setAppVersion(cfg.app_version || "0-unknown");
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  return (
    <div className="page-shell">
      <Header />

      <section className="hero" aria-label="Apresentação">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <div className="hero__brand animate-fade-up">
            <BrandLogo size="hero" />
          </div>
          <h1 className="hero__headline animate-fade-up animate-delay-1">
            Finanças claras para decisões que geram futuro.
          </h1>
          <p className="hero__lead animate-fade-up animate-delay-2">
            Cursos de educação financeira e conteúdos plus em uma plataforma
            tech — aquisição via WhatsApp, sem checkout no site.
          </p>
          <div className="hero__actions animate-fade-up animate-delay-3">
            <a className="btn btn--primary" href="#planos">
              Ver planos
            </a>
            <Link className="btn btn--ghost" to="/login">
              Entrar
            </Link>
          </div>
        </div>
      </section>

      {erro && (
        <p className="banner-erro" role="alert">
          Não foi possível carregar o catálogo: {erro}
        </p>
      )}

      <section id="planos" className="section">
        <div className="section__intro">
          <h2>Planos</h2>
          <p>
            Escolha o nível que faz sentido agora. A aquisição é feita pelo
            WhatsApp da EducaMoney.
          </p>
        </div>
        <div className="plan-grid">
          {planos.length === 0 ? (
            <p className="plan-empty">Nenhum plano disponível no momento.</p>
          ) : (
            planos.map((plano) => (
              <article key={plano.id} className="plan-item">
                <h3>{plano.nome}</h3>
                <p className="plan-item__desc">{plano.descricao}</p>
                <p className="plan-item__price">
                  {formatPreco(plano.preco_referencia)}
                </p>
                <a
                  className="btn btn--primary"
                  href={buildWhatsAppUrl(waTelefone, waMensagem, {
                    titulo_plano: plano.nome,
                    valor_plano: formatPreco(plano.preco_referencia),
                    nome_site: nomeSite,
                  })}
                  target="_blank"
                  rel="noreferrer"
                >
                  Adquirir no WhatsApp
                </a>
              </article>
            ))
          )}
        </div>
      </section>

      <section id="cursos" className="section section--alt">
        <div className="section__intro">
          <h2>Cursos</h2>
          <p>
            Conteúdos de finanças e extras plus liberados conforme o plano
            ativado (próximas fases).
          </p>
        </div>
        <ul className="course-list">
          {cursos.map((curso) => (
            <li key={curso.id} className="course-item">
              <h3>{curso.titulo}</h3>
              <p>{curso.descricao}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="site-footer">
        <p>EducaMoney — educação financeira para o dia a dia.</p>
        <p className="site-footer__version" title="Versão automática do build">
          v{appVersion}
        </p>
      </footer>
    </div>
  );
}
