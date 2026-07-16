"""Views admin P9 — categorias, conjuntos, tickets, estender ativação."""

from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrGestor, IsMerchantOrAbove, IsPROrAbove

from .models import Ativacao, Categoria, Conjunto, Subcategoria, TicketSecretaria
from .serializers import (
    AtivacaoSerializer,
    CategoriaSerializer,
    ConjuntoSerializer,
    EstenderAtivacaoSerializer,
    SubcategoriaSerializer,
    TicketSecretariaSerializer,
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
        ).order_by("-data_ativacao")[:200]
        return Response(AtivacaoSerializer(qs, many=True).data)


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
        return Response(ser.data)
