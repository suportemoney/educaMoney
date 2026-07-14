from django.contrib import admin

from .models import Ativacao, ConfigSistema, Curso, Integracao, Plano, PlanoCurso, TokenKey


class PlanoCursoInline(admin.TabularInline):
    model = PlanoCurso
    extra = 0


@admin.register(Plano)
class PlanoAdmin(admin.ModelAdmin):
    list_display = ("nome", "preco_referencia", "ativo", "ordem")
    list_filter = ("ativo",)
    search_fields = ("nome",)
    inlines = [PlanoCursoInline]


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "instrutor", "ativo", "ordem")
    list_filter = ("ativo",)
    search_fields = ("titulo",)
    raw_id_fields = ("instrutor",)


@admin.register(ConfigSistema)
class ConfigSistemaAdmin(admin.ModelAdmin):
    list_display = ("nome_site", "atualizado_em")


@admin.register(Integracao)
class IntegracaoAdmin(admin.ModelAdmin):
    list_display = ("tipo", "telefone", "ativo", "atualizado_em")
    list_filter = ("tipo", "ativo")


@admin.register(TokenKey)
class TokenKeyAdmin(admin.ModelAdmin):
    list_display = ("codigo", "plano", "status", "criado_por", "usado_por", "criado_em")
    list_filter = ("status",)
    search_fields = ("codigo",)


@admin.register(Ativacao)
class AtivacaoAdmin(admin.ModelAdmin):
    list_display = ("usuario", "plano", "token_key", "data_ativacao", "ativo")
    list_filter = ("ativo",)
