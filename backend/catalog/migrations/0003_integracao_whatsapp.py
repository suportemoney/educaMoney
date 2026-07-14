# Integração WhatsApp (telefone + template) — remove whatsapp_url de ConfigSistema

import re

from django.db import migrations, models


MENSAGEM_PADRAO = (
    "Olá! Vim pelo site de vocês da EducaMoney e quero adquirir o plano "
    "{titulo_plano} de {valor_plano}. Pode me dar mais informações sobre?"
)


def _telefone_de_url(url: str) -> str:
    if not url:
        return ""
    # Extrai dígitos de wa.me/5511... ou similar
    digits = re.sub(r"\D", "", url.split("?")[0])
    if digits.startswith("55") and len(digits) >= 12:
        return f"+{digits}"
    if len(digits) >= 10:
        return f"+55{digits}"
    return ""


def migrar_whatsapp(apps, schema_editor):
    ConfigSistema = apps.get_model("catalog", "ConfigSistema")
    Integracao = apps.get_model("catalog", "Integracao")
    cfg = ConfigSistema.objects.filter(pk=1).first()
    url = getattr(cfg, "whatsapp_url", "") if cfg else ""
    telefone = _telefone_de_url(url) or "+5500000000000"
    if not Integracao.objects.filter(tipo="whatsapp").exists():
        Integracao.objects.create(
            tipo="whatsapp",
            telefone=telefone,
            mensagem_template=MENSAGEM_PADRAO,
            ativo=True,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_p5_catalog_extras"),
    ]

    operations = [
        migrations.CreateModel(
            name="Integracao",
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
                    "tipo",
                    models.CharField(
                        choices=[("whatsapp", "WhatsApp")],
                        default="whatsapp",
                        max_length=20,
                        verbose_name="tipo",
                    ),
                ),
                (
                    "telefone",
                    models.CharField(
                        help_text="Formato +55 e número completo (DDD + celular).",
                        max_length=20,
                        verbose_name="telefone",
                    ),
                ),
                (
                    "mensagem_template",
                    models.TextField(
                        default=MENSAGEM_PADRAO,
                        help_text="Use variáveis entre chaves, ex.: {titulo_plano}, {valor_plano}.",
                        verbose_name="mensagem automática",
                    ),
                ),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "integração",
                "verbose_name_plural": "integrações",
                "ordering": ["-ativo", "-atualizado_em"],
            },
        ),
        migrations.RunPython(migrar_whatsapp, noop_reverse),
        migrations.RemoveField(
            model_name="configsistema",
            name="whatsapp_url",
        ),
    ]
