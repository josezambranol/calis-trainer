# Changelog

Todos los cambios notables de **CalisHome** siguen versionamiento semántico (`SemVer`).

## [1.1.0] - 2026-11-13 (Diferenciación Competitiva: Biomecánica Animada, Agenda Real, Dieta & Coach Cuantitativo)

### Novedades de Producto y Arquitectura
- **Motor Anatómico 3D Interactivo (`ThreeAnatomyCanvas` + `ExerciseVisualizer`):** Reemplazo completo de las ilustraciones 2D por un **modelo anatómico 3D en WebGL (`three`, MIT, 100% offline/CSP `'self'`)** con estriaciones musculares procedurales, iluminación de estudio, cámara orbital 360° (`OrbitControls`), vistas rápidas (`3/4 3D` / `Lateral` / `Frontal`), resaltado coral en grupos musculares activos para los **24 ejercicios** (`exercise3DPose.ts`), control `0.5× Técnica` vs `1× Tempo`, fases `Excéntrica` / `Isometría` / `Concéntrica` y ventana modal dedicada **"Ver técnica y ejecución"** (`technique-modal`) combinando modelo 3D + guía biomecánica paso a paso.
- **Agenda por Fechas + Verificación Automática de Faltas (`V6__planning_nutrition_coaching.sql`):** Endpoints `/api/v1/schedule/*` que autopoblan semanas futuras, marcan sesiones pasadas sin registro como `MISSED`, guardan motivo y permiten reprogramar en 1 clic (`RESCHEDULED`) verificando adherencia real de 14 días.
- **Plan de Desarrollo a 12 Semanas, Árboles de Calistenia y Matriz Muscular 48h:** Periodización en 3 fases adaptada a `resistencia_quemagrasa`, `fuerza_hipertrofia` o `movilidad_salud`, desbloqueo progresivo en 4 cadenas técnicas y recuperación tisular calculada desde `workout_logs`.
- **Monitoreo Nutricional e Hidratación (Mifflin-St Jeor):** Endpoints `/api/v1/nutrition/*` con biometría (`peso`, `estatura`, `edad`, `sexo`, `actividad`, `agua`), metas dinámicas de calorías/macros, registro diario rápido o personalizado, promedios móviles de 7 días e integración con exportación JSON ARCO (`/api/v1/users/me/export`).
- **Coach Cuantitativo sin Mensajes Preprogramados:** Endpoint `GET /api/v1/coaching/insights` respaldado por telemetría real en PostgreSQL (evidencia exacta de faltas, desviación calórica y proteica en `g/kg`, déficit hídrico y carga por RPE).

## [1.0.0] - 2026-11-13 (Lanzamiento Comercial & Portfolio)

### Fase 8 — Producción, Operación, Privacidad y Portfolio
- **Privacidad y Derechos ARCO (Ley 1581 de 2012 / GDPR):** Nuevos endpoints `GET /api/v1/users/me/export` (exportación portable JSON sin contraseñas ni tokens) y `DELETE /api/v1/users/me` (revocación total de refresh tokens, borrado de suscripciones Push, anonimización PII y limpieza de cookie HttpOnly), verificados con Testcontainers (`UserAccountPrivacyIntegrationTest`).
- **Páginas Legales y Gestión de Cuenta:** Rutas `/privacy`, `/terms` (incluye Aviso Médico obligatorio) y `/account` con descarga JSON y eliminación confirmada escribiendo `ELIMINAR`.
- **Atleta Demo Sandbox (`$0`):** `DemoDataInitializer` (`APP_DEMO_SEED_ENABLED=true`, desactivado en `test` y `prod`) pre-carga a `demo@calishome.app` (`Mateo Ríos (Demo Pro)`) con historial de 21 días, racha, sobrecarga adaptativa y acceso en 1 clic desde el login cuando `sandboxMode` está activo.
- **Operación y CI/CD:** Exposición segura de `/actuator/health,info,metrics` (con `/info` y `/metrics` autenticados), scripts de respaldo cifrable (`scripts/backup-postgres.sh`) y restauración verificada (`scripts/restore-postgres.sh`), workflow `.github/workflows/deploy.yml` (GHCR + `staging` + `production` con aprobación manual) y [Runbook de Producción](docs/runbook-produccion.md).

### Fase 7 — Calidad, Rediseño Obsidian & Volt, Offline-First, i18n y E2E
- **Rediseño Visual "Obsidian & Kinetic Volt":** Paleta `#07090d` / `#c8f135`, jerarquía de tablero numérico (`ch-tabular`), Circuit Blueprint numerado y barras discretas de Sobrecarga Progresiva (`-3..+3`).
- **Offline-First & Sincronización Diferida:** IndexedDB (`calishome-offline-db`) con respaldo en `localStorage` para caché de plan semanal/catálogo y cola offline persistente (`enqueuePendingWorkout` / `flushPendingWorkouts`) con sincronización automática al reconectar.
- **Accesibilidad WCAG 2.1 AA e Internacionalización:** Skip-to-Content, zoom habilitado (`index.html`), soporte `Escape`, `aria-live`, `role="meter"` y conmutador completo `ES/EN`.
- **Suite End-to-End Playwright:** `frontend/e2e/calishome.spec.ts` verificando flujo real sobre Docker Compose + Mailpit.

### Fase 6 — Monetización Freemium (Wompi + Sandbox `$0`)
- Tablas `subscriptions` y `payment_events` (`V5__billing_subscriptions.sql`), checkout hospedado Wompi / Sandbox `$0`, verificación SHA-256 de webhooks, idempotencia por `provider_event_id`, período de gracia de 5 días, límites `FREE` vs `PREMIUM` y telemetría Pro.

### Fase 5 — Seguridad OWASP Top 10 & CI
- Protección SSRF para URLs Push (`PushEndpointValidator`), prevención IDOR, rate limiting global con RFC 7807 `429`, `ClientIpResolver`, cabeceras CSP/HSTS y workflow CI con `oxlint`, Vitest, Maven + Testcontainers y Trivy.

### Fase 4 — Web Push VAPID & PWA Code Splitting
- Despacho en segundo plano por zona horaria (`NotificationService` + `nl.martijndwars:web-push`), limpieza `410 Gone`, `manifest.json`, `sw.js` y carga diferida con `React.lazy`.

### Fases 1–3 — Fundación Spring Boot, Seguridad JWT + Refresh + Google OIDC y Motor Determinista
- API Java 21 + Spring Boot 3.5 + PostgreSQL 16 + Flyway (`V1..V3`), autenticación Argon2id + JWT HS256 + refresh token rotativo + Mailpit SMTP, motor determinista de rutinas por objetivo (`fuerza_hipertrofia`, `resistencia_quemagrasa`, `movilidad_salud`) y racha consciente de días programados.
