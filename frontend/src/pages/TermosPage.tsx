import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function TermosPage() {
  useEffect(() => {
    document.title = "Termos de uso — EducaMoney";
  }, []);

  return (
    <div className="page-shell">
      <Header />
      <main className="legal-page">
        <h1>Termos de uso</h1>
        <p className="legal-page__lead">
          Última atualização: julho de 2026. Ao usar a plataforma EducaMoney, você
          concorda com estes termos.
        </p>

        <section>
          <h2>1. Objeto</h2>
          <p>
            A EducaMoney oferece conteúdos de educação financeira e serviços
            correlatos via site, portal do aluno e canais de suporte. O acesso a
            cursos depende de plano ativo e das regras de liberação vigentes.
          </p>
        </section>

        <section>
          <h2>2. Cadastro e conta</h2>
          <p>
            Você é responsável por manter dados verdadeiros, pela confidencialidade
            da senha e pelo uso da conta. Dados cadastrais e de certificado devem
            refletir a identidade do aluno.
          </p>
        </section>

        <section>
          <h2>3. Conteúdo e propriedade</h2>
          <p>
            Vídeos, materiais, quizzes e certificados são protegidos. É vedada
            cópia, redistribuição ou uso comercial sem autorização expressa.
          </p>
        </section>

        <section>
          <h2>4. Planos e ativação</h2>
          <p>
            Aquisição e renovação ocorrem fora do checkout do site (ex.: WhatsApp).
            O token ou ativação liberam o acesso pelo prazo do plano. Cancelamentos
            e estornos seguem a política comercial comunicada no momento da compra.
          </p>
        </section>

        <section>
          <h2>5. Conduta</h2>
          <p>
            É proibido abuso, tentativa de burlar controles de progresso, compartilhar
            acesso ou usar a plataforma de forma ilícita. Podemos suspender contas em
            caso de violação.
          </p>
        </section>

        <section>
          <h2>6. Contato</h2>
          <p>
            Dúvidas sobre estes termos podem ser enviadas pela secretaria do portal
            ou pelos canais oficiais da EducaMoney.
          </p>
        </section>

        <p className="legal-page__back">
          <Link to="/">Voltar à página inicial</Link>
        </p>
      </main>
    </div>
  );
}
