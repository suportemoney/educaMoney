"""Regras de senha EducaMoney (espelhadas no frontend)."""

import re

from django.core.exceptions import ValidationError


class ComplexidadeSenhaValidator:
    """Mín. 8 caracteres, maiúscula, minúscula, número e caractere especial."""

    def validate(self, password, user=None):
        erros = []
        if len(password) < 8:
            erros.append("A senha precisa ter pelo menos 8 caracteres.")
        if not re.search(r"[A-Z]", password):
            erros.append("Inclua ao menos uma letra maiúscula.")
        if not re.search(r"[a-z]", password):
            erros.append("Inclua ao menos uma letra minúscula.")
        if not re.search(r"\d", password):
            erros.append("Inclua ao menos um número.")
        if not re.search(r"[^A-Za-z0-9]", password):
            erros.append("Inclua ao menos um caractere especial.")
        if erros:
            raise ValidationError(erros)

    def get_help_text(self):
        return (
            "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, "
            "minúscula, número e caractere especial."
        )
