"""Validação e formatação de CPF (cadastro de aluno / certificado)."""

from __future__ import annotations


def limpar_cpf(valor: str | None) -> str:
    return "".join(c for c in (valor or "") if c.isdigit())


def cpf_valido(valor: str | None) -> bool:
    cpf = limpar_cpf(valor)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    d1 = (soma * 10) % 11
    d1 = 0 if d1 == 10 else d1
    if d1 != int(cpf[9]):
        return False
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    d2 = (soma * 10) % 11
    d2 = 0 if d2 == 10 else d2
    return d2 == int(cpf[10])


def formatar_cpf(valor: str | None) -> str:
    cpf = limpar_cpf(valor)
    if len(cpf) != 11:
        return limpar_cpf(valor)
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
