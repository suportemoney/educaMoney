# EducaMoney

Plataforma de cursos financeiros. Stack containerizada para Windows e Linux.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows) ou Docker Engine + Compose (Linux)

## Setup após clonar do GitHub

- Windows: [`docs/setup-windows.md`](docs/setup-windows.md)
- Linux: [`docs/setup-linux.md`](docs/setup-linux.md)

## Subir o ambiente (dev)

```bash
cp .env.example .env
docker compose up --build
```

No PowerShell (Windows):

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Acesse:

- SPA: http://localhost/
- API health: http://localhost/api/health/

## Produção (Gunicorn + builds otimizados)

```bash
cp .env.example .env
# Ajuste DJANGO_DEBUG=0 e DJANGO_SECRET_KEY no .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Serviços

| Serviço   | Descrição                          |
|-----------|------------------------------------|
| `db`      | PostgreSQL 16                      |
| `backend` | Django + DRF (runserver / Gunicorn)|
| `frontend`| React + Vite                       |
| `nginx`   | Reverse proxy (porta 80)           |

## Documentação do produto

Veja a pasta [`docs/`](docs/) para visão, domínio, auth, fluxos e roadmap.

Painel admin: http://localhost/painel/login (credenciais em [`docs/07-painel-admin.md`](docs/07-painel-admin.md)).
