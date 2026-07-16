from django.db import migrations, models
import django.db.models.deletion


def preencher_modulo_materiais(apps, schema_editor):
    MaterialAula = apps.get_model("catalog", "MaterialAula")
    for mat in MaterialAula.objects.select_related("aula").all():
        if mat.aula_id and not mat.modulo_id:
            mat.modulo_id = mat.aula.modulo_id
            mat.save(update_fields=["modulo_id"])


def marcar_tipo_quiz(apps, schema_editor):
    Quiz = apps.get_model("catalog", "Quiz")
    for q in Quiz.objects.all():
        if q.aula_id:
            q.tipo = "quiz_aula"
            q.save(update_fields=["tipo"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0009_tokenkey_upgrade_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="materialaula",
            name="modulo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="materiais",
                to="catalog.modulo",
                verbose_name="módulo",
            ),
        ),
        migrations.AlterField(
            model_name="materialaula",
            name="aula",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="materiais",
                to="catalog.aula",
                verbose_name="aula",
            ),
        ),
        migrations.RunPython(preencher_modulo_materiais, migrations.RunPython.noop),
        migrations.AlterModelOptions(
            name="materialaula",
            options={
                "ordering": ["ordem", "id"],
                "verbose_name": "material",
                "verbose_name_plural": "materiais",
            },
        ),
        migrations.AddField(
            model_name="quiz",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("atividade", "Atividade do módulo"),
                    ("prova_curso", "Prova avaliadora do curso"),
                    ("quiz_aula", "Quiz de aula (legado)"),
                ],
                default="quiz_aula",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="quiz",
            name="modulo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="atividades",
                to="catalog.modulo",
                verbose_name="módulo",
            ),
        ),
        migrations.AddField(
            model_name="quiz",
            name="curso",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="prova_avaliadora",
                to="catalog.curso",
                verbose_name="curso (prova)",
            ),
        ),
        migrations.AlterField(
            model_name="quiz",
            name="aula",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="quiz",
                to="catalog.aula",
                verbose_name="aula",
            ),
        ),
        migrations.RunPython(marcar_tipo_quiz, migrations.RunPython.noop),
    ]
