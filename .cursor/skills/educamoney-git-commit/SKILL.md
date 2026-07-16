---
name: educamoney-git-commit
description: >-
  Commit e push comuns no EducaMoney ao terminar tarefas com alterações ou
  criação de arquivos. Use sempre após mudanças no código/docs/skills; se a
  mudança exigir comandos Docker, execute-os antes do commit/push. Não
  monitora GitHub Actions nem faz retry de CI.
---

# EducaMoney — commit e push

## Regra

Sempre que terminar uma tarefa com **alterações ou criação** de arquivos, faça commit e push para `origin`.

Se a mudança mexer em arquivos que normalmente exigem execução da stack, validação por container, rebuild, restart, proxy, Vite, Nginx, Compose, entrypoint, env de serviço, Dockerfile ou integração entre apps, execute os comandos Docker necessários **antes** do commit e push.

Não monitorar Action, não rodar testes de CI remotos, não corrigir pipeline nesta skill.

## Quando aplicar

- Edição/criação de código, docs, skills, config, etc.
- **Não** aplicar se: modo plan/ask sem escrita; usuário pediu para não commit/push; só leitura; working tree limpa.

## Fluxo

1. Em paralelo: `git status`, `git diff` / `git diff --staged`, `git log -5 --oneline`.
2. Verificar se a mudança pede comandos Docker antes do Git.
   - Exemplos comuns: `docker-compose.yml`, `docker-compose.prod.yml`, `nginx/*.conf`, `backend/`, `frontend/`, `frontend-admin/`, `frontend-aluno/`, `Dockerfile*`, entrypoints, variáveis de serviço.
   - Rodar os comandos necessários pela stack, sem executar Django no host Windows.
   - Exemplos:
     - `docker compose up -d --build <servico>`
     - `docker compose restart <servico>`
     - `docker compose logs --tail=100 <servico>`
   - Se houver erro de container/startup diretamente ligado à mudança, corrigir antes de seguir para commit.
3. Staging dos arquivos relevantes (`git add`). Não incluir `.env`, secrets ou credenciais.
4. Commit com mensagem curta (1–2 frases, foco no porquê). PowerShell:
   ```powershell
   git commit -m @"
   mensagem aqui
   "@
   ```
5. Push: `git push -u origin HEAD` (ou `git push` se já houver tracking).
6. Confirmar com `git status`.

## Resumo ao usuário

Formato curto de arquivos alterados **e**:

- comandos Docker executados (quando houver)
- commit SHA / mensagem
- branch enviada a `origin`

## Proibido

- Force push em `main`/`master`
- `git config`, skip hooks, amend indevido
- Comandos Django no host Windows
- `gh run watch` / monitoramento ou correção de Action (fora do escopo)
