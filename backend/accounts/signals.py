from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Perfil


@receiver(post_save, sender=User)
def garantir_perfil(sender, instance, created, **kwargs):
    """Garante Perfil para todo User (aluno por padrão)."""
    if created:
        Perfil.objects.get_or_create(
            user=instance,
            defaults={"papel": Perfil.Papel.ALUNO},
        )
    else:
        Perfil.objects.get_or_create(user=instance)
