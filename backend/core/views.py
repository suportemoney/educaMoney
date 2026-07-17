from django.conf import settings
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Health check: DB + disco media + ffmpeg (P16/P23)."""
    checks = {}

    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    checks["database"] = "ok" if db_ok else "error"

    media_ok = False
    try:
        media_root = getattr(settings, "MEDIA_ROOT", None)
        if media_root is not None:
            path = str(media_root)
            # Garante que o diretório existe e é gravável
            import os

            os.makedirs(path, exist_ok=True)
            media_ok = os.path.isdir(path) and os.access(path, os.W_OK)
    except Exception:
        media_ok = False
    checks["media_disk"] = "ok" if media_ok else "error"

    ffmpeg_ok = False
    try:
        import shutil

        ffmpeg_ok = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))
    except Exception:
        ffmpeg_ok = False
    checks["ffmpeg"] = "ok" if ffmpeg_ok else "missing"

    # DB é crítico; media/ffmpeg são informativos (degraded se DB ok mas media falha)
    if not db_ok:
        status_txt = "degraded"
        http = 503
    elif not media_ok:
        status_txt = "degraded"
        http = 200
    else:
        status_txt = "ok"
        http = 200

    return Response(
        {
            "status": status_txt,
            "service": "educamoney-backend",
            "version": getattr(settings, "APP_VERSION", "0-unknown"),
            "checks": checks,
        },
        status=http,
    )
