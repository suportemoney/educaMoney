---
name: educamoney-git-commit
description: >-
  Commit e push comuns no EducaMoney ao terminar tarefas com alterações ou
  criação de arquivos. Use sempre após mudanças no código/docs/skills; não
  monitora GitHub Actions nem faz retry de CI.
---

# EducaMoney — commit e push

## Regra

Sempre que terminar uma tarefa com **alterações ou criação** de arquivos, faça commit e push para `origin`. Não monitorar Action, não rodar testes de CI, não corrigir pipeline nesta skill.

## Quando aplicar

- Edição/criação de código, docs, skills, config, etc.
- **Não** aplicar se: modo plan/ask sem escrita; usuário pediu para não commit/push; só leitura; working tree limpa.

## Fluxo

1. Em paralelo: `git status`, `git diff` / `git diff --staged`, `git log -5 --oneline`.
2. Staging dos arquivos relevantes (`git add`). Não incluir `.env`, secrets ou credenciais.
3. Commit com mensagem curta (1–2 frases, foco no porquê). PowerShell:
   ```powershell
   git commit -m @"
   mensagem aqui
   "@
   ```
4. Push: `git push -u origin HEAD` (ou `git push` se já houver tracking).
5. Confirmar com `git status`.

## Resumo ao usuário

Formato curto de arquivos alterados **e**:

- commit SHA / mensagem
- branch enviada a `origin`

## Proibido

- Force push em `main`/`master`
- `git config`, skip hooks, amend indevido
- Comandos Django no host Windows
- `gh run watch` / monitoramento ou correção de Action (fora do escopo)
