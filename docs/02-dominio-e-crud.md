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

### Modulo / Aula (futuro)

- Conteúdo estruturado do curso (vídeo, texto, material)

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
