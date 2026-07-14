import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  apiRequest,
  aplicarTemplateWhatsApp,
  buildWhatsAppUrl,
  type Integracao,
} from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const MSG_PADRAO =
  "Olá! Vim pelo site de vocês da EducaMoney e quero adquirir o plano {titulo_plano} de {valor_plano}. Pode me dar mais informações sobre?";

const VARS_HELP =
  "Variáveis: {titulo_plano}, {valor_plano}, {nome_site} — cada plano na landing gera um link diferente.";

/** Exemplo só para preview no painel (na landing usa o plano clicado). */
const EXEMPLO_VARS = {
  titulo_plano: "Essencial",
  valor_plano: "R$ 97,00",
  nome_site: "EducaMoney",
};

export function IntegracaoPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<Integracao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Integracao | null>(null);
  const [form, setForm] = useState({
    telefone: "+55",
    mensagem_template: MSG_PADRAO,
    ativo: true,
  });
  const [salvando, setSalvando] = useState(false);

  const previewMensagem = useMemo(
    () => aplicarTemplateWhatsApp(form.mensagem_template, EXEMPLO_VARS),
    [form.mensagem_template]
  );
  const previewLink = useMemo(
    () => buildWhatsAppUrl(form.telefone, form.mensagem_template, EXEMPLO_VARS),
    [form.telefone, form.mensagem_template]
  );

  async function carregar() {
    if (!access) return;
    setItens(await apiRequest<Integracao[]>("/admin/integracoes/", { token: access }));
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  function abrirNovo() {
    setEditando(null);
    setForm({ telefone: "+55", mensagem_template: MSG_PADRAO, ativo: true });
    setModalAberto(true);
  }

  function abrirEditar(item: Integracao) {
    setEditando(item);
    setForm({
      telefone: item.telefone,
      mensagem_template: item.mensagem_template,
      ativo: item.ativo,
    });
    setModalAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    const body = {
      tipo: "whatsapp" as const,
      telefone: form.telefone,
      mensagem_template: form.mensagem_template,
      ativo: form.ativo,
    };
    try {
      if (editando) {
        await apiRequest(`/admin/integracoes/${editando.id}/`, {
          method: "PATCH",
          token: access,
          body,
        });
      } else {
        await apiRequest("/admin/integracoes/", {
          method: "POST",
          token: access,
          body,
        });
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      const data =
        err && typeof err === "object" && "data" in err
          ? (err as { data: Record<string, unknown> }).data
          : null;
      const telefoneErr = data?.telefone;
      const msg =
        Array.isArray(telefoneErr)
          ? String(telefoneErr[0])
          : err instanceof Error
            ? err.message
            : "Falha ao salvar";
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: Integracao) {
    if (!access || !confirm(`Excluir integração WhatsApp ${item.telefone}?`)) return;
    await apiRequest(`/admin/integracoes/${item.id}/`, {
      method: "PATCH",
      token: access,
      body: { ativo: false },
    });
    await carregar();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Integração</h1>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovo}>
          Novo
        </button>
      </div>
      <p className="page-lead">
        WhatsApp usado nos CTAs da landing. A mensagem aceita variáveis entre chaves.
      </p>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Telefone</th>
              <th>Mensagem</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="badge">{item.tipo}</span>
                </td>
                <td>{item.telefone}</td>
                <td className="td-clip">{item.mensagem_template}</td>
                <td>{item.ativo ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrirEditar(item)}
                  >
                    Editar
                  </button>
                  {item.ativo && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => excluir(item)}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalAberto}
        titulo={editando ? "Editar integração WhatsApp" : "Nova integração WhatsApp"}
        onFechar={() => setModalAberto(false)}
      >
        <form className="form-grid" onSubmit={salvar}>
          <label>
            Telefone (+55 e número completo)
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="+5511999999999"
              required
            />
          </label>
          <label>
            Mensagem automática
            <textarea
              value={form.mensagem_template}
              onChange={(e) => setForm({ ...form, mensagem_template: e.target.value })}
              required
              rows={5}
            />
          </label>
          <p className="form-hint">{VARS_HELP}</p>
          <div className="link-preview">
            <strong>Preview do link (exemplo plano Essencial)</strong>
            <p className="link-preview__msg">{previewMensagem}</p>
            <a href={previewLink} target="_blank" rel="noreferrer" className="link-preview__url">
              {previewLink}
            </a>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Ativa (só uma WhatsApp fica ativa)
          </label>
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
