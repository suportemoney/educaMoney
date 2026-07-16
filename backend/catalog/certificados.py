"""Emissão e elegibilidade de certificados."""

from __future__ import annotations

import secrets
import string

from django.contrib.auth.models import User
from django.utils import timezone

from .models import (
    Aula,
    Certificado,
    Curso,
    ProgressoAula,
    Quiz,
    TentativaQuiz,
)


def _gerar_codigo() -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        codigo = "EMC-" + "".join(secrets.choice(alphabet) for _ in range(10))
        if not Certificado.objects.filter(codigo=codigo).exists():
            return codigo


def aluno_elegivel_certificado(usuario: User, curso: Curso) -> tuple[bool, str]:
    aulas = Aula.objects.filter(
        modulo__curso=curso, modulo__ativo=True, ativo=True
    )
    total = aulas.count()
    if total == 0:
        return False, "Curso sem aulas."
    concluidas = ProgressoAula.objects.filter(
        usuario=usuario, aula__in=aulas, concluida=True
    ).count()
    if concluidas < total:
        return False, "Conclua todas as aulas do curso."

    # Prova avaliadora do curso (cascata); fallback: quizzes de aula legados
    prova = Quiz.objects.filter(
        curso=curso, tipo=Quiz.Tipo.PROVA_CURSO, ativo=True
    ).first()
    if prova is None:
        prova = getattr(curso, "prova_avaliadora", None)
        if prova and not prova.ativo:
            prova = None

    if prova:
        ok = TentativaQuiz.objects.filter(
            usuario=usuario, quiz=prova, aprovado=True
        ).exists()
        if not ok:
            return False, f"Aprove a prova do curso: {prova.titulo}."
        return True, ""

    quizzes = Quiz.objects.filter(aula__in=aulas, ativo=True)
    for quiz in quizzes:
        ok = TentativaQuiz.objects.filter(
            usuario=usuario, quiz=quiz, aprovado=True
        ).exists()
        if not ok:
            return False, f"Aprove o quiz: {quiz.titulo}."
    return True, ""


def montar_html_certificado(
    nome: str, ra: str | None, curso_titulo: str, codigo: str, data_iso: str
) -> str:
    ra_txt = ra or "—"
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Certificado {codigo}</title>
<style>
  body {{ font-family: Georgia, serif; margin: 0; padding: 3rem; background: #0b1220; color: #e8eef8; }}
  .card {{ max-width: 720px; margin: 0 auto; border: 2px solid #3d8bfd; padding: 3rem; text-align: center; }}
  h1 {{ font-size: 1.75rem; letter-spacing: 0.08em; text-transform: uppercase; }}
  .nome {{ font-size: 2rem; margin: 1.5rem 0 0.5rem; color: #7dd3fc; }}
  .meta {{ opacity: 0.8; font-size: 0.95rem; }}
  .codigo {{ margin-top: 2rem; font-family: monospace; }}
</style>
</head>
<body>
  <div class="card">
    <h1>Certificado de conclusão</h1>
    <p>EducaMoney certifica que</p>
    <p class="nome">{nome}</p>
    <p class="meta">RA {ra_txt}</p>
    <p>concluiu o curso</p>
    <p class="nome" style="font-size:1.4rem">{curso_titulo}</p>
    <p class="meta">Emitido em {data_iso}</p>
    <p class="codigo">Código: {codigo}</p>
  </div>
</body>
</html>"""


def emitir_certificado(usuario: User, curso: Curso) -> Certificado:
    ok, motivo = aluno_elegivel_certificado(usuario, curso)
    if not ok:
        raise ValueError(motivo)

    existente = Certificado.objects.filter(
        usuario=usuario, curso=curso, revogado=False
    ).first()
    if existente:
        return existente

    # Reativa se havia revogado
    antigo = Certificado.objects.filter(usuario=usuario, curso=curso).first()
    perfil = getattr(usuario, "perfil", None)
    ra = getattr(perfil, "ra", None) if perfil else None
    nome = usuario.first_name or usuario.username
    codigo = antigo.codigo if antigo else _gerar_codigo()
    agora = timezone.now()
    html = montar_html_certificado(
        nome, ra, curso.titulo, codigo, agora.strftime("%d/%m/%Y")
    )
    if antigo:
        antigo.revogado = False
        antigo.html = html
        antigo.emitido_em = agora
        antigo.save(update_fields=["revogado", "html", "emitido_em"])
        return antigo

    return Certificado.objects.create(
        usuario=usuario,
        curso=curso,
        codigo=codigo,
        html=html,
    )
