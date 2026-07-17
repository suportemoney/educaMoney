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

type TipoForm = "whatsapp" | "email";

const FORM_WA = {
  telefone: "+55",
  mensagem_template: MSG_PADRAO,
  ativo: true,
};

const FORM_EMAIL = {
  email_host: "",
  email_port: 587,
  email_usuario: "",
  email_senha: "",
  email_usar_tls: true,
  email_remetente: "EducaMoney <noreply@seudominio.com>",
  email_secretaria: "",
  ativo: true,
};

export function IntegracaoPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<Integracao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Integracao | null>(null);
  const [tipoForm, setTipoForm] = useState<TipoForm>("whatsapp");
  const [formWa, setFormWa] = useState(FORM_WA);
  const [formEmail, setFormEmail] = useState(FORM_EMAIL);
  const [salvando, setSalvando] = useState(false);

  const previewMensagem = useMemo(
    () => aplicarTemplateWhatsApp(formWa.mensagem_template, EXEMPLO_VARS),
    [formWa.mensagem_template]
  );
  const previewLink = useMemo(
    () => buildWhatsAppUrl(formWa.telefone, formWa.mensagem_template, EXEMPLO_VARS),
    [formWa.telefone, formWa.mensagem_template]
  );

  async function carregar() {
    if (!access) return;
    setItens(await apiRequest<Integracao[]>("/admin/integracoes/", { token: access }));
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  function abrirNovo(tipo: TipoForm = "whatsapp") {
    setEditando(null);
    setTipoForm(tipo);
    setFormWa(FORM_WA);
    setFormEmail(FORM_EMAIL);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEditar(item: Integracao) {
    setEditando(item);
    setTipoForm(item.tipo);
    setErro(null);
    if (item.tipo === "email") {
      setFormEmail({
        email_host: item.email_host || "",
        email_port: item.email_port || 587,
        email_usuario: item.email_usuario || "",
        email_senha: "",
        email_usar_tls: item.email_usar_tls !== false,
        email_remetente: item.email_remetente || "",
        email_secretaria: item.email_secretaria || "",
        ativo: item.ativo,
      });
    } else {
      setFormWa({
        telefone: item.telefone,
        mensagem_template: item.mensagem_template,
        ativo: item.ativo,
      });
    }
    setModalAberto(true);
  }

  function erroApi(err: unknown): string {
    const data =
      err && typeof err === "object" && "data" in err
        ? (err as { data: Record<string, unknown> }).data
        : null;
    if (data && typeof data === "object") {
      for (const key of Object.keys(data)) {
        const v = data[key];
        if (Array.isArray(v) && v[0]) return String(v[0]);
        if (typeof v === "string") return v;
      }
    }
    return err instanceof Error ? err.message : "Falha ao salvar";
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    const body =
      tipoForm === "whatsapp"
        ? {
            tipo: "whatsapp" as const,
            telefone: formWa.telefone,
            mensagem_template: formWa.mensagem_template,
            ativo: formWa.ativo,
          }
        : {
            tipo: "email" as const,
            telefone: "",
            mensagem_template: "",
            email_host: formEmail.email_host,
            email_port: Number(formEmail.email_port) || 587,
            email_usuario: formEmail.email_usuario,
            email_senha: formEmail.email_senha,
            email_usar_tls: formEmail.email_usar_tls,
            email_remetente: formEmail.email_remetente,
            email_secretaria: formEmail.email_secretaria,
            ativo: formEmail.ativo,
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
      setErro(erroApi(err));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: Integracao) {
    const rotulo =
      item.tipo === "email"
        ? item.email_remetente || item.email_host
        : item.telefone;
    if (!access || !confirm(`Desativar integração ${item.tipo} (${rotulo})?`)) return;
    await apiRequest(`/admin/integracoes/${item.id}/`, {
      method: "PATCH",
      token: access,
      body: { ativo: false },
    });
    await carregar();
  }

  function resumoLinha(item: Integracao): string {
    if (item.tipo === "email") {
      return item.email_remetente || item.email_host || "—";
    }
    return item.telefone || "—";
  }

  function detalheLinha(item: Integracao): string {
    if (item.tipo === "email") {
      const sec = item.email_secretaria ? ` · secretaria: ${item.email_secretaria}` : "";
      return `${item.email_host}:${item.email_port}${sec}`;
    }
    return item.mensagem_template;
  }

  return (
    <div>
      <div className="page-head">
        <h1>Integração</h1>
        <div className="page-head__actions">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => abrirNovo("email")}
          >
            Novo e-mail
          </button>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => abrirNovo("whatsapp")}
          >
            Novo WhatsApp
          </button>
        </div>
      </div>
      <p className="page-lead">
        WhatsApp nos CTAs da landing e SMTP para avisos do sistema (tickets, certificado,
        vencimento). Só uma integração ativa por tipo.
      </p>
      {erro && !modalAberto && <p className="form-erro">{erro}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Destino / remetente</th>
              <th>Detalhe</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="badge">
                    {item.tipo === "email" ? "E-mail" : "WhatsApp"}
                  </span>
                </td>
                <td>{resumoLinha(item)}</td>
                <td className="td-clip">{detalheLinha(item)}</td>
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
            {itens.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma integração. Cadastre WhatsApp e/ou E-mail.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalAberto}
        titulo={
          editando
            ? tipoForm === "email"
              ? "Editar integração E-mail"
              : "Editar integração WhatsApp"
            : tipoForm === "email"
              ? "Nova integração E-mail"
              : "Nova integração WhatsApp"
        }
        onFechar={() => setModalAberto(false)}
      >
        <form className="form-grid" onSubmit={salvar}>
          {erro && <p className="form-erro">{erro}</p>}

          {tipoForm === "whatsapp" ? (
            <>
              <label>
                Telefone (+55 e número completo)
                <input
                  value={formWa.telefone}
                  onChange={(e) => setFormWa({ ...formWa, telefone: e.target.value })}
                  placeholder="+5511999999999"
                  required
                />
              </label>
              <label>
                Mensagem automática
                <textarea
                  value={formWa.mensagem_template}
                  onChange={(e) =>
                    setFormWa({ ...formWa, mensagem_template: e.target.value })
                  }
                  required
                  rows={5}
                />
              </label>
              <p className="form-hint">{VARS_HELP}</p>
              <div className="link-preview">
                <strong>Preview do link (exemplo plano Essencial)</strong>
                <p className="link-preview__msg">{previewMensagem}</p>
                <a
                  href={previewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="link-preview__url"
                >
                  {previewLink}
                </a>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={formWa.ativo}
                  onChange={(e) => setFormWa({ ...formWa, ativo: e.target.checked })}
                />
                Ativa (só uma WhatsApp fica ativa)
              </label>
            </>
          ) : (
            <>
              <p className="form-hint">
                Dados do servidor SMTP do provedor (Gmail, Outlook, Hostinger, etc.). Com
                “Ativa”, o sistema envia os avisos operacionais.
              </p>
              <label>
                Servidor SMTP
                <input
                  value={formEmail.email_host}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, email_host: e.target.value })
                  }
                  placeholder="smtp.seudominio.com"
                  required
                />
              </label>
              <label>
                Porta
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={formEmail.email_port}
                  onChange={(e) =>
                    setFormEmail({
                      ...formEmail,
                      email_port: Number(e.target.value) || 587,
                    })
                  }
                  required
                />
              </label>
              <label>
                Usuário SMTP
                <input
                  value={formEmail.email_usuario}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, email_usuario: e.target.value })
                  }
                  placeholder="noreply@seudominio.com"
                  autoComplete="off"
                />
              </label>
              <label>
                Senha SMTP
                <input
                  type="password"
                  value={formEmail.email_senha}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, email_senha: e.target.value })
                  }
                  placeholder={
                    editando?.email_senha_definida
                      ? "Deixe em branco para manter a senha atual"
                      : "Senha do SMTP"
                  }
                  autoComplete="new-password"
                  required={!editando}
                />
              </label>
              <label>
                E-mail remetente (From)
                <input
                  value={formEmail.email_remetente}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, email_remetente: e.target.value })
                  }
                  placeholder="EducaMoney <noreply@seudominio.com>"
                  required
                />
              </label>
              <label>
                E-mail da secretaria (avisos de ticket)
                <input
                  type="email"
                  value={formEmail.email_secretaria}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, email_secretaria: e.target.value })
                  }
                  placeholder="secretaria@seudominio.com"
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={formEmail.email_usar_tls}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, email_usar_tls: e.target.checked })
                  }
                />
                Usar TLS
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={formEmail.ativo}
                  onChange={(e) =>
                    setFormEmail({ ...formEmail, ativo: e.target.checked })
                  }
                />
                Ativa (só uma integração E-mail fica ativa)
              </label>
            </>
          )}

          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
