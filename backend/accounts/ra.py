"""Utilitários de RA (registro acadêmico do aluno)."""

from django.db import transaction
from django.utils import timezone


def gerar_ra_unico() -> str:
    """Formato EM + ano(4) + sequencial(6), ex.: EM2026000042."""
    from .models import Perfil

    ano = timezone.now().year
    prefixo = f"EM{ano}"
    with transaction.atomic():
        ultimo = (
            Perfil.objects.select_for_update()
            .filter(ra__startswith=prefixo)
            .order_by("-ra")
            .values_list("ra", flat=True)
            .first()
        )
        if ultimo and len(ultimo) >= len(prefixo) + 6:
            try:
                seq = int(ultimo[len(prefixo) :]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefixo}{seq:06d}"


def garantir_ra(perfil) -> str:
    """Garante RA em perfil de aluno; retorna o RA."""
    from .models import Perfil

    if perfil.ra:
        return perfil.ra
    if perfil.papel != Perfil.Papel.ALUNO:
        return perfil.ra or ""
    perfil.ra = gerar_ra_unico()
    perfil.save(update_fields=["ra"])
    return perfil.ra
