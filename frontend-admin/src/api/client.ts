const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export type Papel =
  | "administrador"
  | "gestor"
  | "pr"
  | "instrutor"
  | "merchant"
  | "aluno";

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  papel: Papel;
  foto_url: string | null;
  bio: string;
  is_superuser: boolean;
  is_active?: boolean;
};

export type Plano = {
  id: number;
  nome: string;
  descricao: string;
  preco_referencia: string;
  beneficios: string[];
  duracao_dias: number;
  ativo: boolean;
  ordem: number;
};

export type Curso = {
  id: number;
  titulo: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
  instrutor_id: number | null;
  instrutor_nome: string | null;
  plano_ids: number[];
  subcategoria_id: number | null;
  subcategoria_titulo?: string | null;
  categoria_titulo?: string | null;
  icone_url: string | null;
  icone_key: string;
  capa_url?: string | null;
};

export type MaterialAula = {
  id: number;
  aula: number;
  titulo: string;
  arquivo_url: string | null;
  ordem: number;
  ativo: boolean;
};

export type AlternativaAdmin = {
  id: number;
  pergunta: number;
  texto: string;
  correta: boolean;
  ordem: number;
};

export type PerguntaAdmin = {
  id: number;
  quiz: number;
  enunciado: string;
  ordem: number;
  alternativas: AlternativaAdmin[];
};

export type QuizAdmin = {
  id: number;
  aula: number;
  titulo: string;
  nota_minima: number;
  bloqueia_proxima: boolean;
  ativo: boolean;
  perguntas: PerguntaAdmin[];
};

export type AlunoAdmin = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  is_active: boolean;
  ra: string | null;
  foto_url?: string | null;
  bio?: string;
  ativacoes_vigentes: number;
  planos: string[];
  progresso: {
    curso_id: number;
    curso_titulo: string;
    aulas_total: number;
    aulas_concluidas: number;
    progresso_pct: number;
  }[];
  ativacoes?: {
    id: number;
    plano_id?: number;
    plano_nome: string;
    valido_ate: string | null;
    ativo: boolean;
    vigente?: boolean;
    data_ativacao?: string;
  }[];
  ativacoes_historico?: {
    id: number;
    plano_id?: number;
    plano_nome: string;
    valido_ate: string | null;
    ativo: boolean;
    vigente?: boolean;
    data_ativacao?: string;
  }[];
  certificados?: {
    id: number;
    curso_titulo: string;
    codigo: string;
    revogado: boolean;
    emitido_em: string;
  }[];
};

export type CertificadoAdmin = {
  id: number;
  usuario: number;
  usuario_nome: string;
  usuario_ra: string | null;
  curso: number;
  curso_titulo: string;
  codigo: string;
  emitido_em: string;
  revogado: boolean;
};

export type Categoria = {
  id: number;
  titulo: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  icone_url: string | null;
  icone_key: string;
};

export type Subcategoria = {
  id: number;
  categoria: number;
  categoria_titulo: string;
  titulo: string;
  slug: string;
  ordem: number;
  ativo: boolean;
};

export type ConjuntoAdmin = {
  id: number;
  titulo: string;
  descricao: string;
  categoria: number;
  categoria_titulo: string;
  icone_url: string | null;
  icone_key: string;
  ordem: number;
  ativo: boolean;
  curso_ids: number[];
};

export type AtivacaoAdmin = {
  id: number;
  plano: number;
  plano_nome: string;
  token_codigo: string;
  data_ativacao: string;
  ativo: boolean;
  valido_ate: string | null;
  renovado_em: string | null;
  usuario_nome: string;
  vigente: boolean;
  valor_proporcional?: string;
  dias_restantes?: number;
  plano_origem_nome?: string;
};

export type TicketAdmin = {
  id: number;
  usuario: number;
  usuario_nome: string;
  usuario_ra: string | null;
  assunto: string;
  mensagem: string;
  status: string;
  resposta: string;
  criado_em: string;
  atualizado_em: string;
};

export type Modulo = {
  id: number;
  curso: number;
  titulo: string;
  ordem: number;
  ativo: boolean;
};

export type AulaAdmin = {
  id: number;
  modulo: number;
  titulo: string;
  descricao: string;
  video: string | null;
  video_url: string | null;
  duracao_segundos: number | null;
  ordem: number;
  ativo: boolean;
};

export type TokenKey = {
  id: number;
  codigo: string;
  plano: number;
  plano_nome: string;
  status: string;
  origem?: string;
  valor_proporcional?: string | null;
  criado_por: number | null;
  criado_por_nome: string | null;
  criado_em: string;
  usado_por: number | null;
  usado_por_nome: string | null;
  usado_em: string | null;
};

export type Integracao = {
  id: number;
  tipo: "whatsapp";
  telefone: string;
  mensagem_template: string;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
};

export type DashboardPayload = {
  papel: Papel;
  titulo: string;
  mensagem: string;
  metricas: {
    label: string;
    valor: string | number;
    detalhe?: string;
  }[];
  status_operacao: {
    label: string;
    valor: string | number;
    tone?: "good" | "warn" | "info" | "default";
  }[];
  atalhos: {
    label: string;
    to: string;
    tone?: "primary" | "default";
  }[];
  insights: string[];
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(`Erro HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

type Opts = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** Upload multipart (vídeo de aula) — não força Content-Type JSON. */
export async function apiFormData<T>(
  path: string,
  options: { method?: string; formData: FormData; token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "POST",
    headers,
    body: options.formData,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** Substitui {variavel} pelo valor — landing faz o mesmo por plano. */
export function aplicarTemplateWhatsApp(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (texto, [chave, valor]) => texto.split(`{${chave}}`).join(valor),
    template
  );
}

/** Monta wa.me com telefone + mensagem já com variáveis resolvidas. */
export function buildWhatsAppUrl(
  telefone: string,
  mensagemTemplate: string,
  vars: Record<string, string>
): string {
  const digits = (telefone || "").replace(/\D/g, "");
  const texto = encodeURIComponent(
    aplicarTemplateWhatsApp(mensagemTemplate || "", vars)
  );
  if (!digits) return `https://wa.me/?text=${texto}`;
  return `https://wa.me/${digits}?text=${texto}`;
}
