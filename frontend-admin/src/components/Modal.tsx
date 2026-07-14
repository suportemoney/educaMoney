type ModalProps = {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
};

export function Modal({ aberto, titulo, onFechar, children }: ModalProps) {
  if (!aberto) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onFechar}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onFechar}>
            Fechar
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
