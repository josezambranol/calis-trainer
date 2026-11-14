# Auditoría de Seguridad OWASP Top 10 — Fase 5 (CalisHome)

Fecha: 2026-11-13  
Alcance: Backend (`/backend`, Java 21 + Spring Boot 3.5.16), Frontend (`/frontend`, React 19 + Vite + Nginx), Docker Compose y CI (`/github/workflows/ci.yml`).

---

## 1. Resumen Ejecutivo

Tras completar las Fases 1–4, **CalisHome** ya cuenta con cimientos sólidos de seguridad (Argon2id, JWT HS256 de 15 min, Refresh Token rotativo en cookie `HttpOnly` con detección de reuso, CSRF selectivo, verificación de Google OIDC en servidor, RFC 7807 Problem Details y consultas parametrizadas vía JPA).

Sin embargo, la revisión código-a-código contra **OWASP Top 10 (2021)** detectó **8 hallazgos priorizados** que deben corregirse antes de habilitar pagos reales en la Fase 6.

---

## 2. Hallazgos Priorizados

| ID | Severidad | Categoría OWASP | Ubicación | Descripción del Hallazgo | Remediación |
|---|---|---|---|---|---|
| **SEC-01** | **Alta** | A10: Server-Side Request Forgery (SSRF) | `PushSubscribeRequest.java`, `NotificationService.java`, `WebPushClient.java` | El regex `^https?://.+` permitía registrar endpoints `http://` y direcciones internas/loopback/link-local (`127.0.0.1`, `169.254.169.254`, `10.x`, `localhost`), permitiendo que el backend ejecutara peticiones salientes hacia la red interna en `/notifications/test` o en el scheduler. | Exigir estrictamente `https://` y validar mediante `PushEndpointValidator` (host + `InetAddress`) rechazando hosts locales, loopback, link-local, RFC1918, multicast y IPv6 ULA antes de persistir y antes de enviar. |
| **SEC-02** | **Alta** | A01: Broken Access Control (IDOR / Takeover) | `NotificationService.java#subscribe` | Si un usuario B conocía o adivinaba un `endpoint` ya registrado por un usuario A, `subscribe()` sobreescribía `entity.setUserId(userId)` y reasignaba la suscripción al usuario B. | Verificar propiedad cuando el `endpoint` ya existe: si pertenece a otro `userId`, responder `403 Forbidden` (impidiendo secuestro de suscripciones). Añadir suite automática IDOR usuario A vs usuario B. |
| **SEC-03** | **Media** | A01 / A07: Spoofing de IP en Rate Limiting | `AuthController.java#resolveClientIp` | Se confiaba incondicionalmente en la cabecera `X-Forwarded-For` enviada por el cliente, permitiendo falsificar IP y evadir el `AuthRateLimiter` por IP. | Extraer resolución a `ClientIpResolver`: usar `remoteAddr` por defecto y aceptar `X-Forwarded-For` únicamente cuando `app.security.trust-forwarded-headers=true` (solo detrás de proxy confiable como Nginx). |
| **SEC-04** | **Media** | A05: Security Misconfiguration (CORS) | `SecurityConfig.java` | No existía una configuración explícita de `CorsConfigurationSource` acotada por entorno (`dev` vs `prod`). | Configurar CORS restrictivo en `SecurityConfig` controlado por `app.security.cors.allowed-origins`, credenciales explícitas, métodos y cabeceras permitidas. |
| **SEC-05** | **Media** | A05: Security Misconfiguration (Headers HTTP y CSP) | `SecurityConfig.java`, `frontend/nginx.conf`, `frontend/index.html` | Faltaban cabeceras defensivas (`Content-Security-Policy`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `server_tokens off`) y existía registro inline de Service Worker en `index.html`. | Mover registro de `/sw.js` a `src/main.tsx` (eliminando scripts inline), configurar headers completos en Spring Security y Nginx con soporte estricto para Google Identity (`accounts.google.com/gsi`). |
| **SEC-06** | **Media** | A04: Insecure Design (Falta de Rate Limit Global) | Cadena de filtros HTTP `/api/v1/**` | El rate limiting con Bucket4j solo cubría acciones puntuales de `/auth/*`, dejando abiertos endpoints como `/routines/preview`, `/exercises` o `/workouts` a abuso o scraping automatizado. | Añadir `GlobalRateLimitFilter` en `SecurityFilterChain` con respuesta uniforme RFC 7807 (`429 Too Many Requests` + cabecera `Retry-After`) y cuota configurable por minuto/IP. |
| **SEC-07** | **Media** | A03 / Validación y Límites de Entrada | `ExerciseController`, `UpdateProfileRequest`, `RoutinePreviewRequest`, `ImportLocalProgressRequest` | Faltaban límites `@Size(max=...)` en parámetros de búsqueda (`category`, `difficulty`, `q`), tamaño de listas `scheduledDays` (`max=7`) y longitud de `timezone`/`date`. | Añadir anotaciones Jakarta Bean Validation (`@Validated` en controlador y `@Size` en DTOs/parámetros) acotando todas las entradas externas. |
| **SEC-08** | **Media** | A06: Vulnerable and Outdated Components | `.github/workflows/ci.yml`, raíz `.github/` | No existía monitoreo automatizado de dependencias (Dependabot) ni escaneo de vulnerabilidades en el pipeline de CI. | Agregar `.github/dependabot.yml` (Maven, npm, GitHub Actions) e integrar auditoría de vulnerabilidades en CI (`npm audit` + escaneo de repositorio). |

---

## 3. Controles Verificados como Conforme

- **A02 Cryptographic Failures**: Contraseñas hasheadas con **Argon2id**, tokens de sesión con **HMAC-SHA256**, tokens opacos de refresh/email almacenados solo como hash **SHA-256**, cookie `HttpOnly` con `Secure=true` en `prod` y secretos externalizados por variables de entorno.
- **A03 SQL Injection**: Consultas exclusivamente mediante Spring Data JPA con parámetros enlazados (`?`) y sin SQL concatenado en ningún repositorio.
- **A09 Logging & Monitoring**: Revisión de todas las sentencias `log.*` en `backend/src/main`: sin registro de contraseñas, tokens JWT/refresh, correos ni payloads sensibles.
