import { useEffect, useState, type FormEvent } from "react";
import { apiFormData, apiRequest, type AlunoAdmin, type Plano } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { previewValorUpgrade } from "./AtivacoesPage";

function progressoMedio(a: AlunoAdmin): string {
  const lista = a.progresso || [];
  if (!lista.length) return "—";
  const media = Math.round(
    lista.reduce((s, p) => s + (p.progresso_pct || 0), 0) / lista.length
  );
  return `${media}%`;
}

const DOC_TIPOS = [
  { value: "rg", label: "Carteira de identidade (RG)" },
  { value: "cnh", label: "CNH" },
  { value: "passaporte", label: "Passaporte" },
] as const;

function soDigitos(v: string): string {
  return v.replace(/\D/g, "").slice(0, 11);
}

function formatCpfInput(v: string): string {
  const d = soDigitos(v);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const FORM_VAZIO = {
  username: "",
  email: "",
  first_name: "",
  password: "",
  bio: "",
  is_active: true,
  cpf: "",
  data_nascimento: "",
  documento_tipo: "",
  documentoArquivo: null as File | null,
};

export function AlunosPage() {
  const { access } = useAuth();
  const [itens, setItens] = useState<AlunoAdmin[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [q, setQ] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [comPlano, setComPlano] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<AlunoAdmin | null>(null);
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState<AlunoAdmin | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [dias, setDias] = useState(30);
  const [dataPrazo, setDataPrazo] = useState("");
  const [modoPrazo, setModoPrazo] = useState<"dias" | "data">("data");
  const [upgradeAtivacaoId, setUpgradeAtivacaoId] = useState<number | null>(null);
  const [planoUpgradeId, setPlanoUpgradeId] = useState<number | "">("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!access) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filtroAtivo) params.set("ativo", filtroAtivo);
    if (comPlano) params.set("com_plano", "1");
    const qs = params.toString();
    const [data, p] = await Promise.all([
      apiRequest<AlunoAdmin[]>(`/admin/alunos/${qs ? `?${qs}` : ""}`, {
        token: access,
      }),
      apiRequest<Plano[]>("/admin/planos/", { token: access }),
    ]);
    setItens(data);
    setPlanos(p);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, [access]);

  async function abrirDetalhe(id: number) {
    if (!access) return;
    const d = await apiRequest<AlunoAdmin>(`/admin/alunos/${id}/`, { token: access });
    setDetalhe(d);
  }

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalForm(true);
  }

  function abrirEditar(a: AlunoAdmin) {
    setEditando(a);
    setForm({
      username: a.username,
      email: a.email,
      first_name: a.first_name || "",
      password: "",
      bio: a.bio || "",
      is_active: a.is_active,
      cpf: a.cpf_formatado || a.cpf || "",
      data_nascimento: a.data_nascimento || "",
      documento_tipo: a.documento_tipo || "",
      documentoArquivo: null,
    });
    setModalForm(true);
  }

  async function salvarForm(e: FormEvent) {
    e.preventDefault();
    if (!access) return;
    setSalvando(true);
    setErro(null);
    try {
      if (editando) {
        const fd = new FormData();
        fd.append("first_name", form.first_name);
        fd.append("email", form.email);
        fd.append("is_active", form.is_active ? "true" : "false");
        fd.append("bio", form.bio);
        if (form.password) fd.append("password", form.password);
        fd.append("cpf", soDigitos(form.cpf));
        fd.append("data_nascimento", form.data_nascimento);
        fd.append("documento_tipo", form.documento_tipo);
        if (form.documentoArquivo) {
          fd.append("documento_arquivo", form.documentoArquivo);
        }
        await apiFormData(`/admin/alunos/${editando.id}/`, {
          method: "PATCH",
          token: access,
          formData: fd,
        });
        if (detalhe?.id === editando.id) {
          await abrirDetalhe(editando.id);
        }
      } else {
        await apiRequest("/admin/alunos/", {
          method: "POST",
          token: access,
          body: {
            username: form.username,
            email: form.email,
            first_name: form.first_name,
            password: form.password,
            bio: form.bio,
          },
        });
      }
      setModalForm(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function toggleAtivo() {
    if (!access || !detalhe) return;
    const acao = detalhe.is_active ? "Inativar" : "Reativar";
    if (!confirm(`${acao} aluno "${detalhe.first_name || detalhe.username}"?`)) return;
    setSalvando(true);
    try {
      const d = await apiRequest<AlunoAdmin>(`/admin/alunos/${detalhe.id}/`, {
        method: "PATCH",
        token: access,
        body: { is_active: !detalhe.is_active },
      });
      setDetalhe(d);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha");
    } finally {
      setSalvando(false);
    }
  }

  async function estender(ativacaoId: number) {
    if (!access) return;
    if (modoPrazo === "data" && !dataPrazo) {
      setErro("Informe a data de validade.");
      return;
    }
    if (modoPrazo === "dias" && dias < 1) {
      setErro("Informe os dias a adicionar.");
      return;
    }
    const msg =
      modoPrazo === "data"
        ? `Definir validade até ${new Date(dataPrazo + "T12:00:00").toLocaleDateString("pt-BR")}?`
        : `Estender ativação em ${dias} dias?`;
    if (!confirm(msg)) return;
    setSalvando(true);
    try {
      const body =
        modoPrazo === "data"
          ? { valido_ate: new Date(`${dataPrazo}T23:59:59`).toISOString() }
          : { dias };
      await apiRequest(`/admin/ativacoes/${ativacaoId}/estender/`, {
        method: "POST",
        token: access,
        body,
      });
      if (detalhe) await abrirDetalhe(detalhe.id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar prazo");
    } finally {
      setSalvando(false);
    }
  }

  async function fazerUpgrade(ativacaoId: number) {
    if (!access || !planoUpgradeId) return;
    if (!confirm("Confirmar upgrade de plano com o mesmo vencimento?")) return;
    setSalvando(true);
    try {
      await apiRequest(`/admin/ativacoes/${ativacaoId}/upgrade/`, {
        method: "POST",
        token: access,
        body: { plano_id: planoUpgradeId },
      });
      setUpgradeAtivacaoId(null);
      setPlanoUpgradeId("");
      if (detalhe) await abrirDetalhe(detalhe.id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upgrade");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Alunos</h1>
        <button type="button" className="btn btn--primary btn--small" onClick={abrirNovo}>
          Novo
        </button>
      </div>
      <p className="page-lead">
        Criar e editar alunos, filtrar por status/plano e ver progresso, ativações e certificados.
      </p>
      {erro && <p className="form-erro">{erro}</p>}
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          carregar().catch((err: Error) => setErro(err.message));
        }}
      >
        <label>
          Busca
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="RA, nome, e-mail…"
          />
        </label>
        <label>
          Status
          <select value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </select>
        </label>
        <label className="check-row filter-bar__check">
          <input
            type="checkbox"
            checked={comPlano}
            onChange={(e) => setComPlano(e.target.checked)}
          />
          Só com plano vigente
        </label>
        <button type="submit" className="btn btn--primary btn--small">
          Filtrar
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>RA</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Planos</th>
              <th>Progresso</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((a) => (
              <tr key={a.id}>
                <td>{a.ra || "—"}</td>
                <td>{a.first_name || a.username}</td>
                <td>{a.email}</td>
                <td>{(a.planos || []).join(", ") || "—"}</td>
                <td>{progressoMedio(a)}</td>
                <td>{a.is_active ? "Sim" : "Não"}</td>
                <td className="td-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => abrirEditar(a)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() =>
                      abrirDetalhe(a.id).catch((e: Error) => setErro(e.message))
                    }
                  >
                    Detalhe
                  </button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum aluno encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalForm}
        titulo={editando ? "Editar aluno" : "Novo aluno"}
        onFechar={() => setModalForm(false)}
      >
        <form className="form-grid" onSubmit={salvarForm}>
          {!editando && (
            <label>
              Usuário
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </label>
          )}
          {editando && (
            <label>
              RA
              <input value={editando.ra || ""} readOnly disabled />
            </label>
          )}
          <label>
            Nome
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Senha {editando ? "(opcional — reset)" : ""}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editando}
              minLength={editando && !form.password ? undefined : 8}
              placeholder={editando ? "Deixe vazio para manter" : ""}
            />
          </label>
          <label>
            Bio
            <input
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>
          {editando && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Conta ativa
            </label>
          )}
          {editando && (
            <>
              <h3 style={{ margin: "0.35rem 0 0" }}>Dados para certificado</h3>
              <p className="page-lead" style={{ margin: 0, fontSize: "0.85rem" }}>
                CPF, nascimento e PDF (RG, CNH ou passaporte). O aluno também pode
                preencher no portal.
              </p>
              <label>
                CPF
                <input
                  value={form.cpf}
                  onChange={(e) =>
                    setForm({ ...form, cpf: formatCpfInput(e.target.value) })
                  }
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                />
              </label>
              <label>
                Data de nascimento
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) =>
                    setForm({ ...form, data_nascimento: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo de documento
                <select
                  value={form.documento_tipo}
                  onChange={(e) =>
                    setForm({ ...form, documento_tipo: e.target.value })
                  }
                >
                  <option value="">Selecione…</option>
                  {DOC_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Documento (PDF)
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      documentoArquivo: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </label>
              {editando.documento_url && (
                <p className="page-lead" style={{ margin: 0, fontSize: "0.85rem" }}>
                  Documento atual:{" "}
                  <a href={editando.documento_url} target="_blank" rel="noreferrer">
                    ver PDF
                  </a>
                </p>
              )}
            </>
          )}
          <button className="btn btn--primary" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        aberto={!!detalhe}
        titulo={detalhe ? `Aluno ${detalhe.ra || detalhe.username}` : "Aluno"}
        onFechar={() => setDetalhe(null)}
      >
        {detalhe && (
          <div className="form-grid">
            <div className="aluno-detalhe-head">
              {detalhe.foto_url ? (
                <img src={detalhe.foto_url} alt="" className="table-avatar table-avatar--lg" />
              ) : null}
              <p>
                <strong>{detalhe.first_name || detalhe.username}</strong>
                <br />
                {detalhe.email}
                <br />
                RA: {detalhe.ra || "—"}
                {detalhe.bio ? (
                  <>
                    <br />
                    {detalhe.bio}
                  </>
                ) : null}
              </p>
            </div>
            <h3>Dados para certificado</h3>
            <dl className="perfil-dl" style={{ margin: 0 }}>
              <div>
                <dt>CPF</dt>
                <dd>{detalhe.cpf_formatado || detalhe.cpf || "—"}</dd>
              </div>
              <div>
                <dt>Nascimento</dt>
                <dd>
                  {detalhe.data_nascimento
                    ? new Date(detalhe.data_nascimento + "T12:00:00").toLocaleDateString(
                        "pt-BR"
                      )
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Documento</dt>
                <dd>
                  {detalhe.documento_tipo_label || detalhe.documento_tipo || "—"}
                  {detalhe.documento_url ? (
                    <>
                      {" · "}
                      <a href={detalhe.documento_url} target="_blank" rel="noreferrer">
                        ver PDF
                      </a>
                    </>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {detalhe.dados_certificado_completos
                    ? "Completo"
                    : "Incompleto (aluno deve preencher no portal)"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={toggleAtivo}
              disabled={salvando}
            >
              {detalhe.is_active ? "Inativar" : "Reativar"}
            </button>

            <h3>Ativações vigentes</h3>
            {(detalhe.ativacoes || []).length === 0 && <p>Nenhuma.</p>}
            {(detalhe.ativacoes || []).map((at) => {
              const origem = planos.find((p) => p.id === at.plano_id);
              const opcoesUpgrade = origem
                ? planos.filter(
                    (p) =>
                      p.ativo &&
                      Number(p.preco_referencia) > Number(origem.preco_referencia)
                  )
                : [];
              const destino =
                planoUpgradeId && upgradeAtivacaoId === at.id
                  ? planos.find((p) => p.id === planoUpgradeId)
                  : undefined;
              const preview =
                origem && destino
                  ? previewValorUpgrade(origem, destino, at.valido_ate)
                  : null;
              return (
                <div key={at.id} className="aluno-ativacao-card">
                  <div>
                    {at.plano_nome} — até{" "}
                    {at.valido_ate
                      ? new Date(at.valido_ate).toLocaleDateString("pt-BR")
                      : "sem prazo"}
                  </div>
                  <label>
                    Como definir prazo
                    <select
                      value={modoPrazo}
                      onChange={(e) => setModoPrazo(e.target.value as "dias" | "data")}
                    >
                      <option value="data">Data de vencimento</option>
                      <option value="dias">Somar dias</option>
                    </select>
                  </label>
                  {modoPrazo === "data" ? (
                    <label>
                      Válido até
                      <input
                        type="date"
                        value={dataPrazo}
                        onChange={(e) => setDataPrazo(e.target.value)}
                      />
                    </label>
                  ) : (
                    <label>
                      Dias a estender
                      <input
                        type="number"
                        min={1}
                        value={dias}
                        onChange={(e) => setDias(Number(e.target.value))}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => estender(at.id)}
                    disabled={salvando}
                  >
                    Salvar prazo
                  </button>
                  {at.valido_ate && opcoesUpgrade.length > 0 && (
                    <>
                      {upgradeAtivacaoId !== at.id ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => {
                            setUpgradeAtivacaoId(at.id);
                            setPlanoUpgradeId("");
                          }}
                        >
                          Upgrade
                        </button>
                      ) : (
                        <>
                          <label>
                            Novo plano
                            <select
                              value={planoUpgradeId}
                              onChange={(e) =>
                                setPlanoUpgradeId(
                                  e.target.value ? Number(e.target.value) : ""
                                )
                              }
                            >
                              <option value="">Selecione…</option>
                              {opcoesUpgrade.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome}
                                </option>
                              ))}
                            </select>
                          </label>
                          {preview && (
                            <p className="page-lead">
                              Estimativa: {preview.diasRestantes} dias · R${" "}
                              {preview.valor.toFixed(2)}
                            </p>
                          )}
                          <button
                            type="button"
                            className="btn btn--primary btn--small"
                            onClick={() => fazerUpgrade(at.id)}
                            disabled={salvando || !planoUpgradeId || !preview}
                          >
                            Confirmar upgrade
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => {
                              setUpgradeAtivacaoId(null);
                              setPlanoUpgradeId("");
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <h3>Histórico de ativações</h3>
            <ul>
              {(detalhe.ativacoes_historico || detalhe.ativacoes || []).map((at) => (
                <li key={`h-${at.id}`}>
                  {at.plano_nome}
                  {at.vigente === false ? " (encerrada)" : at.vigente ? " (vigente)" : ""}
                  {at.valido_ate
                    ? ` — até ${new Date(at.valido_ate).toLocaleDateString("pt-BR")}`
                    : ""}
                  {at.ativo === false ? " — inativa" : ""}
                </li>
              ))}
              {(detalhe.ativacoes_historico || detalhe.ativacoes || []).length === 0 && (
                <li>Nenhuma.</li>
              )}
            </ul>

            <h3>Progresso</h3>
            <ul>
              {(detalhe.progresso || []).map((p) => (
                <li key={p.curso_id}>
                  {p.curso_titulo}: {p.progresso_pct}% ({p.aulas_concluidas}/{p.aulas_total})
                </li>
              ))}
              {(detalhe.progresso || []).length === 0 && <li>Sem cursos liberados.</li>}
            </ul>

            <h3>Certificados</h3>
            <ul>
              {(detalhe.certificados || []).map((c) => (
                <li key={c.id}>
                  {c.curso_titulo} — {c.codigo}
                  {c.revogado ? " (revogado)" : ""}
                </li>
              ))}
              {(detalhe.certificados || []).length === 0 && <li>Nenhum.</li>}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
