# P11–P14: conteúdo rico, quizzes e certificados

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0007_p9_catalogo_conjuntos"),
    ]

    operations = [
        migrations.AddField(
            model_name="plano",
            name="duracao_dias",
            field=models.PositiveIntegerField(
                default=365,
                help_text="Usado para calcular valido_ate na ativação.",
                verbose_name="duração (dias)",
            ),
        ),
        migrations.AddField(
            model_name="curso",
            name="capa",
            field=models.ImageField(
                blank=True,
                help_text="Imagem de capa do curso (jpg/png/webp).",
                null=True,
                upload_to="capas/",
                verbose_name="capa",
            ),
        ),
        migrations.CreateModel(
            name="MaterialAula",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=160, verbose_name="título")),
                ("arquivo", models.FileField(upload_to="materiais/", verbose_name="arquivo")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                (
                    "aula",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="materiais",
                        to="catalog.aula",
                        verbose_name="aula",
                    ),
                ),
            ],
            options={
                "verbose_name": "material de aula",
                "verbose_name_plural": "materiais de aula",
                "ordering": ["ordem", "id"],
            },
        ),
        migrations.CreateModel(
            name="Quiz",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=160, verbose_name="título")),
                (
                    "nota_minima",
                    models.PositiveIntegerField(
                        default=70,
                        help_text="Percentual mínimo para aprovação (0–100).",
                        verbose_name="nota mínima (%)",
                    ),
                ),
                (
                    "bloqueia_proxima",
                    models.BooleanField(
                        default=False,
                        help_text="Se ativo, exige aprovação para avançar.",
                        verbose_name="bloqueia próxima aula",
                    ),
                ),
                ("ativo", models.BooleanField(default=True, verbose_name="ativo")),
                (
                    "aula",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="quiz",
                        to="catalog.aula",
                        verbose_name="aula",
                    ),
                ),
            ],
            options={
                "verbose_name": "quiz",
                "verbose_name_plural": "quizzes",
            },
        ),
        migrations.CreateModel(
            name="Pergunta",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("enunciado", models.TextField(verbose_name="enunciado")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                (
                    "quiz",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="perguntas",
                        to="catalog.quiz",
                        verbose_name="quiz",
                    ),
                ),
            ],
            options={
                "verbose_name": "pergunta",
                "verbose_name_plural": "perguntas",
                "ordering": ["ordem", "id"],
            },
        ),
        migrations.CreateModel(
            name="Alternativa",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("texto", models.CharField(max_length=400, verbose_name="texto")),
                ("correta", models.BooleanField(default=False, verbose_name="correta")),
                ("ordem", models.PositiveIntegerField(default=0, verbose_name="ordem")),
                (
                    "pergunta",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alternativas",
                        to="catalog.pergunta",
                        verbose_name="pergunta",
                    ),
                ),
            ],
            options={
                "verbose_name": "alternativa",
                "verbose_name_plural": "alternativas",
                "ordering": ["ordem", "id"],
            },
        ),
        migrations.CreateModel(
            name="TentativaQuiz",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nota", models.PositiveIntegerField(default=0, verbose_name="nota (%)")),
                ("aprovado", models.BooleanField(default=False, verbose_name="aprovado")),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                (
                    "quiz",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tentativas",
                        to="catalog.quiz",
                        verbose_name="quiz",
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tentativas_quiz",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuário",
                    ),
                ),
            ],
            options={
                "verbose_name": "tentativa de quiz",
                "verbose_name_plural": "tentativas de quiz",
                "ordering": ["-criado_em"],
            },
        ),
        migrations.CreateModel(
            name="RespostaAluno",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "alternativa",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="respostas_aluno",
                        to="catalog.alternativa",
                        verbose_name="alternativa",
                    ),
                ),
                (
                    "pergunta",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="respostas_aluno",
                        to="catalog.pergunta",
                        verbose_name="pergunta",
                    ),
                ),
                (
                    "tentativa",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="respostas",
                        to="catalog.tentativaquiz",
                        verbose_name="tentativa",
                    ),
                ),
            ],
            options={
                "verbose_name": "resposta do aluno",
                "verbose_name_plural": "respostas do aluno",
                "unique_together": {("tentativa", "pergunta")},
            },
        ),
        migrations.CreateModel(
            name="Certificado",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("codigo", models.CharField(max_length=32, unique=True, verbose_name="código")),
                ("emitido_em", models.DateTimeField(auto_now_add=True)),
                ("revogado", models.BooleanField(default=False, verbose_name="revogado")),
                ("html", models.TextField(blank=True, default="", verbose_name="html")),
                (
                    "curso",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="certificados",
                        to="catalog.curso",
                        verbose_name="curso",
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="certificados",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="aluno",
                    ),
                ),
            ],
            options={
                "verbose_name": "certificado",
                "verbose_name_plural": "certificados",
                "ordering": ["-emitido_em"],
                "unique_together": {("usuario", "curso")},
            },
        ),
    ]
