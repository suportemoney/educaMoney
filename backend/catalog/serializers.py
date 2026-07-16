import re

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Alternativa,
    Ativacao,
    Aula,
    Categoria,
    Certificado,
    ConfigSistema,
    Conjunto,
    ConjuntoCurso,
    Curso,
    Integracao,
    MaterialAula,
    Modulo,
    Pergunta,
    Plano,
    PlanoCurso,
    ProgressoAula,
    Quiz,
    Subcategoria,
    TentativaQuiz,
    TicketSecretaria,
    TokenKey,
)

# Limite alinhado ao nginx (500M) e validação de extensão
VIDEO_MAX_BYTES = 500 * 1024 * 1024
VIDEO_EXTENSOES = {".mp4", ".webm"}
ICONE_MAX_BYTES = 2 * 1024 * 1024
ICONE_EXTENSOES = {".png", ".webp", ".svg", ".jpg", ".jpeg"}
MATERIAL_MAX_BYTES = 50 * 1024 * 1024
MATERIAL_EXTENSOES = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".zip"}
CAPA_MAX_BYTES = 5 * 1024 * 1024
CAPA_EXTENSOES = {".png", ".webp", ".jpg", ".jpeg"}


def _validar_video(arquivo):
    if arquivo is None:
        return
    nome = getattr(arquivo, "name", "") or ""
    ext = ("." + nome.rsplit(".", 1)[-1].lower()) if "." in nome else ""
    if ext not in VIDEO_EXTENSOES:
        raise serializers.ValidationError("Envie um vídeo .mp4 ou .webm.")
    tamanho = getattr(arquivo, "size", None)
    if tamanho is not None and tamanho > VIDEO_MAX_BYTES:
        raise serializers.ValidationError("Vídeo acima do limite de 500 MB.")


def _validar_icone(arquivo):
    if arquivo is None:
        return
    nome = getattr(arquivo, "name", "") or ""
    ext = ("." + nome.rsplit(".", 1)[-1].lower()) if "." in nome else ""
    if ext not in ICONE_EXTENSOES:
        raise serializers.ValidationError("Ícone: png, webp, svg ou jpg.")
    tamanho = getattr(arquivo, "size", None)
    if tamanho is not None and tamanho > ICONE_MAX_BYTES:
        raise serializers.ValidationError("Ícone acima de 2 MB.")


def _validar_capa(arquivo):
    if arquivo is None:
        return
    nome = getattr(arquivo, "name", "") or ""
    ext = ("." + nome.rsplit(".", 1)[-1].lower()) if "." in nome else ""
    if ext not in CAPA_EXTENSOES:
        raise serializers.ValidationError("Capa: png, webp ou jpg.")
    tamanho = getattr(arquivo, "size", None)
    if tamanho is not None and tamanho > CAPA_MAX_BYTES:
        raise serializers.ValidationError("Capa acima de 5 MB.")


def _validar_material(arquivo):
    if arquivo is None:
        raise serializers.ValidationError("Envie um arquivo.")
    nome = getattr(arquivo, "name", "") or ""
    ext = ("." + nome.rsplit(".", 1)[-1].lower()) if "." in nome else ""
    if ext not in MATERIAL_EXTENSOES:
        raise serializers.ValidationError("Material: pdf, png, jpg, webp ou zip.")
    tamanho = getattr(arquivo, "size", None)
    if tamanho is not None and tamanho > MATERIAL_MAX_BYTES:
        raise serializers.ValidationError("Material acima de 50 MB.")


def _file_url(obj_file, request):
    if not obj_file:
        return None
    url = obj_file.url
    if request:
        return request.build_absolute_uri(url)
    return url


class PlanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_referencia",
            "beneficios",
            "duracao_dias",
            "ordem",
        )


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = ("id", "titulo", "descricao", "ordem")


class PlanoAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_referencia",
            "beneficios",
            "duracao_dias",
            "ativo",
            "ordem",
        )

    def validate_beneficios(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Informe uma lista de benefícios.")
        limpos = []
        for item in value:
            texto = str(item).strip()
            if texto:
                limpos.append(texto)
        return limpos


class CursoAdminSerializer(serializers.ModelSerializer):
    plano_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Plano.objects.all(),
        source="planos",
        required=False,
    )
    instrutor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="instrutor",
        allow_null=True,
        required=False,
    )
    instrutor_nome = serializers.SerializerMethodField(read_only=True)
    subcategoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Subcategoria.objects.all(),
        source="subcategoria",
        allow_null=True,
        required=False,
    )
    icone_url = serializers.SerializerMethodField(read_only=True)
    capa_url = serializers.SerializerMethodField(read_only=True)
    categoria_titulo = serializers.SerializerMethodField(read_only=True)
    subcategoria_titulo = serializers.SerializerMethodField(read_only=True)
    planos_nomes = serializers.SerializerMethodField(read_only=True)
    modulos_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "descricao",
            "ativo",
            "ordem",
            "instrutor_id",
            "instrutor_nome",
            "plano_ids",
            "planos_nomes",
            "modulos_count",
            "subcategoria_id",
            "subcategoria_titulo",
            "categoria_titulo",
            "icone",
            "icone_url",
            "icone_key",
            "capa",
            "capa_url",
        )
        extra_kwargs = {
            "icone": {"required": False, "allow_null": True},
            "capa": {"required": False, "allow_null": True},
        }

    def get_instrutor_nome(self, obj):
        if not obj.instrutor:
            return None
        return obj.instrutor.first_name or obj.instrutor.username

    def get_icone_url(self, obj):
        return _file_url(obj.icone, self.context.get("request"))

    def get_capa_url(self, obj):
        return _file_url(obj.capa, self.context.get("request"))

    def get_subcategoria_titulo(self, obj):
        return obj.subcategoria.titulo if obj.subcategoria_id else None

    def get_categoria_titulo(self, obj):
        if obj.subcategoria_id and obj.subcategoria.categoria_id:
            return obj.subcategoria.categoria.titulo
        return None

    def get_planos_nomes(self, obj):
        return [p.nome for p in obj.planos.all()]

    def get_modulos_count(self, obj):
        if hasattr(obj, "modulos_count") and obj.modulos_count is not None:
            return obj.modulos_count
        return obj.modulos.filter(ativo=True).count()

    def validate_icone(self, value):
        _validar_icone(value)
        return value

    def validate_capa(self, value):
        _validar_capa(value)
        return value

    def create(self, validated_data):
        planos = validated_data.pop("planos", [])
        curso = Curso.objects.create(**validated_data)
        self._sync_planos(curso, planos)
        return curso

    def update(self, instance, validated_data):
        planos = validated_data.pop("planos", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if planos is not None:
            self._sync_planos(instance, planos)
        return instance

    def _sync_planos(self, curso, planos):
        PlanoCurso.objects.filter(curso=curso).delete()
        for i, plano in enumerate(planos):
            PlanoCurso.objects.create(curso=curso, plano=plano, ordem=i)


class ConfigSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigSistema
        fields = ("nome_site", "atualizado_em")
        read_only_fields = ("atualizado_em",)


class IntegracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integracao
        fields = (
            "id",
            "tipo",
            "telefone",
            "mensagem_template",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("criado_em", "atualizado_em")

    def validate_telefone(self, value):
        limpo = re.sub(r"[\s\-\(\)]", "", (value or "").strip())
        if not re.fullmatch(r"\+55\d{10,11}", limpo):
            raise serializers.ValidationError(
                "Informe o telefone com +55 e o número completo (DDD + celular), "
                "ex.: +5511999999999."
            )
        return limpo

    def validate_mensagem_template(self, value):
        texto = (value or "").strip()
        if not texto:
            raise serializers.ValidationError("Informe a mensagem automática.")
        return texto

    def create(self, validated_data):
        validated_data.setdefault("tipo", Integracao.Tipo.WHATSAPP)
        integracao = super().create(validated_data)
        if integracao.ativo:
            Integracao.objects.filter(tipo=Integracao.Tipo.WHATSAPP).exclude(
                pk=integracao.pk
            ).update(ativo=False)
        return integracao

    def update(self, instance, validated_data):
        integracao = super().update(instance, validated_data)
        if integracao.ativo:
            Integracao.objects.filter(tipo=Integracao.Tipo.WHATSAPP).exclude(
                pk=integracao.pk
            ).update(ativo=False)
        return integracao


class TokenKeySerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source="plano.nome", read_only=True)
    criado_por_nome = serializers.SerializerMethodField()
    usado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = TokenKey
        fields = (
            "id",
            "codigo",
            "plano",
            "plano_nome",
            "status",
            "origem",
            "valor_proporcional",
            "criado_por",
            "criado_por_nome",
            "criado_em",
            "usado_por",
            "usado_por_nome",
            "usado_em",
        )
        read_only_fields = (
            "codigo",
            "status",
            "origem",
            "valor_proporcional",
            "criado_por",
            "criado_em",
            "usado_por",
            "usado_em",
        )

    def get_criado_por_nome(self, obj):
        if not obj.criado_por:
            return None
        return obj.criado_por.first_name or obj.criado_por.username

    def get_usado_por_nome(self, obj):
        if not obj.usado_por:
            return None
        return obj.usado_por.first_name or obj.usado_por.username


class TokenKeyCreateSerializer(serializers.Serializer):
    plano_id = serializers.PrimaryKeyRelatedField(queryset=Plano.objects.filter(ativo=True))


class AtivarTokenSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=32)

    def validate_codigo(self, value):
        return (value or "").strip().upper()


class AtivacaoSerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source="plano.nome", read_only=True)
    token_codigo = serializers.CharField(source="token_key.codigo", read_only=True)
    usuario_nome = serializers.SerializerMethodField()
    vigente = serializers.SerializerMethodField()

    class Meta:
        model = Ativacao
        fields = (
            "id",
            "plano",
            "plano_nome",
            "token_key",
            "token_codigo",
            "data_ativacao",
            "ativo",
            "valido_ate",
            "renovado_em",
            "usuario_nome",
            "vigente",
        )

    def get_usuario_nome(self, obj):
        u = obj.usuario
        return u.first_name or u.username

    def get_vigente(self, obj):
        if not obj.ativo:
            return False
        if obj.valido_ate is None:
            return True
        from django.utils import timezone

        return obj.valido_ate >= timezone.now()


class CursoAlunoSerializer(serializers.ModelSerializer):
    instrutor_nome = serializers.SerializerMethodField()
    aulas_total = serializers.IntegerField(read_only=True, required=False)
    aulas_concluidas = serializers.IntegerField(read_only=True, required=False)
    progresso_pct = serializers.IntegerField(read_only=True, required=False)
    icone_url = serializers.SerializerMethodField()
    capa_url = serializers.SerializerMethodField()
    categoria_id = serializers.SerializerMethodField()
    categoria_titulo = serializers.SerializerMethodField()
    subcategoria_titulo = serializers.SerializerMethodField()
    certificado_codigo = serializers.SerializerMethodField()

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "descricao",
            "ordem",
            "instrutor_nome",
            "aulas_total",
            "aulas_concluidas",
            "progresso_pct",
            "icone_url",
            "capa_url",
            "icone_key",
            "categoria_id",
            "categoria_titulo",
            "subcategoria_id",
            "subcategoria_titulo",
            "certificado_codigo",
        )

    def get_instrutor_nome(self, obj):
        if not obj.instrutor:
            return None
        return obj.instrutor.first_name or obj.instrutor.username

    def get_icone_url(self, obj):
        return _file_url(obj.icone, self.context.get("request"))

    def get_capa_url(self, obj):
        return _file_url(obj.capa, self.context.get("request"))

    def get_categoria_id(self, obj):
        if obj.subcategoria_id:
            return obj.subcategoria.categoria_id
        return None

    def get_categoria_titulo(self, obj):
        if obj.subcategoria_id:
            return obj.subcategoria.categoria.titulo
        return None

    def get_subcategoria_titulo(self, obj):
        return obj.subcategoria.titulo if obj.subcategoria_id else None

    def get_certificado_codigo(self, obj):
        mapa = self.context.get("certificados_map") or {}
        return mapa.get(obj.id)


class ProgressoAulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgressoAula
        fields = ("concluida", "posicao_segundos", "atualizado_em")
        read_only_fields = ("atualizado_em",)


class ProgressoAulaUpdateSerializer(serializers.Serializer):
    posicao_segundos = serializers.IntegerField(required=False, min_value=0)
    concluida = serializers.BooleanField(required=False)


class AulaAlunoSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    progresso = serializers.SerializerMethodField()
    materiais = serializers.SerializerMethodField()
    quiz = serializers.SerializerMethodField()

    class Meta:
        model = Aula
        fields = (
            "id",
            "titulo",
            "descricao",
            "ordem",
            "duracao_segundos",
            "video_url",
            "progresso",
            "materiais",
            "quiz",
        )

    def get_video_url(self, obj):
        if not obj.video:
            return None
        request = self.context.get("request")
        url = obj.video.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_progresso(self, obj):
        mapa = self.context.get("progresso_map") or {}
        prog = mapa.get(obj.id)
        if not prog:
            return {"concluida": False, "posicao_segundos": 0}
        return ProgressoAulaSerializer(prog).data

    def get_materiais(self, obj):
        mats = [m for m in obj.materiais.all() if m.ativo]
        return MaterialAulaSerializer(
            mats, many=True, context=self.context
        ).data

    def get_quiz(self, obj):
        try:
            quiz = obj.quiz
        except Quiz.DoesNotExist:
            return None
        if not quiz or not quiz.ativo:
            return None
        tentativas_map = self.context.get("quiz_aprovado_map") or {}
        return {
            "id": quiz.id,
            "titulo": quiz.titulo,
            "nota_minima": quiz.nota_minima,
            "bloqueia_proxima": quiz.bloqueia_proxima,
            "aprovado": bool(tentativas_map.get(quiz.id)),
        }


class CursoDetalheAlunoSerializer(serializers.ModelSerializer):
    instrutor_nome = serializers.SerializerMethodField()
    modulos = serializers.SerializerMethodField()
    aulas_total = serializers.IntegerField(read_only=True)
    aulas_concluidas = serializers.IntegerField(read_only=True)
    progresso_pct = serializers.IntegerField(read_only=True)

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "descricao",
            "instrutor_nome",
            "modulos",
            "aulas_total",
            "aulas_concluidas",
            "progresso_pct",
        )

    def get_instrutor_nome(self, obj):
        if not obj.instrutor:
            return None
        return obj.instrutor.first_name or obj.instrutor.username

    def get_modulos(self, obj):
        data = []
        for m in obj.modulos.all():
            if not m.ativo:
                continue
            aulas = [a for a in m.aulas.all() if a.ativo]
            data.append(
                {
                    "id": m.id,
                    "titulo": m.titulo,
                    "ordem": m.ordem,
                    "aulas": AulaAlunoSerializer(
                        aulas, many=True, context=self.context
                    ).data,
                }
            )
        return data


class ModuloAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modulo
        fields = ("id", "curso", "titulo", "ordem", "ativo")
        read_only_fields = ("curso",)


class AulaAdminSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Aula
        fields = (
            "id",
            "modulo",
            "titulo",
            "descricao",
            "video",
            "video_url",
            "duracao_segundos",
            "ordem",
            "ativo",
        )
        read_only_fields = ("modulo",)
        extra_kwargs = {"video": {"required": False, "allow_null": True}}

    def get_video_url(self, obj):
        if not obj.video:
            return None
        request = self.context.get("request")
        url = obj.video.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate_video(self, value):
        _validar_video(value)
        return value


class CategoriaSerializer(serializers.ModelSerializer):
    icone_url = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = (
            "id",
            "titulo",
            "slug",
            "ordem",
            "ativo",
            "icone",
            "icone_url",
            "icone_key",
        )
        extra_kwargs = {
            "icone": {"required": False, "allow_null": True},
            "slug": {"required": False},
        }

    def get_icone_url(self, obj):
        return _file_url(obj.icone, self.context.get("request"))

    def validate_icone(self, value):
        _validar_icone(value)
        return value


class SubcategoriaSerializer(serializers.ModelSerializer):
    categoria_titulo = serializers.CharField(source="categoria.titulo", read_only=True)

    class Meta:
        model = Subcategoria
        fields = (
            "id",
            "categoria",
            "categoria_titulo",
            "titulo",
            "slug",
            "ordem",
            "ativo",
        )
        extra_kwargs = {"slug": {"required": False}}


class ConjuntoSerializer(serializers.ModelSerializer):
    curso_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Curso.objects.all(),
        source="cursos",
        required=False,
    )
    categoria_titulo = serializers.CharField(source="categoria.titulo", read_only=True)
    icone_url = serializers.SerializerMethodField()

    class Meta:
        model = Conjunto
        fields = (
            "id",
            "titulo",
            "descricao",
            "categoria",
            "categoria_titulo",
            "icone",
            "icone_url",
            "icone_key",
            "ordem",
            "ativo",
            "curso_ids",
        )
        extra_kwargs = {"icone": {"required": False, "allow_null": True}}

    def get_icone_url(self, obj):
        return _file_url(obj.icone, self.context.get("request"))

    def validate_icone(self, value):
        _validar_icone(value)
        return value

    def create(self, validated_data):
        cursos = validated_data.pop("cursos", [])
        conj = Conjunto.objects.create(**validated_data)
        self._sync_cursos(conj, cursos)
        return conj

    def update(self, instance, validated_data):
        cursos = validated_data.pop("cursos", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if cursos is not None:
            self._sync_cursos(instance, cursos)
        return instance

    def _sync_cursos(self, conjunto, cursos):
        ConjuntoCurso.objects.filter(conjunto=conjunto).delete()
        for i, curso in enumerate(cursos):
            ConjuntoCurso.objects.create(conjunto=conjunto, curso=curso, ordem=i)


class TicketSecretariaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()
    usuario_ra = serializers.SerializerMethodField()

    class Meta:
        model = TicketSecretaria
        fields = (
            "id",
            "usuario",
            "usuario_nome",
            "usuario_ra",
            "assunto",
            "mensagem",
            "status",
            "resposta",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("usuario", "criado_em", "atualizado_em")

    def get_usuario_nome(self, obj):
        return obj.usuario.first_name or obj.usuario.username

    def get_usuario_ra(self, obj):
        perfil = getattr(obj.usuario, "perfil", None)
        return getattr(perfil, "ra", None) if perfil else None


class TicketAlunoCreateSerializer(serializers.Serializer):
    assunto = serializers.CharField(max_length=160)
    mensagem = serializers.CharField()


class EstenderAtivacaoSerializer(serializers.Serializer):
    dias = serializers.IntegerField(required=False, min_value=1, max_value=3650)
    valido_ate = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if not attrs.get("dias") and not attrs.get("valido_ate"):
            raise serializers.ValidationError("Informe dias ou valido_ate.")
        return attrs


class UpgradeAtivacaoSerializer(serializers.Serializer):
    plano_id = serializers.PrimaryKeyRelatedField(
        queryset=Plano.objects.filter(ativo=True),
        source="plano",
    )


class ConjuntoAlunoSerializer(serializers.ModelSerializer):
    categoria_titulo = serializers.CharField(source="categoria.titulo", read_only=True)
    icone_url = serializers.SerializerMethodField()
    cursos = serializers.SerializerMethodField()

    class Meta:
        model = Conjunto
        fields = (
            "id",
            "titulo",
            "descricao",
            "categoria",
            "categoria_titulo",
            "icone_url",
            "icone_key",
            "ordem",
            "cursos",
        )

    def get_icone_url(self, obj):
        return _file_url(obj.icone, self.context.get("request"))

    def get_cursos(self, obj):
        liberados = self.context.get("liberados_ids") or set()
        request = self.context.get("request")
        out = []
        for cc in obj.conjunto_cursos.select_related(
            "curso", "curso__subcategoria", "curso__subcategoria__categoria"
        ).order_by("ordem", "id"):
            c = cc.curso
            if not c.ativo:
                continue
            out.append(
                {
                    "id": c.id,
                    "titulo": c.titulo,
                    "icone_url": _file_url(c.icone, request),
                    "icone_key": c.icone_key,
                    "capa_url": _file_url(c.capa, request),
                    "liberado": c.id in liberados,
                }
            )
        return out


class MaterialAulaSerializer(serializers.ModelSerializer):
    arquivo_url = serializers.SerializerMethodField()

    class Meta:
        model = MaterialAula
        fields = ("id", "aula", "titulo", "arquivo", "arquivo_url", "ordem", "ativo")
        read_only_fields = ("aula",)
        extra_kwargs = {"arquivo": {"required": False}}

    def get_arquivo_url(self, obj):
        return _file_url(obj.arquivo, self.context.get("request"))

    def validate_arquivo(self, value):
        if value is not None:
            _validar_material(value)
        return value


class AlternativaAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternativa
        fields = ("id", "pergunta", "texto", "correta", "ordem")
        read_only_fields = ("pergunta",)


class PerguntaAdminSerializer(serializers.ModelSerializer):
    alternativas = AlternativaAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Pergunta
        fields = ("id", "quiz", "enunciado", "ordem", "alternativas")
        read_only_fields = ("quiz",)


class QuizAdminSerializer(serializers.ModelSerializer):
    perguntas = PerguntaAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "aula",
            "titulo",
            "nota_minima",
            "bloqueia_proxima",
            "ativo",
            "perguntas",
        )
        read_only_fields = ("aula",)


class AlternativaAlunoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternativa
        fields = ("id", "texto", "ordem")


class PerguntaAlunoSerializer(serializers.ModelSerializer):
    alternativas = AlternativaAlunoSerializer(many=True, read_only=True)

    class Meta:
        model = Pergunta
        fields = ("id", "enunciado", "ordem", "alternativas")


class QuizAlunoSerializer(serializers.ModelSerializer):
    perguntas = PerguntaAlunoSerializer(many=True, read_only=True)
    aprovado = serializers.SerializerMethodField()
    ultima_nota = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = (
            "id",
            "titulo",
            "nota_minima",
            "bloqueia_proxima",
            "perguntas",
            "aprovado",
            "ultima_nota",
        )

    def get_aprovado(self, obj):
        mapa = self.context.get("quiz_aprovado_map") or {}
        return bool(mapa.get(obj.id))

    def get_ultima_nota(self, obj):
        mapa = self.context.get("quiz_nota_map") or {}
        return mapa.get(obj.id)


class SubmeterQuizSerializer(serializers.Serializer):
    respostas = serializers.ListField(
        child=serializers.DictField(), allow_empty=False
    )

    def validate_respostas(self, value):
        limpos = []
        for item in value:
            try:
                pergunta_id = int(item.get("pergunta_id"))
                alternativa_id = int(item.get("alternativa_id"))
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Cada resposta precisa de pergunta_id e alternativa_id."
                )
            limpos.append(
                {"pergunta_id": pergunta_id, "alternativa_id": alternativa_id}
            )
        return limpos


class TentativaQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = TentativaQuiz
        fields = ("id", "quiz", "nota", "aprovado", "criado_em")


class CertificadoSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source="curso.titulo", read_only=True)
    usuario_nome = serializers.SerializerMethodField()
    usuario_ra = serializers.SerializerMethodField()

    class Meta:
        model = Certificado
        fields = (
            "id",
            "usuario",
            "usuario_nome",
            "usuario_ra",
            "curso",
            "curso_titulo",
            "codigo",
            "emitido_em",
            "revogado",
        )

    def get_usuario_nome(self, obj):
        return obj.usuario.first_name or obj.usuario.username

    def get_usuario_ra(self, obj):
        perfil = getattr(obj.usuario, "perfil", None)
        return getattr(perfil, "ra", None) if perfil else None


class EmitirCertificadoSerializer(serializers.Serializer):
    curso_id = serializers.PrimaryKeyRelatedField(queryset=Curso.objects.filter(ativo=True))


class AlunoAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    is_active = serializers.BooleanField()
    ra = serializers.CharField(allow_null=True)
    ativacoes_vigentes = serializers.IntegerField()
    planos = serializers.ListField(child=serializers.CharField())
    progresso = serializers.ListField(child=serializers.DictField())
    certificados = serializers.ListField(child=serializers.DictField(), required=False)
