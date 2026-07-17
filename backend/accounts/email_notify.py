"""
Envio de e-mails operacionais (thread leve).
Prioridade: integração E-mail ativa no painel; fallback settings/.env.
"""
from __future__ import annotations

import logging
import threading
from typing import Iterable

from django.conf import settings
from django.core.mail import get_connection, send_mail

logger = logging.getLogger(__name__)


def _cfg_email():
    """
    Retorna dict com config SMTP ou None se e-mail desligado.
    Preferência: Integracao tipo email ativa no banco.
    """
    try:
        from catalog.models import Integracao

        row = Integracao.email_ativa()
    except Exception:
        row = None

    if row:
        return {
            "host": row.email_host,
            "port": row.email_port or 587,
            "username": row.email_usuario or "",
            "password": row.email_senha or "",
            "use_tls": bool(row.email_usar_tls),
            "from_email": row.email_remetente
            or "EducaMoney <noreply@educamoney.local>",
            "secretaria": row.email_secretaria or "",
        }

    if not getattr(settings, "EMAIL_ENABLED", False):
        return None

    return {
        "host": getattr(settings, "EMAIL_HOST", "localhost"),
        "port": int(getattr(settings, "EMAIL_PORT", 587) or 587),
        "username": getattr(settings, "EMAIL_HOST_USER", "") or "",
        "password": getattr(settings, "EMAIL_HOST_PASSWORD", "") or "",
        "use_tls": bool(getattr(settings, "EMAIL_USE_TLS", True)),
        "from_email": getattr(
            settings, "DEFAULT_FROM_EMAIL", "EducaMoney <noreply@educamoney.local>"
        ),
        "secretaria": getattr(settings, "SECRETARIA_NOTIFY_EMAIL", "") or "",
    }


def _enviar_async(assunto: str, corpo: str, destinatarios: Iterable[str]) -> None:
    destinatarios = [e.strip() for e in destinatarios if e and str(e).strip()]
    cfg = _cfg_email()
    if not destinatarios or not cfg:
        return

    from_email = cfg["from_email"]

    def _run() -> None:
        try:
            conn = get_connection(
                backend="django.core.mail.backends.smtp.EmailBackend",
                host=cfg["host"],
                port=cfg["port"],
                username=cfg["username"] or None,
                password=cfg["password"] or None,
                use_tls=cfg["use_tls"],
                fail_silently=True,
            )
            send_mail(
                subject=assunto,
                message=corpo,
                from_email=from_email,
                recipient_list=list(destinatarios),
                connection=conn,
                fail_silently=True,
            )
        except Exception:
            logger.exception("Falha ao enviar e-mail: %s", assunto)

    threading.Thread(target=_run, daemon=True).start()


def notificar_ticket_aberto(ticket) -> None:
    """Novo ticket → staff (e-mail da secretaria na integração)."""
    cfg = _cfg_email()
    dest = (cfg or {}).get("secretaria") or ""
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
    plano = (
        ativacao.plano.nome
        if ativacao.plano_id and getattr(ativacao.plano, "nome", None)
        else "seu plano"
    )
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
