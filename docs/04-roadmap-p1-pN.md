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

## P7 — Portal do aluno separado (entregue)

- SPA `frontend-aluno` em `/portal/` (prod: `aluno.educamoney.com.br`)
- RA no perfil + handoff JWT landing → portal
- Mini-menu na landing (Portal / Ativar se sem plano / Sair)
- Nginx: path `/portal/` + rascunho `nginx/hosts.prod.conf`

## P8 — Conteúdo, progresso e skills (entregue)

- `Modulo` / `Aula` (upload vídeo mp4/webm) / `ProgressoAula`
- Painel: conteúdo por curso (CRUD módulos/aulas)
- Portal: detalhe do curso, player HTML5, progresso %
- Agent Skills em `.cursor/skills/` (stack, portal, painel-conteudo)
- Nginx/Django: upload até 500M

## P9 — Portal completo + catálogo (entregue)

- Categorias / subcategorias / conjuntos (trilhas) + ícone nos cursos
- Portal: Início (bento), Meus cursos (grid+filtros), Conjuntos, Finanças, Secretaria, Perfil
- `Ativacao.valido_ate` + estender no painel; upgrade/renovar via WhatsApp
- Tickets de secretaria (aluno + painel)

## P11 — Conteúdo rico (entregue)

- `MaterialAula`, capa de curso, `Plano.duracao_dias`
- Painel: materiais e duração; confirmação em categorias/conjuntos

## P12 — Gestão de alunos (entregue)

- `/api/admin/alunos/` + tela Alunos (RA, progresso, estender)

## P13 — Quizzes (entregue)

- `Quiz` / `Pergunta` / `Alternativa` / `TentativaQuiz`
- Painel no conteúdo da aula; API aluno submete tentativa

## P14 — Certificados (entregue)

- Emissão por conclusão + quizzes; HTML imprimível; admin listar/revogar
- Validação pública `GET /api/public/certificados/{codigo}/`

## P15 — Portal LMS (entregue)

- Materiais, quiz no player, certificados, perfil editável (PATCH `/auth/me/`)

## P16 — Operação e qualidade

- Soft-delete helpers, health com check de DB, script `scripts/backup-postgres.sh`
- Soft-delete preferencial já aplicado em categorias/conjuntos/materiais/quizzes

## P17 — Hardening (entregue)

- Nginx: `/media/documentos_aluno/` inacessível (PDF só via API autenticada)
- UI painel: criação de “bloqueia avanço” (legado) removida do editor de atividades

## P18 — Notificações por e-mail (entregue)

- SMTP via `.env` + `EMAIL_ENABLED`; eventos: ticket (aluno/staff), certificado, aviso de vencimento (`avisar_vencimento`)

## P19 — Área do Instrutor (entregue)

- Nav/APIs filtradas por `Curso.instrutor`; dashboard com métricas dos próprios cursos

## P20 — Relatórios CSV (entregue)

- Export alunos, ativações e progresso por curso (admin/gestor)

## P21 — Portal: conjuntos + UX (entregue)

- Progresso agregado do conjunto; checklist; banner perfil incompleto; atividades no player

## P22 — Landing (entregue)

- Validar certificado; Termos e Privacidade; SEO básico

## P23 — Qualidade (entregue)

- Smoke tests; health ampliado (media/ffmpeg); doc de deploy curto (sem backup automático)

## P10 — (legado) Operação

- Itens absorvidos em P16; backups e observabilidade contínua
