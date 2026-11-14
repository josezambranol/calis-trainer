#!/usr/bin/env bash
set -euo pipefail

# Backup automatizado de PostgreSQL para CalisHome (soporta contenedor Docker o host externo)
# Variables opcionales:
#   CONTAINER_NAME=calishome-postgres
#   PGDATABASE=calishome PGUSER=calishome PGPASSWORD=calishome_dev PGHOST=... PGPORT=5432
#   BACKUP_DIR=./backups
#   BACKUP_ENCRYPTION_KEY=...   (si se define, cifra el dump con GPG AES-256)
#   RETENTION_DAYS=30

CONTAINER_NAME="${CONTAINER_NAME:-calishome-postgres}"
PGDATABASE="${PGDATABASE:-calishome}"
PGUSER="${PGUSER:-calishome}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"

RAW_DUMP="${BACKUP_DIR}/calishome-${PGDATABASE}-${TIMESTAMP}.sql.gz"

echo "[backup] Iniciando respaldo de base '${PGDATABASE}'..."
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker exec -i "${CONTAINER_NAME}" pg_dump -U "${PGUSER}" -d "${PGDATABASE}" --clean --if-exists --no-owner --no-privileges \
    | gzip -9 > "${RAW_DUMP}"
else
  pg_dump -U "${PGUSER}" -d "${PGDATABASE}" --clean --if-exists --no-owner --no-privileges \
    | gzip -9 > "${RAW_DUMP}"
fi

ARTIFACT="${RAW_DUMP}"
if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  command -v gpg >/dev/null 2>&1 || { echo "[backup] ERROR: gpg requerido para cifrado."; exit 1; }
  ENC_FILE="${RAW_DUMP}.gpg"
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "${BACKUP_ENCRYPTION_KEY}" -o "${ENC_FILE}" "${RAW_DUMP}"
  rm -f "${RAW_DUMP}"
  ARTIFACT="${ENC_FILE}"
fi

sha256sum "${ARTIFACT}" > "${ARTIFACT}.sha256"

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && [[ "${RETENTION_DAYS}" -gt 0 ]]; then
  find "${BACKUP_DIR}" -type f \( -name "calishome-*.sql.gz*" \) -mtime +"${RETENTION_DAYS}" -delete || true
fi

echo "[backup] Respaldo generado: ${ARTIFACT}"
echo "[backup] Checksum SHA-256: $(cat "${ARTIFACT}.sha256")"
