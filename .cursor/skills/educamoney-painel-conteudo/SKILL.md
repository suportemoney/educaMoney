---
name: educamoney-painel-conteudo
description: >-
  CRUD de conteúdo do painel EducaMoney: módulos e aulas com upload de vídeo
  multipart. Use ao editar Cursos/conteúdo no frontend-admin ou APIs
  /api/admin/cursos/*/modulos e /api/admin/aulas.
---

# EducaMoney — conteúdo no painel

## Domínio

`Curso` → `Modulo` → `Aula` (`video` FileField `aulas/`, mp4/webm, máx. 500 MB).
`MaterialAula` (pdf/zip/imagem, máx. 50 MB) sob a aula.
`Quiz` 1:1 com aula → `Pergunta` → `Alternativa`; tentativas do aluno.
`Curso.capa`, `Plano.duracao_dias`.
Progresso do aluno: `ProgressoAula` (não editado no painel nesta fase).

## CRUD UI (obrigatório)

Regra `.cursor/rules/painel-crud.mdc`: tabela + modal Novo/Editar + Excluir.

- Lista cursos: filtros `q`/`ativo`/`subcategoria_id`; ação **Conteúdo** → `/painel/cursos/:id/conteudo`
- Página conteúdo: layout 2 colunas; breadcrumb; URL `?modulo=&aula=`
- Soft-delete: DELETE módulo/aula/material/quiz → `ativo=false` (listas default só ativos)
- Quiz soft-deletado: POST na mesma aula **reativa** em vez de 400
- Aulas/materiais: modal com `FormData` via `apiFormData`
- Alternativas: criar e editar via modal (`PATCH /admin/alternativas/{id}/`)

## APIs admin (PR+)

- `GET/POST /api/admin/cursos/` — GET aceita `q`, `ativo`, `subcategoria_id`; lista com `modulos_count` / `planos_nomes`
- `GET/POST /api/admin/cursos/{id}/modulos/` — GET: `?incluir_inativos=1`
- `PATCH/DELETE /api/admin/modulos/{id}/` — DELETE soft
- `GET/POST /api/admin/modulos/{id}/aulas/` (multipart) — GET: `?incluir_inativos=1`
- `PATCH/DELETE /api/admin/aulas/{id}/` — DELETE soft
- `GET/POST /api/admin/aulas/{id}/materiais/`
- `GET/POST /api/admin/aulas/{id}/quiz/` + perguntas/alternativas

## Papéis

Quem edita cursos: administrador, gestor, PR (`IsPROrAbove`).
