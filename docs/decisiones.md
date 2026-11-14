# Registro de Decisiones Arquitectónicas (ADRs) — CalisHome

Este documento registra las decisiones técnicas clave tomadas durante la evolución de **CalisHome** a un producto SaaS de producción, junto con sus alternativas y compromisos.

---

## ADR-001: Estructura Monorepo (`/frontend` + `/backend`)
- **Decisión:** Reorganizar el repositorio en un monorepo con `/frontend` (React 19 + TypeScript + Vite) y `/backend` (Java 21 + Spring Boot 3), orquestados por un `docker-compose.yml` en la raíz y un pipeline único en GitHub Actions.
- **Alternativas consideradas:** Dos repositorios separados (`calishome-web` y `calishome-api`).
- **Por qué se eligió monorepo:** Facilita cambios atómicos entre contrato de API y frontend en fases iniciales, simplifica levantar el entorno completo con un solo comando (`docker compose up --build`) y centraliza la documentación y migraciones.

## ADR-002: Spring Boot 3.5.16 + Java 21 + Arquitectura por Features
- **Decisión:** Usar Spring Boot `3.5.16` (última versión estable de la rama 3.5 compatible con `springdoc-openapi 2.8.17`) y organizar paquetes por funcionalidad (`health/`, `auth/`, `users/`, `routines/`, etc.) con soporte compartido en `common/`, en lugar de agrupar por capa técnica (`controllers/`, `services/`).
- **Por qué:** Al crecer hacia 7+ módulos (auth, rutinas, Web Push, pagos Wompi), la estructura por *feature* mantiene cohesionado cada dominio y evita acoplamientos accidentales entre módulos.

## ADR-003: Flyway con `ddl-auto: validate` y Migración Inicial V1 Real
- **Decisión:** Prohibir `spring.jpa.hibernate.ddl-auto=update` en todos los perfiles (`dev`, `test`, `prod`), usando estrictamente `validate` + migraciones inmutables Flyway. En lugar de dejar `V1__init.sql` completamente vacío, se habilita `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
- **Por qué:** Valida que Flyway conecte y ejecute DDL real contra PostgreSQL desde el primer día y deja lista la extensión para UUIDs en la Fase 2.

## ADR-004: Pruebas de Integración con Testcontainers (`disabledWithoutDocker = true`)
- **Decisión:** Usar `PostgreSQLContainer("postgres:16-alpine")` con `@ServiceConnection` para pruebas de integración reales en lugar de bases en memoria como H2.
- **Compromiso:** En entornos locales donde Docker Desktop esté apagado, `@Testcontainers(disabledWithoutDocker = true)` omite el test de integración sin romper el ciclo rápido de tests unitarios, mientras que en CI (`ubuntu-latest`) Docker está siempre activo y ejecuta toda la suite.

## ADR-005: Errores Uniformes RFC 7807 Problem Details + Seguridad por Defecto
- **Decisión:** Habilitar `spring.mvc.problemdetails.enabled=true` y personalizar `SecurityConfig` y `GlobalExceptionHandler` para que toda respuesta de error (incluyendo `401 Unauthorized` y `403 Forbidden` de Spring Security) devuelva `application/problem+json` sin filtrar trazas de pila ni secretos.
- **Por qué:** Evita respuestas inconsistentes entre errores de negocio, validación y seguridad, y protege información interna en producción.

## ADR-006: Proxy de Desarrollo en Vite (`/api` -> `:8080`) y Nginx en Docker
- **Decisión:** Configurar `server.proxy` en `frontend/vite.config.ts` para desarrollo local y proxy reverso en `frontend/nginx.conf` para Docker Compose.
- **Por qué:** Permite que frontend y backend compartan origen (`same-origin`) en desarrollo y Docker, preparando el camino para cookies `HttpOnly + SameSite` sin conflictos tempranos de CORS.

## ADR-007: Argon2id + Refresh Token Rotativo con Detección de Reuso y `noRollbackFor`
- **Decisión:** Usar **Argon2id** (`bcprov-jdk18on` `1.87`) para contraseñas, JWT HS256 de 15 minutos con Nimbus (`spring-boot-starter-oauth2-resource-server`), y Refresh Tokens opacos en cookie `HttpOnly` cuyo hash SHA-256 se guarda asociado a un `family_id`. En `AuthService.login` y `AuthService.refresh` se usa `@Transactional(noRollbackFor = ApiException.class)`.
- **Por qué:** Sin `noRollbackFor = ApiException.class`, lanzar una excepción `401` tras incrementar `failed_login_attempts` o revocar la familia comprometida provocaría un rollback automático de Spring e invalidaría tanto el bloqueo por fuerza bruta como la detección de reuso de tokens.

## ADR-008: Protección CSRF Selectiva en Endpoints de Cookie + Validación Google OIDC en Servidor
- **Decisión:** Proteger `/api/v1/auth/refresh` y `/api/v1/auth/logout` mediante `CookieCsrfTokenRepository` + `SpaCsrfTokenRequestHandler` (`X-XSRF-TOKEN`), manteniendo el resto de endpoints stateless vía `Authorization: Bearer`. Para Google Login, el servidor valida el `idToken` contra `https://www.googleapis.com/oauth2/v3/certs` (`NimbusGoogleTokenVerifier`).
- **Por qué:** Solo los endpoints que dependen de cookies son vulnerables a CSRF; exigir CSRF desde Fase 2 evita dejar una ventana abierta hasta Fase 5, y validar el `idToken` en backend impide suplantación de identidad desde el cliente.

## ADR-009: Motor de Rutinas Determinista en Servidor por Objetivo y Zona Horaria
- **Decisión:** Migrar la generación de rutinas al backend (`RoutinePlanner` + `RoutineService`), usando una semilla determinista `SHA-256(seedKey + weekStart + dayId + slotIndex)` evaluada en el `ZoneId` IANA del perfil y diferenciando volumen, descansos y selección de ejercicios según `goal` (`fuerza_hipertrofia`, `resistencia_quemagrasa`, `movilidad_salud`).
- **Alternativas consideradas:** Mantener `routineGenerator.ts` en el cliente con `Math.random()`.
- **Por qué:** El algoritmo con `Math.random()` cambiaba los ejercicios en cada renderizado de React e ignoraba por completo el `goal` del usuario. Moverlo al servidor garantiza coherencia semanal, personalización real por objetivo y consistencia multidispositivo.

## ADR-010: Racha Consciente de Días Programados + Onboarding Previo e Importación Idempotente
- **Decisión:** Calcular `streak` en el servidor (`TrainingDayUtil.calculateNextStreak`) verificando que no haya ningún día presente en `scheduledDays` perdido entre `last_completed_local_date` y el entrenamiento actual; además, habilitar un flujo de diagnóstico previo al registro (`POST /api/v1/routines/preview`) e importación idempotente de `localStorage` (`POST /api/v1/users/me/import`).
- **Por qué:** Exigir días de calendario consecutivos rompía la racha de cualquier atleta que entrene 3 días/semana (p. ej. Lunes-Miércoles-Viernes), y pedir registro antes de mostrar una rutina reducía conversión frente a mostrar el plan personalizado primero.

## ADR-011: Web Push VAPID con Limpieza `410 Gone`, Deduplicación Diaria y PWA Code Splitting
- **Decisión:** Implementar notificaciones Push en segundo plano mediante `nl.martijndwars:web-push` (`5.1.2`) + claves VAPID (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` obligatorias en `prod`, efímeras en `dev/test`), un scheduler cada minuto (`NotificationService.dispatchDueReminders`) que evalúa `ZoneId` IANA del usuario, deduplica por `last_sent_local_date`, omite usuarios que ya completaron entreno ese día y elimina automáticamente suscripciones con HTTP `404`/`410`. En el frontend, el Service Worker (`sw.js`) cachea únicamente app-shell y catálogo público (`/api/v1/exercises`) sin cachear endpoints sensibles (`/api/v1/auth`, `/users`, `/workouts`, `/routines`, `/notifications`), y `App.tsx` divide módulos con `React.lazy`.
- **Por qué:** El `reminderWatcher` del navegador dejaba de funcionar al cerrar la pestaña; la limpieza automática ante `410 Gone` evita acumular endpoints obsoletos en `push_subscriptions`, no cachear rutas autenticadas impide fugas en equipos compartidos, y `React.lazy` mantiene el bundle inicial bajo 500 kB (`~349 kB` sin comprimir).

## ADR-012: Endurecimiento OWASP Top 10 (SSRF, IDOR, CORS, CSP sin `unsafe-inline` en JS y Rate Limit Global)
- **Decisión:** Tras auditar la aplicación en [auditoria-seguridad-fase5.md](./auditoria-seguridad-fase5.md), se implementaron cinco controles de defensa en profundidad: (1) `PushEndpointValidator` exige `https://` y bloquea hosts locales, loopback, link-local (`169.254.0.0/16`), RFC1918, CGNAT y IPv6 ULA tanto al suscribir como antes de despachar; (2) `NotificationService.subscribe` rechaza con `403` el secuestro de un `endpoint` perteneciente a otro usuario; (3) `ClientIpResolver` solo confía en `X-Forwarded-For` cuando `app.security.trust-forwarded-headers=true`; (4) `SecurityConfig` y `frontend/nginx.conf` aplican CORS por entorno, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS y CSP estricta tras mover el registro del Service Worker fuera del HTML inline hacia `src/main.tsx`; y (5) `GlobalRateLimitFilter` limita peticiones API globales devolviendo RFC 7807 `429`, acompañado de Dependabot y escaneo Trivy en CI.
- **Por qué:** Cerrar superficie contra SSRF, evasión de rate-limiting por spoofing de cabeceras y secuestro de recursos antes de integrar pasarelas de pago y webhooks en la Fase 6.

## ADR-013: Monetización Freemium con Wompi Hosted Checkout + Sandbox $0 y Webhooks Idempotentes
- **Decisión:** Implementar monetización Freemium sobre las tablas `subscriptions` y `payment_events` (`V5__billing_subscriptions.sql`) usando **Wompi Colombia** (moneda `COP`, checkout hospedado externo sin almacenar datos de tarjeta) como pasarela principal de costo fijo `$0`, acompañada de un modo **Sandbox $0** (`BILLING_SANDBOX_ENABLED=true` fuera del perfil `prod`) que enruta la simulación por el mismo endpoint firmado con SHA-256 (`WompiSignatureService` + `/api/v1/billing/webhooks/wompi`). Se controla el acceso en el servidor por `PlanTier`: `FREE` (últimos 5 entrenamientos, 1 dispositivo Web Push, sin `/api/v1/workouts/analytics`) vs `PREMIUM` (`ACTIVE`, `IN_GRACE` durante 5 días de gracia o `CANCELED` con período restante vigente: hasta 100 entrenamientos, 5 dispositivos Push y analíticas Pro).
- **Alternativas consideradas:** Stripe (requiere entidad/cuenta en país soportado y comisiones internacionales para cobro local COP) y Mercado Pago (mayor acoplamiento SDK frente al flujo checkout por URL + checksum SHA-256 limpio de Wompi).
- **Por qué:** Permite demostrar todo el ciclo comercial (`PENDING` → `ACTIVE` → `IN_GRACE` → `PAST_DUE` / `CANCELED`), idempotencia por `provider_event_id`, rechazo de eventos desordenados (`STALE_OUT_OF_ORDER` vía `last_event_timestamp`) y envío de recibos por email sin presupuesto inicial (`$0`), manteniendo lista la integración real en producción solo configurando `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET`.
