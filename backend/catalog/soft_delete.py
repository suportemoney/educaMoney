"""Helpers de soft-delete (P16)."""


def soft_delete_ativo(obj, *, campo: str = "ativo") -> None:
    """Marca registro como inativo sem remover do banco."""
    setattr(obj, campo, False)
    obj.save(update_fields=[campo])


def soft_delete_is_active(user) -> None:
    """Inativa usuário Django."""
    user.is_active = False
    user.save(update_fields=["is_active"])
