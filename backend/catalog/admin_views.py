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
from accounts.permissions import (
    IsAdminOrGestor,
    IsMerchantOrAbove,
    IsPROrAbove,
    IsPainelUser,
)

from .models import Aula, Curso, Integracao, Modulo, Plano, TokenKey
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
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
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


class AdminCursoDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CursoAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Curso.objects.select_related(
        "instrutor", "subcategoria", "subcategoria__categoria"
    ).prefetch_related("planos")


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
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        qs = Modulo.objects.filter(curso=curso).order_by("ordem", "id")
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
        return Response(ModuloAdminSerializer(qs, many=True).data)

    def post(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        ser = ModuloAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        modulo = Modulo.objects.create(curso=curso, **ser.validated_data)
        return Response(
            ModuloAdminSerializer(modulo).data, status=status.HTTP_201_CREATED
        )


class AdminModuloDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def patch(self, request, pk):
        modulo = get_object_or_404(Modulo, pk=pk)
        ser = ModuloAdminSerializer(modulo, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        modulo = get_object_or_404(Modulo, pk=pk)
        soft_delete_ativo(modulo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAulaListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, modulo_id):
        modulo = get_object_or_404(Modulo, pk=modulo_id)
        qs = Aula.objects.filter(modulo=modulo).order_by("ordem", "id")
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
        return Response(
            AulaAdminSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request, modulo_id):
        modulo = get_object_or_404(Modulo, pk=modulo_id)
        ser = AulaAdminSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        aula = Aula.objects.create(modulo=modulo, **ser.validated_data)
        return Response(
            AulaAdminSerializer(aula, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminAulaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        aula = get_object_or_404(Aula, pk=pk)
        ser = AulaAdminSerializer(
            aula, data=request.data, partial=True, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        aula = get_object_or_404(Aula, pk=pk)
        soft_delete_ativo(aula)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _gerar_codigo_token() -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        parts = [
            "".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(4)
        ]
        codigo = "-".join(parts)
        if not TokenKey.objects.filter(codigo=codigo).exists():
            return codigo
