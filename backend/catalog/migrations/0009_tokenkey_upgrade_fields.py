from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0008_p11_p14_lms"),
    ]

    operations = [
        migrations.AddField(
            model_name="tokenkey",
            name="origem",
            field=models.CharField(
                choices=[("gerado", "Gerado"), ("upgrade", "Upgrade")],
                default="gerado",
                help_text="Como o token foi criado (manual ou upgrade de plano).",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="tokenkey",
            name="valor_proporcional",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Valor diferencial cobrado em upgrade; vazio = token de preço cheio.",
                max_digits=10,
                null=True,
                verbose_name="valor proporcional",
            ),
        ),
    ]
