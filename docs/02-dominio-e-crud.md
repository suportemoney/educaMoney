# Domínio e CRUD

## Entidades (rascunho)

### Usuario

- Campos: nome, e-mail, senha (hash), perfil (`aluno` | `admin` | `operador`), ativo
- CRUD: admin gerencia; aluno se cadastra

### Plano

- Campos: nome, descrição, preço referência (informativo), ativo, ordem exibição
- CRUD: tabela + modal criar/editar; inativar

### Curso

- Campos: título, descrição, duração estimada, ativo, conteúdo (módulos/aulas — P posteriores)
- CRUD: tabela + modal; inativar

### PlanoCurso (N:N)

- Campos: plano, curso, ordem
- Define quais cursos cada plano libera

### TokenKey

- Campos: código único, plano vinculado, status (`disponivel` | `usado` | `revogado`), criado_por, criado_em, usado_por, usado_em
- CRUD operador: gerar / listar / revogar (não editar código após criação)

### Ativacao (P6)

- Campos: usuario, plano, token_key (OneToOne), data_ativacao, ativo
- Registro histórico da ativação; concede acesso aos cursos do plano

### Modulo (P8)

- Campos: curso (FK), titulo, ordem, ativo
- CRUD no painel em **Cursos → Conteúdo**

### Aula (P8)

- Campos: modulo (FK), titulo, descricao, video (arquivo mp4/webm em `media/aulas/`), duracao_segundos, ordem, ativo
- Upload multipart; limite **500 MB** (Nginx + Django)

### Categoria / Subcategoria (P9)

- Organização do catálogo; curso aponta para subcategoria
- CRUD no painel em **Categorias**

### Conjunto (P9)

- Trilha/curadoria: título, categoria, ícone, N cursos
- **Não** libera acesso sozinho — plano + ativação continuam sendo o gate

### Ativacao (P6 + P9)

- Campos: usuario, plano, token_key, data_ativacao, ativo, **valido_ate**, renovado_em
- Painel: ação **Estender**

### MaterialAula (P11)

- Campos: aula (FK), titulo, arquivo (pdf/zip/imagem), ordem, ativo
- CRUD no painel em **Cursos → Conteúdo** (selecionar aula)

### Plano (atualização P11)

- `duracao_dias` — usado na ativação para `valido_ate`

### Curso (atualização P11)

- `capa` — imagem de capa

### Quiz / Pergunta / Alternativa / TentativaQuiz (P13)

- Quiz 1:1 com aula; nota_minima; bloqueia_proxima
- Tentativas do aluno com auto-correção

### Certificado (P14)

- usuario + curso + codigo único + html; revogado
- Emissão quando 100% aulas + quizzes aprovados

### TicketSecretaria (P9)

- Aluno abre ticket; staff responde no painel

## Padrão de telas admin

1. Tabela com filtros simples (busca + ativo/inativo)
2. Botão **Novo** → modal formulário
3. Ação **Editar** → mesmo modal pré-preenchido
4. Ação **Inativar** (preferencial) ou **Excluir** com confirmação

## APIs previstas (alto nível)

| Recurso | Endpoints |
|---------|-----------|
| Planos | `GET/POST /api/planos/`, `GET/PATCH/DELETE /api/planos/{id}/` |
| Cursos | `GET/POST /api/cursos/`, … |
| Tokens | `GET/POST /api/tokens/`, `POST /api/tokens/{id}/revogar/` |
| Ativação | `POST /api/ativacao/` body `{ "codigo": "..." }` |
| Público landing | `GET /api/public/planos/`, `GET /api/public/cursos/` |
