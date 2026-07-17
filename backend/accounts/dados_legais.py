"""Aplicação compartilhada de CPF, nascimento e documento PDF no Perfil."""

from __future__ import annotations

from datetime import date
from typing import Any

from rest_framework import status
from rest_framework.response import Response

from .cpf import cpf_valido, limpar_cpf
from .models import Perfil

PDF_MAX_BYTES = 5 * 1024 * 1024


def aplicar_dados_legais(
    perfil: Perfil,
    data: Any,
    files: Any,
) -> tuple[list[str], Response | None]:
    """
    Atualiza campos legais no perfil a partir de request.data / FILES.
    Retorna (campos_para_save, erro_http_ou_None).
    """
    update: list[str] = []

    if "cpf" in data:
        cpf = limpar_cpf(str(data.get("cpf") or ""))
        if cpf and not cpf_valido(cpf):
            return [], Response(
                {"detail": "CPF inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if cpf:
            conflito = (
                Perfil.objects.filter(cpf=cpf).exclude(pk=perfil.pk).exists()
            )
            if conflito:
                return [], Response(
                    {"detail": "Este CPF já está cadastrado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            perfil.cpf = cpf
        else:
            perfil.cpf = None
        update.append("cpf")

    if "data_nascimento" in data:
        raw = data.get("data_nascimento")
        if raw in (None, ""):
            perfil.data_nascimento = None
        else:
            try:
                partes = str(raw).strip()[:10].split("-")
                perfil.data_nascimento = date(
                    int(partes[0]), int(partes[1]), int(partes[2])
                )
            except (ValueError, IndexError, TypeError):
                return [], Response(
                    {"detail": "Data de nascimento inválida."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if perfil.data_nascimento > date.today():
                return [], Response(
                    {"detail": "Data de nascimento não pode ser no futuro."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        update.append("data_nascimento")

    if "documento_tipo" in data:
        tipo = str(data.get("documento_tipo") or "").strip().lower()
        permitidos = {c.value for c in Perfil.DocumentoTipo}
        if tipo and tipo not in permitidos:
            return [], Response(
                {"detail": "Documento inválido. Use RG, CNH ou passaporte."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        perfil.documento_tipo = tipo
        update.append("documento_tipo")

    doc = files.get("documento_arquivo") if files is not None else None
    if doc is not None:
        nome = (doc.name or "").lower()
        if not nome.endswith(".pdf"):
            return [], Response(
                {"detail": "O documento deve ser um PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if getattr(doc, "size", 0) > PDF_MAX_BYTES:
            return [], Response(
                {"detail": "PDF no máximo 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        perfil.documento_arquivo = doc
        update.append("documento_arquivo")

    return update, None
