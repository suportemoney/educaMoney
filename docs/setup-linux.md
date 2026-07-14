# Setup no Linux (após clonar do GitHub)

Guia para rodar o EducaMoney em outro PC/servidor Linux usando Docker Engine + Compose.

## 1. Pré-requisitos

1. Git instalado.
2. Docker Engine + plugin Compose v2.
3. Usuário no grupo `docker` (para não precisar de `sudo` a cada comando).

### Ubuntu / Debian (exemplo)

```bash
sudo apt update
sudo apt install -y git ca-certificates curl

# Docker oficial (resumo — siga a doc atual da sua distro)
# https://docs.docker.com/engine/install/
```

Após instalar o Docker:

```bash
sudo usermod -aG docker "$USER"
# Encerre a sessão e entre de novo (ou reinicie) para o grupo valer
```

### Conferir instalação

```bash
git --version
docker --version
docker compose version
docker info
```

`docker info` deve responder sem erro de permissão. Se pedir `permission denied` no socket, revise o grupo `docker` ou use `sudo` temporariamente.

## 2. Clonar o repositório

```bash
cd ~
git clone https://github.com/SEU_USUARIO/SEU_REPO.git EducaMoney
cd EducaMoney
```

Substitua a URL pela do repositório real.

## 3. Criar o arquivo de ambiente

O `.env` **não** vai para o GitHub. Crie a partir do exemplo:

```bash
cp .env.example .env
```

Edite se necessário (`nano .env` ou o editor de preferência). Em desenvolvimento, o padrão já funciona.

## 4. Liberar a porta 80 (se necessário)

O Nginx usa a porta **80**. Verifique:

```bash
sudo ss -tlnp | grep ':80 '
```

Se estiver ocupada (Apache/Nginx nativo, etc.):

- Pare o serviço conflitante, ou
- Em `docker-compose.yml`, mude `"80:80"` para `"8080:80"` e use `http://localhost:8080`.

Em algumas distros, abrir porta baixa exige privilégio; com Docker instalado corretamente, mapear `80:80` funciona para o usuário do grupo `docker`.

## 5. Subir o ambiente (desenvolvimento)

```bash
docker compose up --build
```

Na **primeira** vez pode demorar (imagens + build). Deixe o terminal aberto.

Em segundo plano:

```bash
docker compose up --build -d
```

## 6. Validar

| URL | Esperado |
|-----|----------|
| http://localhost/ | Página EducaMoney |
| http://localhost/api/health/ | JSON `{"status":"ok",...}` |

Em servidor remoto, use o IP/hostname da máquina no lugar de `localhost` e ajuste `DJANGO_ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` no `.env`.

## 7. Comandos úteis no dia a dia

```bash
# Ver containers
docker compose ps

# Logs
docker compose logs -f

# Parar
docker compose down

# Parar e apagar volumes do Postgres (apaga dados do banco local)
docker compose down -v
```

## 8. Produção (opcional)

```bash
# No .env: DJANGO_DEBUG=0 e troque DJANGO_SECRET_KEY por um valor forte
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Recomendações extras em servidor:

- Firewall (ufw/firewalld) liberando só 80/443
- HTTPS (proxy reverso Caddy/Traefik/Nginx no host, ou certificado no edge)
- Não expor a porta `5432` do Postgres publicamente (em prod o compose já remove o publish da porta)

## Problemas comuns (Linux)

| Sintoma | O que fazer |
|---------|-------------|
| `permission denied` em `/var/run/docker.sock` | Adicionar usuário ao grupo `docker` e relogar |
| Porta 80 em uso | Parar Apache/Nginx do host ou mudar o mapeamento |
| SELinux bloqueando volumes | Ajustar contexto ou labels conforme a distro |
| Disco cheio | `docker system prune` (com cuidado) |
| Compose antigo (`docker-compose` com hífen) | Instalar plugin Compose v2 (`docker compose`) |

## Checklist rápido

1. Docker Engine ativo (`docker info` ok)
2. `git clone` + `cd` no projeto
3. `cp .env.example .env`
4. `docker compose up --build`
5. Abrir http://localhost/
