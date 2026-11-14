# Runbook de Producción y Operación — CalisHome

Guía operativa para desplegar, monitorear, respaldar y recuperar **CalisHome** con arquitectura de bajo/nulo costo fijo inicial (`$0`) escalable a infraestructura dedicada.

---

## 1. Arquitectura de Despliegue Recomendada (Presupuesto `$0` Inicial)

| Componente | Destino Free-Tier Sugerido | Imagen / Artefacto | Notas |
|---|---|---|---|
| **Frontend PWA (Nginx)** | Docker (Render / Koyeb) o CDN estático + Nginx reverse proxy | `ghcr.io/<owner>/calishome-web:latest` | Sirve SPA React + `sw.js` + headers CSP/HSTS |
| **API Backend (Spring Boot 3.5 / Java 21)** | Contenedor Docker (`backend/Dockerfile`) | `ghcr.io/<owner>/calishome-api:latest` | Ejecutar con `SPRING_PROFILES_ACTIVE=prod` |
| **Base de Datos** | PostgreSQL 16 (Neon / Supabase / contenedor gestionado) | `postgres:16-alpine` | Migraciones Flyway automáticas (`V1..V5`) |
| **SMTP Transaccional** | Brevo / Resend (plan gratuito) en `prod`; Mailpit en `dev` | `SMTP_HOST`, `SMTP_PORT`, credenciales | Requerido para verificación, reset y recibos Pro |
| **Registro de Contenedores** | GitHub Container Registry (`ghcr.io`) | Generado por `.github/workflows/deploy.yml` | Sin costo para repositorios públicos / paquetes estándar |

---

## 2. Checklist de Variables y Secretos en Producción (`SPRING_PROFILES_ACTIVE=prod`)

Nunca usar valores por defecto de desarrollo en `prod` (`application-prod.yml` exige las variables críticas):

- `JWT_SECRET`: secreto aleatorio ≥ 32 bytes (`openssl rand -base64 48`).
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`: conexión TLS a PostgreSQL 16.
- `CORS_ALLOWED_ORIGINS`: URL HTTPS exacta del frontend (ej. `https://app.calishome.app`).
- `FRONTEND_URL`: origen HTTPS público para enlaces de verificación/recuperación.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`: par ECDSA P-256 fijo para Web Push persistente.
- `BILLING_SANDBOX_ENABLED=false` y `APP_DEMO_SEED_ENABLED=false` (ya fijados en `application-prod.yml`).
- `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`: llaves de producción Wompi cuando se habiliten cobros reales.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`.

---

## 3. Pipeline CI/CD (`staging` → `production`)

1. **Integración Continua (`.github/workflows/ci.yml`):** Cada push/PR ejecuta `Security Scan (Trivy Filesystem)`, `Backend` (`mvn -B verify` con PostgreSQL 16 Testcontainers) y `Frontend` (`oxlint`, `npm audit --omit=dev --audit-level=high`, `vitest`, `vite build`).
2. **Despliegue Escalonado (`.github/workflows/deploy.yml`):**
   - Al hacer push a `main` o crear un tag `v*`, publica imágenes Docker en `ghcr.io`.
   - Despliega automáticamente en `environment: staging` (via `STAGING_DEPLOY_WEBHOOK` y smoke check `STAGING_URL/api/v1/health` cuando estén configurados).
   - Promueve a `environment: production` únicamente tras aprobación manual configurada en **GitHub Settings → Environments → production → Required reviewers**.

---

## 4. Monitoreo, Salud y Alertas

- **Salud Pública:** `GET /api/v1/health` y `GET /actuator/health` responden `200 OK` verificando conexión activa a PostgreSQL (`permitAll` para balanceadores y Docker healthcheck).
- **Telemetría Interna (`info`, `metrics`):** Expuestos en `/actuator/info` y `/actuator/metrics` bajo autenticación JWT (`SecurityConfig`).
- **Errores Frontend / API:** Configurar alertas en Sentry (free-tier) sobre picos de HTTP `5xx`, errores de firma en `/api/v1/billing/webhooks/wompi` o latencia p95 elevada.

---

## 5. Procedimiento Operativo (Deploy, Rollback y Caídas)

### Rollback Rápido de Imagen
1. Identificar el último `sha-<commit>` estable en `ghcr.io/<owner>/calishome-api` y `calishome-web`.
2. Actualizar el tag en el entorno de destino (o revertir el commit en `main` con `git revert <sha>` y re-ejecutar `deploy.yml`).
3. Confirmar `GET /api/v1/health` en `200 OK` y revisar logs de arranque de Flyway.
4. *(Importante)* Evitar migraciones destructivas sin compatibilidad hacia atrás; toda evolución de esquema debe añadir una nueva versión `V<N>__*.sql`.

### Respuesta ante Incidentes
- **API no responde / `503`:** Verificar `/actuator/health`, disponibilidad de PostgreSQL y agotamiento de pool HikariCP.
- **Correos no llegan:** Validar credenciales SMTP / cuotas del proveedor y consultar `SmtpOrLoggingEmailSender` en logs.
- **Webhook Wompi rechazado (`401`):** Verificar sincronización exacta de `WOMPI_EVENTS_SECRET` entre panel Wompi y secreto de despliegue.

---

## 6. Respaldo y Restauración de PostgreSQL

### Crear Respaldo Diario
```bash
BACKUP_DIR=./backups RETENTION_DAYS=30 ./scripts/backup-postgres.sh
# Opcional con cifrado GPG AES-256:
BACKUP_ENCRYPTION_KEY="clave-segura" ./scripts/backup-postgres.sh
```

### Verificar Restauración
```bash
./scripts/restore-postgres.sh ./backups/calishome-calishome-<timestamp>.sql.gz calishome_restore_test
```

### Registro de Prueba de Restauración Verificada
- **Fecha (UTC):** `2026-11-14T04:09:29Z`
- **Scripts ejecutados:** `./scripts/backup-postgres.sh` y `./scripts/restore-postgres.sh ./backups/calishome-calishome-20261114T040929Z.sql.gz calishome_restore_test` sobre el contenedor `calishome-postgres` (PostgreSQL 16).
- **Verificación de integridad:** Checksum SHA-256 `OK` (`0da600d624444870db2c54cdcc96ddb8019df9db21e68d922522592922a9fb2a`) y conteo verificado tras restaurar: `exercises_count = 24`, `users_count = 8`, `workouts_count = 10`.
- **Limpieza posterior:** Base temporal `calishome_restore_test` eliminada tras confirmar integridad.
