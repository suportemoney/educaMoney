import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from catalog.models import (
    Ativacao,
    Aula,
    Categoria,
    Conjunto,
    Curso,
    MaterialAula,
    Plano,
    Quiz,
    TicketSecretaria,
    TokenKey,
)
from accounts.models import Perfil
from accounts.permissions import (
    IsAdminOrGestor,
    IsAluno,
    IsPainelUser,
    obter_papel,
)
from accounts.serializers import (
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

HANDOFF_TTL = 60
HANDOFF_PREFIX = "portal_handoff:"


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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        from .dados_legais import aplicar_dados_legais

        user = request.user
        if "first_name" in request.data:
            user.first_name = str(request.data.get("first_name") or "")[:150]
            user.save(update_fields=["first_name"])
        perfil, _ = Perfil.objects.get_or_create(user=user)
        update_perfil: list[str] = []

        if "bio" in request.data:
            perfil.bio = str(request.data.get("bio") or "")[:500]
            update_perfil.append("bio")

        foto = request.FILES.get("foto")
        if foto is not None:
            perfil.foto = foto
            update_perfil.append("foto")

        legais, erro = aplicar_dados_legais(perfil, request.data, request.FILES)
        if erro is not None:
            return erro
        update_perfil.extend(legais)

        if update_perfil:
            perfil.save(update_fields=list(dict.fromkeys(update_perfil)))
        return Response(UserSerializer(user, context={"request": request}).data)


class MeDocumentoView(APIView):
    """Download autenticado do próprio PDF de identidade (portal) + log."""

    permission_classes = [permissions.IsAuthenticated, IsAluno]

    def get(self, request):
        from .documento_serve import servir_documento_aluno
        from .models import DocumentoAcessoLog

        return servir_documento_aluno(
            visualizador=request.user,
            aluno=request.user,
            origem=DocumentoAcessoLog.Origem.PORTAL,
        )


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


class PortalHandoffCreateView(APIView):
    """Aluno autenticado na landing gera código de 1 uso para o portal."""

    permission_classes = [permissions.IsAuthenticated, IsAluno]

    def post(self, request):
        code = secrets.token_urlsafe(24)
        cache.set(f"{HANDOFF_PREFIX}{code}", request.user.id, timeout=HANDOFF_TTL)
        portal = getattr(settings, "ALUNO_PORTAL_URL", "http://localhost/portal/").rstrip(
            "/"
        )
        return Response(
            {
                "code": code,
                "portal_url": f"{portal}/login?code={code}",
                "expires_in": HANDOFF_TTL,
            }
        )


class PortalHandoffConsumeView(APIView):
    """Portal consome o código e recebe JWT (origem distinta da landing)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        if not code:
            return Response(
                {"detail": "Informe o código de acesso."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        key = f"{HANDOFF_PREFIX}{code}"
        user_id = cache.get(key)
        if not user_id:
            return Response(
                {"detail": "Código inválido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache.delete(key)
        try:
            user = User.objects.select_related("perfil").get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "Usuário não encontrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if obter_papel(user) != Perfil.Papel.ALUNO or user.is_superuser:
            return Response(
                {"detail": "Acesso ao portal restrito a alunos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )


class AdminUsuarioListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        # Lista só staff — alunos ficam em /api/admin/alunos/
        qs = (
            User.objects.select_related("perfil")
            .exclude(perfil__papel=Perfil.Papel.ALUNO)
            .order_by("username")
        )
        busca = (request.query_params.get("q") or "").strip()
        if busca:
            qs = qs.filter(
                Q(username__icontains=busca)
                | Q(email__icontains=busca)
                | Q(first_name__icontains=busca)
            )
        papel = (request.query_params.get("papel") or "").strip()
        if papel and papel != Perfil.Papel.ALUNO:
            qs = qs.filter(perfil__papel=papel)
        ativo = request.query_params.get("ativo")
        if ativo == "1":
            qs = qs.filter(is_active=True)
        elif ativo == "0":
            qs = qs.filter(is_active=False)
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        try:
            user = User.objects.select_related("perfil").get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Usuário não encontrado."}, status=404)
        if obter_papel(user) == Perfil.Papel.ALUNO:
            return Response(
                {"detail": "Alunos são gerenciados em /api/admin/alunos/."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(user, serializer.validated_data)
        foto = request.FILES.get("foto")
        if foto is not None:
            perfil, _ = Perfil.objects.get_or_create(user=user)
            perfil.foto = foto
            perfil.save(update_fields=["foto"])
        return Response(UserSerializer(user, context={"request": request}).data)


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPainelUser]

    def get(self, request):
        papel = obter_papel(request.user)
        agora = timezone.now()
        base = {
            "papel": papel,
            "titulo": "Painel EducaMoney",
            "mensagem": "Métricas ao vivo do catálogo e operação.",
            "metricas": [],
            "status_operacao": [],
            "atalhos": [],
            "insights": [],
        }

        def metrica(label, valor, detalhe=""):
            return {"label": label, "valor": valor, "detalhe": detalhe}

        def status_item(label, valor, tone="info"):
            return {"label": label, "valor": valor, "tone": tone}

        def atalho(label, to, tone="default"):
            return {"label": label, "to": to, "tone": tone}

        ativacoes_vigentes = Ativacao.objects.filter(ativo=True).filter(
            Q(valido_ate__isnull=True) | Q(valido_ate__gte=agora)
        )
        tickets_abertos = TicketSecretaria.objects.filter(
            status__in=[
                TicketSecretaria.Status.ABERTO,
                TicketSecretaria.Status.EM_ANDAMENTO,
            ]
        )
        cursos_com_conteudo = Curso.objects.filter(
            modulos__ativo=True, modulos__aulas__ativo=True, ativo=True
        ).distinct()
        cursos_sem_conteudo = Curso.objects.filter(ativo=True).exclude(
            modulos__aulas__ativo=True
        )
        ativacoes_proximas_vencer = ativacoes_vigentes.filter(
            valido_ate__isnull=False,
            valido_ate__lte=agora + timedelta(days=7),
        ).count()

        if papel == Perfil.Papel.INSTRUTOR:
            meus_cursos = Curso.objects.filter(instrutor=request.user, ativo=True)
            minhas_aulas = Aula.objects.filter(modulo__curso__instrutor=request.user, ativo=True)
            meus_materiais = MaterialAula.objects.filter(
                aula__modulo__curso__instrutor=request.user, ativo=True
            )
            meus_quizzes = Quiz.objects.filter(aula__modulo__curso__instrutor=request.user, ativo=True)
            base["metricas"] = [
                metrica("Cursos lecionados", meus_cursos.count(), "Cursos ativos com você como instrutor"),
                metrica("Aulas publicadas", minhas_aulas.count(), "Aulas ativas no catálogo"),
                metrica("Materiais", meus_materiais.count(), "Arquivos de apoio publicados"),
                metrica("Quizzes", meus_quizzes.count(), "Quizzes ativos nas suas aulas"),
            ]
            base["status_operacao"] = [
                status_item("Cursos sem conteúdo", meus_cursos.exclude(modulos__aulas__ativo=True).distinct().count(), "warn"),
                status_item("Aulas sem quiz", minhas_aulas.exclude(quiz__ativo=True).distinct().count(), "info"),
                status_item("Aulas sem material", minhas_aulas.exclude(materiais__ativo=True).distinct().count(), "info"),
            ]
            base["atalhos"] = [
                atalho("Abrir cursos", "/cursos", "primary"),
                atalho("Editar conteúdo", "/cursos", "default"),
            ]
            if meus_cursos.count() == 0:
                base["insights"].append("Você ainda não está vinculado a cursos ativos.")
            if minhas_aulas.exclude(quiz__ativo=True).exists():
                base["insights"].append("Há aulas sem quiz publicado para reforçar retenção.")
        elif papel == Perfil.Papel.MERCHANT:
            tokens_disponiveis = TokenKey.objects.filter(status=TokenKey.Status.DISPONIVEL).count()
            tokens_usados = TokenKey.objects.filter(status=TokenKey.Status.USADO).count()
            ativacoes_recentes = Ativacao.objects.filter(
                data_ativacao__gte=agora - timedelta(days=7)
            ).count()
            base["metricas"] = [
                metrica("Tokens gerados", TokenKey.objects.count(), "Base total emitida"),
                metrica("Tokens disponíveis", tokens_disponiveis, "Prontos para ativação"),
                metrica("Tokens usados", tokens_usados, "Já convertidos em acesso"),
                metrica("Ativações recentes", ativacoes_recentes, "Últimos 7 dias"),
            ]
            base["status_operacao"] = [
                status_item("Revogados", TokenKey.objects.filter(status=TokenKey.Status.REVOGADO).count(), "warn"),
                status_item("Ativações vigentes", ativacoes_vigentes.count(), "good"),
                status_item("Vencendo em 7 dias", ativacoes_proximas_vencer, "warn"),
            ]
            base["atalhos"] = [
                atalho("Gerar tokens", "/tokens", "primary"),
                atalho("Ver ativações", "/ativacoes", "default"),
            ]
            if tokens_disponiveis < 10:
                base["insights"].append("Estoque baixo de tokens disponíveis para novas vendas.")
            if ativacoes_proximas_vencer:
                base["insights"].append("Há ativações próximas do vencimento para ação comercial.")
        elif papel == Perfil.Papel.PR:
            cursos_ativos = Curso.objects.filter(ativo=True)
            base["metricas"] = [
                metrica("Cursos ativos", cursos_ativos.count(), "Publicados no catálogo"),
                metrica("Com instrutor", cursos_ativos.exclude(instrutor=None).count(), "Cursos com responsável"),
                metrica("Sem conteúdo", cursos_sem_conteudo.count(), "Cursos sem aulas ativas"),
                metrica("Instrutores", User.objects.filter(perfil__papel=Perfil.Papel.INSTRUTOR).count(), "Base de instrutores"),
            ]
            base["status_operacao"] = [
                status_item("Conjuntos ativos", Conjunto.objects.filter(ativo=True).count(), "good"),
                status_item("Categorias ativas", Categoria.objects.filter(ativo=True).count(), "info"),
                status_item("Cursos sem instrutor", cursos_ativos.filter(instrutor=None).count(), "warn"),
            ]
            base["atalhos"] = [
                atalho("Gerenciar cursos", "/cursos", "primary"),
                atalho("Categorias", "/categorias", "default"),
                atalho("Conjuntos", "/conjuntos", "default"),
            ]
            if cursos_sem_conteudo.exists():
                base["insights"].append("Existem cursos ativos sem conteúdo publicado.")
            if cursos_ativos.filter(instrutor=None).exists():
                base["insights"].append("Alguns cursos ainda não têm instrutor vinculado.")
        else:
            alunos_ativos = User.objects.filter(
                perfil__papel=Perfil.Papel.ALUNO, is_active=True
            ).count()
            base["metricas"] = [
                metrica("Alunos ativos", alunos_ativos, "Base com acesso operacional"),
                metrica("Planos ativos", Plano.objects.filter(ativo=True).count(), "Ofertas disponíveis"),
                metrica("Ativações vigentes", ativacoes_vigentes.count(), "Acessos dentro da validade"),
                metrica("Tickets abertos", tickets_abertos.count(), "Fila de suporte"),
            ]
            base["status_operacao"] = [
                status_item("Tokens disponíveis", TokenKey.objects.filter(status=TokenKey.Status.DISPONIVEL).count(), "good"),
                status_item("Cursos com conteúdo", cursos_com_conteudo.count(), "info"),
                status_item("Vencendo em 7 dias", ativacoes_proximas_vencer, "warn"),
                status_item("Tickets em andamento", TicketSecretaria.objects.filter(status=TicketSecretaria.Status.EM_ANDAMENTO).count(), "warn"),
            ]
            base["atalhos"] = [
                atalho("Abrir alunos", "/alunos", "primary"),
                atalho("Ver ativações", "/ativacoes", "default"),
                atalho("Atender secretaria", "/secretaria", "default"),
                atalho("Gerenciar cursos", "/cursos", "default"),
            ]
            if tickets_abertos.exists():
                base["insights"].append("Há tickets pendentes exigindo resposta da equipe.")
            if ativacoes_proximas_vencer:
                base["insights"].append("Ativações próximas do vencimento pedem ação preventiva.")
            if cursos_sem_conteudo.exists():
                base["insights"].append("Nem todos os cursos ativos têm conteúdo suficiente publicado.")
        if not base["insights"]:
            base["insights"].append("Operação estável no momento, sem alertas prioritários.")
        return Response(base)
