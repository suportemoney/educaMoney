from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from catalog.models import Curso, Plano, TokenKey
from accounts.models import Perfil
from accounts.permissions import (
    IsAdminOrGestor,
    IsPainelUser,
    obter_papel,
)
from accounts.serializers import (
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """Cadastro público de aluno."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "Informe o refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Refresh token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUsuarioListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request):
        qs = User.objects.select_related("perfil").order_by("username")
        data = UserSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminUsuarioDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def patch(self, request, pk):
        try:
            user = User.objects.select_related("perfil").get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)
        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(user, serializer.validated_data)
        return Response(UserSerializer(user, context={"request": request}).data)


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPainelUser]

    def get(self, request):
        papel = obter_papel(request.user)
        base = {
            "papel": papel,
            "titulo": "Painel EducaMoney",
            "mensagem": "Métricas ao vivo do catálogo e operação.",
        }
        if papel == Perfil.Papel.INSTRUTOR:
            meus = Curso.objects.filter(instrutor=request.user, ativo=True).count()
            base["metricas"] = [
                {"label": "Cursos lecionados", "valor": meus},
                {"label": "Alunos ativos", "valor": "—"},
                {"label": "Taxa de conclusão", "valor": "—"},
            ]
        elif papel == Perfil.Papel.MERCHANT:
            base["metricas"] = [
                {
                    "label": "Tokens gerados",
                    "valor": TokenKey.objects.count(),
                },
                {
                    "label": "Tokens disponíveis",
                    "valor": TokenKey.objects.filter(
                        status=TokenKey.Status.DISPONIVEL
                    ).count(),
                },
                {
                    "label": "Tokens usados",
                    "valor": TokenKey.objects.filter(
                        status=TokenKey.Status.USADO
                    ).count(),
                },
            ]
        elif papel == Perfil.Papel.PR:
            base["metricas"] = [
                {"label": "Cursos", "valor": Curso.objects.count()},
                {
                    "label": "Com instrutor",
                    "valor": Curso.objects.exclude(instrutor=None).count(),
                },
                {
                    "label": "Instrutores",
                    "valor": User.objects.filter(
                        perfil__papel=Perfil.Papel.INSTRUTOR
                    ).count(),
                },
            ]
        else:
            base["metricas"] = [
                {"label": "Usuários", "valor": User.objects.count()},
                {"label": "Planos ativos", "valor": Plano.objects.filter(ativo=True).count()},
                {
                    "label": "Tokens",
                    "valor": TokenKey.objects.count(),
                },
            ]
        return Response(base)
