# Roadmap

## P0 — Infra Docker + docs

- Compose: PostgreSQL, Django+DRF, React+Vite, Nginx/Gunicorn
- Health check `/api/health/`
- Documentação em `docs/`

## P1 — Auth + Landing (entregue)

- Cadastro, login, logout (JWT + blacklist)
- Landing com planos/cursos via API pública + seed
- CTA WhatsApp por plano

## P2 — UI/UX tecnológica + brand (entregue)

- Tema dark neon + pasta brand

## P3 — Versionamento automático `?v=` (entregue)

- Versão Git no build + footer + `?v=`

## P4 — Painel admin + papéis (entregue)

- SPA `/painel` com RBAC (admin, gestor, PR, instrutor, merchant)
- Modelo Perfil + foto + seed de 5 usuários
- Telas base / placeholders (CRUD completo nas fases seguintes)

## P5 — Painel completo + planos na landing (entregue)

- CRUD Planos, Cursos, Usuários, Integração (WhatsApp) e Tokens no painel
- `PlanoCurso` N:N, `Curso.instrutor`, `Integracao`, `TokenKey`
- Landing consome os mesmos planos/cursos ativos do banco

## P6 — Ativação do aluno + base autenticada (entregue)

- `Ativacao` + `TokenKey.usado_por`
- `POST /api/ativacao/` e `GET /api/aluno/meus-cursos/`
- SPA: `/ativar`, `/meus-cursos` (guard JWT)
- Painel Tokens mostra usado por / usado em

## P7 — Conteúdo e progresso

- Módulos/aulas, player, progresso / consumo de conteúdo

## P8 — Operação e qualidade

- Soft-delete, backups, observabilidade
