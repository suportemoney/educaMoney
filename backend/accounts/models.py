from django.conf import settings
from django.db import models


class Perfil(models.Model):
    """Perfil estendido do usuário (papel e foto)."""

    class Papel(models.TextChoices):
        ADMINISTRADOR = "administrador", "Administrador"
        GESTOR = "gestor", "Gestor"
        PR = "pr", "PR"
        INSTRUTOR = "instrutor", "Instrutor/Professor"
        MERCHANT = "merchant", "Merchant"
        ALUNO = "aluno", "Aluno"

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

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"{self.user.username} ({self.papel})"

    @property
    def eh_staff_painel(self) -> bool:
        return self.papel != self.Papel.ALUNO or self.user.is_superuser
