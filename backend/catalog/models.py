from django.conf import settings
from django.db import models


class Plano(models.Model):
    nome = models.CharField("nome", max_length=120)
    descricao = models.TextField("descrição")
    preco_referencia = models.DecimalField(
        "preço referência", max_digits=10, decimal_places=2
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
    """Integrações externas (ex.: WhatsApp da landing)."""

    class Tipo(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"

    tipo = models.CharField(
        "tipo", max_length=20, choices=Tipo.choices, default=Tipo.WHATSAPP
    )
    telefone = models.CharField(
        "telefone",
        max_length=20,
        help_text="Formato +55 e número completo (DDD + celular).",
    )
    mensagem_template = models.TextField(
        "mensagem automática",
        default=MENSAGEM_WHATSAPP_PADRAO,
        help_text="Use variáveis entre chaves, ex.: {titulo_plano}, {valor_plano}.",
    )
    ativo = models.BooleanField("ativo", default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ativo", "-atualizado_em"]
        verbose_name = "integração"
        verbose_name_plural = "integrações"

    def __str__(self):
        return f"{self.get_tipo_display()} {self.telefone}"

    @classmethod
    def whatsapp_ativa(cls):
        return cls.objects.filter(tipo=cls.Tipo.WHATSAPP, ativo=True).first()

class TokenKey(models.Model):
    class Status(models.TextChoices):
        DISPONIVEL = "disponivel", "Disponível"
        USADO = "usado", "Usado"
        REVOGADO = "revogado", "Revogado"

    codigo = models.CharField("código", max_length=32, unique=True)
    plano = models.ForeignKey(
        Plano, on_delete=models.PROTECT, related_name="tokens", verbose_name="plano"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DISPONIVEL
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

    class Meta:
        ordering = ["-data_ativacao"]
        verbose_name = "ativação"
        verbose_name_plural = "ativações"

    def __str__(self):
        return f"{self.usuario} → {self.plano}"
