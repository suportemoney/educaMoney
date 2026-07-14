# Migration manual P4 — modelo Perfil

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Perfil",
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
                    "papel",
                    models.CharField(
                        choices=[
                            ("administrador", "Administrador"),
                            ("gestor", "Gestor"),
                            ("pr", "PR"),
                            ("instrutor", "Instrutor/Professor"),
                            ("merchant", "Merchant"),
                            ("aluno", "Aluno"),
                        ],
                        default="aluno",
                        max_length=32,
                        verbose_name="papel",
                    ),
                ),
                (
                    "foto",
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to="perfis/",
                        verbose_name="foto",
                    ),
                ),
                (
                    "bio",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=255,
                        verbose_name="bio",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="perfil",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuário",
                    ),
                ),
            ],
            options={
                "verbose_name": "perfil",
                "verbose_name_plural": "perfis",
            },
        ),
    ]
