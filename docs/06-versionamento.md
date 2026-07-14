# Versionamento automático (`?v=`)

A versão da EducaMoney é **gerada no build Docker** a partir do Git. Não é necessário editar número em `.env` ou `package.json`.

## Formato

`{quantidade_de_commits}-{sha_curto}`

Exemplo: `12-a1b2c3d`

- Se o repositório ainda não tiver commits: `0-unknown`
- Override de emergência (raro): variável de ambiente `APP_VERSION`

## Onde nasce

1. `docker compose up --build` usa o [`backend/Dockerfile`](../backend/Dockerfile)
2. O build lê o `.git` da raiz e grava `/etc/educamoney/VERSION`
3. O Django expõe em:
   - `GET /api/health/` → campo `version`
   - `GET /api/public/config/` → campo `app_version`
4. A landing mostra `v…` no rodapé

## Query `?v=`

Após um deploy, use para forçar refetch sem cache do navegador:

```
http://localhost/?v=12-a1b2c3d
```

Com `?v=` presente, o frontend busca planos/cursos/config com `cache: 'no-store'`.

## Atualizar a versão

1. Faça commits no Git
2. Rode `docker compose up --build`
3. A versão muda sozinha

Não há bump manual no fluxo normal.
