# Integração SMTP (e-mail) no mesmo modelo Integracao

from django.db import migrations, models


def seed_email_do_env(apps, schema_editor):
    """Se EMAIL_ENABLED=1 no ambiente, cria registro inicial (opcional)."""
    import os

    Integracao = apps.get_model("catalog", "Integracao")
    if Integracao.objects.filter(tipo="email").exists():
        return
    if os.environ.get("EMAIL_ENABLED", "0") != "1":
        return
    Integracao.objects.create(
        tipo="email",
        telefone="",
        mensagem_template="",
        email_host=os.environ.get("EMAIL_HOST", "") or "",
        email_port=int(os.environ.get("EMAIL_PORT", "587") or 587),
        email_usuario=os.environ.get("EMAIL_HOST_USER", "") or "",
        email_senha=os.environ.get("EMAIL_HOST_PASSWORD", "") or "",
        email_usar_tls=os.environ.get("EMAIL_USE_TLS", "1") == "1",
        email_remetente=os.environ.get(
            "DEFAULT_FROM_EMAIL", "EducaMoney <noreply@educamoney.local>"
        ),
        email_secretaria=os.environ.get("SECRETARIA_NOTIFY_EMAIL", "") or "",
        ativo=True,
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0010_conteudo_cascata_modulo_prova"),
    ]

    operations = [
        migrations.AlterField(
            model_name="integracao",
            name="tipo",
            field=models.CharField(
                choices=[("whatsapp", "WhatsApp"), ("email", "E-mail")],
                default="whatsapp",
                max_length=20,
                verbose_name="tipo",
            ),
        ),
        migrations.AlterField(
            model_name="integracao",
            name="telefone",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Formato +55 e número completo (DDD + celular).",
                max_length=20,
                verbose_name="telefone",
            ),
        ),
        migrations.AlterField(
            model_name="integracao",
            name="mensagem_template",
            field=models.TextField(
                blank=True,
                default=(
                    "Olá! Vim pelo site de vocês da EducaMoney e quero adquirir o plano "
                    "{titulo_plano} de {valor_plano}. Pode me dar mais informações sobre?"
                ),
                help_text="Use variáveis entre chaves, ex.: {titulo_plano}, {valor_plano}.",
                verbose_name="mensagem automática",
            ),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_host",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="servidor SMTP"
            ),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_port",
            field=models.PositiveIntegerField(default=587, verbose_name="porta SMTP"),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_usuario",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="usuário SMTP"
            ),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_senha",
            field=models.CharField(
                blank=True, default="", max_length=255, verbose_name="senha SMTP"
            ),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_usar_tls",
            field=models.BooleanField(default=True, verbose_name="usar TLS"),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_remetente",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Ex.: EducaMoney <noreply@seudominio.com>",
                max_length=255,
                verbose_name="e-mail remetente",
            ),
        ),
        migrations.AddField(
            model_name="integracao",
            name="email_secretaria",
            field=models.EmailField(
                blank=True,
                default="",
                help_text="Recebe aviso quando o aluno abre um ticket.",
                max_length=254,
                verbose_name="e-mail da secretaria",
            ),
        ),
        migrations.RunPython(seed_email_do_env, noop_reverse),
    ]
