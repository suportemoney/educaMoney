#!/usr/bin/env bash
# Backup lógico do Postgres do Compose (P16).
# Uso (na raiz do projeto, com stack no ar):
#   bash scripts/backup-postgres.sh
# Requer: docker compose e volume/serviço db.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${ROOT}/backups"
mkdir -p "$OUT_DIR"
FILE="${OUT_DIR}/educamoney_${STAMP}.sql.gz"

echo "Gerando ${FILE}…"
docker compose -f "${ROOT}/docker-compose.yml" exec -T db \
  pg_dump -U "${POSTGRES_USER:-educamoney}" "${POSTGRES_DB:-educamoney}" \
  | gzip > "${FILE}"

echo "OK: ${FILE}"
