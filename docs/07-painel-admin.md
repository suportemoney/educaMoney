# Painel administrativo

## URL

- Login: http://localhost/painel/login
- App: http://localhost/painel/

Site público continua em http://localhost/

## Papéis

| Papel | Código | Acesso no painel |
|-------|--------|------------------|
| Administrador | `administrador` (+ `is_superuser`) | Tudo |
| Gestor | `gestor` | Usuários, planos, integração, tokens |
| PR | `pr` | Dashboard, cursos (+ leitura de planos) |
| Instrutor | `instrutor` | Só dashboard (métricas) |
| Merchant | `merchant` | Dashboard, tokens (+ leitura de planos) |
| Aluno | `aluno` | Sem acesso ao painel |

## Usuários seed (senha: `Educa@2026`)

| Usuário | Papel |
|---------|--------|
| `admin` | Administrador |
| `gestor` | Gestor |
| `pr` | PR |
| `professor` | Instrutor |
| `merchant` | Merchant |

O comando `seed_staff` no entrypoint cria/atualiza esses usuários com foto de perfil.

## Padrão de UI (CRUD)

| Operação | UI |
|----------|-----|
| R | Tabela |
| C / U | Modal (**Novo** / **Editar**) |
| D | Botão **Excluir** na linha (soft-delete via `ativo` / `is_active`) |

Tokens: Gerar no modal, **Revogar** como D.

### Integração WhatsApp

- Telefone no formato `+55` + DDD + número (ex.: `+5511999999999`)
- Mensagem automática com variáveis: `{titulo_plano}`, `{valor_plano}`, `{nome_site}`
- Só uma integração WhatsApp fica `ativo=True` por vez
- A landing monta `https://wa.me/<digitos>?text=...` substituindo as variáveis do plano clicado

## APIs auth

- `GET /api/auth/me/` — `papel`, `foto_url`, `bio`
- `GET /api/auth/admin/dashboard/` — métricas reais (counts) por papel
- `GET/POST /api/auth/admin/usuarios/` — gestor+
- `PATCH /api/auth/admin/usuarios/<id>/` — gestor+ (papel, bio, ativo, senha opcional)

## APIs admin (catálogo)

Prefixo `/api/admin/` — JWT + RBAC:

| Recurso | Métodos | Papéis |
|---------|---------|--------|
| `/api/admin/planos/` | GET (painel), POST/PATCH (gestor+) | ver tabela |
| `/api/admin/cursos/` | list/create/patch + `plano_ids` | PR+ |
| `/api/admin/instrutores/` | GET | PR+ |
| `/api/admin/integracoes/` | list/create/patch | gestor+ |
| `/api/admin/tokens/` | list/create | merchant+ |
| `/api/admin/tokens/<id>/revogar/` | POST | merchant+ |

## Público (landing)

- `GET /api/public/planos/` — só `ativo=True`
- `GET /api/public/cursos/` — só `ativo=True`
- `GET /api/public/config/` — `whatsapp_telefone`, `whatsapp_mensagem`, `nome_site`, `app_version`

Alterações de planos/cursos/integração no painel refletem na landing.
