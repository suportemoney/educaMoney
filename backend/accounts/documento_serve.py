"""Helpers para servir PDF de identidade com log de acesso."""

from __future__ import annotations

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from .models import DocumentoAcessoLog


def servir_documento_aluno(
    *,
    visualizador,
    aluno,
    origem: str,
) -> FileResponse | Response:
    """
    Entrega o PDF do aluno e registra DocumentoAcessoLog.
    origem: portal | admin
    """
    perfil = getattr(aluno, "perfil", None)
    if not perfil or not perfil.documento_arquivo:
        return Response(
            {"detail": "Documento não cadastrado."},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        path = perfil.documento_arquivo.path
    except (ValueError, NotImplementedError):
        return Response(
            {"detail": "Documento indisponível."},
            status=status.HTTP_404_NOT_FOUND,
        )

    DocumentoAcessoLog.objects.create(
        visualizador=visualizador,
        aluno=aluno,
        origem=origem,
    )
    nome = perfil.documento_arquivo.name.rsplit("/", 1)[-1] or "documento.pdf"
    return FileResponse(
        open(path, "rb"),
        as_attachment=False,
        filename=nome,
        content_type="application/pdf",
    )
