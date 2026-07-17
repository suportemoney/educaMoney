"""Processamento de vídeo de aula: duração (ffprobe) e conversão MP4→WebM."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.core.files import File

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


def processar_video_aula(aula) -> None:
    """
    Após salvar vídeo: define duração e, se for mp4, tenta converter para webm.
    Atualiza o FileField da aula no lugar.
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
    nome = Path(path).name.lower()
    webm_tmp = None
    if nome.endswith(".mp4") or nome.endswith(".mov") or nome.endswith(".mkv"):
        webm_tmp = converter_para_webm(path)

    update_fields: list[str] = []
    if dur is not None and aula.duracao_segundos != dur:
        aula.duracao_segundos = dur
        update_fields.append("duracao_segundos")

    if webm_tmp:
        antigo = path
        base = Path(aula.video.name).stem
        with open(webm_tmp, "rb") as fh:
            aula.video.save(f"{base}.webm", File(fh), save=False)
        update_fields.append("video")
        # Remove original no disco se ainda existir
        try:
            if antigo and os.path.isfile(antigo) and antigo != getattr(aula.video, "path", None):
                os.unlink(antigo)
        except OSError:
            pass
        webm_tmp.unlink(missing_ok=True)
        # Re-probe no webm se duração ainda vazia
        if aula.duracao_segundos is None:
            try:
                d2 = obter_duracao_segundos(aula.video.path)
                if d2 is not None:
                    aula.duracao_segundos = d2
                    if "duracao_segundos" not in update_fields:
                        update_fields.append("duracao_segundos")
            except (ValueError, NotImplementedError, OSError):
                pass

    if update_fields:
        aula.save(update_fields=list(dict.fromkeys(update_fields)))
