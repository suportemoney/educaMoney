from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Perfil
from .ra import garantir_ra


@receiver(post_save, sender=User)
def garantir_perfil(sender, instance, created, **kwargs):
    """Garante Perfil para todo User (aluno por padrão)."""
    if created:
        perfil, _ = Perfil.objects.get_or_create(
            user=instance,
            defaults={"papel": Perfil.Papel.ALUNO},
        )
    else:
        perfil, _ = Perfil.objects.get_or_create(user=instance)
    if perfil.papel == Perfil.Papel.ALUNO and not perfil.ra:
        garantir_ra(perfil)
