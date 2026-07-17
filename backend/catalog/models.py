from django.conf import settings
from django.db import models


class Plano(models.Model):
    nome = models.CharField("nome", max_length=120)
    descricao = models.TextField("descrição")
    preco_referencia = models.DecimalField(
        "preço referência", max_digits=10, decimal_places=2
    )
    # Lista de benefícios exibida nos cards da landing / painel
    beneficios = models.JSONField(
        "benefícios",
        default=list,
        blank=True,
        help_text="Lista de strings: o que o cliente recebe neste plano.",
    )
    # Dias de validade ao ativar o plano via token
    duracao_dias = models.PositiveIntegerField(
        "duração (dias)",
        default=365,
        help_text="Usado para calcular valido_ate na ativação.",
    )
    ativo = models.BooleanField("ativo", default=True)
    ordem = models.PositiveIntegerField("ordem", default=0)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "plano"
        verbose_name_plural = "planos"

    def __str__(self):
        return self.nome


class Curso(models.Model):
    titulo = models.CharField("título", max_length=160)
    descricao = models.TextField("descrição")
    ativo = models.BooleanField("ativo", default=True)
    ordem = models.PositiveIntegerField("ordem", default=0)
    icone = models.FileField(
        "ícone",
        upload_to="icones/",
        blank=True,
        null=True,
        help_text="Ícone do curso (png/webp/svg).",
    )
    capa = models.ImageField(
        "capa",
        upload_to="capas/",
        blank=True,
        null=True,
        help_text="Imagem de capa do curso (jpg/png/webp).",
    )
    icone_key = models.CharField(
        "chave do ícone",
        max_length=40,
        blank=True,
        default="",
        help_text="Fallback sem arquivo, ex.: wallet, chart, shield.",
    )
    subcategoria = models.ForeignKey(
        "Subcategoria",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cursos",
        verbose_name="subcategoria",
    )
    instrutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cursos_lecionados",
        verbose_name="instrutor",
        limit_choices_to={"perfil__papel": "instrutor"},
    )
    planos = models.ManyToManyField(
        Plano,
        through="PlanoCurso",
        related_name="cursos",
        blank=True,
        verbose_name="planos",
    )

    class Meta:
        ordering = ["ordem", "titulo"]
        verbose_name = "curso"
        verbose_name_plural = "cursos"

    def __str__(self):
        return self.titulo


class Categoria(models.Model):
    titulo = models.CharField("título", max_length=120)
    slug = models.SlugField("slug", max_length=140, unique=True)
    ordem = models.PositiveIntegerField("ordem", default=0)
    ativo = models.BooleanField("ativo", default=True)
    icone = models.FileField(
        "ícone", upload_to="icones/", blank=True, null=True
    )
    icone_key = models.CharField("chave do ícone", max_length=40, blank=True, default="")

    class Meta:
        ordering = ["ordem", "titulo"]
        verbose_name = "categoria"
        verbose_name_plural = "categorias"

    def __str__(self):
        return self.titulo


class Subcategoria(models.Model):
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.CASCADE,
        related_name="subcategorias",
        verbose_name="categoria",
    )
    titulo = models.CharField("título", max_length=120)
    slug = models.SlugField("slug", max_length=140)
    ordem = models.PositiveIntegerField("ordem", default=0)
    ativo = models.BooleanField("ativo", default=True)

    class Meta:
        ordering = ["ordem", "titulo"]
        verbose_name = "subcategoria"
        verbose_name_plural = "subcategorias"
        unique_together = ("categoria", "slug")

    def __str__(self):
        return f"{self.categoria} / {self.titulo}"


class Conjunto(models.Model):
    """Trilha/curadoria — não libera acesso sozinho (Plano continua sendo o gate)."""

    titulo = models.CharField("título", max_length=160)
    descricao = models.TextField("descrição", blank=True, default="")
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name="conjuntos",
        verbose_name="categoria",
    )
    icone = models.FileField(
        "ícone", upload_to="icones/", blank=True, null=True
    )
    icone_key = models.CharField("chave do ícone", max_length=40, blank=True, default="")
    ordem = models.PositiveIntegerField("ordem", default=0)
    ativo = models.BooleanField("ativo", default=True)
    cursos = models.ManyToManyField(
        Curso,
        through="ConjuntoCurso",
        related_name="conjuntos",
        blank=True,
        verbose_name="cursos",
    )

    class Meta:
        ordering = ["ordem", "titulo"]
        verbose_name = "conjunto"
        verbose_name_plural = "conjuntos"

    def __str__(self):
        return self.titulo


class ConjuntoCurso(models.Model):
    conjunto = models.ForeignKey(
        Conjunto, on_delete=models.CASCADE, related_name="conjunto_cursos"
    )
    curso = models.ForeignKey(
        Curso, on_delete=models.CASCADE, related_name="curso_conjuntos"
    )
    ordem = models.PositiveIntegerField("ordem", default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "conjunto-curso"
        verbose_name_plural = "conjuntos-cursos"
        unique_together = ("conjunto", "curso")

    def __str__(self):
        return f"{self.conjunto} ↔ {self.curso}"


class PlanoCurso(models.Model):
    plano = models.ForeignKey(Plano, on_delete=models.CASCADE, related_name="plano_cursos")
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name="curso_planos")
    ordem = models.PositiveIntegerField("ordem", default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "plano-curso"
        verbose_name_plural = "planos-cursos"
        unique_together = ("plano", "curso")

    def __str__(self):
        return f"{self.plano} ↔ {self.curso}"


class ConfigSistema(models.Model):
    """Nome do site e demais ajustes globais (singleton)."""

    nome_site = models.CharField("nome do site", max_length=120, default="EducaMoney")
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "configuração do sistema"
        verbose_name_plural = "configurações do sistema"

    def __str__(self):
        return self.nome_site

    @classmethod
    def obter(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


MENSAGEM_WHATSAPP_PADRAO = (
    "Olá! Vim pelo site de vocês da EducaMoney e quero adquirir o plano "
    "{titulo_plano} de {valor_plano}. Pode me dar mais informações sobre?"
)


class Integracao(models.Model):
    """Integrações externas (WhatsApp da landing / SMTP de e-mail)."""

    class Tipo(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"
        EMAIL = "email", "E-mail"

    tipo = models.CharField(
        "tipo", max_length=20, choices=Tipo.choices, default=Tipo.WHATSAPP
    )
    # WhatsApp
    telefone = models.CharField(
        "telefone",
        max_length=20,
        blank=True,
        default="",
        help_text="Formato +55 e número completo (DDD + celular).",
    )
    mensagem_template = models.TextField(
        "mensagem automática",
        blank=True,
        default=MENSAGEM_WHATSAPP_PADRAO,
        help_text="Use variáveis entre chaves, ex.: {titulo_plano}, {valor_plano}.",
    )
    # SMTP (tipo e-mail)
    email_host = models.CharField(
        "servidor SMTP", max_length=255, blank=True, default=""
    )
    email_port = models.PositiveIntegerField("porta SMTP", default=587)
    email_usuario = models.CharField(
        "usuário SMTP", max_length=255, blank=True, default=""
    )
    email_senha = models.CharField(
        "senha SMTP", max_length=255, blank=True, default=""
    )
    email_usar_tls = models.BooleanField("usar TLS", default=True)
    email_remetente = models.CharField(
        "e-mail remetente",
        max_length=255,
        blank=True,
        default="",
        help_text="Ex.: EducaMoney <noreply@seudominio.com>",
    )
    email_secretaria = models.EmailField(
        "e-mail da secretaria",
        blank=True,
        default="",
        help_text="Recebe aviso quando o aluno abre um ticket.",
    )
    ativo = models.BooleanField("ativo", default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ativo", "-atualizado_em"]
        verbose_name = "integração"
        verbose_name_plural = "integrações"

    def __str__(self):
        if self.tipo == self.Tipo.EMAIL:
            return f"E-mail {self.email_remetente or self.email_host}"
        return f"{self.get_tipo_display()} {self.telefone}"

    @classmethod
    def whatsapp_ativa(cls):
        return cls.objects.filter(tipo=cls.Tipo.WHATSAPP, ativo=True).first()

    @classmethod
    def email_ativa(cls):
        return cls.objects.filter(tipo=cls.Tipo.EMAIL, ativo=True).first()

class TokenKey(models.Model):
    class Status(models.TextChoices):
        DISPONIVEL = "disponivel", "Disponível"
        USADO = "usado", "Usado"
        REVOGADO = "revogado", "Revogado"

    class Origem(models.TextChoices):
        GERADO = "gerado", "Gerado"
        UPGRADE = "upgrade", "Upgrade"

    codigo = models.CharField("código", max_length=32, unique=True)
    plano = models.ForeignKey(
        Plano, on_delete=models.PROTECT, related_name="tokens", verbose_name="plano"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DISPONIVEL
    )
    origem = models.CharField(
        max_length=20,
        choices=Origem.choices,
        default=Origem.GERADO,
        help_text="Como o token foi criado (manual ou upgrade de plano).",
    )
    valor_proporcional = models.DecimalField(
        "valor proporcional",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor diferencial cobrado em upgrade; vazio = token de preço cheio.",
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="tokens_criados",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    usado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tokens_usados",
        verbose_name="usado por",
    )
    usado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "token-key"
        verbose_name_plural = "token-keys"

    def __str__(self):
        return self.codigo


class Ativacao(models.Model):
    """Registro de ativação de plano via token-key."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ativacoes",
        verbose_name="usuário",
    )
    plano = models.ForeignKey(
        Plano,
        on_delete=models.PROTECT,
        related_name="ativacoes",
        verbose_name="plano",
    )
    token_key = models.OneToOneField(
        TokenKey,
        on_delete=models.PROTECT,
        related_name="ativacao",
        verbose_name="token",
    )
    data_ativacao = models.DateTimeField(auto_now_add=True)
    ativo = models.BooleanField(default=True)
    valido_ate = models.DateTimeField(
        "válido até",
        null=True,
        blank=True,
        help_text="Vazio = sem prazo de expiração.",
    )
    renovado_em = models.DateTimeField("renovado em", null=True, blank=True)

    class Meta:
        ordering = ["-data_ativacao"]
        verbose_name = "ativação"
        verbose_name_plural = "ativações"

    def __str__(self):
        return f"{self.usuario} → {self.plano}"


class TicketSecretaria(models.Model):
    class Status(models.TextChoices):
        ABERTO = "aberto", "Aberto"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        FECHADO = "fechado", "Fechado"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tickets_secretaria",
        verbose_name="aluno",
    )
    assunto = models.CharField("assunto", max_length=160)
    mensagem = models.TextField("mensagem")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ABERTO
    )
    resposta = models.TextField("resposta", blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "ticket de secretaria"
        verbose_name_plural = "tickets de secretaria"

    def __str__(self):
        return f"{self.assunto} ({self.status})"


class Modulo(models.Model):
    curso = models.ForeignKey(
        Curso, on_delete=models.CASCADE, related_name="modulos", verbose_name="curso"
    )
    titulo = models.CharField("título", max_length=160)
    ordem = models.PositiveIntegerField("ordem", default=0)
    ativo = models.BooleanField("ativo", default=True)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "módulo"
        verbose_name_plural = "módulos"

    def __str__(self):
        return f"{self.curso}: {self.titulo}"


class Aula(models.Model):
    modulo = models.ForeignKey(
        Modulo, on_delete=models.CASCADE, related_name="aulas", verbose_name="módulo"
    )
    titulo = models.CharField("título", max_length=160)
    descricao = models.TextField("descrição", blank=True, default="")
    video = models.FileField(
        "vídeo",
        upload_to="aulas/",
        blank=True,
        null=True,
        help_text="Arquivo mp4 ou webm.",
    )
    duracao_segundos = models.PositiveIntegerField(
        "duração (segundos)", null=True, blank=True
    )
    ordem = models.PositiveIntegerField("ordem", default=0)
    ativo = models.BooleanField("ativo", default=True)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "aula"
        verbose_name_plural = "aulas"

    def __str__(self):
        return self.titulo


class ProgressoAula(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="progressos_aula",
        verbose_name="usuário",
    )
    aula = models.ForeignKey(
        Aula,
        on_delete=models.CASCADE,
        related_name="progressos",
        verbose_name="aula",
    )
    concluida = models.BooleanField("concluída", default=False)
    posicao_segundos = models.PositiveIntegerField("posição (segundos)", default=0)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-atualizado_em"]
        verbose_name = "progresso de aula"
        verbose_name_plural = "progressos de aula"
        unique_together = ("usuario", "aula")

    def __str__(self):
        return f"{self.usuario} → {self.aula}"


class MaterialAula(models.Model):
    """PDF/imagem/zip de apoio — vinculado ao módulo (cascata do painel)."""

    modulo = models.ForeignKey(
        "Modulo",
        on_delete=models.CASCADE,
        related_name="materiais",
        verbose_name="módulo",
        null=True,
        blank=True,
    )
    # Legado: materiais antigos ligados à aula; preferir modulo
    aula = models.ForeignKey(
        Aula,
        on_delete=models.CASCADE,
        related_name="materiais",
        verbose_name="aula",
        null=True,
        blank=True,
    )
    titulo = models.CharField("título", max_length=160)
    arquivo = models.FileField("arquivo", upload_to="materiais/")
    ordem = models.PositiveIntegerField("ordem", default=0)
    ativo = models.BooleanField("ativo", default=True)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "material"
        verbose_name_plural = "materiais"

    def __str__(self):
        return self.titulo


class Quiz(models.Model):
    """Atividade de módulo, prova do curso ou quiz legado de aula."""

    class Tipo(models.TextChoices):
        ATIVIDADE = "atividade", "Atividade do módulo"
        PROVA_CURSO = "prova_curso", "Prova avaliadora do curso"
        QUIZ_AULA = "quiz_aula", "Quiz de aula (legado)"

    aula = models.OneToOneField(
        Aula,
        on_delete=models.CASCADE,
        related_name="quiz",
        verbose_name="aula",
        null=True,
        blank=True,
    )
    modulo = models.ForeignKey(
        "Modulo",
        on_delete=models.CASCADE,
        related_name="atividades",
        verbose_name="módulo",
        null=True,
        blank=True,
    )
    curso = models.OneToOneField(
        Curso,
        on_delete=models.CASCADE,
        related_name="prova_avaliadora",
        verbose_name="curso (prova)",
        null=True,
        blank=True,
    )
    tipo = models.CharField(
        max_length=20,
        choices=Tipo.choices,
        default=Tipo.QUIZ_AULA,
    )
    titulo = models.CharField("título", max_length=160)
    nota_minima = models.PositiveIntegerField(
        "nota mínima (%)",
        default=70,
        help_text="Percentual mínimo para aprovação (0–100).",
    )
    bloqueia_proxima = models.BooleanField(
        "bloqueia próxima aula",
        default=False,
        help_text="Se ativo, exige aprovação para avançar (quiz de aula).",
    )
    ativo = models.BooleanField("ativo", default=True)

    class Meta:
        verbose_name = "quiz"
        verbose_name_plural = "quizzes"

    def __str__(self):
        return self.titulo


class Pergunta(models.Model):
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="perguntas", verbose_name="quiz"
    )
    enunciado = models.TextField("enunciado")
    ordem = models.PositiveIntegerField("ordem", default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "pergunta"
        verbose_name_plural = "perguntas"

    def __str__(self):
        return self.enunciado[:60]


class Alternativa(models.Model):
    pergunta = models.ForeignKey(
        Pergunta,
        on_delete=models.CASCADE,
        related_name="alternativas",
        verbose_name="pergunta",
    )
    texto = models.CharField("texto", max_length=400)
    correta = models.BooleanField("correta", default=False)
    ordem = models.PositiveIntegerField("ordem", default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "alternativa"
        verbose_name_plural = "alternativas"

    def __str__(self):
        return self.texto[:60]


class TentativaQuiz(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tentativas_quiz",
        verbose_name="usuário",
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="tentativas",
        verbose_name="quiz",
    )
    nota = models.PositiveIntegerField("nota (%)", default=0)
    aprovado = models.BooleanField("aprovado", default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "tentativa de quiz"
        verbose_name_plural = "tentativas de quiz"

    def __str__(self):
        return f"{self.usuario} → {self.quiz} ({self.nota}%)"


class RespostaAluno(models.Model):
    tentativa = models.ForeignKey(
        TentativaQuiz,
        on_delete=models.CASCADE,
        related_name="respostas",
        verbose_name="tentativa",
    )
    pergunta = models.ForeignKey(
        Pergunta,
        on_delete=models.CASCADE,
        related_name="respostas_aluno",
        verbose_name="pergunta",
    )
    alternativa = models.ForeignKey(
        Alternativa,
        on_delete=models.CASCADE,
        related_name="respostas_aluno",
        verbose_name="alternativa",
    )

    class Meta:
        verbose_name = "resposta do aluno"
        verbose_name_plural = "respostas do aluno"
        unique_together = ("tentativa", "pergunta")

    def __str__(self):
        return f"{self.tentativa_id}:{self.pergunta_id}"


class Certificado(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificados",
        verbose_name="aluno",
    )
    curso = models.ForeignKey(
        Curso,
        on_delete=models.PROTECT,
        related_name="certificados",
        verbose_name="curso",
    )
    codigo = models.CharField("código", max_length=32, unique=True)
    emitido_em = models.DateTimeField(auto_now_add=True)
    revogado = models.BooleanField("revogado", default=False)
    # HTML imprimível (sem dependência de PDF)
    html = models.TextField("html", blank=True, default="")

    class Meta:
        ordering = ["-emitido_em"]
        verbose_name = "certificado"
        verbose_name_plural = "certificados"
        unique_together = ("usuario", "curso")

    def __str__(self):
        return self.codigo
