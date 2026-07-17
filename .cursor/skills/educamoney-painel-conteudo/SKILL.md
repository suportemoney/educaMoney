---
name: educamoney-painel-conteudo
description: >-
  CRUD de conteúdo do painel EducaMoney: módulos e aulas com upload de vídeo
  multipart. Use ao editar Cursos/conteúdo no frontend-admin ou APIs
  /api/admin/cursos/*/modulos e /api/admin/aulas.
---

# EducaMoney — conteúdo no painel

## Domínio (cascata)

`Curso` → lista só `Modulo`.
Ao abrir módulo → 3 containers: **Aulas** | **Materiais** | **Atividades**.
Fora do módulo → **1 prova avaliadora** do curso (`Quiz.tipo=prova_curso`); aprovação + aulas concluídas = certificado.

- `Aula`: vídeo FileField `aulas/` (mp4/webm, máx. 500 MB)
- Upload: **duração via ffprobe**; **MP4→WebM** com ffmpeg quando possível
- Ordem de módulo/aula: **automática no create**; reordenar com drag (`…/reordenar/`)
- `MaterialAula`: FK `modulo` (cascata); `aula` legado opcional
- `Quiz.tipo`: `atividade` (módulo), `prova_curso` (curso 1:1), `quiz_aula` (legado)
- `Curso.capa`, `Plano.duracao_dias`
- Progresso: `ProgressoAula` (portal)

## CRUD UI (obrigatório)

Regra `.cursor/rules/painel-crud.mdc`: tabela + modal Novo/Editar + Excluir.

- Lista cursos: filtros `q`/`ativo`/`subcategoria_id`; **Conteúdo** → `/painel/cursos/:id/conteudo`
- Página conteúdo: módulos (sem auto-selecionar) → grid 3 containers; prova no nível curso; URL `?modulo=`
- Soft-delete: DELETE → `ativo=false`
- Aulas/materiais: modal com `FormData` via `apiFormData` (sem campos duração/ordem)

## APIs admin (PR+)

- `GET/POST /api/admin/cursos/{id}/modulos/`
- `POST /api/admin/cursos/{id}/modulos/reordenar/` — body `{ids:[…]}`
- `GET/POST /api/admin/modulos/{id}/aulas/` (multipart)
- `POST /api/admin/modulos/{id}/aulas/reordenar/` — body `{ids:[…]}`
- `GET/POST /api/admin/modulos/{id}/materiais/`
- `GET/POST /api/admin/modulos/{id}/atividades/`
- `GET/POST /api/admin/cursos/{id}/prova/`
- Legado: `GET/POST /api/admin/aulas/{id}/materiais|quiz/`

## Papéis

Quem edita cursos: administrador, gestor, PR (`IsPROrAbove`).
