from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ativacao, Curso, TokenKey
from .serializers import (
    AtivacaoSerializer,
    AtivarTokenSerializer,
    CursoAlunoSerializer,
)


class AtivacaoView(APIView):
    """Aluno autentica e ativa um token-key disponível."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AtivarTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        codigo = serializer.validated_data["codigo"]

        with transaction.atomic():
            try:
                token = (
                    TokenKey.objects.select_for_update()
                    .select_related("plano")
                    .get(codigo=codigo)
                )
            except TokenKey.DoesNotExist:
                return Response(
                    {"detail": "Código inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if token.status == TokenKey.Status.REVOGADO:
                return Response(
                    {"detail": "Este token foi revogado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if token.status == TokenKey.Status.USADO:
                return Response(
                    {"detail": "Este token já foi utilizado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            agora = timezone.now()
            token.status = TokenKey.Status.USADO
            token.usado_por = request.user
            token.usado_em = agora
            token.save(update_fields=["status", "usado_por", "usado_em"])

            ativacao = Ativacao.objects.create(
                usuario=request.user,
                plano=token.plano,
                token_key=token,
                ativo=True,
            )

            cursos = (
                Curso.objects.filter(planos=token.plano, ativo=True)
                .select_related("instrutor")
                .distinct()
                .order_by("ordem", "titulo")
            )

        return Response(
            {
                "ativacao": AtivacaoSerializer(ativacao).data,
                "plano": {
                    "id": token.plano.id,
                    "nome": token.plano.nome,
                    "descricao": token.plano.descricao,
                },
                "cursos": CursoAlunoSerializer(cursos, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeusCursosView(APIView):
    """Cursos liberados pelas ativações ativas do aluno."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        planos_ids = Ativacao.objects.filter(
            usuario=request.user, ativo=True
        ).values_list("plano_id", flat=True)
        cursos = (
            Curso.objects.filter(planos__id__in=planos_ids, ativo=True)
            .select_related("instrutor")
            .distinct()
            .order_by("ordem", "titulo")
        )
        return Response(CursoAlunoSerializer(cursos, many=True).data)


class MinhasAtivacoesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Ativacao.objects.filter(usuario=request.user).select_related(
            "plano", "token_key"
        )
        return Response(AtivacaoSerializer(qs, many=True).data)
