import secrets
import string

from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Perfil
from accounts.models import Perfil
from accounts.permissions import (
    IsAdminOrGestor,
    IsInstrutorOrPROrAbove,
    IsMerchantOrAbove,
    IsPROrAbove,
    IsPainelUser,
)

from .instrutor_scope import eh_instrutor, filtrar_cursos_qs, instrutor_pode_curso
from .models import Aula, Curso, Integracao, Modulo, Plano, TokenKey


def _curso_ou_403(request, curso: Curso):
    if not instrutor_pode_curso(request.user, curso):
        return Response({"detail": "Sem acesso a este curso."}, status=status.HTTP_403_FORBIDDEN)
    return None
from .serializers import (
    AulaAdminSerializer,
    CursoAdminSerializer,
    IntegracaoSerializer,
    ModuloAdminSerializer,
    PlanoAdminSerializer,
    TokenKeyCreateSerializer,
    TokenKeySerializer,
)
from .soft_delete import soft_delete_ativo
from .video_process import processar_video_aula


def _proxima_ordem(qs) -> int:
    ultimo = qs.order_by("-ordem", "-id").values_list("ordem", flat=True).first()
    return (ultimo if ultimo is not None else -1) + 1


def _reordenar(qs, ids: list[int]) -> Response:
    """Aplica ordem 0..n-1 na sequência de ids (mesmo queryset escopo)."""
    if not isinstance(ids, list) or not ids:
        return Response(
            {"ids": ["Informe a lista de ids na nova ordem."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        ids_int = [int(x) for x in ids]
    except (TypeError, ValueError):
        return Response(
            {"ids": ["Ids inválidos."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    existentes = set(qs.filter(pk__in=ids_int).values_list("id", flat=True))
    if set(ids_int) != existentes or len(ids_int) != len(existentes):
        return Response(
            {"ids": ["A lista deve conter exatamente os itens do escopo."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    for i, pk in enumerate(ids_int):
        qs.filter(pk=pk).update(ordem=i)
    return Response({"ok": True, "ids": ids_int})


class AdminPlanoListCreateView(generics.ListCreateAPIView):
    serializer_class = PlanoAdminSerializer
    queryset = Plano.objects.all()

    def get_permissions(self):
        # PR/merchant leem planos; só gestor+ cria
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), IsPainelUser()]
        return [permissions.IsAuthenticated(), IsAdminOrGestor()]


class AdminPlanoDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PlanoAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]
    queryset = Plano.objects.all()


class AdminCursoListCreateView(generics.ListCreateAPIView):
    serializer_class = CursoAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = (
            Curso.objects.select_related(
                "instrutor", "subcategoria", "subcategoria__categoria"
            )
            .prefetch_related("planos")
            .annotate(
                modulos_count=Count(
                    "modulos", filter=Q(modulos__ativo=True), distinct=True
                )
            )
            .order_by("ordem", "id")
        )
        qs = filtrar_cursos_qs(qs, self.request.user)
        busca = (self.request.query_params.get("q") or "").strip()
        if busca:
            qs = qs.filter(
                Q(titulo__icontains=busca) | Q(descricao__icontains=busca)
            )
        ativo = self.request.query_params.get("ativo")
        if ativo == "1":
            qs = qs.filter(ativo=True)
        elif ativo == "0":
            qs = qs.filter(ativo=False)
        sub = (self.request.query_params.get("subcategoria_id") or "").strip()
        if sub.isdigit():
            qs = qs.filter(subcategoria_id=int(sub))
        return qs

    def create(self, request, *args, **kwargs):
        if eh_instrutor(request.user):
            return Response(
                {"detail": "Instrutor não pode criar cursos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class AdminCursoDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CursoAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Curso.objects.select_related(
            "instrutor", "subcategoria", "subcategoria__categoria"
        ).prefetch_related("planos")
        return filtrar_cursos_qs(qs, self.request.user)


class AdminIntegracaoListCreateView(generics.ListCreateAPIView):
    serializer_class = IntegracaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]
    queryset = Integracao.objects.all()


class AdminIntegracaoDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = IntegracaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]
    queryset = Integracao.objects.all()


class AdminTokenListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMerchantOrAbove]

    def get(self, request):
        qs = TokenKey.objects.select_related("plano", "criado_por", "usado_por")
        return Response(TokenKeySerializer(qs, many=True).data)

    def post(self, request):
        serializer = TokenKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plano = serializer.validated_data["plano_id"]
        codigo = _gerar_codigo_token()
        token = TokenKey.objects.create(
            codigo=codigo,
            plano=plano,
            criado_por=request.user,
        )
        return Response(TokenKeySerializer(token).data, status=status.HTTP_201_CREATED)


class AdminTokenRevogarView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMerchantOrAbove]

    def post(self, request, pk):
        try:
            token = TokenKey.objects.get(pk=pk)
        except TokenKey.DoesNotExist:
            return Response({"detail": "Token não encontrado."}, status=404)
        if token.status != TokenKey.Status.DISPONIVEL:
            return Response(
                {"detail": "Só é possível revogar tokens disponíveis."},
                status=400,
            )
        token.status = TokenKey.Status.REVOGADO
        token.save(update_fields=["status"])
        return Response(TokenKeySerializer(token).data)


class AdminInstrutorListView(APIView):
    """Lista usuários instrutor para select no form de curso."""

    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request):
        from accounts.serializers import UserSerializer

        qs = User.objects.filter(perfil__papel=Perfil.Papel.INSTRUTOR).order_by(
            "first_name", "username"
        )
        return Response(UserSerializer(qs, many=True, context={"request": request}).data)


class AdminModuloListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]

    def get(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        negado = _curso_ou_403(request, curso)
        if negado:
            return negado
        qs = Modulo.objects.filter(curso=curso).order_by("ordem", "id")
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
        return Response(ModuloAdminSerializer(qs, many=True).data)

    def post(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        negado = _curso_ou_403(request, curso)
        if negado:
            return negado
        ser = ModuloAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        data["ordem"] = _proxima_ordem(Modulo.objects.filter(curso=curso))
        modulo = Modulo.objects.create(curso=curso, **data)
        return Response(
            ModuloAdminSerializer(modulo).data, status=status.HTTP_201_CREATED
        )


class AdminModuloDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]

    def patch(self, request, pk):
        modulo = get_object_or_404(Modulo.objects.select_related("curso"), pk=pk)
        negado = _curso_ou_403(request, modulo.curso)
        if negado:
            return negado
        ser = ModuloAdminSerializer(modulo, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        modulo = get_object_or_404(Modulo.objects.select_related("curso"), pk=pk)
        negado = _curso_ou_403(request, modulo.curso)
        if negado:
            return negado
        soft_delete_ativo(modulo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCursoModulosReordenarView(APIView):
    """Kanban: reordena módulos do curso. Body: {\"ids\": [3,1,2]}."""

    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]

    def post(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        negado = _curso_ou_403(request, curso)
        if negado:
            return negado
        qs = Modulo.objects.filter(curso=curso, ativo=True)
        return _reordenar(qs, request.data.get("ids"))


class AdminAulaListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, modulo_id):
        modulo = get_object_or_404(Modulo.objects.select_related("curso"), pk=modulo_id)
        negado = _curso_ou_403(request, modulo.curso)
        if negado:
            return negado
        qs = Aula.objects.filter(modulo=modulo).order_by("ordem", "id")
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
        return Response(
            AulaAdminSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request, modulo_id):
        modulo = get_object_or_404(Modulo.objects.select_related("curso"), pk=modulo_id)
        negado = _curso_ou_403(request, modulo.curso)
        if negado:
            return negado
        ser = AulaAdminSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        data["ordem"] = _proxima_ordem(Aula.objects.filter(modulo=modulo))
        aula = Aula.objects.create(modulo=modulo, **data)
        if aula.video:
            processar_video_aula(aula)
            aula.refresh_from_db()
        return Response(
            AulaAdminSerializer(aula, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminAulaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        aula = get_object_or_404(
            Aula.objects.select_related("modulo__curso"), pk=pk
        )
        negado = _curso_ou_403(request, aula.modulo.curso)
        if negado:
            return negado
        tinha_video = bool(aula.video)
        nome_antes = aula.video.name if aula.video else None
        ser = AulaAdminSerializer(
            aula, data=request.data, partial=True, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        aula.refresh_from_db()
        video_novo = bool(aula.video) and (
            not tinha_video or aula.video.name != nome_antes
        )
        if video_novo:
            processar_video_aula(aula)
            aula.refresh_from_db()
        return Response(
            AulaAdminSerializer(aula, context={"request": request}).data
        )

    def delete(self, request, pk):
        aula = get_object_or_404(
            Aula.objects.select_related("modulo__curso"), pk=pk
        )
        negado = _curso_ou_403(request, aula.modulo.curso)
        if negado:
            return negado
        soft_delete_ativo(aula)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminModuloAulasReordenarView(APIView):
    """Kanban: reordena aulas do módulo. Body: {\"ids\": [3,1,2]}."""

    permission_classes = [permissions.IsAuthenticated, IsInstrutorOrPROrAbove]

    def post(self, request, modulo_id):
        modulo = get_object_or_404(Modulo.objects.select_related("curso"), pk=modulo_id)
        negado = _curso_ou_403(request, modulo.curso)
        if negado:
            return negado
        qs = Aula.objects.filter(modulo=modulo, ativo=True)
        return _reordenar(qs, request.data.get("ids"))


def _gerar_codigo_token() -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        parts = [
            "".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(4)
        ]
        codigo = "-".join(parts)
        if not TokenKey.objects.filter(codigo=codigo).exists():
            return codigo
