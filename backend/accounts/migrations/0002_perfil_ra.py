# P7 — RA no Perfil do aluno

from django.db import migrations, models
from django.utils import timezone


def backfill_ra(apps, schema_editor):
    Perfil = apps.get_model("accounts", "Perfil")
    ano = timezone.now().year
    prefixo = f"EM{ano}"
    seq = 1
    for perfil in Perfil.objects.filter(papel="aluno", ra__isnull=True).order_by("id"):
        perfil.ra = f"{prefixo}{seq:06d}"
        perfil.save(update_fields=["ra"])
        seq += 1


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="perfil",
            name="ra",
            field=models.CharField(
                blank=True,
                help_text="Registro do aluno (EM + ano + sequencial).",
                max_length=16,
                null=True,
                unique=True,
                verbose_name="RA",
            ),
        ),
        migrations.RunPython(backfill_ra, noop_reverse),
    ]
