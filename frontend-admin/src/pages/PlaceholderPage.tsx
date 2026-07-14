type PlaceholderProps = {
  titulo: string;
  descricao: string;
};

export function PlaceholderPage({ titulo, descricao }: PlaceholderProps) {
  return (
    <div>
      <h1>{titulo}</h1>
      <p className="page-lead">{descricao}</p>
      <div className="placeholder-box">
        Em breve: tabela com botões criar/editar (modais) e inativar/excluir.
      </div>
    </div>
  );
}
