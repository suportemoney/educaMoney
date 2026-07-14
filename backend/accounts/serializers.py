from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Perfil
from .permissions import obter_papel


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "email", "first_name", "password", "password_confirm")

    def validate_email(self, value):
        email = value.strip().lower()
        if not email:
            raise serializers.ValidationError("Informe um e-mail.")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "As senhas não coincidem."}
            )
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # Signal cria perfil aluno; reforça papel
        Perfil.objects.update_or_create(
            user=user,
            defaults={"papel": Perfil.Papel.ALUNO},
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    papel = serializers.SerializerMethodField()
    foto_url = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "papel",
            "foto_url",
            "bio",
            "is_superuser",
            "is_active",
        )

    def get_papel(self, obj):
        return obter_papel(obj)

    def get_foto_url(self, obj):
        perfil = getattr(obj, "perfil", None)
        if not perfil or not perfil.foto:
            return None
        request = self.context.get("request")
        url = perfil.foto.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_bio(self, obj):
        perfil = getattr(obj, "perfil", None)
        return perfil.bio if perfil else ""


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    papel = serializers.ChoiceField(
        choices=[c for c in Perfil.Papel.choices if c[0] != Perfil.Papel.ALUNO]
    )
    bio = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Usuário já existe.")
        return value

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("E-mail já em uso.")
        return email

    def create(self, validated_data):
        papel = validated_data.pop("papel")
        bio = validated_data.pop("bio", "")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        if papel == Perfil.Papel.ADMINISTRADOR:
            user.is_staff = True
            user.is_superuser = True
        user.save()
        Perfil.objects.update_or_create(
            user=user,
            defaults={"papel": papel, "bio": bio},
        )
        return user


class AdminUserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False)
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    papel = serializers.ChoiceField(
        choices=[c for c in Perfil.Papel.choices if c[0] != Perfil.Papel.ALUNO],
        required=False,
    )
    bio = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def update(self, user, validated_data):
        if "email" in validated_data:
            user.email = validated_data["email"].strip().lower()
        if "first_name" in validated_data:
            user.first_name = validated_data["first_name"]
        if "is_active" in validated_data:
            user.is_active = validated_data["is_active"]
        if "password" in validated_data:
            user.set_password(validated_data["password"])
        papel = validated_data.get("papel")
        if papel == Perfil.Papel.ADMINISTRADOR:
            user.is_staff = True
            user.is_superuser = True
        elif papel:
            user.is_superuser = False
        user.save()
        perfil, _ = Perfil.objects.get_or_create(user=user)
        if papel:
            perfil.papel = papel
        if "bio" in validated_data:
            perfil.bio = validated_data["bio"]
        perfil.save()
        return user
