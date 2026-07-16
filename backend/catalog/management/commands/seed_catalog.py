import re

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import (
    MENSAGEM_WHATSAPP_PADRAO,
    Aula,
    Categoria,
    ConfigSistema,
    Conjunto,
    ConjuntoCurso,
    Curso,
    Integracao,
    Modulo,
    Plano,
    PlanoCurso,
    Subcategoria,
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
                "beneficios": [
                    "Acesso aos cursos essenciais de organização financeira",
                    "Material de apoio para orçamento pessoal",
                    "Comunidade de iniciantes no WhatsApp",
                    "Suporte padrão por mensagem",
                ],
            },
            {
                "nome": "Investidor",
                "descricao": "Do essencial ao primeiro portfólio: reserva, renda fixa e fundamentos de renda variável.",
                "preco_referencia": "197.00",
                "ordem": 2,
                "beneficios": [
                    "Tudo do plano Essencial",
                    "Cursos de reserva e primeiros investimentos",
                    "Trilha para montar o primeiro portfólio",
                    "Encontros ao vivo mensais (resumo)",
                    "Suporte prioritário",
                ],
            },
            {
                "nome": "Plus Completo",
                "descricao": "Acesso amplo aos cursos EducaMoney, incluindo conteúdos plus para quem quer aprofundar.",
                "preco_referencia": "297.00",
                "ordem": 3,
                "beneficios": [
                    "Tudo do plano Investidor",
                    "Conteúdos plus e profundidade avançada",
                    "Acesso a todo o catálogo liberado no plano",
                    "Mentoria em grupo trimestral",
                    "Biblioteca de materiais extras (PDF/links)",
                    "Suporte VIP",
                ],
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
                    "beneficios": dados["beneficios"],
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
                "icone_key": "wallet",
                "sub": "orcamento",
            },
            {
                "titulo": "Reserva de emergência",
                "descricao": "Quanto guardar, onde colocar e como usar a reserva sem culpa.",
                "ordem": 2,
                "planos": [0, 1, 2],
                "icone_key": "shield",
                "sub": "reserva",
            },
            {
                "titulo": "Primeiros passos em investimentos",
                "descricao": "Tesouro, CDBs e fundamentos para começar com segurança.",
                "ordem": 3,
                "planos": [1, 2],
                "icone_key": "chart",
                "sub": "renda-fixa",
            },
            {
                "titulo": "Psicologia do dinheiro",
                "descricao": "Entenda vieses e hábitos que sabotam suas metas financeiras.",
                "ordem": 4,
                "planos": [2],
                "icone_key": "brain",
                "sub": "habitos",
            },
        ]

        # Categorias / subcategorias
        cat_fund, _ = Categoria.objects.update_or_create(
            slug="fundamentos",
            defaults={
                "titulo": "Fundamentos",
                "ordem": 1,
                "ativo": True,
                "icone_key": "book",
            },
        )
        cat_invest, _ = Categoria.objects.update_or_create(
            slug="investimentos",
            defaults={
                "titulo": "Investimentos",
                "ordem": 2,
                "ativo": True,
                "icone_key": "chart",
            },
        )
        cat_mente, _ = Categoria.objects.update_or_create(
            slug="comportamento",
            defaults={
                "titulo": "Comportamento",
                "ordem": 3,
                "ativo": True,
                "icone_key": "brain",
            },
        )
        subs_map = {}
        for slug, titulo, cat, ordem in [
            ("orcamento", "Orçamento", cat_fund, 1),
            ("reserva", "Reserva", cat_fund, 2),
            ("renda-fixa", "Renda fixa", cat_invest, 1),
            ("habitos", "Hábitos", cat_mente, 1),
        ]:
            s, _ = Subcategoria.objects.update_or_create(
                categoria=cat,
                slug=slug,
                defaults={"titulo": titulo, "ordem": ordem, "ativo": True},
            )
            subs_map[slug] = s
        self.stdout.write("Categorias e subcategorias seed OK.")

        for dados in cursos_data:
            obj, created = Curso.objects.update_or_create(
                titulo=dados["titulo"],
                defaults={
                    "descricao": dados["descricao"],
                    "ordem": dados["ordem"],
                    "ativo": True,
                    "icone_key": dados["icone_key"],
                    "subcategoria": subs_map.get(dados["sub"]),
                },
            )
            PlanoCurso.objects.filter(curso=obj).delete()
            for i, idx in enumerate(dados["planos"]):
                PlanoCurso.objects.create(curso=obj, plano=planos[idx], ordem=i)
            self.stdout.write(f"Curso {obj.titulo} {'criado' if created else 'atualizado'}.")

        # Estrutura mínima de conteúdo no primeiro curso (sem arquivo de vídeo)
        curso_base = Curso.objects.filter(titulo="Orçamento que funciona").first()
        if curso_base and not curso_base.modulos.exists():
            mod = Modulo.objects.create(
                curso=curso_base, titulo="Fundamentos", ordem=1, ativo=True
            )
            Aula.objects.create(
                modulo=mod,
                titulo="Por que orçar",
                descricao="Entenda o papel do orçamento na saúde financeira.",
                ordem=1,
                ativo=True,
            )
            Aula.objects.create(
                modulo=mod,
                titulo="Categorias essenciais",
                descricao="Separe gastos fixos, variáveis e prioridades.",
                ordem=2,
                ativo=True,
            )
            self.stdout.write("Módulo/aulas demo criados em Orçamento que funciona.")

        # Conjuntos (trilhas)
        cursos_qs = {c.titulo: c for c in Curso.objects.all()}
        conj, _ = Conjunto.objects.update_or_create(
            titulo="Trilha do Zero ao Orçamento",
            defaults={
                "descricao": "Organize o dinheiro do zero com foco em orçamento e reserva.",
                "categoria": cat_fund,
                "icone_key": "route",
                "ordem": 1,
                "ativo": True,
            },
        )
        ConjuntoCurso.objects.filter(conjunto=conj).delete()
        for i, titulo in enumerate(
            ["Orçamento que funciona", "Reserva de emergência"]
        ):
            c = cursos_qs.get(titulo)
            if c:
                ConjuntoCurso.objects.create(conjunto=conj, curso=c, ordem=i)
        conj2, _ = Conjunto.objects.update_or_create(
            titulo="Primeiros investimentos",
            defaults={
                "descricao": "Depois da reserva, comece a investir com segurança.",
                "categoria": cat_invest,
                "icone_key": "trending",
                "ordem": 2,
                "ativo": True,
            },
        )
        ConjuntoCurso.objects.filter(conjunto=conj2).delete()
        c_inv = cursos_qs.get("Primeiros passos em investimentos")
        if c_inv:
            ConjuntoCurso.objects.create(conjunto=conj2, curso=c_inv, ordem=0)
        self.stdout.write("Conjuntos seed OK.")

        self.stdout.write(self.style.SUCCESS("Seed do catálogo concluído."))
