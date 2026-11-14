#!/usr/bin/env bash
set -euo pipefail

# Prueba / ejecucion de restauracion de respaldo PostgreSQL para CalisHome
# Uso: ./scripts/restore-postgres.sh <ruta_backup.sql.gz[.gpg]> [base_destino]

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <archivo_backup> [base_destino]" >&2
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-calishome_restore_test}"
CONTAINER_NAME="${CONTAINER_NAME:-calishome-postgres}"
PGUSER="${PGUSER:-calishome}"

[[ -f "${BACKUP_FILE}" ]] || { echo "[restore] Archivo no encontrado: ${BACKUP_FILE}" >&2; exit 1; }

if [[ -f "${BACKUP_FILE}.sha256" ]]; then
  sha256sum -c "${BACKUP_FILE}.sha256"
fi

TMP_SQL_GZ=""
CLEANUP_TMP=0
if [[ "${BACKUP_FILE}" == *.gpg ]]; then
  [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]] || { echo "[restore] BACKUP_ENCRYPTION_KEY requerida para descifrar." >&2; exit 1; }
  TMP_SQL_GZ="$(mktemp /tmp/calishome-restore-XXXXXX.sql.gz)"
  CLEANUP_TMP=1
  gpg --batch --yes --decrypt --passphrase "${BACKUP_ENCRYPTION_KEY}" -o "${TMP_SQL_GZ}" "${BACKUP_FILE}"
else
  TMP_SQL_GZ="${BACKUP_FILE}"
fi

cleanup() {
  if [[ "${CLEANUP_TMP}" -eq 1 && -f "${TMP_SQL_GZ}" ]]; then
    rm -f "${TMP_SQL_GZ}"
  fi
}
trap cleanup EXIT

run_psql() {
  local db="$1"
  local sql="$2"
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
    docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${PGUSER}" -d "${db}" -c "${sql}"
  else
    psql -v ON_ERROR_STOP=1 -U "${PGUSER}" -d "${db}" -c "${sql}"
  fi
}

echo "[restore] Recreando base de verificacion '${TARGET_DB}'..."
run_psql postgres "DROP DATABASE IF EXISTS \"${TARGET_DB}\";"
run_psql postgres "CREATE DATABASE \"${TARGET_DB}\" OWNER \"${PGUSER}\";"

echo "[restore] Restaurando volcado..."
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  gzip -dc "${TMP_SQL_GZ}" | docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${PGUSER}" -d "${TARGET_DB}" >/dev/null
else
  gzip -dc "${TMP_SQL_GZ}" | psql -v ON_ERROR_STOP=1 -U "${PGUSER}" -d "${TARGET_DB}" >/dev/null
fi

echo "[restore] Validando conteo de tablas tras restauracion..."
run_psql "${TARGET_DB}" "SELECT (SELECT COUNT(*) FROM exercises) AS exercises_count, (SELECT COUNT(*) FROM users) AS users_count, (SELECT COUNT(*) FROM workout_logs) AS workouts_count;"
echo "[restore] Restauracion verificada con exito en '${TARGET_DB}'."
