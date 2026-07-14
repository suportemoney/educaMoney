from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Perfil


class PerfilInline(admin.StackedInline):
    model = Perfil
    can_delete = False
    fk_name = "user"


class UserAdmin(BaseUserAdmin):
    inlines = (PerfilInline,)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ("user", "papel")
    list_filter = ("papel",)
    search_fields = ("user__username", "user__email")
