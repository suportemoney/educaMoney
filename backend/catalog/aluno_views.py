from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAluno

from .access import (
    aluno_tem_acesso_aula,
    aluno_tem_acesso_curso,
    ativacoes_vigentes_qs,
    cursos_liberados_aluno,
)
from .models import (
    Ativacao,
    Aula,
    Categoria,
    Conjunto,
    Curso,
    Integracao,
    Plano,
    ProgressoAula,
    TicketSecretaria,
    TokenKey,
)
from .serializers import (
    AtivacaoSerializer,
    AtivarTokenSerializer,
    AulaAlunoSerializer,
    CategoriaSerializer,
    ConjuntoAlunoSerializer,
    CursoAlunoSerializer,
    CursoDetalheAlunoSerializer,
    ProgressoAulaSerializer,
    ProgressoAulaUpdateSerializer,
    SubcategoriaSerializer,
    TicketAlunoCreateSerializer,
    TicketSecretariaSerializer,
)


def _stats_progresso_curso(user, curso: Curso) -> dict:
    aulas = Aula.objects.filter(
        modulo__curso=curso, modulo__ativo=True, ativo=True
    )
    total = aulas.count()
    concluidas = ProgressoAula.objects.filter(
        usuario=user, aula__in=aulas, concluida=True
    ).count()
    pct = int(round(100 * concluidas / total)) if total else 0
    return {
        "aulas_total": total,
        "aulas_concluidas": concluidas,
        "progresso_pct": pct,
    }


class AtivacaoView(APIView):
    """Aluno autentica e ativa um token-key disponível."""

    permission_classes = [IsAluno]

    def post(self, request):
        serializer = AtivarTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        codigo = serializer.validated_data["codigo"]

        with transaction.atomic():
            try:
                token = (
                    TokenKey.objects.select_for_update()
                    .select_related("plano")
                    .get(codigo=codigo)
                )
            except TokenKey.DoesNotExist:
                return Response(
                    {"detail": "Código inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if token.status == TokenKey.Status.REVOGADO:
                return Response(
                    {"detail": "Este token foi revogado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if token.status == TokenKey.Status.USADO:
                return Response(
                    {"detail": "Este token já foi utilizado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            agora = timezone.now()
            token.status = TokenKey.Status.USADO
            token.usado_por = request.user
            token.usado_em = agora
            token.save(update_fields=["status", "usado_por", "usado_em"])

            dias = getattr(token.plano, "duracao_dias", None) or 365
            ativacao = Ativacao.objects.create(
                usuario=request.user,
                plano=token.plano,
                token_key=token,
                ativo=True,
                valido_ate=agora + timedelta(days=dias),
            )

            cursos = (
                Curso.objects.filter(planos=token.plano, ativo=True)
                .select_related("instrutor")
                .distinct()
                .order_by("ordem", "titulo")
            )
            payload = []
            for c in cursos:
                row = CursoAlunoSerializer(c, context={"request": request}).data
                row.update(_stats_progresso_curso(request.user, c))
                payload.append(row)

        return Response(
            {
                "ativacao": AtivacaoSerializer(ativacao).data,
                "plano": {
                    "id": token.plano.id,
                    "nome": token.plano.nome,
                    "descricao": token.plano.descricao,
                },
                "cursos": payload,
            },
            status=status.HTTP_201_CREATED,
        )


class MeusCursosView(APIView):
    """Cursos liberados pelas ativações ativas do aluno."""

    permission_classes = [IsAluno]

    def get(self, request):
        from .models import Certificado

        cursos = cursos_liberados_aluno(request.user)
        certs = {
            c.curso_id: c.codigo
            for c in Certificado.objects.filter(
                usuario=request.user, revogado=False, curso__in=cursos
            )
        }
        out = []
        for c in cursos:
            row = CursoAlunoSerializer(
                c, context={"request": request, "certificados_map": certs}
            ).data
            row.update(_stats_progresso_curso(request.user, c))
            out.append(row)
        return Response(out)


class MinhasAtivacoesView(APIView):
    permission_classes = [IsAluno]

    def get(self, request):
        qs = Ativacao.objects.filter(usuario=request.user).select_related(
            "plano", "token_key"
        )
        return Response(AtivacaoSerializer(qs, many=True).data)


class CursoDetalheAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request, pk):
        if not aluno_tem_acesso_curso(request.user, pk):
            return Response(
                {"detail": "Você não tem acesso a este curso."},
                status=status.HTTP_403_FORBIDDEN,
            )
        curso = get_object_or_404(
            Curso.objects.select_related("instrutor").prefetch_related(
                "modulos__aulas__materiais",
                "modulos__aulas__quiz",
            ),
            pk=pk,
            ativo=True,
        )
        aulas_ids = list(
            Aula.objects.filter(
                modulo__curso=curso, modulo__ativo=True, ativo=True
            ).values_list("id", flat=True)
        )
        progresso_map = {
            p.aula_id: p
            for p in ProgressoAula.objects.filter(
                usuario=request.user, aula_id__in=aulas_ids
            )
        }
        from .models import Quiz, TentativaQuiz

        quiz_ids = list(
            Quiz.objects.filter(aula_id__in=aulas_ids, ativo=True).values_list(
                "id", flat=True
            )
        )
        quiz_aprovado_map = {
            t.quiz_id: True
            for t in TentativaQuiz.objects.filter(
                usuario=request.user, quiz_id__in=quiz_ids, aprovado=True
            )
        }
        stats = _stats_progresso_curso(request.user, curso)
        for k, v in stats.items():
            setattr(curso, k, v)
        data = CursoDetalheAlunoSerializer(
            curso,
            context={
                "request": request,
                "progresso_map": progresso_map,
                "quiz_aprovado_map": quiz_aprovado_map,
            },
        ).data
        from .certificados import aluno_elegivel_certificado
        from .models import Certificado

        cert = Certificado.objects.filter(
            usuario=request.user, curso=curso, revogado=False
        ).first()
        elegivel, motivo = aluno_elegivel_certificado(request.user, curso)
        data["certificado"] = (
            {"codigo": cert.codigo, "emitido_em": cert.emitido_em} if cert else None
        )
        data["certificado_elegivel"] = elegivel and not cert
        data["certificado_motivo"] = motivo if not elegivel else ""
        return Response(data)


class AulaDetalheAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request, pk):
        aula = get_object_or_404(
            Aula.objects.select_related("modulo__curso").prefetch_related(
                "materiais"
            ),
            pk=pk,
            ativo=True,
            modulo__ativo=True,
        )
        if not aluno_tem_acesso_aula(request.user, aula):
            return Response(
                {"detail": "Você não tem acesso a esta aula."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prog = ProgressoAula.objects.filter(
            usuario=request.user, aula=aula
        ).first()
        progresso_map = {aula.id: prog} if prog else {}
        from .models import Quiz, TentativaQuiz

        quiz = Quiz.objects.filter(aula=aula, ativo=True).first()
        quiz_aprovado_map = {}
        if quiz:
            quiz_aprovado_map = {
                t.quiz_id: True
                for t in TentativaQuiz.objects.filter(
                    usuario=request.user, quiz=quiz, aprovado=True
                )
            }
        data = AulaAlunoSerializer(
            aula,
            context={
                "request": request,
                "progresso_map": progresso_map,
                "quiz_aprovado_map": quiz_aprovado_map,
            },
        ).data
        data["curso_id"] = aula.modulo.curso_id
        data["modulo_id"] = aula.modulo_id
        data["modulo_titulo"] = aula.modulo.titulo
        # Navegação anterior/próxima no curso
        aulas = list(
            Aula.objects.filter(
                modulo__curso_id=aula.modulo.curso_id,
                modulo__ativo=True,
                ativo=True,
            )
            .order_by("modulo__ordem", "modulo__id", "ordem", "id")
            .values_list("id", flat=True)
        )
        idx = aulas.index(aula.id) if aula.id in aulas else -1
        proxima_id = aulas[idx + 1] if idx >= 0 and idx + 1 < len(aulas) else None
        bloqueado = False
        if quiz and quiz.bloqueia_proxima and not quiz_aprovado_map.get(quiz.id):
            bloqueado = True
            proxima_id = None
        data["aula_anterior_id"] = aulas[idx - 1] if idx > 0 else None
        data["aula_proxima_id"] = proxima_id
        data["proxima_bloqueada"] = bloqueado
        return Response(data)


class AulaProgressoView(APIView):
    permission_classes = [IsAluno]

    def patch(self, request, pk):
        aula = get_object_or_404(
            Aula.objects.select_related("modulo"),
            pk=pk,
            ativo=True,
            modulo__ativo=True,
        )
        if not aluno_tem_acesso_aula(request.user, aula):
            return Response(
                {"detail": "Você não tem acesso a esta aula."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = ProgressoAulaUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        prog, _ = ProgressoAula.objects.get_or_create(
            usuario=request.user, aula=aula
        )
        if "posicao_segundos" in ser.validated_data:
            prog.posicao_segundos = ser.validated_data["posicao_segundos"]
        if "concluida" in ser.validated_data:
            prog.concluida = ser.validated_data["concluida"]
        prog.save()
        return Response(ProgressoAulaSerializer(prog).data)


def _wa_url(telefone: str, texto: str) -> str:
    digits = "".join(c for c in (telefone or "") if c.isdigit())
    from urllib.parse import quote

    q = quote(texto)
    if not digits:
        return f"https://wa.me/?text={q}"
    return f"https://wa.me/{digits}?text={q}"


def _aplicar_template(tpl: str, vars_: dict) -> str:
    out = tpl or ""
    for k, v in vars_.items():
        out = out.replace("{" + k + "}", str(v))
    return out


class CatalogoAlunoView(APIView):
    """Cursos + conjuntos com busca parcial e filtros de categoria/tag."""

    permission_classes = [IsAluno]

    def get(self, request):
        from .models import Subcategoria

        cursos = cursos_liberados_aluno(request.user)
        cat = request.query_params.get("categoria")
        sub = request.query_params.get("subcategoria")
        q = (request.query_params.get("q") or "").strip()
        # tipo: all | curso | conjunto
        tipo = (request.query_params.get("tipo") or "all").strip().lower()

        if cat:
            cursos = cursos.filter(subcategoria__categoria_id=cat)
        if sub:
            cursos = cursos.filter(subcategoria_id=sub)
        if q:
            cursos = cursos.filter(
                Q(titulo__icontains=q) | Q(descricao__icontains=q)
            )

        out_cursos = []
        if tipo in ("all", "curso", "cursos"):
            for c in cursos:
                row = CursoAlunoSerializer(c, context={"request": request}).data
                row.update(_stats_progresso_curso(request.user, c))
                out_cursos.append(row)

        liberados = set(
            cursos_liberados_aluno(request.user).values_list("id", flat=True)
        )
        conjuntos = (
            Conjunto.objects.filter(ativo=True)
            .select_related("categoria")
            .prefetch_related("conjunto_cursos__curso")
        )
        if cat:
            conjuntos = conjuntos.filter(categoria_id=cat)
        if sub:
            conjuntos = conjuntos.filter(cursos__subcategoria_id=sub).distinct()
        if q:
            conjuntos = conjuntos.filter(
                Q(titulo__icontains=q)
                | Q(descricao__icontains=q)
                | Q(cursos__titulo__icontains=q)
            ).distinct()
        out_conjuntos = []
        if tipo in ("all", "conjunto", "conjuntos"):
            out_conjuntos = ConjuntoAlunoSerializer(
                conjuntos,
                many=True,
                context={"request": request, "liberados_ids": liberados},
            ).data

        categorias = Categoria.objects.filter(ativo=True).order_by("ordem", "titulo")
        subs = Subcategoria.objects.filter(
            ativo=True, categoria__ativo=True
        ).select_related("categoria")
        return Response(
            {
                "cursos": out_cursos,
                "conjuntos": out_conjuntos,
                "categorias": CategoriaSerializer(
                    categorias, many=True, context={"request": request}
                ).data,
                "subcategorias": SubcategoriaSerializer(subs, many=True).data,
            }
        )


class ConjuntosAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request):
        liberados = set(cursos_liberados_aluno(request.user).values_list("id", flat=True))
        qs = (
            Conjunto.objects.filter(ativo=True)
            .select_related("categoria")
            .prefetch_related("conjunto_cursos__curso")
        )
        return Response(
            ConjuntoAlunoSerializer(
                qs,
                many=True,
                context={"request": request, "liberados_ids": liberados},
            ).data
        )


class FinancasAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request):
        ativacoes = Ativacao.objects.filter(usuario=request.user).select_related(
            "plano", "token_key"
        )
        vigentes = list(ativacoes_vigentes_qs(request.user).select_related("plano"))
        wa = Integracao.whatsapp_ativa()
        telefone = wa.telefone if wa else ""
        tpl = (
            wa.mensagem_template
            if wa
            else "Olá! Sou {nome} (RA {ra}) e quero {acao} o plano {titulo_plano}."
        )
        perfil = getattr(request.user, "perfil", None)
        ra = getattr(perfil, "ra", "") or ""
        nome = request.user.first_name or request.user.username
        plano_ref = vigentes[0].plano if vigentes else Plano.objects.filter(ativo=True).order_by("ordem").first()
        titulo_plano = plano_ref.nome if plano_ref else "plano EducaMoney"
        valor = str(plano_ref.preco_referencia) if plano_ref else ""

        def link(acao: str) -> str:
            texto = _aplicar_template(
                tpl,
                {
                    "titulo_plano": titulo_plano,
                    "valor_plano": valor,
                    "nome_site": "EducaMoney",
                    "acao": acao,
                    "ra": ra,
                    "nome": nome,
                },
            )
            # Se o template da landing não tem {acao}, acrescenta
            if "{acao}" not in (tpl or "") and acao:
                texto = f"{texto}\n\nSolicitação: {acao}."
            return _wa_url(telefone, texto)

        return Response(
            {
                "ativacoes": AtivacaoSerializer(ativacoes, many=True).data,
                "vigentes": AtivacaoSerializer(vigentes, many=True).data,
                "whatsapp_upgrade": link("upgrade de plano"),
                "whatsapp_renovar": link("renovar / estender validade"),
            }
        )


class TicketsAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request):
        qs = TicketSecretaria.objects.filter(usuario=request.user)
        return Response(TicketSecretariaSerializer(qs, many=True).data)

    def post(self, request):
        ser = TicketAlunoCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ticket = TicketSecretaria.objects.create(
            usuario=request.user,
            assunto=ser.validated_data["assunto"],
            mensagem=ser.validated_data["mensagem"],
        )
        return Response(
            TicketSecretariaSerializer(ticket).data, status=status.HTTP_201_CREATED
        )


class CategoriasPublicasAlunoView(APIView):
    """Categorias/subcategorias para filtros do portal."""

    permission_classes = [IsAluno]

    def get(self, request):
        cats = Categoria.objects.filter(ativo=True)
        from .models import Subcategoria

        subs = Subcategoria.objects.filter(ativo=True, categoria__ativo=True)
        return Response(
            {
                "categorias": CategoriaSerializer(
                    cats, many=True, context={"request": request}
                ).data,
                "subcategorias": SubcategoriaSerializer(subs, many=True).data,
            }
        )


class QuizAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request, aula_id):
        from .models import Quiz, TentativaQuiz
        from .serializers import QuizAlunoSerializer

        aula = get_object_or_404(Aula, pk=aula_id, ativo=True, modulo__ativo=True)
        if not aluno_tem_acesso_aula(request.user, aula):
            return Response({"detail": "Sem acesso."}, status=status.HTTP_403_FORBIDDEN)
        quiz = (
            Quiz.objects.filter(aula=aula, ativo=True)
            .prefetch_related("perguntas__alternativas")
            .first()
        )
        if not quiz:
            return Response(None)
        ultima = (
            TentativaQuiz.objects.filter(usuario=request.user, quiz=quiz)
            .order_by("-criado_em")
            .first()
        )
        aprovado = TentativaQuiz.objects.filter(
            usuario=request.user, quiz=quiz, aprovado=True
        ).exists()
        return Response(
            QuizAlunoSerializer(
                quiz,
                context={
                    "quiz_aprovado_map": {quiz.id: aprovado},
                    "quiz_nota_map": {quiz.id: ultima.nota if ultima else None},
                },
            ).data
        )

    def post(self, request, aula_id):
        from .models import Alternativa, Pergunta, Quiz, RespostaAluno, TentativaQuiz
        from .serializers import SubmeterQuizSerializer, TentativaQuizSerializer

        aula = get_object_or_404(Aula, pk=aula_id, ativo=True, modulo__ativo=True)
        if not aluno_tem_acesso_aula(request.user, aula):
            return Response({"detail": "Sem acesso."}, status=status.HTTP_403_FORBIDDEN)
        quiz = get_object_or_404(Quiz, aula=aula, ativo=True)
        ser = SubmeterQuizSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        respostas = ser.validated_data["respostas"]
        perguntas = {p.id: p for p in quiz.perguntas.all()}
        if not perguntas:
            return Response(
                {"detail": "Quiz sem perguntas."}, status=status.HTTP_400_BAD_REQUEST
            )
        acertos = 0
        pares = []
        for item in respostas:
            pid = item["pergunta_id"]
            aid = item["alternativa_id"]
            if pid not in perguntas:
                return Response(
                    {"detail": f"Pergunta {pid} inválida."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                alt = Alternativa.objects.get(pk=aid, pergunta_id=pid)
            except Alternativa.DoesNotExist:
                return Response(
                    {"detail": f"Alternativa {aid} inválida."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if alt.correta:
                acertos += 1
            pares.append((perguntas[pid], alt))
        nota = int(round(100 * acertos / len(perguntas)))
        aprovado = nota >= quiz.nota_minima
        tentativa = TentativaQuiz.objects.create(
            usuario=request.user, quiz=quiz, nota=nota, aprovado=aprovado
        )
        RespostaAluno.objects.bulk_create(
            [
                RespostaAluno(
                    tentativa=tentativa, pergunta=perg, alternativa=alt
                )
                for perg, alt in pares
            ]
        )
        return Response(
            TentativaQuizSerializer(tentativa).data, status=status.HTTP_201_CREATED
        )


class CertificadosAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request):
        from .models import Certificado
        from .serializers import CertificadoSerializer

        qs = Certificado.objects.filter(
            usuario=request.user, revogado=False
        ).select_related("curso")
        return Response(CertificadoSerializer(qs, many=True).data)

    def post(self, request):
        from .certificados import emitir_certificado
        from .serializers import CertificadoSerializer, EmitirCertificadoSerializer

        ser = EmitirCertificadoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        curso = ser.validated_data["curso_id"]
        if not aluno_tem_acesso_curso(request.user, curso.id):
            return Response({"detail": "Sem acesso."}, status=status.HTTP_403_FORBIDDEN)
        try:
            cert = emitir_certificado(request.user, curso)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CertificadoSerializer(cert).data, status=status.HTTP_201_CREATED
        )


class CertificadoHtmlAlunoView(APIView):
    permission_classes = [IsAluno]

    def get(self, request, codigo):
        from django.http import HttpResponse

        from .models import Certificado

        cert = get_object_or_404(
            Certificado, codigo=codigo, usuario=request.user, revogado=False
        )
        return HttpResponse(cert.html or "<p>Certificado sem HTML.</p>", content_type="text/html")


class PublicCertificadoView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, codigo):
        from .models import Certificado
        from .serializers import CertificadoSerializer

        cert = get_object_or_404(Certificado, codigo=codigo, revogado=False)
        data = CertificadoSerializer(cert).data
        data["valido"] = True
        return Response(data)
