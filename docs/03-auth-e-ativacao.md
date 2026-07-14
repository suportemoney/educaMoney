# Autenticação e ativação de plano

## Auth (SPA + API)

JWT via Django REST Framework (simplejwt).

| Fluxo | Endpoint | Observação |
|-------|----------|------------|
| Cadastro | `POST /api/auth/register/` | Cria usuário `aluno` |
| Login | `POST /api/auth/login/` | Retorna access/refresh |
| Logout | `POST /api/auth/logout/` | Invalida refresh (blacklist) |
| Me | `GET /api/auth/me/` | Dados do usuário autenticado |

Sessão Django Admin permanece em `/admin/` para equipe técnica.

## Compra via WhatsApp

1. Landing exibe planos/cursos.
2. CTA “Adquirir” abre WhatsApp com mensagem da integração (variáveis `{titulo_plano}`, etc.).
3. Operador fecha a venda fora do sistema.
4. Operador gera **TokenKey** no painel (`/painel/tokens`).
5. Cliente recebe o código e ativa em **http://localhost/ativar** (logado).

## Ativação (P6)

```
POST /api/ativacao/
Authorization: Bearer <jwt>
{ "codigo": "XXXX-XXXX-XXXX-XXXX" }
```

Também disponível em `POST /api/aluno/ativacao/`.

Regras:

- Token deve estar `disponivel`
- Usuário autenticado
- Marca token como `usado`, preenche `usado_por` / `usado_em`
- Cria `Ativacao` (usuario, plano, token_key)
- Libera cursos do plano via `PlanoCurso`
- Token inválido / revogado / já usado → `400` com `detail` claro

Resposta de sucesso inclui `ativacao`, `plano` e `cursos`.

## Área do aluno (mínima)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/aluno/meus-cursos/` | União dos cursos dos planos com ativação ativa |
| `GET /api/aluno/ativacoes/` | Histórico de ativações do usuário |

Rotas SPA (JWT obrigatório): `/ativar`, `/meus-cursos`.

## Logout

Limpa tokens no cliente (localStorage) e chama endpoint de logout com blacklist.
