"""Processamento de vídeo de aula: duração (ffprobe) e conversão MP4→WebM."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from django.core.files import File
from django.db import close_old_connections

logger = logging.getLogger(__name__)


def _ffmpeg_bin() -> str | None:
    return shutil.which("ffmpeg")


def _ffprobe_bin() -> str | None:
    return shutil.which("ffprobe")


def obter_duracao_segundos(caminho: str | Path) -> int | None:
    """Lê duração do arquivo com ffprobe; None se indisponível."""
    probe = _ffprobe_bin()
    if not probe:
        return None
    try:
        out = subprocess.run(
            [
                probe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(caminho),
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if out.returncode != 0:
            logger.warning("ffprobe falhou: %s", out.stderr)
            return None
        raw = (out.stdout or "").strip()
        if not raw:
            return None
        return max(1, int(round(float(raw))))
    except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
        logger.warning("ffprobe erro: %s", exc)
        return None


def converter_para_webm(caminho_origem: str | Path) -> Path | None:
    """
    Converte MP4 (ou outro) para .webm mais leve (VP8 + Vorbis).
    Retorna path do webm temporário ou None se falhar / ffmpeg ausente.
    """
    ffmpeg = _ffmpeg_bin()
    if not ffmpeg:
        return None
    origem = Path(caminho_origem)
    if origem.suffix.lower() == ".webm":
        return None
    dest = Path(tempfile.mkstemp(suffix=".webm")[1])
    try:
        # VP8 é mais rápido que VP9; bitrate moderado para arquivo mais leve
        out = subprocess.run(
            [
                ffmpeg,
                "-y",
                "-i",
                str(origem),
                "-c:v",
                "libvpx",
                "-b:v",
                "1M",
                "-crf",
                "32",
                "-c:a",
                "libvorbis",
                "-b:a",
                "96k",
                "-deadline",
                "good",
                "-cpu-used",
                "4",
                str(dest),
            ],
            capture_output=True,
            text=True,
            timeout=1800,
            check=False,
        )
        if out.returncode != 0 or not dest.exists() or dest.stat().st_size < 1:
            logger.warning("ffmpeg conversão falhou: %s", out.stderr[-2000:])
            if dest.exists():
                dest.unlink(missing_ok=True)
            return None
        return dest
    except (OSError, subprocess.TimeoutExpired) as exc:
        logger.warning("ffmpeg erro: %s", exc)
        if dest.exists():
            dest.unlink(missing_ok=True)
        return None


def _precisa_converter(path: str) -> bool:
    nome = Path(path).name.lower()
    return nome.endswith((".mp4", ".mov", ".mkv"))


def _aplicar_webm(aula, path: str, webm_tmp: Path) -> None:
    antigo = path
    base = Path(aula.video.name).stem
    with open(webm_tmp, "rb") as fh:
        aula.video.save(f"{base}.webm", File(fh), save=False)
    aula.save(update_fields=["video"])
    try:
        if antigo and os.path.isfile(antigo) and antigo != getattr(aula.video, "path", None):
            os.unlink(antigo)
    except OSError:
        pass
    webm_tmp.unlink(missing_ok=True)


def _converter_aula_em_background(aula_id: int) -> None:
    """Conversão pesada fora do request HTTP (evita 504 no nginx)."""
    close_old_connections()
    try:
        from catalog.models import Aula

        aula = Aula.objects.filter(pk=aula_id).first()
        if not aula or not aula.video:
            return
        try:
            path = aula.video.path
        except (ValueError, NotImplementedError):
            return
        if not path or not os.path.isfile(path) or not _precisa_converter(path):
            return
        webm_tmp = converter_para_webm(path)
        if not webm_tmp:
            return
        # Recarrega: outro request pode ter alterado a aula
        aula = Aula.objects.filter(pk=aula_id).first()
        if not aula or not aula.video:
            webm_tmp.unlink(missing_ok=True)
            return
        try:
            path_atual = aula.video.path
        except (ValueError, NotImplementedError):
            webm_tmp.unlink(missing_ok=True)
            return
        if path_atual != path:
            # Novo upload substituiu o arquivo — descarta conversão antiga
            webm_tmp.unlink(missing_ok=True)
            return
        _aplicar_webm(aula, path_atual, webm_tmp)
        logger.info("Aula %s convertida para webm em background", aula_id)
    except Exception:
        logger.exception("Falha na conversão webm da aula %s", aula_id)
    finally:
        close_old_connections()


def processar_video_aula(aula) -> None:
    """
    Após salvar vídeo: grava duração na hora e dispara conversão WebM em background.
    Assim o PATCH/POST responde rápido e a duração já aparece na lista.
    """
    if not aula.video:
        return
    path = None
    try:
        path = aula.video.path
    except (ValueError, NotImplementedError):
        return
    if not path or not os.path.isfile(path):
        return

    dur = obter_duracao_segundos(path)
    if dur is not None and aula.duracao_segundos != dur:
        aula.duracao_segundos = dur
        aula.save(update_fields=["duracao_segundos"])

    if _precisa_converter(path):
        threading.Thread(
            target=_converter_aula_em_background,
            args=(aula.pk,),
            daemon=True,
            name=f"webm-aula-{aula.pk}",
        ).start()
