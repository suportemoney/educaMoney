import re

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import (
    MENSAGEM_WHATSAPP_PADRAO,
    ConfigSistema,
    Curso,
    Integracao,
    Plano,
    PlanoCurso,
)


def _telefone_de_url(url: str) -> str:
    if not url:
        return ""
    digits = re.sub(r"\D", "", url.split("?")[0])
    if digits.startswith("55") and len(digits) >= 12:
        return f"+{digits}"
    if len(digits) >= 10:
        return f"+55{digits}"
    return ""


class Command(BaseCommand):
    help = "Popula planos e cursos de demonstração (idempotente)."

    def handle(self, *args, **options):
        ConfigSistema.obter()

        if not Integracao.objects.filter(tipo=Integracao.Tipo.WHATSAPP).exists():
            telefone = _telefone_de_url(getattr(settings, "WHATSAPP_URL", "") or "")
            if not telefone:
                telefone = "+5500000000000"
            Integracao.objects.create(
                tipo=Integracao.Tipo.WHATSAPP,
                telefone=telefone,
                mensagem_template=MENSAGEM_WHATSAPP_PADRAO,
                ativo=True,
            )
            self.stdout.write("Integração WhatsApp criada a partir do env/WHATSAPP_URL.")

        planos_data = [
            {
                "nome": "Essencial",
                "descricao": "Base sólida de educação financeira para organizar o orçamento e sair do vermelho.",
                "preco_referencia": "97.00",
                "ordem": 1,
            },
            {
                "nome": "Investidor",
                "descricao": "Do essencial ao primeiro portfólio: reserva, renda fixa e fundamentos de renda variável.",
                "preco_referencia": "197.00",
                "ordem": 2,
            },
            {
                "nome": "Plus Completo",
                "descricao": "Acesso amplo aos cursos EducaMoney, incluindo conteúdos plus para quem quer aprofundar.",
                "preco_referencia": "297.00",
                "ordem": 3,
            },
        ]

        planos = []
        for dados in planos_data:
            obj, created = Plano.objects.update_or_create(
                nome=dados["nome"],
                defaults={
                    "descricao": dados["descricao"],
                    "preco_referencia": dados["preco_referencia"],
                    "ordem": dados["ordem"],
                    "ativo": True,
                },
            )
            planos.append(obj)
            self.stdout.write(f"Plano {obj.nome} {'criado' if created else 'atualizado'}.")

        cursos_data = [
            {
                "titulo": "Orçamento que funciona",
                "descricao": "Monte um orçamento realista e acompanhe gastos sem planilha complicada.",
                "ordem": 1,
                "planos": [0, 1, 2],
            },
            {
                "titulo": "Reserva de emergência",
                "descricao": "Quanto guardar, onde colocar e como usar a reserva sem culpa.",
                "ordem": 2,
                "planos": [0, 1, 2],
            },
            {
                "titulo": "Primeiros passos em investimentos",
                "descricao": "Tesouro, CDBs e fundamentos para começar com segurança.",
                "ordem": 3,
                "planos": [1, 2],
            },
            {
                "titulo": "Psicologia do dinheiro",
                "descricao": "Entenda vieses e hábitos que sabotam suas metas financeiras.",
                "ordem": 4,
                "planos": [2],
            },
        ]

        for dados in cursos_data:
            obj, created = Curso.objects.update_or_create(
                titulo=dados["titulo"],
                defaults={
                    "descricao": dados["descricao"],
                    "ordem": dados["ordem"],
                    "ativo": True,
                },
            )
            PlanoCurso.objects.filter(curso=obj).delete()
            for i, idx in enumerate(dados["planos"]):
                PlanoCurso.objects.create(curso=obj, plano=planos[idx], ordem=i)
            self.stdout.write(f"Curso {obj.titulo} {'criado' if created else 'atualizado'}.")

        self.stdout.write(self.style.SUCCESS("Seed do catálogo concluído."))
