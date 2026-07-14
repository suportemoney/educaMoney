# Setup no Windows (após clonar do GitHub)

Guia para rodar o EducaMoney em outro PC Windows usando Docker.

## 1. Pré-requisitos

1. Conta no [GitHub](https://github.com) e [Git](https://git-scm.com/download/win) instalado.
2. [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/) instalado.
3. No instalador do Docker Desktop, deixe habilitado o backend **WSL 2** (recomendado).
4. Reinicie o PC se o instalador pedir.

### Conferir instalação

Abra o **PowerShell** e rode:

```powershell
git --version
docker --version
docker compose version
```

## 2. Ligar o Docker Desktop

1. Abra o aplicativo **Docker Desktop**.
2. Espere o status ficar **Running** (ícone da baleia na bandeja do sistema).
3. Confirme:

```powershell
docker info
```

Se aparecer erro com `dockerDesktopLinuxEngine` / *pipe*, o Docker **não está rodando** — abra o Desktop e aguarde.

## 3. Clonar o repositório

No PowerShell:

```powershell
cd "$env:USERPROFILE\Documents"
git clone https://github.com/SEU_USUARIO/SEU_REPO.git EducaMoney
cd EducaMoney
```

Substitua a URL pela do repositório real.

> Se a pasta estiver no OneDrive, preferir um caminho local (ex.: `Documents`) para evitar lentidão/locks nos volumes do Docker.

## 4. Criar o arquivo de ambiente

O `.env` **não** vai para o GitHub. Crie a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` se quiser (senhas, `WHATSAPP_URL`, etc.). Para desenvolvimento local, o padrão já funciona.

## 5. Liberar a porta 80 (se necessário)

O Nginx usa a porta **80**. Se outro programa a estiver usando:

- Pare IIS / Apache / Skype, ou
- Altere em `docker-compose.yml` o mapeamento de `80:80` para outro, ex.: `"8080:80"`, e acesse `http://localhost:8080`.

## 6. Subir o ambiente (desenvolvimento)

```powershell
docker compose up --build
```

Na **primeira** vez pode demorar (download de imagens + build). Deixe o terminal aberto.

Para rodar em segundo plano:

```powershell
docker compose up --build -d
```

## 7. Validar

No navegador use a **porta 80** (Nginx). Não use `:5173` — essa porta do Vite fica só dentro da rede Docker e não está publicada no Windows.

| URL | Esperado |
|-----|----------|
| http://localhost/ | Landing EducaMoney (planos/cursos) |
| http://localhost/login | Login |
| http://localhost/cadastro | Cadastro |
| http://localhost/api/health/ | JSON `{"status":"ok",...}` |

## 8. Comandos úteis no dia a dia

```powershell
# Ver containers
docker compose ps

# Logs
docker compose logs -f

# Parar
docker compose down

# Parar e apagar volumes do Postgres (apaga dados do banco local)
docker compose down -v
```

## 9. Produção local (opcional)

```powershell
# No .env: DJANGO_DEBUG=0 e troque DJANGO_SECRET_KEY
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Problemas comuns (Windows)

| Sintoma | O que fazer |
|---------|-------------|
| `open //./pipe/dockerDesktopLinuxEngine` | Abrir/reiniciar Docker Desktop |
| Porta 80 em uso | Trocar mapeamento ou liberar a porta |
| Build lento no OneDrive | Clonar fora do OneDrive |
| WSL não instalado | Instalar “Subsistema Windows para Linux” e reiniciar o Docker |
| Antivírus bloqueando | Liberar Docker Desktop na exclusão de pastas |

## Checklist rápido

1. Docker Desktop **Running**
2. `git clone` + `cd` no projeto
3. `Copy-Item .env.example .env`
4. `docker compose up --build`
5. Abrir http://localhost/
