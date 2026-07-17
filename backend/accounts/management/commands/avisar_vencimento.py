"""
Avisa alunos com plano vencendo nos próximos N dias (e-mail).
Uso no container: python manage.py avisar_vencimento [--dias 7]
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.email_notify import notificar_plano_vencendo
from catalog.models import Ativacao


class Command(BaseCommand):
    help = "Envia e-mail para alunos com ativação vencendo em N dias"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dias",
            type=int,
            default=7,
            help="Janela em dias até o vencimento (default 7)",
        )

    def handle(self, *args, **options):
        dias = max(1, int(options["dias"]))
        agora = timezone.now()
        limite = agora + timedelta(days=dias)
        qs = Ativacao.objects.filter(
            ativo=True,
            valido_ate__isnull=False,
            valido_ate__gte=agora,
            valido_ate__lte=limite,
        ).select_related("usuario", "plano")

        enviados = 0
        for ativ in qs:
            resto = (ativ.valido_ate - agora).days
            notificar_plano_vencendo(ativ, max(0, resto))
            enviados += 1

        self.stdout.write(self.style.SUCCESS(f"Avisos enfileirados: {enviados}"))
