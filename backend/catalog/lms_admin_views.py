"""APIs admin P11–P14: materiais, alunos, quizzes, certificados."""

from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from accounts.models import Perfil
from accounts.permissions import IsAdminOrGestor, IsPROrAbove
from accounts.ra import garantir_ra

from .access import ativacoes_vigentes_qs, cursos_liberados_aluno
from .certificados import emitir_certificado
from .models import (
    Alternativa,
    Ativacao,
    Aula,
    Certificado,
    Curso,
    MaterialAula,
    Modulo,
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
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
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
        mat = MaterialAula.objects.create(
            aula=aula, modulo=aula.modulo, **ser.validated_data
        )
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


class AdminModuloMateriaisView(APIView):
    """Materiais do módulo (cascata)."""

    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, modulo_id):
        modulo = get_object_or_404(Modulo, pk=modulo_id)
        qs = MaterialAula.objects.filter(modulo=modulo).order_by("ordem", "id")
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
        return Response(
            MaterialAulaSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request, modulo_id):
        modulo = get_object_or_404(Modulo, pk=modulo_id)
        ser = MaterialAulaSerializer(
            data=request.data, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        if not ser.validated_data.get("arquivo"):
            return Response(
                {"arquivo": ["Envie um arquivo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mat = MaterialAula.objects.create(
            modulo=modulo, aula=None, **ser.validated_data
        )
        return Response(
            MaterialAulaSerializer(mat, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminModuloAtividadesView(APIView):
    """Atividades (quizzes) do módulo."""

    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request, modulo_id):
        modulo = get_object_or_404(Modulo, pk=modulo_id)
        qs = (
            Quiz.objects.filter(modulo=modulo, tipo=Quiz.Tipo.ATIVIDADE)
            .prefetch_related("perguntas__alternativas")
            .order_by("id")
        )
        if request.query_params.get("incluir_inativos") != "1":
            qs = qs.filter(ativo=True)
        return Response(QuizAdminSerializer(qs, many=True).data)

    def post(self, request, modulo_id):
        modulo = get_object_or_404(Modulo, pk=modulo_id)
        ser = QuizAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        quiz = Quiz.objects.create(
            modulo=modulo,
            tipo=Quiz.Tipo.ATIVIDADE,
            aula=None,
            curso=None,
            **ser.validated_data,
        )
        return Response(
            QuizAdminSerializer(quiz).data, status=status.HTTP_201_CREATED
        )


class AdminCursoProvaView(APIView):
    """Prova avaliadora única do curso (certificado)."""

    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        quiz = (
            Quiz.objects.filter(curso=curso, tipo=Quiz.Tipo.PROVA_CURSO)
            .prefetch_related("perguntas__alternativas")
            .first()
        )
        if not quiz or (not quiz.ativo and request.query_params.get("incluir_inativos") != "1"):
            return Response(None)
        return Response(QuizAdminSerializer(quiz).data)

    def post(self, request, curso_id):
        curso = get_object_or_404(Curso, pk=curso_id)
        existente = Quiz.objects.filter(curso=curso).first()
        ser = QuizAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if existente:
            if existente.ativo and existente.tipo == Quiz.Tipo.PROVA_CURSO:
                return Response(
                    {"detail": "Curso já tem prova. Use PATCH."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            for campo, valor in ser.validated_data.items():
                setattr(existente, campo, valor)
            existente.tipo = Quiz.Tipo.PROVA_CURSO
            existente.curso = curso
            existente.modulo = None
            existente.aula = None
            existente.ativo = True
            existente.save()
            quiz = Quiz.objects.prefetch_related("perguntas__alternativas").get(
                pk=existente.pk
            )
            return Response(QuizAdminSerializer(quiz).data)
        quiz = Quiz.objects.create(
            curso=curso,
            tipo=Quiz.Tipo.PROVA_CURSO,
            aula=None,
            modulo=None,
            **ser.validated_data,
        )
        return Response(
            QuizAdminSerializer(quiz).data, status=status.HTTP_201_CREATED
        )


def _foto_url(request, perfil):
    if not perfil or not perfil.foto:
        return None
    url = perfil.foto.url
    return request.build_absolute_uri(url) if request else url


def _bool_param(raw, default=None):
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).lower() in ("1", "true", "yes", "on")


def _serializar_aluno_lista(request, u):
    vig = list(ativacoes_vigentes_qs(u).select_related("plano"))
    cursos = cursos_liberados_aluno(u)
    progresso = [_stats_progresso(u, c) for c in cursos[:20]]
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "is_active": u.is_active,
        "ra": getattr(u.perfil, "ra", None),
        "foto_url": _foto_url(request, getattr(u, "perfil", None)),
        "bio": getattr(u.perfil, "bio", "") or "",
        "ativacoes_vigentes": len(vig),
        "planos": [a.plano.nome for a in vig],
        "progresso": progresso,
    }


def _serializar_aluno_detalhe(request, u):
    vig = list(ativacoes_vigentes_qs(u).select_related("plano", "token_key"))
    todas = list(
        Ativacao.objects.filter(usuario=u)
        .select_related("plano")
        .order_by("-data_ativacao")
    )
    cursos = cursos_liberados_aluno(u)
    certificados = Certificado.objects.filter(usuario=u).select_related("curso")
    vig_ids = {a.id for a in vig}

    def _item_ativacao(a):
        return {
            "id": a.id,
            "plano_id": a.plano_id,
            "plano_nome": a.plano.nome,
            "valido_ate": a.valido_ate,
            "ativo": a.ativo,
            "vigente": a.id in vig_ids,
            "data_ativacao": a.data_ativacao,
        }

    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "is_active": u.is_active,
        "ra": getattr(u.perfil, "ra", None),
        "foto_url": _foto_url(request, getattr(u, "perfil", None)),
        "bio": getattr(u.perfil, "bio", "") or "",
        "ativacoes_vigentes": len(vig),
        "planos": [a.plano.nome for a in vig],
        "ativacoes": [_item_ativacao(a) for a in vig],
        "ativacoes_historico": [_item_ativacao(a) for a in todas],
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
        plano_id = (request.query_params.get("plano_id") or "").strip()
        if plano_id.isdigit():
            qs = qs.filter(
                ativacoes__plano_id=int(plano_id),
                ativacoes__ativo=True,
            ).distinct()

        out = []
        for u in qs.order_by("first_name", "username")[:200]:
            item = _serializar_aluno_lista(request, u)
            if request.query_params.get("com_plano") == "1" and not item["ativacoes_vigentes"]:
                continue
            out.append(item)
        return Response(out)

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        first_name = (request.data.get("first_name") or "").strip()
        password = request.data.get("password") or ""
        bio = (request.data.get("bio") or "").strip()

        erros = {}
        if not username:
            erros["username"] = "Informe o usuário."
        elif User.objects.filter(username=username).exists():
            erros["username"] = "Usuário já existe."
        if not email:
            erros["email"] = "Informe o e-mail."
        elif User.objects.filter(email__iexact=email).exists():
            erros["email"] = "E-mail já em uso."
        if not first_name:
            erros["first_name"] = "Informe o nome."
        if not password or len(password) < 8:
            erros["password"] = "Senha com no mínimo 8 caracteres."
        else:
            try:
                validate_password(password)
            except DjangoValidationError as e:
                erros["password"] = list(e.messages)
        if erros:
            return Response(erros, status=status.HTTP_400_BAD_REQUEST)

        user = User(username=username, email=email, first_name=first_name)
        user.set_password(password)
        user.save()
        perfil, _ = Perfil.objects.update_or_create(
            user=user,
            defaults={"papel": Perfil.Papel.ALUNO, "bio": bio},
        )
        garantir_ra(perfil)
        user = User.objects.select_related("perfil").get(pk=user.pk)
        return Response(
            _serializar_aluno_lista(request, user),
            status=status.HTTP_201_CREATED,
        )


class AdminAlunoDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request, pk):
        u = get_object_or_404(
            User.objects.select_related("perfil"),
            pk=pk,
            perfil__papel=Perfil.Papel.ALUNO,
        )
        return Response(_serializar_aluno_detalhe(request, u))

    def patch(self, request, pk):
        u = get_object_or_404(
            User.objects.select_related("perfil"),
            pk=pk,
            perfil__papel=Perfil.Papel.ALUNO,
        )
        data = request.data
        update_fields = []

        if "first_name" in data:
            u.first_name = str(data.get("first_name") or "")[:150]
            update_fields.append("first_name")
        if "email" in data:
            email = str(data.get("email") or "").strip().lower()
            if not email:
                return Response(
                    {"email": "Informe o e-mail."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (
                User.objects.filter(email__iexact=email)
                .exclude(pk=u.pk)
                .exists()
            ):
                return Response(
                    {"email": "E-mail já em uso."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            u.email = email
            update_fields.append("email")
        if "is_active" in data:
            u.is_active = _bool_param(data.get("is_active"), u.is_active)
            update_fields.append("is_active")
        if "password" in data and data.get("password"):
            password = data.get("password")
            try:
                validate_password(password, user=u)
            except DjangoValidationError as e:
                return Response(
                    {"password": list(e.messages)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            u.set_password(password)
            update_fields.append("password")

        if update_fields:
            # password não é campo direto no save — set_password já marcou
            campos = [f for f in update_fields if f != "password"]
            if "password" in update_fields and not campos:
                u.save()
            elif campos:
                u.save(update_fields=campos)
                if "password" in update_fields:
                    u.save()

        perfil = u.perfil
        if "bio" in data:
            perfil.bio = str(data.get("bio") or "")
            perfil.save(update_fields=["bio"])

        return self.get(request, pk)


class AdminQuizByAulaView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request, aula_id):
        aula = get_object_or_404(Aula, pk=aula_id)
        quiz = (
            Quiz.objects.filter(aula=aula, ativo=True)
            .prefetch_related("perguntas__alternativas")
            .first()
        )
        if not quiz:
            return Response(None)
        return Response(QuizAdminSerializer(quiz).data)

    def post(self, request, aula_id):
        aula = get_object_or_404(Aula, pk=aula_id)
        existente = Quiz.objects.filter(aula=aula).first()
        ser = QuizAdminSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if existente:
            if existente.ativo:
                return Response(
                    {"detail": "Esta aula já possui quiz. Use PATCH."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Reativa quiz soft-deletado em vez de bloquear
            for campo, valor in ser.validated_data.items():
                setattr(existente, campo, valor)
            existente.ativo = True
            existente.save()
            quiz = Quiz.objects.prefetch_related("perguntas__alternativas").get(
                pk=existente.pk
            )
            return Response(QuizAdminSerializer(quiz).data, status=status.HTTP_200_OK)
        quiz = Quiz.objects.create(
            aula=aula, tipo=Quiz.Tipo.QUIZ_AULA, **ser.validated_data
        )
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
