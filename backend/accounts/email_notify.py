"""
Envio de e-mails operacionais (síncrono ou thread leve).
Respeita EMAIL_ENABLED — ambientes sem SMTP não quebram.
"""
from __future__ import annotations

import logging
import threading
from typing import Iterable

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _email_ativo() -> bool:
    return bool(getattr(settings, "EMAIL_ENABLED", False))


def _enviar_async(assunto: str, corpo: str, destinatarios: Iterable[str]) -> None:
    destinatarios = [e.strip() for e in destinatarios if e and str(e).strip()]
    if not destinatarios or not _email_ativo():
        return

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@educamoney.local")

    def _run() -> None:
        try:
            send_mail(
                subject=assunto,
                message=corpo,
                from_email=from_email,
                recipient_list=list(destinatarios),
                fail_silently=True,
            )
        except Exception:
            logger.exception("Falha ao enviar e-mail: %s", assunto)

    threading.Thread(target=_run, daemon=True).start()


def notificar_ticket_aberto(ticket) -> None:
    """Novo ticket → staff (SECRETARIA_NOTIFY_EMAIL)."""
    dest = getattr(settings, "SECRETARIA_NOTIFY_EMAIL", "") or ""
    aluno = ticket.usuario
    nome = aluno.get_full_name() or aluno.username
    _enviar_async(
        assunto=f"[EducaMoney] Novo ticket: {ticket.assunto}",
        corpo=(
            f"Aluno: {nome} ({aluno.email})\n"
            f"Assunto: {ticket.assunto}\n\n"
            f"{ticket.mensagem}\n"
        ),
        destinatarios=[dest],
    )


def notificar_ticket_atualizado(ticket) -> None:
    """Resposta/status do ticket → aluno."""
    email = getattr(ticket.usuario, "email", "") or ""
    _enviar_async(
        assunto=f"[EducaMoney] Atualização do ticket: {ticket.assunto}",
        corpo=(
            f"Olá,\n\n"
            f"Seu ticket \"{ticket.assunto}\" foi atualizado.\n"
            f"Status: {ticket.status}\n\n"
            f"Resposta:\n{ticket.resposta or '(sem resposta ainda)'}\n\n"
            f"— EducaMoney\n"
        ),
        destinatarios=[email],
    )


def notificar_certificado_emitido(certificado) -> None:
    """Certificado emitido → aluno."""
    email = getattr(certificado.usuario, "email", "") or ""
    _enviar_async(
        assunto=f"[EducaMoney] Certificado: {certificado.curso.titulo}",
        corpo=(
            f"Olá,\n\n"
            f"Seu certificado do curso \"{certificado.curso.titulo}\" foi emitido.\n"
            f"Código de validação: {certificado.codigo}\n\n"
            f"Acesse o portal para imprimir ou compartilhar.\n\n"
            f"— EducaMoney\n"
        ),
        destinatarios=[email],
    )


def notificar_plano_vencendo(ativacao, dias: int) -> None:
    """Aviso de vencimento próximo → aluno."""
    email = getattr(ativacao.usuario, "email", "") or ""
    plano = ativacao.plano.titulo if ativacao.plano_id else "seu plano"
    valido = (
        ativacao.valido_ate.strftime("%d/%m/%Y")
        if ativacao.valido_ate
        else "sem data"
    )
    _enviar_async(
        assunto=f"[EducaMoney] Plano próximo do vencimento ({dias} dia(s))",
        corpo=(
            f"Olá,\n\n"
            f"Seu plano \"{plano}\" vence em {dias} dia(s) ({valido}).\n"
            f"Renove pelo WhatsApp ou pela área Finanças do portal.\n\n"
            f"— EducaMoney\n"
        ),
        destinatarios=[email],
    )
