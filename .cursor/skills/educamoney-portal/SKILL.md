---
name: educamoney-portal
description: >-
  Portal do aluno EducaMoney (frontend-aluno): handoff JWT, RA, IsAluno,
  catálogo com categorias, conjuntos, finanças, secretaria, player e progresso.
  Use ao editar o portal ou APIs /api/aluno/* e /api/auth/portal-handoff*.
---

# EducaMoney — portal do aluno

## Auth

- Storage isolado: `em_aluno_access` / `em_aluno_refresh`.
- Guard: JWT + `papel === "aluno"` (staff do painel não entra).
- Handoff landing → portal: `POST /api/auth/portal-handoff/` → redirect
  `/portal/login?code=` → `POST /api/auth/portal-handoff/consume/`.
- RA no perfil (`EM` + ano + 6 dígitos), exposto em `/auth/me/`.

## Rotas SPA (`basename=/portal`)

- `/` dashboard bento (grid) + certificados
- `/meus-cursos` biblioteca + filtros categoria/subcategoria
- `/meus-cursos/:cursoId` outline módulos/aulas + emitir certificado
- `/aulas/:aulaId` player HTML5 + materiais + quiz + concluir
- `/conjuntos` trilhas (não liberam acesso sozinhas)
- `/financas` validade + WhatsApp upgrade/renovar
- `/secretaria` tickets
- `/perfil` RA (read-only) + editar nome/bio/foto (`PATCH /auth/me/`)
- `/ativar` só se sem plano vigente (nav oculta item)

## Domínio relevante

- `Categoria` → `Subcategoria` → `Curso` (icone / capa / icone_key)
- `Conjunto` + `ConjuntoCurso` (curadoria)
- `Ativacao.valido_ate` (acesso vigente = ativo + prazo OK; dias do plano)
- `MaterialAula`, `Quiz`, `Certificado`
- `TicketSecretaria`

## APIs aluno (`IsAluno`)

- `GET /api/aluno/meus-cursos/`, `GET /api/aluno/catalogo/`
- `GET /api/aluno/conjuntos/`, `GET /api/aluno/financas/`
- `GET/POST /api/aluno/secretaria/tickets/`
- `GET/POST /api/aluno/aulas/{id}/quiz/`
- `GET/POST /api/aluno/certificados/`, HTML com auth
- Conteúdo P8: cursos/aulas/progresso
- Gate: `ativacoes_vigentes_qs` em `catalog/access.py`

## UX

Tema dark neon + **CSS grid bento**; `CursoCard` com ícone.
Não reutilizar layout da landing no portal.
