"""Views admin P9 — categorias, conjuntos, tickets, estender/upgrade ativação."""

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from math import ceil

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrGestor, IsMerchantOrAbove, IsPROrAbove

from .admin_views import _gerar_codigo_token
from .models import Ativacao, Categoria, Conjunto, Plano, Subcategoria, TicketSecretaria, TokenKey
from .serializers import (
    AtivacaoSerializer,
    CategoriaSerializer,
    ConjuntoSerializer,
    EstenderAtivacaoSerializer,
    SubcategoriaSerializer,
    TicketSecretariaSerializer,
    UpgradeAtivacaoSerializer,
)


def _slug_unico(modelo, base: str, campo="slug", **filtros):
    base = slugify(base) or "item"
    slug = base
    i = 2
    while modelo.objects.filter(**{campo: slug}, **filtros).exists():
        slug = f"{base}-{i}"
        i += 1
    return slug


class AdminCategoriaListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Categoria.objects.all()
        return Response(
            CategoriaSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request):
        data = request.data.copy()
        if not data.get("slug") and data.get("titulo"):
            data["slug"] = _slug_unico(Categoria, data["titulo"])
        ser = CategoriaSerializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AdminCategoriaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        obj = get_object_or_404(Categoria, pk=pk)
        ser = CategoriaSerializer(
            obj, data=request.data, partial=True, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        obj = get_object_or_404(Categoria, pk=pk)
        obj.ativo = False
        obj.save(update_fields=["ativo"])
        return Response(
            CategoriaSerializer(obj, context={"request": request}).data
        )


class AdminSubcategoriaListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def get(self, request):
        qs = Subcategoria.objects.select_related("categoria")
        cat = request.query_params.get("categoria")
        if cat:
            qs = qs.filter(categoria_id=cat)
        return Response(SubcategoriaSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        cat_id = data.get("categoria")
        if not data.get("slug") and data.get("titulo") and cat_id:
            data["slug"] = _slug_unico(
                Subcategoria, data["titulo"], categoria_id=cat_id
            )
        ser = SubcategoriaSerializer(data=data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AdminSubcategoriaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]

    def patch(self, request, pk):
        obj = get_object_or_404(Subcategoria, pk=pk)
        ser = SubcategoriaSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        obj = get_object_or_404(Subcategoria, pk=pk)
        obj.ativo = False
        obj.save(update_fields=["ativo"])
        return Response(SubcategoriaSerializer(obj).data)


class AdminConjuntoListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Conjunto.objects.select_related("categoria").prefetch_related("cursos")
        return Response(
            ConjuntoSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request):
        data = request.data
        # FormData: curso_ids como lista
        if hasattr(data, "getlist"):
            mutable = {k: data.get(k) for k in data.keys()}
            ids = data.getlist("curso_ids") or data.getlist("curso_ids[]")
            if ids:
                mutable["curso_ids"] = [int(x) for x in ids]
            data = mutable
        ser = ConjuntoSerializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AdminConjuntoDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPROrAbove]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        obj = get_object_or_404(Conjunto, pk=pk)
        data = request.data
        if hasattr(data, "getlist"):
            mutable = {k: data.get(k) for k in data.keys()}
            ids = data.getlist("curso_ids") or data.getlist("curso_ids[]")
            if ids:
                mutable["curso_ids"] = [int(x) for x in ids]
            data = mutable
        ser = ConjuntoSerializer(
            obj, data=data, partial=True, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        obj = get_object_or_404(Conjunto, pk=pk)
        obj.ativo = False
        obj.save(update_fields=["ativo"])
        return Response(
            ConjuntoSerializer(obj, context={"request": request}).data
        )


class AdminAtivacaoListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMerchantOrAbove]

    def get(self, request):
        qs = Ativacao.objects.select_related(
            "plano", "token_key", "usuario"
        ).order_by("-data_ativacao")
        busca = (request.query_params.get("q") or "").strip()
        if busca:
            qs = qs.filter(
                Q(usuario__first_name__icontains=busca)
                | Q(usuario__username__icontains=busca)
                | Q(usuario__email__icontains=busca)
                | Q(token_key__codigo__icontains=busca)
            )
        plano_id = (request.query_params.get("plano_id") or "").strip()
        if plano_id.isdigit():
            qs = qs.filter(plano_id=int(plano_id))
        vigente = request.query_params.get("vigente")
        agora = timezone.now()
        if vigente == "1":
            qs = qs.filter(ativo=True).filter(
                Q(valido_ate__isnull=True) | Q(valido_ate__gte=agora)
            )
        elif vigente == "0":
            qs = qs.filter(
                Q(ativo=False)
                | Q(valido_ate__isnull=False, valido_ate__lt=agora)
            )
        return Response(AtivacaoSerializer(qs[:200], many=True).data)


class AdminAtivacaoEstenderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMerchantOrAbove]

    def post(self, request, pk):
        ativ = get_object_or_404(Ativacao, pk=pk)
        ser = EstenderAtivacaoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        agora = timezone.now()
        if ser.validated_data.get("valido_ate"):
            ativ.valido_ate = ser.validated_data["valido_ate"]
        else:
            dias = ser.validated_data["dias"]
            base = ativ.valido_ate if ativ.valido_ate and ativ.valido_ate > agora else agora
            ativ.valido_ate = base + timedelta(days=dias)
        ativ.renovado_em = agora
        ativ.ativo = True
        ativ.save(update_fields=["valido_ate", "renovado_em", "ativo"])
        return Response(AtivacaoSerializer(ativ).data)


def _calcular_valor_upgrade(plano_origem: Plano, plano_destino: Plano, dias_restantes: int) -> Decimal:
    """Diferença de preço proporcional aos dias restantes do ciclo de origem."""
    preco_antigo = Decimal(plano_origem.preco_referencia)
    preco_novo = Decimal(plano_destino.preco_referencia)
    duracao = max(1, int(plano_origem.duracao_dias or 1))
    diff = preco_novo - preco_antigo
    if diff <= 0:
        return Decimal("0.00")
    valor = (diff * Decimal(dias_restantes)) / Decimal(duracao)
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class AdminAtivacaoUpgradeView(APIView):
    """Troca plano vigente mantendo o mesmo vencimento; gera token usado com valor B."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def post(self, request, pk):
        ativ = get_object_or_404(
            Ativacao.objects.select_related("plano", "usuario", "token_key"),
            pk=pk,
        )
        agora = timezone.now()
        if not ativ.ativo:
            return Response(
                {"detail": "Ativação não está ativa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if ativ.valido_ate is None:
            return Response(
                {
                    "detail": "Upgrade exige data de vencimento. Estenda ou defina valido_ate primeiro."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if ativ.valido_ate < agora:
            return Response(
                {"detail": "Ativação expirada; não é possível fazer upgrade."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = UpgradeAtivacaoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        plano_destino = ser.validated_data["plano"]
        plano_origem = ativ.plano

        if plano_destino.id == plano_origem.id:
            return Response(
                {"detail": "Escolha um plano diferente do atual."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Decimal(plano_destino.preco_referencia) <= Decimal(plano_origem.preco_referencia):
            return Response(
                {"detail": "Upgrade só para plano com preço maior que o atual."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delta = ativ.valido_ate - agora
        dias_restantes = max(0, ceil(delta.total_seconds() / 86400))
        if dias_restantes < 1:
            return Response(
                {"detail": "Não há dias restantes suficientes para upgrade."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valor = _calcular_valor_upgrade(plano_origem, plano_destino, dias_restantes)

        with transaction.atomic():
            codigo = _gerar_codigo_token()
            token = TokenKey.objects.create(
                codigo=codigo,
                plano=plano_destino,
                status=TokenKey.Status.USADO,
                origem=TokenKey.Origem.UPGRADE,
                valor_proporcional=valor,
                criado_por=request.user,
                usado_por=ativ.usuario,
                usado_em=agora,
            )
            nova = Ativacao.objects.create(
                usuario=ativ.usuario,
                plano=plano_destino,
                token_key=token,
                ativo=True,
                valido_ate=ativ.valido_ate,
            )
            ativ.ativo = False
            ativ.save(update_fields=["ativo"])

        data = AtivacaoSerializer(nova).data
        return Response(
            {
                **data,
                "valor_proporcional": str(valor),
                "dias_restantes": dias_restantes,
                "plano_origem_nome": plano_origem.nome,
                "token_codigo": token.codigo,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminTicketListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def get(self, request):
        qs = TicketSecretaria.objects.select_related("usuario", "usuario__perfil")
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status=st)
        return Response(TicketSecretariaSerializer(qs, many=True).data)


class AdminTicketDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrGestor]

    def patch(self, request, pk):
        ticket = get_object_or_404(TicketSecretaria, pk=pk)
        ser = TicketSecretariaSerializer(ticket, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        from accounts.email_notify import notificar_ticket_atualizado

        notificar_ticket_atualizado(ticket)
        return Response(ser.data)
