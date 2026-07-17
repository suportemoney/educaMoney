---
name: educamoney-stack
description: >-
  Stack EducaMoney (Docker Compose, Nginx, três frontends Vite, Django/DRF).
  Use ao alterar compose, nginx, env, paths de deploy ou quando o agente
  for subir/debugar serviços locais.
---

# EducaMoney — stack

## Superfícies

| App | Dev (path) | Porta interna | JWT prefix |
|-----|------------|---------------|------------|
| Landing `frontend/` | `/` | 5173 | `em_*` |
| Painel `frontend-admin/` | `/painel/` | 5174 | `em_admin_*` |
| Portal `frontend-aluno/` | `/portal/` | 5175 | `em_aluno_*` |
| API `backend/` | `/api/` | 8000 | — |

Só o Nginx publica a porta **80**. Não expor 5173/5174/5175 no host.

## Regras operacionais

- **Nunca** rodar `manage.py` / Django no host Windows; migrações rodam no entrypoint do container `backend`.
- Builds distintos — não misturar shells landing/painel/portal.
- Dev: `base` Vite `/painel/` e `/portal/`; prod com subdomínios em `nginx/hosts.prod.conf`.
- Upload de mídia: `MEDIA_URL=/media/`, proxy Nginx; `client_max_body_size 500M` (vídeos de aula).
- **Bloqueado no Nginx:** `/media/documentos_aluno/` → 404. PDF de identidade só via API autenticada (`/api/auth/me/documento/`, `/api/admin/alunos/<id>/documento/`).

## Variáveis úteis

- `ALUNO_PORTAL_URL` (backend handoff)
- `VITE_ALUNO_PORTAL_URL` (landing)
- `VITE_API_BASE_URL` (default `/api`)
- `EMAIL_ENABLED`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`, `SECRETARIA_NOTIFY_EMAIL`

## Docs

Ver `docs/setup-windows.md`, `docs/08-portal-aluno.md`, `docs/09-deploy-prod.md`.
