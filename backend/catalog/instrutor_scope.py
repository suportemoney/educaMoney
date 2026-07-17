"""Escopo de dados do papel instrutor no painel."""
from __future__ import annotations

from django.contrib.auth.models import User
from django.db.models import QuerySet

from accounts.models import Perfil
from accounts.permissions import obter_papel

from .models import Curso


def eh_instrutor(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return False
    return obter_papel(user) == Perfil.Papel.INSTRUTOR


def ids_cursos_instrutor(user) -> list[int]:
    return list(
        Curso.objects.filter(instrutor=user).values_list("id", flat=True)
    )


def filtrar_cursos_qs(qs: QuerySet, user) -> QuerySet:
    if eh_instrutor(user):
        return qs.filter(instrutor=user)
    return qs


def instrutor_pode_curso(user, curso: Curso) -> bool:
    if not eh_instrutor(user):
        return True
    return curso.instrutor_id == user.id


def alunos_dos_cursos_instrutor(user) -> QuerySet:
    """Alunos com ativação em plano que inclui curso do instrutor."""
    ids = ids_cursos_instrutor(user)
    if not ids:
        return User.objects.none()
    return (
        User.objects.filter(
            perfil__papel=Perfil.Papel.ALUNO,
            ativacoes__ativo=True,
            ativacoes__plano__cursos__id__in=ids,
        )
        .select_related("perfil")
        .distinct()
    )
