# Contexto = raiz do monorepo (ver docker-compose.yml)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 git ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Versão automática a partir do Git (fora do bind-mount /app)
COPY .git /tmp/educamoney-git/.git
RUN mkdir -p /etc/educamoney \
    && cd /tmp/educamoney-git \
    && git config --global --add safe.directory /tmp/educamoney-git \
    && if git rev-parse --verify HEAD >/dev/null 2>&1; then \
         CNT="$(git rev-list --count HEAD)"; \
         SHA="$(git rev-parse --short=7 HEAD)"; \
         printf '%s-%s' "$CNT" "$SHA" > /etc/educamoney/VERSION; \
       else \
         printf '0-unknown' > /etc/educamoney/VERSION; \
       fi \
    && rm -rf /tmp/educamoney-git \
    && apt-get purge -y git \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
