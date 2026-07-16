const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  papel?: string;
  ra?: string | null;
};

export type Plano = {
  id: number;
  nome: string;
  descricao: string;
  preco_referencia: string;
  beneficios: string[];
  ordem: number;
};

export type Curso = {
  id: number;
  titulo: string;
  descricao: string;
  ordem: number;
};

export type CursoAluno = {
  id: number;
  titulo: string;
  descricao: string;
  ordem: number;
  instrutor_nome: string | null;
};

export type Ativacao = {
  id: number;
  plano: number;
  plano_nome: string;
  token_key: number;
  token_codigo: string;
  data_ativacao: string;
  ativo: boolean;
};

export type AtivacaoResultado = {
  ativacao: Ativacao;
  plano: { id: number; nome: string; descricao: string };
  cursos: CursoAluno[];
};

export type PublicConfig = {
  nome_site?: string;
  whatsapp_telefone: string;
  whatsapp_mensagem: string;
  total_cursos?: number;
  app_version: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data as T;
}

export function formatPreco(valor: string): string {
  const n = Number(valor);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function aplicarTemplateWhatsApp(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (texto, [chave, valor]) => texto.split(`{${chave}}`).join(valor),
    template
  );
}

export function buildWhatsAppUrl(
  telefone: string,
  mensagemTemplate: string,
  vars: Record<string, string>
): string {
  const digits = (telefone || "").replace(/\D/g, "");
  const fallback =
    "Olá! Vim pelo site da EducaMoney e quero adquirir o plano {titulo_plano} de {valor_plano}.";
  const texto = encodeURIComponent(
    aplicarTemplateWhatsApp(mensagemTemplate || fallback, vars)
  );
  if (!digits) {
    return `https://wa.me/?text=${texto}`;
  }
  return `https://wa.me/${digits}?text=${texto}`;
}
