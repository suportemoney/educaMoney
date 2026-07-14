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
};

export type TokenKey = {
  id: number;
  codigo: string;
  plano: number;
  plano_nome: string;
  status: string;
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
  metricas: { label: string; valor: string | number }[];
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
