from django.urls import path

from .admin_views import (
    AdminAulaDetailView,
    AdminAulaListCreateView,
    AdminCursoDetailView,
    AdminCursoListCreateView,
    AdminInstrutorListView,
    AdminIntegracaoDetailView,
    AdminIntegracaoListCreateView,
    AdminModuloDetailView,
    AdminModuloListCreateView,
    AdminPlanoDetailView,
    AdminPlanoListCreateView,
    AdminTokenListCreateView,
    AdminTokenRevogarView,
)
from .aluno_views import (
    AtivacaoView,
    AulaDetalheAlunoView,
    AulaProgressoView,
    CatalogoAlunoView,
    CategoriasPublicasAlunoView,
    CertificadoHtmlAlunoView,
    CertificadosAlunoView,
    ConjuntosAlunoView,
    CursoDetalheAlunoView,
    FinancasAlunoView,
    MeusCursosView,
    MinhasAtivacoesView,
    PublicCertificadoView,
    QuizAlunoView,
    TicketsAlunoView,
)
from .lms_admin_views import (
    AdminAlternativaDetailView,
    AdminAlternativaListCreateView,
    AdminAlunoDetailView,
    AdminAlunoListView,
    AdminCertificadoEmitirView,
    AdminCertificadoListView,
    AdminCertificadoRevogarView,
    AdminMaterialDetailView,
    AdminMaterialListCreateView,
    AdminPerguntaDetailView,
    AdminPerguntaListCreateView,
    AdminQuizByAulaView,
    AdminQuizDetailView,
)
from .p9_admin_views import (
    AdminAtivacaoEstenderView,
    AdminAtivacaoListView,
    AdminCategoriaDetailView,
    AdminCategoriaListCreateView,
    AdminConjuntoDetailView,
    AdminConjuntoListCreateView,
    AdminSubcategoriaDetailView,
    AdminSubcategoriaListCreateView,
    AdminTicketDetailView,
    AdminTicketListView,
)
from .views import PublicConfigView, PublicCursoListView, PublicPlanoListView

urlpatterns = [
    path("planos/", PublicPlanoListView.as_view(), name="public-planos"),
    path("cursos/", PublicCursoListView.as_view(), name="public-cursos"),
    path("config/", PublicConfigView.as_view(), name="public-config"),
    path(
        "certificados/<str:codigo>/",
        PublicCertificadoView.as_view(),
        name="public-certificado",
    ),
]

aluno_urlpatterns = [
    path("ativacao/", AtivacaoView.as_view(), name="aluno-ativacao"),
    path("meus-cursos/", MeusCursosView.as_view(), name="aluno-meus-cursos"),
    path("ativacoes/", MinhasAtivacoesView.as_view(), name="aluno-ativacoes"),
    path("cursos/<int:pk>/", CursoDetalheAlunoView.as_view(), name="aluno-curso-detail"),
    path("aulas/<int:pk>/", AulaDetalheAlunoView.as_view(), name="aluno-aula-detail"),
    path(
        "aulas/<int:pk>/progresso/",
        AulaProgressoView.as_view(),
        name="aluno-aula-progresso",
    ),
    path(
        "aulas/<int:aula_id>/quiz/",
        QuizAlunoView.as_view(),
        name="aluno-aula-quiz",
    ),
    path("catalogo/", CatalogoAlunoView.as_view(), name="aluno-catalogo"),
    path("conjuntos/", ConjuntosAlunoView.as_view(), name="aluno-conjuntos"),
    path("financas/", FinancasAlunoView.as_view(), name="aluno-financas"),
    path("secretaria/tickets/", TicketsAlunoView.as_view(), name="aluno-tickets"),
    path("categorias/", CategoriasPublicasAlunoView.as_view(), name="aluno-categorias"),
    path("certificados/", CertificadosAlunoView.as_view(), name="aluno-certificados"),
    path(
        "certificados/<str:codigo>/html/",
        CertificadoHtmlAlunoView.as_view(),
        name="aluno-certificado-html",
    ),
]

admin_urlpatterns = [
    path("planos/", AdminPlanoListCreateView.as_view(), name="admin-planos"),
    path("planos/<int:pk>/", AdminPlanoDetailView.as_view(), name="admin-plano-detail"),
    path("cursos/", AdminCursoListCreateView.as_view(), name="admin-cursos"),
    path("cursos/<int:pk>/", AdminCursoDetailView.as_view(), name="admin-curso-detail"),
    path(
        "cursos/<int:curso_id>/modulos/",
        AdminModuloListCreateView.as_view(),
        name="admin-curso-modulos",
    ),
    path(
        "modulos/<int:pk>/",
        AdminModuloDetailView.as_view(),
        name="admin-modulo-detail",
    ),
    path(
        "modulos/<int:modulo_id>/aulas/",
        AdminAulaListCreateView.as_view(),
        name="admin-modulo-aulas",
    ),
    path(
        "aulas/<int:pk>/",
        AdminAulaDetailView.as_view(),
        name="admin-aula-detail",
    ),
    path(
        "aulas/<int:aula_id>/materiais/",
        AdminMaterialListCreateView.as_view(),
        name="admin-aula-materiais",
    ),
    path(
        "materiais/<int:pk>/",
        AdminMaterialDetailView.as_view(),
        name="admin-material-detail",
    ),
    path(
        "aulas/<int:aula_id>/quiz/",
        AdminQuizByAulaView.as_view(),
        name="admin-aula-quiz",
    ),
    path("quizzes/<int:pk>/", AdminQuizDetailView.as_view(), name="admin-quiz-detail"),
    path(
        "quizzes/<int:quiz_id>/perguntas/",
        AdminPerguntaListCreateView.as_view(),
        name="admin-quiz-perguntas",
    ),
    path(
        "perguntas/<int:pk>/",
        AdminPerguntaDetailView.as_view(),
        name="admin-pergunta-detail",
    ),
    path(
        "perguntas/<int:pergunta_id>/alternativas/",
        AdminAlternativaListCreateView.as_view(),
        name="admin-pergunta-alternativas",
    ),
    path(
        "alternativas/<int:pk>/",
        AdminAlternativaDetailView.as_view(),
        name="admin-alternativa-detail",
    ),
    path("alunos/", AdminAlunoListView.as_view(), name="admin-alunos"),
    path("alunos/<int:pk>/", AdminAlunoDetailView.as_view(), name="admin-aluno-detail"),
    path(
        "certificados/",
        AdminCertificadoListView.as_view(),
        name="admin-certificados",
    ),
    path(
        "certificados/emitir/",
        AdminCertificadoEmitirView.as_view(),
        name="admin-certificados-emitir",
    ),
    path(
        "certificados/<int:pk>/revogar/",
        AdminCertificadoRevogarView.as_view(),
        name="admin-certificado-revogar",
    ),
    path("categorias/", AdminCategoriaListCreateView.as_view(), name="admin-categorias"),
    path(
        "categorias/<int:pk>/",
        AdminCategoriaDetailView.as_view(),
        name="admin-categoria-detail",
    ),
    path(
        "subcategorias/",
        AdminSubcategoriaListCreateView.as_view(),
        name="admin-subcategorias",
    ),
    path(
        "subcategorias/<int:pk>/",
        AdminSubcategoriaDetailView.as_view(),
        name="admin-subcategoria-detail",
    ),
    path("conjuntos/", AdminConjuntoListCreateView.as_view(), name="admin-conjuntos"),
    path(
        "conjuntos/<int:pk>/",
        AdminConjuntoDetailView.as_view(),
        name="admin-conjunto-detail",
    ),
    path("ativacoes/", AdminAtivacaoListView.as_view(), name="admin-ativacoes"),
    path(
        "ativacoes/<int:pk>/estender/",
        AdminAtivacaoEstenderView.as_view(),
        name="admin-ativacao-estender",
    ),
    path("tickets/", AdminTicketListView.as_view(), name="admin-tickets"),
    path(
        "tickets/<int:pk>/",
        AdminTicketDetailView.as_view(),
        name="admin-ticket-detail",
    ),
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
