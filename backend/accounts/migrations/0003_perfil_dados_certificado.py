# Dados legais do aluno para emissão de certificado

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_perfil_ra"),
    ]

    operations = [
        migrations.AddField(
            model_name="perfil",
            name="cpf",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Somente dígitos.",
                max_length=11,
                verbose_name="CPF",
            ),
        ),
        migrations.AddField(
            model_name="perfil",
            name="data_nascimento",
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name="data de nascimento",
            ),
        ),
        migrations.AddField(
            model_name="perfil",
            name="documento_tipo",
            field=models.CharField(
                blank=True,
                choices=[
                    ("rg", "Carteira de identidade (RG)"),
                    ("cnh", "CNH"),
                    ("passaporte", "Passaporte"),
                ],
                default="",
                max_length=16,
                verbose_name="tipo de documento",
            ),
        ),
        migrations.AddField(
            model_name="perfil",
            name="documento_arquivo",
            field=models.FileField(
                blank=True,
                help_text="PDF do RG, CNH ou passaporte.",
                null=True,
                upload_to="documentos_aluno/",
                verbose_name="documento (PDF)",
            ),
        ),
    ]
