# Gerada manualmente para o scaffold P1 (sem manage.py no host).

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Plano",
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
                ("nome", models.CharField(max_length=120, verbose_name="nome")),
                ("descricao", models.TextField(verbose_name="descrição")),
                (
                    "preco_referencia",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        verbose_name="preço referência",
                    ),
                ),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
            ],
            options={
                "verbose_name": "plano",
                "verbose_name_plural": "planos",
                "ordering": ["ordem", "nome"],
            },
        ),
        migrations.CreateModel(
            name="Curso",
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
                ("descricao", models.TextField(verbose_name="descrição")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
            ],
            options={
                "verbose_name": "curso",
                "verbose_name_plural": "cursos",
                "ordering": ["ordem", "titulo"],
            },
        ),
    ]
