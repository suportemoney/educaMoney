# Portal do aluno (P7 + P8)

## URLs (desenvolvimento)

| Superfície | URL |
|------------|-----|
| Landing | http://localhost/ |
| Painel | http://localhost/painel/ |
| Portal aluno | http://localhost/portal/ |

Serviços Vite internos (Docker): landing `5173`, admin `5174`, aluno `5175`. Só o Nginx publica a porta **80**.

## URLs (produção — DNS)

| Host | App |
|------|-----|
| `educamoney.com.br` | Landing |
| `admin.educamoney.com.br` | Painel |
| `aluno.educamoney.com.br` | Portal aluno |

Arquivo de referência: [`nginx/hosts.prod.conf`](../nginx/hosts.prod.conf). Em prod, cada SPA costuma ser buildada com `base: '/'` no próprio host; em dev usamos paths `/painel/` e `/portal/`.

## Variáveis

```env
ALUNO_PORTAL_URL=http://localhost/portal/
```

Frontend landing: `VITE_ALUNO_PORTAL_URL=/portal/` (compose já define).

## RA

Todo aluno recebe `RA` no formato `EM` + ano + 6 dígitos (ex.: `EM2026000042`), gerado no cadastro e exposto em `GET /api/auth/me/`.

## Fluxo landing → portal

1. Aluno entra na landing (`/login` ou cadastro).
2. Mini-menu no nome → **Portal do aluno**.
3. `POST /api/auth/portal-handoff/` gera código de uso único (~60s).
4. Redirect para `/portal/login?code=...`.
5. Portal consome `POST /api/auth/portal-handoff/consume/` e guarda JWT em `em_aluno_*` (storage isolado).

Se o aluno **não** tem plano ativo, o menu também mostra **Ativar plano** (handoff com `next=/ativar`).

## Segurança

- APIs `/api/aluno/*` e `/api/ativacao/` exigem papel **aluno** (`IsAluno`).
- Staff do painel não entra no portal.
- Três builds separados evitam misturar UI/admin/aluno no mesmo bundle.

## Conteúdo e progresso (P8)

Fluxo: **Meus cursos** → detalhe do curso (módulos/aulas + %) → **player** → conclui / próxima.

| Método | Path |
|--------|------|
| GET | `/api/aluno/meus-cursos/` (com `progresso_pct`) |
| GET | `/api/aluno/cursos/{id}/` |
| GET | `/api/aluno/aulas/{id}/` |
| PATCH | `/api/aluno/aulas/{id}/progresso/` |

Nav do portal oculta **Ativar plano** se houver ativação ativa.

### Upload de vídeo (painel)

- Tela: `/painel/cursos/{id}/conteudo`
- Extensões: `.mp4`, `.webm`
- Limite: **500 MB** (`client_max_body_size` no Nginx + validação no serializer)
- Arquivos em `/media/aulas/…`
- Materiais (pdf/zip/imagem) em `/media/materiais/…`
- Quiz e certificado: APIs `/api/aluno/aulas/{id}/quiz/` e `/api/aluno/certificados/`

### Agent Skills (Cursor)

Projeto: `.cursor/skills/educamoney-stack`, `educamoney-portal`, `educamoney-painel-conteudo`.

## Páginas do portal (P9)

| Rota | Função |
|------|--------|
| `/portal/` | Início em grid bento |
| `/portal/catalogo` | Busca + tags + painel filtros (cursos e conjuntos) |
| `/portal/meus-cursos` | Biblioteca do aluno |
| `/portal/conjuntos` | Trilhas |
| `/portal/financas` | Validade + WhatsApp upgrade/renovar |
| `/portal/secretaria` | Tickets |
| `/portal/perfil` | RA e dados |

UI: sidebar expansível com grupos (Estudo / Conta / Suporte); catálogo com pesquisa parcial e filtro lateral.
