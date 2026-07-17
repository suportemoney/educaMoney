# Deploy produção EducaMoney (sem backup automático)

## Pré-requisitos

- Docker + Docker Compose
- DNS apontando para o host: `educamoney.com.br`, `admin.educamoney.com.br`, `aluno.educamoney.com.br`
- Arquivo `.env` preenchido (copie de `.env.example`)

## Subir

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Ou, se o compose de produção usar `nginx/hosts.prod.conf`, monte esse arquivo no serviço nginx conforme o `docker-compose.prod.yml` do repositório.

## Checagens rápidas

1. `GET /api/health/` → `status` ok (ou degraded com DB ok) e `checks.database=ok`
2. Landing: `https://educamoney.com.br/`
3. Painel: `https://admin.educamoney.com.br/`
4. Portal: `https://aluno.educamoney.com.br/`
5. Validar certificado: `/validar-certificado`

## E-mail (opcional)

Defina `EMAIL_ENABLED=1` e SMTP no `.env`. Aviso de vencimento:

```bash
docker compose exec backend python manage.py avisar_vencimento --dias 7
```

## Segurança de mídia

`/media/documentos_aluno/` retorna 404 no Nginx. PDF só via API autenticada.

## Fora de escopo

- Gateway de pagamento (continua token + WhatsApp)
- Backup automático (use `scripts/backup-postgres.sh` manualmente se precisar)

## Smoke tests (no container)

```bash
docker compose exec backend python manage.py test catalog.tests.test_smoke
```
