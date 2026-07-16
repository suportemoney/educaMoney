from django.conf import settings
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Health check com checagem leve de banco (P16)."""
    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    status_txt = "ok" if db_ok else "degraded"
    return Response(
        {
            "status": status_txt,
            "service": "educamoney-backend",
            "version": getattr(settings, "APP_VERSION", "0-unknown"),
            "checks": {"database": "ok" if db_ok else "error"},
        },
        status=200 if db_ok else 503,
    )
