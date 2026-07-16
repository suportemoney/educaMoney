# Generated manually for P9

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0006_modulo_aula_progresso"),
    ]

    operations = [
        migrations.CreateModel(
            name="Categoria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=120, verbose_name="título")),
                ("slug", models.SlugField(max_length=140, unique=True, verbose_name="slug")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                ("icone", models.FileField(blank=True, null=True, upload_to="icones/", verbose_name="ícone")),
                ("icone_key", models.CharField(blank=True, default="", max_length=40, verbose_name="chave do ícone")),
            ],
            options={
                "verbose_name": "categoria",
                "verbose_name_plural": "categorias",
                "ordering": ["ordem", "titulo"],
            },
        ),
        migrations.CreateModel(
            name="Subcategoria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=120, verbose_name="título")),
                ("slug", models.SlugField(max_length=140, verbose_name="slug")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                (
                    "categoria",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subcategorias",
                        to="catalog.categoria",
                        verbose_name="categoria",
                    ),
                ),
            ],
            options={
                "verbose_name": "subcategoria",
                "verbose_name_plural": "subcategorias",
                "ordering": ["ordem", "titulo"],
                "unique_together": {("categoria", "slug")},
            },
        ),
        migrations.AddField(
            model_name="curso",
            name="icone",
            field=models.FileField(
                blank=True,
                help_text="Ícone do curso (png/webp/svg).",
                null=True,
                upload_to="icones/",
                verbose_name="ícone",
            ),
        ),
        migrations.AddField(
            model_name="curso",
            name="icone_key",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Fallback sem arquivo, ex.: wallet, chart, shield.",
                max_length=40,
                verbose_name="chave do ícone",
            ),
        ),
        migrations.AddField(
            model_name="curso",
            name="subcategoria",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cursos",
                to="catalog.subcategoria",
                verbose_name="subcategoria",
            ),
        ),
        migrations.CreateModel(
            name="Conjunto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=160, verbose_name="título")),
                ("descricao", models.TextField(blank=True, default="", verbose_name="descrição")),
                ("icone", models.FileField(blank=True, null=True, upload_to="icones/", verbose_name="ícone")),
                ("icone_key", models.CharField(blank=True, default="", max_length=40, verbose_name="chave do ícone")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                (
                    "categoria",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="conjuntos",
                        to="catalog.categoria",
                        verbose_name="categoria",
                    ),
                ),
            ],
            options={
                "verbose_name": "conjunto",
                "verbose_name_plural": "conjuntos",
                "ordering": ["ordem", "titulo"],
            },
        ),
        migrations.CreateModel(
            name="ConjuntoCurso",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                (
                    "conjunto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conjunto_cursos",
                        to="catalog.conjunto",
                    ),
                ),
                (
                    "curso",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="curso_conjuntos",
                        to="catalog.curso",
                    ),
                ),
            ],
            options={
                "verbose_name": "conjunto-curso",
                "verbose_name_plural": "conjuntos-cursos",
                "ordering": ["ordem", "id"],
                "unique_together": {("conjunto", "curso")},
            },
        ),
        migrations.AddField(
            model_name="conjunto",
            name="cursos",
            field=models.ManyToManyField(
                blank=True,
                related_name="conjuntos",
                through="catalog.ConjuntoCurso",
                to="catalog.curso",
                verbose_name="cursos",
            ),
        ),
        migrations.AddField(
            model_name="ativacao",
            name="valido_ate",
            field=models.DateTimeField(
                blank=True,
                help_text="Vazio = sem prazo de expiração.",
                null=True,
                verbose_name="válido até",
            ),
        ),
        migrations.AddField(
            model_name="ativacao",
            name="renovado_em",
            field=models.DateTimeField(blank=True, null=True, verbose_name="renovado em"),
        ),
        migrations.CreateModel(
            name="TicketSecretaria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("assunto", models.CharField(max_length=160, verbose_name="assunto")),
                ("mensagem", models.TextField(verbose_name="mensagem")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("aberto", "Aberto"),
                            ("em_andamento", "Em andamento"),
                            ("fechado", "Fechado"),
                        ],
                        default="aberto",
                        max_length=20,
                    ),
                ),
                ("resposta", models.TextField(blank=True, default="", verbose_name="resposta")),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tickets_secretaria",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="aluno",
                    ),
                ),
            ],
            options={
                "verbose_name": "ticket de secretaria",
                "verbose_name_plural": "tickets de secretaria",
                "ordering": ["-criado_em"],
            },
        ),
    ]
