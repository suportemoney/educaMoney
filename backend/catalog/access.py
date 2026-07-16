"""Regras de acesso do aluno ao conteúdo do curso."""

from django.db.models import Q
from django.utils import timezone

from .models import Ativacao, Aula, Curso


def ativacoes_vigentes_qs(user):
    """Ativações ativas e dentro da validade (ou sem prazo)."""
    agora = timezone.now()
    return Ativacao.objects.filter(usuario=user, ativo=True).filter(
        Q(valido_ate__isnull=True) | Q(valido_ate__gte=agora)
    )


def aluno_tem_acesso_curso(user, curso_id: int) -> bool:
    if not user or not user.is_authenticated:
        return False
    return ativacoes_vigentes_qs(user).filter(
        plano__cursos__id=curso_id,
        plano__cursos__ativo=True,
    ).exists()


def aluno_tem_acesso_aula(user, aula: Aula) -> bool:
    return aluno_tem_acesso_curso(user, aula.modulo.curso_id)


def cursos_liberados_aluno(user):
    planos_ids = ativacoes_vigentes_qs(user).values_list("plano_id", flat=True)
    return (
        Curso.objects.filter(planos__id__in=planos_ids, ativo=True)
        .select_related("instrutor", "subcategoria", "subcategoria__categoria")
        .distinct()
        .order_by("ordem", "titulo")
    )
