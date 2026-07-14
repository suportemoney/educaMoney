export type RegraSenha = {
  id: string;
  label: string;
  ok: (senha: string) => boolean;
};

export const REGRAS_SENHA: RegraSenha[] = [
  { id: "len", label: "Mínimo 8 caracteres", ok: (s) => s.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", ok: (s) => /[A-Z]/.test(s) },
  { id: "lower", label: "Uma letra minúscula", ok: (s) => /[a-z]/.test(s) },
  { id: "num", label: "Um número", ok: (s) => /\d/.test(s) },
  {
    id: "special",
    label: "Um caractere especial",
    ok: (s) => /[^A-Za-z0-9]/.test(s),
  },
];

export function senhaValida(senha: string): boolean {
  return REGRAS_SENHA.every((r) => r.ok(senha));
}
