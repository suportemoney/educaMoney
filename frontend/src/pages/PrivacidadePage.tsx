import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function PrivacidadePage() {
  useEffect(() => {
    document.title = "Privacidade — EducaMoney";
  }, []);

  return (
    <div className="page-shell">
      <Header />
      <main className="legal-page">
        <h1>Política de privacidade</h1>
        <p className="legal-page__lead">
          Última atualização: julho de 2026. Esta política descreve como tratamos
          dados pessoais na EducaMoney.
        </p>

        <section>
          <h2>1. Dados que coletamos</h2>
          <p>
            Dados de cadastro (nome, e-mail, usuário), dados de perfil e certificado
            (como CPF, data de nascimento e documento de identidade quando
            fornecidos), registros de progresso, tickets de suporte e dados técnicos
            de acesso necessários à operação do serviço.
          </p>
        </section>

        <section>
          <h2>2. Finalidades</h2>
          <p>
            Usamos os dados para autenticar usuários, liberar planos, emitir e
            validar certificados, prestar suporte, enviar avisos operacionais
            (ex.: vencimento) e melhorar a plataforma.
          </p>
        </section>

        <section>
          <h2>3. Compartilhamento</h2>
          <p>
            Não vendemos dados pessoais. Podemos compartilhar com provedores
            essenciais (hospedagem, e-mail) sob obrigação de confidencialidade, ou
            quando exigido por lei.
          </p>
        </section>

        <section>
          <h2>4. Segurança e retenção</h2>
          <p>
            Adotamos medidas razoáveis de proteção. Documentos de identidade são
            acessíveis apenas via canais autenticados. Mantemos os dados pelo tempo
            necessário às finalidades e obrigações legais.
          </p>
        </section>

        <section>
          <h2>5. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão de dados, conforme a
            legislação aplicável, pelos canais oficiais da EducaMoney.
          </p>
        </section>

        <p className="legal-page__back">
          <Link to="/">Voltar à página inicial</Link>
        </p>
      </main>
    </div>
  );
}
