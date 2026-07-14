# P5 — PlanoCurso, instrutor, ConfigSistema, TokenKey

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="curso",
            name="instrutor",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"perfil__papel": "instrutor"},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cursos_lecionados",
                to=settings.AUTH_USER_MODEL,
                verbose_name="instrutor",
            ),
        ),
        migrations.CreateModel(
            name="ConfigSistema",
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
                    "nome_site",
                    models.CharField(
                        default="EducaMoney",
                        max_length=120,
                        verbose_name="nome do site",
                    ),
                ),
                (
                    "whatsapp_url",
                    models.URLField(
                        blank=True, default="", verbose_name="URL WhatsApp"
                    ),
                ),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "configuração do sistema",
                "verbose_name_plural": "configurações do sistema",
            },
        ),
        migrations.CreateModel(
            name="PlanoCurso",
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
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                (
                    "curso",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="curso_planos",
                        to="catalog.curso",
                    ),
                ),
                (
                    "plano",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plano_cursos",
                        to="catalog.plano",
                    ),
                ),
            ],
            options={
                "verbose_name": "plano-curso",
                "verbose_name_plural": "planos-cursos",
                "ordering": ["ordem", "id"],
                "unique_together": {("plano", "curso")},
            },
        ),
        migrations.AddField(
            model_name="curso",
            name="planos",
            field=models.ManyToManyField(
                blank=True,
                related_name="cursos",
                through="catalog.PlanoCurso",
                to="catalog.plano",
                verbose_name="planos",
            ),
        ),
        migrations.CreateModel(
            name="TokenKey",
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
                ("codigo", models.CharField(max_length=32, unique=True, verbose_name="código")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("disponivel", "Disponível"),
                            ("usado", "Usado"),
                            ("revogado", "Revogado"),
                        ],
                        default="disponivel",
                        max_length=20,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("usado_em", models.DateTimeField(blank=True, null=True)),
                (
                    "criado_por",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="tokens_criados",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "plano",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="tokens",
                        to="catalog.plano",
                        verbose_name="plano",
                    ),
                ),
            ],
            options={
                "verbose_name": "token-key",
                "verbose_name_plural": "token-keys",
                "ordering": ["-criado_em"],
            },
        ),
    ]
