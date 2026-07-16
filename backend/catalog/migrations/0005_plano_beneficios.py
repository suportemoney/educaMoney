# Benefícios por plano (landing + admin)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0004_ativacao_usado_por"),
    ]

    operations = [
        migrations.AddField(
            model_name="plano",
            name="beneficios",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Lista de strings: o que o cliente recebe neste plano.",
                verbose_name="benefícios",
            ),
        ),
    ]
