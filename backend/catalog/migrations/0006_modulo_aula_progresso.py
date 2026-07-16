import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0005_plano_beneficios"),
    ]

    operations = [
        migrations.CreateModel(
            name="Modulo",
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
                ("titulo", models.CharField(max_length=160, verbose_name="título")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                (
                    "curso",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="modulos",
                        to="catalog.curso",
                        verbose_name="curso",
                    ),
                ),
            ],
            options={
                "verbose_name": "módulo",
                "verbose_name_plural": "módulos",
                "ordering": ["ordem", "id"],
            },
        ),
        migrations.CreateModel(
            name="Aula",
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
                ("titulo", models.CharField(max_length=160, verbose_name="título")),
                (
                    "descricao",
                    models.TextField(blank=True, default="", verbose_name="descrição"),
                ),
                (
                    "video",
                    models.FileField(
                        blank=True,
                        help_text="Arquivo mp4 ou webm.",
                        null=True,
                        upload_to="aulas/",
                        verbose_name="vídeo",
                    ),
                ),
                (
                    "duracao_segundos",
                    models.PositiveIntegerField(
                        blank=True, null=True, verbose_name="duração (segundos)"
                    ),
                ),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                (
                    "modulo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="aulas",
                        to="catalog.modulo",
                        verbose_name="módulo",
                    ),
                ),
            ],
            options={
                "verbose_name": "aula",
                "verbose_name_plural": "aulas",
                "ordering": ["ordem", "id"],
            },
        ),
        migrations.CreateModel(
            name="ProgressoAula",
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
                    "concluida",
                    models.BooleanField(default=False, verbose_name="concluída"),
                ),
                (
                    "posicao_segundos",
                    models.PositiveIntegerField(
                        default=0, verbose_name="posição (segundos)"
                    ),
                ),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "aula",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="progressos",
                        to="catalog.aula",
                        verbose_name="aula",
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="progressos_aula",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuário",
                    ),
                ),
            ],
            options={
                "verbose_name": "progresso de aula",
                "verbose_name_plural": "progressos de aula",
                "ordering": ["-atualizado_em"],
                "unique_together": {("usuario", "aula")},
            },
        ),
    ]
