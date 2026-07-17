from rest_framework.permissions import BasePermission

from .models import Perfil


def obter_papel(user) -> str:
    if not user or not user.is_authenticated:
        return Perfil.Papel.ALUNO
    if user.is_superuser:
        return Perfil.Papel.ADMINISTRADOR
    perfil = getattr(user, "perfil", None)
    if perfil is None:
        return Perfil.Papel.ALUNO
    return perfil.papel


def papel_em(user, *papeis: str) -> bool:
    if user and user.is_superuser:
        return True
    return obter_papel(user) in papeis


class IsPainelUser(BasePermission):
    """Qualquer usuário com acesso ao painel (não aluno)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return obter_papel(request.user) != Perfil.Papel.ALUNO or request.user.is_superuser


class IsAdminOrGestor(BasePermission):
    def has_permission(self, request, view):
        return papel_em(
            request.user,
            Perfil.Papel.ADMINISTRADOR,
            Perfil.Papel.GESTOR,
        )


class IsPROrAbove(BasePermission):
    def has_permission(self, request, view):
        return papel_em(
            request.user,
            Perfil.Papel.ADMINISTRADOR,
            Perfil.Papel.GESTOR,
            Perfil.Papel.PR,
        )


class IsMerchantOrAbove(BasePermission):
    """Merchant, gestor ou administrador (tokens)."""

    def has_permission(self, request, view):
        return papel_em(
            request.user,
            Perfil.Papel.ADMINISTRADOR,
            Perfil.Papel.GESTOR,
            Perfil.Papel.MERCHANT,
        )


class IsInstrutor(BasePermission):
    def has_permission(self, request, view):
        return papel_em(request.user, Perfil.Papel.INSTRUTOR)


class IsInstrutorOrPROrAbove(BasePermission):
    """PR+ ou instrutor (cursos/conteúdo do próprio instrutor)."""

    def has_permission(self, request, view):
        return papel_em(
            request.user,
            Perfil.Papel.ADMINISTRADOR,
            Perfil.Papel.GESTOR,
            Perfil.Papel.PR,
            Perfil.Papel.INSTRUTOR,
        )


class IsAdminGestorOrInstrutor(BasePermission):
    """Gestão de alunos: admin/gestor ou instrutor (somente leitura filtrada)."""

    def has_permission(self, request, view):
        return papel_em(
            request.user,
            Perfil.Papel.ADMINISTRADOR,
            Perfil.Papel.GESTOR,
            Perfil.Papel.INSTRUTOR,
        )


class IsAluno(BasePermission):
    """Somente aluno (não staff do painel / superuser)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return False
        return obter_papel(user) == Perfil.Papel.ALUNO
