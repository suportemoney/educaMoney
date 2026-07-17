"""Exportações CSV para gestão (P20)."""
from __future__ import annotations

import csv
from io import StringIO

from django.contrib.auth.models import User
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import Perfil
from accounts.permissions import IsAdminOrGestor

from .access import ativacoes_vigentes_qs
from .lms_admin_views import _stats_progresso
from .models import Ativacao, Curso


def _csv_response(nome: str, header: list[str], rows: list[list]) -> HttpResponse:
    buf = StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{nome}"'
    return resp


def _mascarar_cpf(cpf: str | None) -> str:
    d = "".join(c for c in (cpf or "") if c.isdigit())
    if len(d) != 11:
        return ""
    return f"***.***.{d[6:9]}-**"


class ExportAlunosCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request):
        qs = User.objects.filter(perfil__papel=Perfil.Papel.ALUNO).select_related(
            "perfil"
        )
        busca = (request.query_params.get("q") or "").strip()
        if busca:
            qs = qs.filter(
                Q(username__icontains=busca)
                | Q(email__icontains=busca)
                | Q(first_name__icontains=busca)
                | Q(perfil__ra__icontains=busca)
            )
        rows = []
        for u in qs.order_by("first_name", "username")[:2000]:
            perfil = getattr(u, "perfil", None)
            vigentes = ativacoes_vigentes_qs(u)
            planos = ", ".join(
                a.plano.titulo for a in vigentes.select_related("plano") if a.plano_id
            )
            rows.append(
                [
                    getattr(perfil, "ra", "") or "",
                    u.first_name or u.username,
                    u.email,
                    _mascarar_cpf(getattr(perfil, "cpf", None) if perfil else None),
                    "sim" if perfil and perfil.dados_certificado_completos() else "nao",
                    planos,
                    "sim" if u.is_active else "nao",
                ]
            )
        return _csv_response(
            "alunos.csv",
            ["ra", "nome", "email", "cpf_mascarado", "dados_certificado", "planos_vigentes", "ativo"],
            rows,
        )


class ExportAtivacoesCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request):
        qs = Ativacao.objects.select_related("plano", "usuario", "usuario__perfil").order_by(
            "-data_ativacao"
        )
        plano_id = (request.query_params.get("plano_id") or "").strip()
        if plano_id.isdigit():
            qs = qs.filter(plano_id=int(plano_id))
        vigente = request.query_params.get("vigente")
        agora = timezone.now()
        if vigente == "1":
            qs = qs.filter(ativo=True).filter(
                Q(valido_ate__isnull=True) | Q(valido_ate__gte=agora)
            )
        rows = []
        for a in qs[:5000]:
            u = a.usuario
            rows.append(
                [
                    getattr(getattr(u, "perfil", None), "ra", "") or "",
                    u.first_name or u.username,
                    u.email,
                    a.plano.titulo if a.plano_id else "",
                    a.valido_ate.isoformat() if a.valido_ate else "",
                    "sim" if a.ativo else "nao",
                    a.data_ativacao.isoformat() if a.data_ativacao else "",
                ]
            )
        return _csv_response(
            "ativacoes.csv",
            ["ra", "aluno", "email", "plano", "valido_ate", "ativo", "data_ativacao"],
            rows,
        )


class ExportProgressoCsvView(APIView):
    """GET ?curso_id= — progresso dos alunos no curso."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request):
        curso_id = (request.query_params.get("curso_id") or "").strip()
        if not curso_id.isdigit():
            return Response(
                {"curso_id": "Informe curso_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        curso = get_object_or_404(Curso, pk=int(curso_id))
        alunos = (
            User.objects.filter(
                perfil__papel=Perfil.Papel.ALUNO,
                ativacoes__ativo=True,
                ativacoes__plano__cursos=curso,
            )
            .select_related("perfil")
            .distinct()
            .order_by("first_name", "username")
        )
        rows = []
        for u in alunos[:2000]:
            st = _stats_progresso(u, curso)
            rows.append(
                [
                    getattr(getattr(u, "perfil", None), "ra", "") or "",
                    u.first_name or u.username,
                    u.email,
                    curso.id,
                    curso.titulo,
                    st.get("progresso_pct", 0),
                    st.get("aulas_concluidas", 0),
                    st.get("aulas_total", 0),
                ]
            )
        return _csv_response(
            f"progresso_curso_{curso.id}.csv",
            [
                "ra",
                "aluno",
                "email",
                "curso_id",
                "curso",
                "progresso_pct",
                "aulas_concluidas",
                "aulas_total",
            ],
            rows,
        )
