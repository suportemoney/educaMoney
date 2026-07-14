import re

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Ativacao,
    ConfigSistema,
    Curso,
    Integracao,
    Plano,
    PlanoCurso,
    TokenKey,
)


class PlanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = ("id", "nome", "descricao", "preco_referencia", "ordem")


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = ("id", "titulo", "descricao", "ordem")


class PlanoAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_referencia",
            "ativo",
            "ordem",
        )


class CursoAdminSerializer(serializers.ModelSerializer):
    plano_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Plano.objects.all(),
        source="planos",
        required=False,
    )
    instrutor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="instrutor",
        allow_null=True,
        required=False,
    )
    instrutor_nome = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Curso
        fields = (
            "id",
            "titulo",
            "descricao",
            "ativo",
            "ordem",
            "instrutor_id",
            "instrutor_nome",
            "plano_ids",
        )

    def get_instrutor_nome(self, obj):
        if not obj.instrutor:
            return None
        return obj.instrutor.first_name or obj.instrutor.username

    def create(self, validated_data):
        planos = validated_data.pop("planos", [])
        curso = Curso.objects.create(**validated_data)
        self._sync_planos(curso, planos)
        return curso

    def update(self, instance, validated_data):
        planos = validated_data.pop("planos", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if planos is not None:
            self._sync_planos(instance, planos)
        return instance

    def _sync_planos(self, curso, planos):
        PlanoCurso.objects.filter(curso=curso).delete()
        for i, plano in enumerate(planos):
            PlanoCurso.objects.create(curso=curso, plano=plano, ordem=i)


class ConfigSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigSistema
        fields = ("nome_site", "atualizado_em")
        read_only_fields = ("atualizado_em",)


class IntegracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integracao
        fields = (
            "id",
            "tipo",
            "telefone",
            "mensagem_template",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("criado_em", "atualizado_em")

    def validate_telefone(self, value):
        limpo = re.sub(r"[\s\-\(\)]", "", (value or "").strip())
        if not re.fullmatch(r"\+55\d{10,11}", limpo):
            raise serializers.ValidationError(
                "Informe o telefone com +55 e o número completo (DDD + celular), "
                "ex.: +5511999999999."
            )
        return limpo

    def validate_mensagem_template(self, value):
        texto = (value or "").strip()
        if not texto:
            raise serializers.ValidationError("Informe a mensagem automática.")
        return texto

    def create(self, validated_data):
        validated_data.setdefault("tipo", Integracao.Tipo.WHATSAPP)
        integracao = super().create(validated_data)
        if integracao.ativo:
            Integracao.objects.filter(tipo=Integracao.Tipo.WHATSAPP).exclude(
                pk=integracao.pk
            ).update(ativo=False)
        return integracao

    def update(self, instance, validated_data):
        integracao = super().update(instance, validated_data)
        if integracao.ativo:
            Integracao.objects.filter(tipo=Integracao.Tipo.WHATSAPP).exclude(
                pk=integracao.pk
            ).update(ativo=False)
        return integracao


class TokenKeySerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source="plano.nome", read_only=True)
    criado_por_nome = serializers.SerializerMethodField()
    usado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = TokenKey
        fields = (
            "id",
            "codigo",
            "plano",
            "plano_nome",
            "status",
            "criado_por",
            "criado_por_nome",
            "criado_em",
            "usado_por",
            "usado_por_nome",
            "usado_em",
        )
        read_only_fields = (
            "codigo",
            "status",
            "criado_por",
            "criado_em",
            "usado_por",
            "usado_em",
        )

    def get_criado_por_nome(self, obj):
        if not obj.criado_por:
            return None
        return obj.criado_por.first_name or obj.criado_por.username

    def get_usado_por_nome(self, obj):
        if not obj.usado_por:
            return None
        return obj.usado_por.first_name or obj.usado_por.username


class TokenKeyCreateSerializer(serializers.Serializer):
    plano_id = serializers.PrimaryKeyRelatedField(queryset=Plano.objects.filter(ativo=True))


class AtivarTokenSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=32)

    def validate_codigo(self, value):
        return (value or "").strip().upper()


class AtivacaoSerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source="plano.nome", read_only=True)
    token_codigo = serializers.CharField(source="token_key.codigo", read_only=True)

    class Meta:
        model = Ativacao
        fields = (
            "id",
            "plano",
            "plano_nome",
            "token_key",
            "token_codigo",
            "data_ativacao",
            "ativo",
        )


class CursoAlunoSerializer(serializers.ModelSerializer):
    instrutor_nome = serializers.SerializerMethodField()

    class Meta:
        model = Curso
        fields = ("id", "titulo", "descricao", "ordem", "instrutor_nome")

    def get_instrutor_nome(self, obj):
        if not obj.instrutor:
            return None
        return obj.instrutor.first_name or obj.instrutor.username
