"""
Smoke tests da API (P23).
Rodar no container: python manage.py test catalog.tests.test_smoke
"""
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Perfil
from catalog.models import Curso, Plano


class SmokeAPITests(APITestCase):
    def setUp(self):
        self.aluno = User.objects.create_user(
            username="smoke_aluno",
            email="smoke@test.local",
            password="SenhaForte1!",
            first_name="Smoke",
        )
        Perfil.objects.update_or_create(
            user=self.aluno, defaults={"papel": Perfil.Papel.ALUNO}
        )
        self.plano = Plano.objects.create(
            nome="Plano Smoke",
            descricao="Plano de teste",
            preco_referencia=99,
            duracao_dias=30,
            ativo=True,
            ordem=0,
        )
        self.curso = Curso.objects.create(
            titulo="Curso Smoke",
            descricao="desc",
            ativo=True,
            ordem=0,
        )
        self.curso.planos.add(self.plano)

    def _auth(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_health(self):
        url = "/api/health/"
        res = self.client.get(url)
        self.assertIn(res.status_code, (200, 503))
        self.assertIn("checks", res.data)
        self.assertIn("database", res.data["checks"])

    def test_login(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "smoke_aluno", "password": "SenhaForte1!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)

    def test_planos_publicos(self):
        res = self.client.get("/api/public/planos/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(res.data, list))

    def test_meus_cursos_aluno(self):
        self._auth(self.aluno)
        res = self.client.get("/api/aluno/meus-cursos/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_certificado_publico_404(self):
        res = self.client.get("/api/public/certificados/CODIGO-INEXISTENTE/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
