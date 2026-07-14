from django.urls import path

from .admin_views import (
    AdminCursoDetailView,
    AdminCursoListCreateView,
    AdminInstrutorListView,
    AdminIntegracaoDetailView,
    AdminIntegracaoListCreateView,
    AdminPlanoDetailView,
    AdminPlanoListCreateView,
    AdminTokenListCreateView,
    AdminTokenRevogarView,
)
from .aluno_views import AtivacaoView, MeusCursosView, MinhasAtivacoesView
from .views import PublicConfigView, PublicCursoListView, PublicPlanoListView

urlpatterns = [
    path("planos/", PublicPlanoListView.as_view(), name="public-planos"),
    path("cursos/", PublicCursoListView.as_view(), name="public-cursos"),
    path("config/", PublicConfigView.as_view(), name="public-config"),
]

aluno_urlpatterns = [
    path("ativacao/", AtivacaoView.as_view(), name="aluno-ativacao"),
    path("meus-cursos/", MeusCursosView.as_view(), name="aluno-meus-cursos"),
    path("ativacoes/", MinhasAtivacoesView.as_view(), name="aluno-ativacoes"),
]

admin_urlpatterns = [
    path("planos/", AdminPlanoListCreateView.as_view(), name="admin-planos"),
    path("planos/<int:pk>/", AdminPlanoDetailView.as_view(), name="admin-plano-detail"),
    path("cursos/", AdminCursoListCreateView.as_view(), name="admin-cursos"),
    path("cursos/<int:pk>/", AdminCursoDetailView.as_view(), name="admin-curso-detail"),
    path("integracoes/", AdminIntegracaoListCreateView.as_view(), name="admin-integracoes"),
    path(
        "integracoes/<int:pk>/",
        AdminIntegracaoDetailView.as_view(),
        name="admin-integracao-detail",
    ),
    path("tokens/", AdminTokenListCreateView.as_view(), name="admin-tokens"),
    path(
        "tokens/<int:pk>/revogar/",
        AdminTokenRevogarView.as_view(),
        name="admin-token-revogar",
    ),
    path("instrutores/", AdminInstrutorListView.as_view(), name="admin-instrutores"),
]
