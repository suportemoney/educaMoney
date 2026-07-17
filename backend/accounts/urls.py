from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminDashboardView,
    AdminUsuarioDetailView,
    AdminUsuarioListCreateView,
    LoginView,
    LogoutView,
    MeDocumentoView,
    MeView,
    PortalHandoffConsumeView,
    PortalHandoffCreateView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/documento/", MeDocumentoView.as_view(), name="auth-me-documento"),
    path(
        "portal-handoff/",
        PortalHandoffCreateView.as_view(),
        name="auth-portal-handoff",
    ),
    path(
        "portal-handoff/consume/",
        PortalHandoffConsumeView.as_view(),
        name="auth-portal-handoff-consume",
    ),
    path("admin/usuarios/", AdminUsuarioListCreateView.as_view(), name="admin-usuarios"),
    path(
        "admin/usuarios/<int:pk>/",
        AdminUsuarioDetailView.as_view(),
        name="admin-usuario-detail",
    ),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
]
