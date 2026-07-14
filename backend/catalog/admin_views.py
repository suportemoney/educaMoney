import secrets
import string

from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Perfil
from accounts.permissions import (
    IsAdminOrGestor,
    IsMerchantOrAbove,
    IsPROrAbove,
    IsPainelUser,
)

from .models import Curso, Integracao, Plano, TokenKey
from .serializers import (
    CursoAdminSerializer,
    IntegracaoSerializer,
    PlanoAdminSerializer,
    TokenKeyCreateSerializer,
    TokenKeySerializer,
)


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
    queryset = Curso.objects.select_related("instrutor").prefetch_related("planos")


class AdminCursoDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CursoAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    queryset = Curso.objects.select_related("instrutor").prefetch_related("planos")


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


def _gerar_codigo_token() -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        parts = [
            "".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(4)
        ]
        codigo = "-".join(parts)
        if not TokenKey.objects.filter(codigo=codigo).exists():
            return codigo
