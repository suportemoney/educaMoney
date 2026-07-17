const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  papel: string;
  ra: string | null;
  foto_url: string | null;
  bio: string;
  is_superuser: boolean;
  is_active?: boolean;
};

export type ProgressoAula = {
  concluida: boolean;
  posicao_segundos: number;
  atualizado_em?: string;
};

export type CursoAluno = {
  id: number;
  titulo: string;
  descricao: string;
  ordem: number;
  instrutor_nome: string | null;
  aulas_total: number;
  aulas_concluidas: number;
  progresso_pct: number;
  continuar_aula_id?: number | null;
  ultima_atividade_em?: string | null;
  icone_url: string | null;
  capa_url?: string | null;
  icone_key: string;
  categoria_id: number | null;
  categoria_titulo: string | null;
  subcategoria_id: number | null;
  subcategoria_titulo: string | null;
  certificado_codigo?: string | null;
};

export type MaterialAluno = {
  id: number;
  titulo: string;
  arquivo_url: string | null;
  ordem: number;
};

export type QuizResumo = {
  id: number;
  titulo: string;
  nota_minima: number;
  bloqueia_proxima?: boolean;
  aprovado: boolean;
};

export type AlternativaAluno = {
  id: number;
  texto: string;
  ordem: number;
};

export type PerguntaAluno = {
  id: number;
  enunciado: string;
  ordem: number;
  alternativas: AlternativaAluno[];
};

export type QuizAluno = {
  id: number;
  titulo: string;
  nota_minima: number;
  bloqueia_proxima: boolean;
  perguntas: PerguntaAluno[];
  aprovado: boolean;
  ultima_nota: number | null;
};

export type TentativaQuiz = {
  id: number;
  quiz: number;
  nota: number;
  aprovado: boolean;
  criado_em: string;
};

export type CertificadoAluno = {
  id: number;
  curso: number;
  curso_titulo: string;
  codigo: string;
  emitido_em: string;
};

export type CategoriaAluno = {
  id: number;
  titulo: string;
  slug: string;
  icone_key: string;
  icone_url: string | null;
};

export type SubcategoriaAluno = {
  id: number;
  categoria: number;
  categoria_titulo: string;
  titulo: string;
  slug: string;
};

export type ConjuntoAluno = {
  id: number;
  titulo: string;
  descricao: string;
  categoria: number;
  categoria_titulo: string;
  icone_url: string | null;
  icone_key: string;
  ordem: number;
  cursos: {
    id: number;
    titulo: string;
    icone_url: string | null;
    icone_key: string;
    liberado: boolean;
  }[];
};

export type CatalogoResp = {
  cursos: CursoAluno[];
  conjuntos: ConjuntoAluno[];
  categorias: CategoriaAluno[];
  subcategorias: SubcategoriaAluno[];
};

export type AulaAluno = {
  id: number;
  titulo: string;
  descricao: string;
  ordem: number;
  duracao_segundos: number | null;
  video_url: string | null;
  progresso: ProgressoAula;
  materiais?: MaterialAluno[];
  quiz?: QuizResumo | null;
  curso_id?: number;
  modulo_id?: number;
  modulo_titulo?: string;
  aula_anterior_id?: number | null;
  aula_proxima_id?: number | null;
  proxima_bloqueada?: boolean;
};

export type ModuloAluno = {
  id: number;
  titulo: string;
  ordem: number;
  aulas: AulaAluno[];
  materiais?: MaterialAluno[];
  atividades?: QuizResumo[];
};

export type CursoDetalhe = {
  id: number;
  titulo: string;
  descricao: string;
  instrutor_nome: string | null;
  modulos: ModuloAluno[];
  prova?: QuizResumo | null;
  aulas_total: number;
  aulas_concluidas: number;
  progresso_pct: number;
  certificado?: { codigo: string; emitido_em: string } | null;
  certificado_elegivel?: boolean;
  certificado_motivo?: string;
};

export type Ativacao = {
  id: number;
  plano: number;
  plano_nome: string;
  token_codigo: string;
  data_ativacao: string;
  ativo: boolean;
  valido_ate?: string | null;
  renovado_em?: string | null;
  vigente?: boolean;
};

export type FinancasPayload = {
  ativacoes: Ativacao[];
  vigentes: Ativacao[];
  whatsapp_upgrade: string;
  whatsapp_renovar: string;
};

export type Ticket = {
  id: number;
  assunto: string;
  mensagem: string;
  status: string;
  resposta: string;
  criado_em: string;
};

export type AtivacaoResultado = {
  ativacao: Ativacao;
  plano: { id: number; nome: string; descricao: string };
  cursos: CursoAluno[];
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `Erro HTTP ${status}`
    );
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

/** Upload multipart (foto de perfil). */
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

const ICON_GLYPH: Record<string, string> = {
  wallet: "◎",
  shield: "◆",
  chart: "▲",
  brain: "✦",
  book: "▣",
  route: "➔",
  trending: "↗",
};

export function glyphForIconKey(key?: string | null) {
  if (!key) return "▶";
  return ICON_GLYPH[key] || key.slice(0, 1).toUpperCase() || "▶";
}
