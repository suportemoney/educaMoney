from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Endpoint de health check para Docker e Nginx."""
    return Response(
        {
            "status": "ok",
            "service": "educamoney-backend",
            "version": getattr(settings, "APP_VERSION", "0-unknown"),
        }
    )
