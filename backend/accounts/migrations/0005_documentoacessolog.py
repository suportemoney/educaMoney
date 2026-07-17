# Log de acesso ao PDF de identidade do aluno

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_perfil_cpf_unique"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentoAcessoLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "origem",
                    models.CharField(
                        choices=[("portal", "Portal"), ("admin", "Painel")],
                        max_length=16,
                        verbose_name="origem",
                    ),
                ),
                (
                    "criado_em",
                    models.DateTimeField(auto_now_add=True, verbose_name="criado em"),
                ),
                (
                    "aluno",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="documentos_acessados",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="aluno",
                    ),
                ),
                (
                    "visualizador",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="documentos_visualizados",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="visualizador",
                    ),
                ),
            ],
            options={
                "verbose_name": "acesso a documento",
                "verbose_name_plural": "acessos a documentos",
                "ordering": ("-criado_em",),
            },
        ),
    ]
