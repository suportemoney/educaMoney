from django.conf import settings
from django.db import models


class Perfil(models.Model):
    """Perfil estendido do usuário (papel, foto e dados legais do aluno)."""

    class Papel(models.TextChoices):
        ADMINISTRADOR = "administrador", "Administrador"
        GESTOR = "gestor", "Gestor"
        PR = "pr", "PR"
        INSTRUTOR = "instrutor", "Instrutor/Professor"
        MERCHANT = "merchant", "Merchant"
        ALUNO = "aluno", "Aluno"

    class DocumentoTipo(models.TextChoices):
        # Documentos civis aceitos para identificar o aluno no certificado
        RG = "rg", "Carteira de identidade (RG)"
        CNH = "cnh", "CNH"
        PASSAPORTE = "passaporte", "Passaporte"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
        verbose_name="usuário",
    )
    papel = models.CharField(
        "papel",
        max_length=32,
        choices=Papel.choices,
        default=Papel.ALUNO,
    )
    foto = models.FileField(
        "foto",
        upload_to="perfis/",
        blank=True,
        null=True,
    )
    bio = models.CharField("bio", max_length=255, blank=True, default="")
    ra = models.CharField(
        "RA",
        max_length=16,
        unique=True,
        null=True,
        blank=True,
        help_text="Registro do aluno (EM + ano + sequencial).",
    )
    # Dados exigidos para emissão legal de certificado de conclusão
    cpf = models.CharField(
        "CPF",
        max_length=11,
        blank=True,
        null=True,
        unique=True,
        default=None,
        help_text="Somente dígitos; vazio = NULL.",
    )
    data_nascimento = models.DateField(
        "data de nascimento",
        null=True,
        blank=True,
    )
    documento_tipo = models.CharField(
        "tipo de documento",
        max_length=16,
        choices=DocumentoTipo.choices,
        blank=True,
        default="",
    )
    documento_arquivo = models.FileField(
        "documento (PDF)",
        upload_to="documentos_aluno/",
        blank=True,
        null=True,
        help_text="PDF do RG, CNH ou passaporte.",
    )

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"{self.user.username} ({self.papel})"

    @property
    def eh_staff_painel(self) -> bool:
        return self.papel != self.Papel.ALUNO or self.user.is_superuser

    @property
    def eh_aluno(self) -> bool:
        return self.papel == self.Papel.ALUNO and not self.user.is_superuser

    def dados_certificado_completos(self) -> bool:
        """Nome, CPF, nascimento e PDF de identidade — mínimos para emitir certificado."""
        nome = (self.user.first_name or "").strip()
        return bool(
            nome
            and self.cpf
            and len(self.cpf) == 11
            and self.data_nascimento
            and self.documento_tipo
            and self.documento_arquivo
        )