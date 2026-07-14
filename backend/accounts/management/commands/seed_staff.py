import shutil
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files import File
from django.core.management.base import BaseCommand

from accounts.models import Perfil

SENHA_PADRAO = "Educa@2026"

STAFF = [
    {
        "username": "admin",
        "email": "admin@educamoney.local",
        "first_name": "Admin",
        "papel": Perfil.Papel.ADMINISTRADOR,
        "is_superuser": True,
        "is_staff": True,
        "bio": "Superusuário do sistema",
        "inicial": "A",
    },
    {
        "username": "gestor",
        "email": "gestor@educamoney.local",
        "first_name": "Gestor",
        "papel": Perfil.Papel.GESTOR,
        "bio": "Gestão de planos e usuários",
        "inicial": "G",
    },
    {
        "username": "pr",
        "email": "pr@educamoney.local",
        "first_name": "PR",
        "papel": Perfil.Papel.PR,
        "bio": "Produção de cursos e provas",
        "inicial": "P",
    },
    {
        "username": "professor",
        "email": "professor@educamoney.local",
        "first_name": "Professor",
        "papel": Perfil.Papel.INSTRUTOR,
        "bio": "Instrutor de finanças",
        "inicial": "I",
    },
    {
        "username": "merchant",
        "email": "merchant@educamoney.local",
        "first_name": "Merchant",
        "papel": Perfil.Papel.MERCHANT,
        "bio": "Emissão de token-key",
        "inicial": "M",
    },
]


class Command(BaseCommand):
    help = "Cria usuários staff do painel com perfil e foto (idempotente)."

    def handle(self, *args, **options):
        seed_dir = Path(settings.BASE_DIR) / "media_seed" / "perfis"
        template = seed_dir / "avatar_template.svg"
        dest_dir = Path(settings.MEDIA_ROOT) / "perfis"
        dest_dir.mkdir(parents=True, exist_ok=True)

        for dados in STAFF:
            user, created = User.objects.get_or_create(
                username=dados["username"],
                defaults={
                    "email": dados["email"],
                    "first_name": dados["first_name"],
                    "is_staff": dados.get("is_staff", False),
                    "is_superuser": dados.get("is_superuser", False),
                },
            )
            if created:
                user.set_password(SENHA_PADRAO)
                user.save()
                self.stdout.write(f"Usuário {user.username} criado.")
            else:
                user.email = dados["email"]
                user.first_name = dados["first_name"]
                user.is_staff = dados.get("is_staff", user.is_staff)
                user.is_superuser = dados.get("is_superuser", user.is_superuser)
                user.set_password(SENHA_PADRAO)
                user.save()
                self.stdout.write(f"Usuário {user.username} atualizado.")

            perfil, _ = Perfil.objects.get_or_create(user=user)
            perfil.papel = dados["papel"]
            perfil.bio = dados.get("bio", "")

            # Gera SVG individual a partir do template
            svg_name = f"{dados['username']}.svg"
            svg_path = dest_dir / svg_name
            if template.exists():
                conteudo = template.read_text(encoding="utf-8").replace(
                    "__INITIAL__", dados["inicial"]
                )
                svg_path.write_text(conteudo, encoding="utf-8")
                with svg_path.open("rb") as f:
                    perfil.foto.save(svg_name, File(f), save=False)
            perfil.save()

        self.stdout.write(self.style.SUCCESS("Seed staff concluído."))
