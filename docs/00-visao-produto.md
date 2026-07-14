# Visão do produto — EducaMoney

## O que é

Plataforma digital da **EducaMoney** para disponibilizar cursos sobre finanças e conteúdos complementares (*plus*) aos clientes.

## Proposta de valor

- O visitante conhece planos e cursos em uma **landing page**.
- A **compra não ocorre no site**: o CTA redireciona para o **WhatsApp** da empresa.
- Após a conversa comercial, a equipe gera um **token-key** vinculado a um plano.
- O cliente usa o token no sistema para **ativar o plano** e liberar os cursos correspondentes.

## Personas

| Persona | Necessidade |
|---------|-------------|
| Visitante | Ver planos/cursos e iniciar contato comercial |
| Aluno / Cliente | Cadastrar-se, ativar plano com token, consumir cursos |
| Operador / Admin | Gerenciar planos, cursos, tokens e usuários (CRUD) |

## Escopo fora do sistema

- Checkout, gateway de pagamento e emissão fiscal (tratados no WhatsApp / operação humana).
- App nativo mobile (futuro; por ora web responsiva).

## Princípios de UX admin

Todas as áreas de configuração seguem o padrão **CRUD em tabela**:

- Lista tabular dos registros
- Botão para **criar** (abre modal)
- Botão para **editar** (abre modal com dados)
- Botão para **excluir** ou **inativar** (soft-delete preferencial)
