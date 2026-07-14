#!/bin/sh
set -e

echo "Aguardando PostgreSQL em ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."

until python -c "
import os, socket, sys
host = os.environ.get('POSTGRES_HOST', 'db')
port = int(os.environ.get('POSTGRES_PORT', '5432'))
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect((host, port))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
  echo "Postgres indisponível — nova tentativa em 2s..."
  sleep 2
done

echo "Postgres disponível. Aplicando migrações..."
python manage.py migrate --noinput

echo "Populando catálogo (seed idempotente)..."
python manage.py seed_catalog

echo "Populando staff do painel (seed idempotente)..."
python manage.py seed_staff

echo "Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

echo "Iniciando aplicação..."
exec "$@"
