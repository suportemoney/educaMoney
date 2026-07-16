---
name: educamoney-git-deploy
description: >-
  Após alterações ou criação de arquivos no EducaMoney: commit, push para
  origin (dispara deploy na GitHub Action), monitorar a Action e corrigir
  falhas na mesma resposta. Use sempre que terminar uma tarefa com mudanças
  no código/docs/skills; deploy; CI; gh run; push main.
---

# EducaMoney — git + deploy Action

## Regra (obrigatória)

Sempre que terminar de responder algo que tenha alterações ou criação, precisa executar os comandos git, que vão para o deploy na action, tem que verificar o status da action criada e se falhar já aproveitar a propria resposta para corrigi.

Não encerrar a tarefa só com o resumo de arquivos: o ciclo só fecha com Action verde (ou falha corrigida + re-push).

## Quando aplicar

- Qualquer edição/criação de código, docs, skills, config, compose, nginx, etc.
- Não aplicar se: modo plan/ask sem escrita; usuário pediu explicitamente para **não** commit/push; só leitura.

## Fluxo

1. **Status e diff** (em paralelo):
   - `git status`
   - `git diff` e `git diff --staged`
   - `git log -5 --oneline` (estilo da mensagem)
   - `git branch -vv` (tracking / ahead)

2. **Commit** (se houver mudanças):
   - Não commitar `.env`, secrets, credenciais.
   - Staging dos arquivos relevantes (`git add`).
   - Mensagem curta (1–2 frases, foco no porquê), HEREDOC / equivalente PowerShell.
   - Seguir protocolo de commit do projeto (sem `--no-verify`, sem amend salvo regras existentes).

3. **Push** (dispara a Action de deploy):
   - Branch atual → `origin` com `git push -u origin HEAD` (ou `git push` se já trackear).
   - Remote: `origin` → `git@github.com:suportemoney/educaMoney.git`.
   - Preferir branch de deploy do time (em geral `main`).

4. **Monitorar a Action**:
   - `gh run list --branch <branch> --limit 5`
   - Pegar o run mais recente disparado pelo push.
   - `gh run watch <run-id> --exit-status` **ou** poll com `gh run view <run-id>` até `completed`.
   - Se ainda não houver workflow no repo: avisar no resumo e não inventar CI; assim que `.github/workflows/` existir, este passo é obrigatório.

5. **Se a Action falhar** (na mesma resposta, sem esperar novo pedido):
   - `gh run view <run-id> --log-failed` (ou `gh run view --log`)
   - Diagnosticar causa raiz.
   - Corrigir no código.
   - Voltar ao passo 2 (commit + push + watch) até passar ou bloquear com motivo claro (secret ausente, permissão, etc.).

## Comandos úteis

```bash
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status
gh run view <run-id> --json status,conclusion,url,displayTitle
gh run view <run-id> --log-failed
```

## Resumo final ao usuário

Manter o formato curto de arquivos alterados do projeto **e** acrescentar:

- commit SHA / mensagem
- URL do run (`gh run view --json url`)
- conclusão: `success` | `failure` (+ 1 linha do que foi corrigido, se houve retry)

## Conflitos com outras regras

- Esta skill **autoriza** commit+push ao fim de tarefas com alteração neste repo (mesmo sem o usuário pedir “commit” de novo).
- Continua proibido: force push em `main`/`master`, `git config`, skip hooks, amend indevido.
- Continua proibido rodar comandos Django no host Windows (migrações só no container).
