import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiRequest,
  buildWhatsAppUrl,
  formatPreco,
  type Plano,
  type PublicConfig,
} from "../api/client";
import { BrandLogo } from "../components/BrandLogo";
import { Header } from "../components/Header";
import { fetchCacheMode } from "../lib/version";

export function LandingPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [totalCursos, setTotalCursos] = useState(0);
  const [waTelefone, setWaTelefone] = useState("");
  const [waMensagem, setWaMensagem] = useState("");
  const [nomeSite, setNomeSite] = useState("EducaMoney");
  const [appVersion, setAppVersion] = useState("…");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const cache = fetchCacheMode();
    Promise.all([
      apiRequest<Plano[]>("/public/planos/", { cache }),
      apiRequest<PublicConfig>("/public/config/", { cache }),
    ])
      .then(([p, cfg]) => {
        setPlanos(p);
        setTotalCursos(cfg.total_cursos ?? 0);
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

      <section id="planos" className="section section--planos">
        <div className="section__intro">
          <h2>Planos</h2>
          <p>
            Compare o que cada plano libera. A aquisição é feita pelo WhatsApp
            da EducaMoney.
          </p>
        </div>
        <div className="plan-grid">
          {planos.length === 0 ? (
            <p className="plan-empty">Nenhum plano disponível no momento.</p>
          ) : (
            planos.map((plano) => (
              <article key={plano.id} className="plan-card">
                <header className="plan-card__head">
                  <h3>{plano.nome}</h3>
                  <p className="plan-card__price">
                    {formatPreco(plano.preco_referencia)}
                  </p>
                </header>
                {plano.descricao && (
                  <p className="plan-card__tagline">{plano.descricao}</p>
                )}
                <ul className="plan-card__list">
                  {(plano.beneficios || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <a
                  className="btn btn--primary plan-card__cta"
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
        <div className="cursos-teaser">
          <p className="cursos-teaser__kicker">Biblioteca EducaMoney</p>
          <h2 className="cursos-teaser__title">
            {totalCursos > 0 ? (
              <>
                Mais de{" "}
                <span className="cursos-teaser__num">{totalCursos}</span> cursos
              </>
            ) : (
              "Cursos em expansão"
            )}
          </h2>
          <p className="cursos-teaser__lead">
            Conteúdos de finanças e extras plus liberados conforme o plano que
            você ativar — sem listar o catálogo completo aqui.
          </p>
          <a className="btn btn--ghost" href="#planos">
            Ver planos
          </a>
        </div>
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
