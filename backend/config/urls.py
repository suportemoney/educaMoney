from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from catalog.aluno_views import AtivacaoView
from catalog.urls import admin_urlpatterns as catalog_admin_urls
from catalog.urls import aluno_urlpatterns as catalog_aluno_urls

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/auth/", include("accounts.urls")),
    path("api/public/", include("catalog.urls")),
    path("api/admin/", include((catalog_admin_urls, "catalog-admin"))),
    path("api/aluno/", include((catalog_aluno_urls, "catalog-aluno"))),
    path("api/ativacao/", AtivacaoView.as_view(), name="ativacao"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
