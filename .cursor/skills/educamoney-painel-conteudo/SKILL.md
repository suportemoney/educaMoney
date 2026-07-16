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

- Lista cursos: ação **Conteúdo** → `/painel/cursos/:id/conteudo`
- Página: tabela módulos; ao selecionar, tabela aulas; ao selecionar aula: materiais + quiz
- Aulas/materiais: modal com `FormData` via `apiFormData`

## APIs admin (PR+)

- `GET/POST /api/admin/cursos/{id}/modulos/`
- `PATCH/DELETE /api/admin/modulos/{id}/`
- `GET/POST /api/admin/modulos/{id}/aulas/` (multipart)
- `PATCH/DELETE /api/admin/aulas/{id}/`
- `GET/POST /api/admin/aulas/{id}/materiais/`
- `GET/POST /api/admin/aulas/{id}/quiz/` + perguntas/alternativas

## Papéis

Quem edita cursos: administrador, gestor, PR (`IsPROrAbove`).
