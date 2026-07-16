from rest_framework import permissions
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings

from .models import ConfigSistema, Curso, Integracao, Plano
from .serializers import CursoSerializer, PlanoSerializer


class PublicPlanoListView(ListAPIView):
    """Lista planos ativos para a landing."""

    serializer_class = PlanoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Plano.objects.filter(ativo=True)


class PublicCursoListView(ListAPIView):
    """Lista cursos ativos para a landing."""

    serializer_class = CursoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Curso.objects.filter(ativo=True)


class PublicConfigView(APIView):
    """Configuração pública (integração WhatsApp + versão)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cfg = ConfigSistema.obter()
        wa = Integracao.whatsapp_ativa()
        telefone = ""
        mensagem = ""
        if wa:
            telefone = wa.telefone
            mensagem = wa.mensagem_template
        total_cursos = Curso.objects.filter(ativo=True).count()
        return Response(
            {
                "nome_site": cfg.nome_site,
                "whatsapp_telefone": telefone,
                "whatsapp_mensagem": mensagem,
                "total_cursos": total_cursos,
                "app_version": getattr(settings, "APP_VERSION", "0-unknown"),
            }
        )
