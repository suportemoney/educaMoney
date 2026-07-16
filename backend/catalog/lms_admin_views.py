"""APIs admin P11–P14: materiais, alunos, quizzes, certificados."""

from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Perfil
from accounts.permissions import IsAdminOrGestor, IsPROrAbove

from .access import ativacoes_vigentes_qs, cursos_liberados_aluno
from .certificados import emitir_certificado
from .models import (
    Alternativa,
    Aula,
    Certificado,
    MaterialAula,
    Pergunta,
    ProgressoAula,
    Quiz,
)
from .serializers import (
    AlternativaAdminSerializer,
    CertificadoSerializer,
    MaterialAulaSerializer,
    PerguntaAdminSerializer,
    QuizAdminSerializer,
)
from .soft_delete import soft_delete_ativo


def _stats_progresso(user, curso):
    aulas = Aula.objects.filter(modulo__curso=curso, modulo__ativo=True, ativo=True)
    total = aulas.count()
    concluidas = ProgressoAula.objects.filter(
        usuario=user, aula__in=aulas, concluida=True
    ).count()
    pct = int(round(100 * concluidas / total)) if total else 0
    return {
        "curso_id": curso.id,
        "curso_titulo": curso.titulo,
        "aulas_total": total,
        "aulas_concluidas": concluidas,
        "progresso_pct": pct,
    }


class AdminMaterialListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, aula_id):
        aula = get_object_or_404(Aula, pk=aula_id)
        qs = MaterialAula.objects.filter(aula=aula).order_by("ordem", "id")
        return Response(
            MaterialAulaSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request, aula_id):
        aula = get_object_or_404(Aula, pk=aula_id)
        ser = MaterialAulaSerializer(
            data=request.data, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        if not ser.validated_data.get("arquivo"):
            return Response(
                {"arquivo": ["Envie um arquivo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mat = MaterialAula.objects.create(aula=aula, **ser.validated_data)
        return Response(
            MaterialAulaSerializer(mat, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminMaterialDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        mat = get_object_or_404(MaterialAula, pk=pk)
        ser = MaterialAulaSerializer(
            mat, data=request.data, partial=True, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        mat = get_object_or_404(MaterialAula, pk=pk)
        soft_delete_ativo(mat)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAlunoListView(APIView):
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
        ativo = request.query_params.get("ativo")
        if ativo == "1":
            qs = qs.filter(is_active=True)
        elif ativo == "0":
            qs = qs.filter(is_active=False)
        ra = (request.query_params.get("ra") or "").strip()
        if ra:
            qs = qs.filter(perfil__ra__iexact=ra)

        out = []
        for u in qs.order_by("first_name", "username")[:200]:
            vig = list(ativacoes_vigentes_qs(u).select_related("plano"))
            if request.query_params.get("com_plano") == "1" and not vig:
                continue
            cursos = cursos_liberados_aluno(u)
            progresso = [_stats_progresso(u, c) for c in cursos[:20]]
            out.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "first_name": u.first_name,
                    "is_active": u.is_active,
                    "ra": getattr(u.perfil, "ra", None),
                    "ativacoes_vigentes": len(vig),
                    "planos": [a.plano.nome for a in vig],
                    "progresso": progresso,
                }
            )
        return Response(out)


class AdminAlunoDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request, pk):
        u = get_object_or_404(
            User.objects.select_related("perfil"),
            pk=pk,
            perfil__papel=Perfil.Papel.ALUNO,
        )
        vig = list(ativacoes_vigentes_qs(u).select_related("plano", "token_key"))
        cursos = cursos_liberados_aluno(u)
        certificados = Certificado.objects.filter(usuario=u).select_related("curso")
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "is_active": u.is_active,
                "ra": getattr(u.perfil, "ra", None),
                "ativacoes_vigentes": len(vig),
                "planos": [a.plano.nome for a in vig],
                "ativacoes": [
                    {
                        "id": a.id,
                        "plano_nome": a.plano.nome,
                        "valido_ate": a.valido_ate,
                        "ativo": a.ativo,
                    }
                    for a in vig
                ],
                "progresso": [_stats_progresso(u, c) for c in cursos],
                "certificados": [
                    {
                        "id": c.id,
                        "curso_titulo": c.curso.titulo,
                        "codigo": c.codigo,
                        "revogado": c.revogado,
                        "emitido_em": c.emitido_em,
                    }
                    for c in certificados
                ],
            }
        )

    def patch(self, request, pk):
        u = get_object_or_404(
            User.objects.select_related("perfil"),
            pk=pk,
            perfil__papel=Perfil.Papel.ALUNO,
        )
        if "is_active" in request.data:
            u.is_active = bool(request.data.get("is_active"))
            u.save(update_fields=["is_active"])
        if "first_name" in request.data:
            u.first_name = str(request.data.get("first_name") or "")[:150]
            u.save(update_fields=["first_name"])
        return self.get(request, pk)


class AdminQuizByAulaView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request, aula_id):
        aula = get_object_or_404(Aula, pk=aula_id)
        quiz = Quiz.objects.filter(aula=aula).prefetch_related(
            "perguntas__alternativas"
        ).first()
        if not quiz:
            return Response(None)
        return Response(QuizAdminSerializer(quiz).data)

    def post(self, request, aula_id):
        aula = get_object_or_404(Aula, pk=aula_id)
        if Quiz.objects.filter(aula=aula).exists():
            return Response(
                {"detail": "Esta aula já possui quiz. Use PATCH."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = QuizAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        quiz = Quiz.objects.create(aula=aula, **ser.validated_data)
        return Response(
            QuizAdminSerializer(quiz).data, status=status.HTTP_201_CREATED
        )


class AdminQuizDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def patch(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        ser = QuizAdminSerializer(quiz, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(
            QuizAdminSerializer(
                Quiz.objects.prefetch_related("perguntas__alternativas").get(pk=pk)
            ).data
        )

    def delete(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk)
        soft_delete_ativo(quiz)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminPerguntaListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        qs = Pergunta.objects.filter(quiz=quiz).prefetch_related("alternativas")
        return Response(PerguntaAdminSerializer(qs, many=True).data)

    def post(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        ser = PerguntaAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pergunta = Pergunta.objects.create(quiz=quiz, **ser.validated_data)
        return Response(
            PerguntaAdminSerializer(pergunta).data, status=status.HTTP_201_CREATED
        )


class AdminPerguntaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def patch(self, request, pk):
        pergunta = get_object_or_404(Pergunta, pk=pk)
        ser = PerguntaAdminSerializer(pergunta, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(PerguntaAdminSerializer(pergunta).data)

    def delete(self, request, pk):
        pergunta = get_object_or_404(Pergunta, pk=pk)
        pergunta.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAlternativaListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def post(self, request, pergunta_id):
        pergunta = get_object_or_404(Pergunta, pk=pergunta_id)
        ser = AlternativaAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        alt = Alternativa.objects.create(pergunta=pergunta, **ser.validated_data)
        return Response(
            AlternativaAdminSerializer(alt).data, status=status.HTTP_201_CREATED
        )


class AdminAlternativaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def patch(self, request, pk):
        alt = get_object_or_404(Alternativa, pk=pk)
        ser = AlternativaAdminSerializer(alt, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        alt = get_object_or_404(Alternativa, pk=pk)
        alt.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCertificadoListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request):
        qs = Certificado.objects.select_related("usuario", "usuario__perfil", "curso")
        curso_id = request.query_params.get("curso")
        ra = (request.query_params.get("ra") or "").strip()
        if curso_id:
            qs = qs.filter(curso_id=curso_id)
        if ra:
            qs = qs.filter(usuario__perfil__ra__iexact=ra)
        return Response(CertificadoSerializer(qs[:300], many=True).data)


class AdminCertificadoRevogarView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def post(self, request, pk):
        cert = get_object_or_404(Certificado, pk=pk)
        cert.revogado = True
        cert.save(update_fields=["revogado"])
        return Response(CertificadoSerializer(cert).data)


class AdminCertificadoEmitirView(APIView):
    """Emissão manual pelo staff (mesmo critério de elegibilidade)."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def post(self, request):
        from .serializers import EmitirCertificadoSerializer

        ser = EmitirCertificadoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user_id = request.data.get("usuario_id")
        if not user_id:
            return Response(
                {"usuario_id": ["Obrigatório."]}, status=status.HTTP_400_BAD_REQUEST
            )
        usuario = get_object_or_404(User, pk=user_id, perfil__papel=Perfil.Papel.ALUNO)
        curso = ser.validated_data["curso_id"]
        try:
            cert = emitir_certificado(usuario, curso)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CertificadoSerializer(cert).data, status=status.HTTP_201_CREATED
        )
