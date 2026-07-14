# P6 — Ativacao + TokenKey.usado_por

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0003_integracao_whatsapp"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="tokenkey",
            name="usado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tokens_usados",
                to=settings.AUTH_USER_MODEL,
                verbose_name="usado por",
            ),
        ),
        migrations.CreateModel(
            name="Ativacao",
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
                ("data_ativacao", models.DateTimeField(auto_now_add=True)),
                ("ativo", models.BooleanField(default=True)),
                (
                    "plano",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="ativacoes",
                        to="catalog.plano",
                        verbose_name="plano",
                    ),
                ),
                (
                    "token_key",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="ativacao",
                        to="catalog.tokenkey",
                        verbose_name="token",
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ativacoes",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuário",
                    ),
                ),
            ],
            options={
                "verbose_name": "ativação",
                "verbose_name_plural": "ativações",
                "ordering": ["-data_ativacao"],
            },
        ),
    ]
