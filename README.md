# 🏋️ CalisHome — Monorepo (PWA + API Spring Boot)

Aplicación web progresiva (**PWA**) para asignar y guiar rutinas de calistenia en casa con **100% cero material** (peso corporal, suelo y pared), sobrecarga progresiva adaptativa y recordatorios programados.

---

## 🏗️ Arquitectura del Monorepo

```text
calishome/
├── .github/workflows/ci.yml   # CI: lint, tests y build (Frontend + Backend)
├── docker-compose.yml         # Orquestación con 1 comando (Postgres + Backend + Frontend)
├── .env.example               # Plantilla de variables de entorno (sin secretos)
├── docs/
│   ├── decisiones.md          # Registro de decisiones arquitectónicas (ADRs)
│   └── amenazas-fase2.md      # Modelo de amenazas de autenticación
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS v4 + Vitest
└── backend/                   # Java 21 + Spring Boot 3.5 + PostgreSQL + Flyway + Testcontainers
```

---

## 🚀 Levantar todo con un solo comando (Docker)

1. Copia el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Levanta PostgreSQL 16, el Backend Spring Boot y el Frontend Nginx:
   ```bash
   docker compose up --build
   ```
3. Accede a los servicios:
   - **Frontend (PWA):** http://localhost:5173
   - **Backend Health:** http://localhost:8080/api/v1/health
   - **Swagger / OpenAPI (perfil `dev`):** http://localhost:8080/swagger-ui.html
   - **Mailpit SMTP Web UI (dev):** http://localhost:8026

---

## 🔐 Endpoints Disponibles (`v1`)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/v1/health` | Estado de la API y PostgreSQL | Público |
| `GET` | `/api/v1/auth/csrf` | Emite cookie `XSRF-TOKEN` para SPA | Público |
| `POST` | `/api/v1/auth/register` | Registro con Argon2id + envío de verificación | Público (Rate Limit) |
| `POST` | `/api/v1/auth/verify-email` | Confirma cuenta con token | Público |
| `POST` | `/api/v1/auth/resend-verification` | Reenvía correo de verificación | Público (Rate Limit) |
| `POST` | `/api/v1/auth/login` | Login + Access JWT + Cookie `HttpOnly` refresh | Público (Rate Limit + Lockout) |
| `POST` | `/api/v1/auth/google` | Login OIDC validando `idToken` con Google JWKS | Público (Rate Limit) |
| `POST` | `/api/v1/auth/refresh` | Rotación de refresh token + detección de reuso | Cookie + CSRF |
| `POST` | `/api/v1/auth/logout` | Cierra sesión y revoca familia de tokens | Cookie + CSRF |
| `POST` | `/api/v1/auth/forgot-password` | Solicita recuperación (anti-enumeración) | Público (Rate Limit) |
| `POST` | `/api/v1/auth/reset-password` | Restablece clave y revoca sesiones activas | Público |
| `GET` | `/api/v1/users/me` | Perfil completo del usuario autenticado | Bearer JWT |
| `GET` | `/api/v1/users/me/profile` | Alias del perfil de entrenamiento autenticado | Bearer JWT |
| `PATCH` | `/api/v1/users/me/profile` | Actualiza nivel, objetivo, días, horario, zona horaria y audio | Bearer JWT |
| `POST` | `/api/v1/users/me/import` | Importación idempotente de progreso previo en `localStorage` | Bearer JWT |
| `GET` | `/api/v1/exercises` | Catálogo de 24 ejercicios (filtros `category`, `difficulty`, `q`) | Público |
| `GET` | `/api/v1/routines/today` | Rutina determinista de hoy según objetivo y zona horaria | Bearer JWT |
| `GET` | `/api/v1/routines/weekly` | Plan semanal completo (7 días) del usuario autenticado | Bearer JWT |
| `POST` | `/api/v1/routines/preview` | Vista previa semanal en onboarding antes de registrarse | Público |
| `GET` | `/api/v1/workouts` | Historial de sesiones completadas del usuario | Bearer JWT |
| `POST` | `/api/v1/workouts` | Registra sesión, recalcula racha y `adaptationScore` (`-3` a `+3`) | Bearer JWT |
| `GET` | `/api/v1/notifications/vapid-public-key` | Clave pública VAPID del servidor para Web Push | Público |
| `GET` | `/api/v1/notifications/status` | Dispositivos Web Push activos del usuario | Bearer JWT |
| `POST` | `/api/v1/notifications/subscribe` | Registra o actualiza suscripción Push (`endpoint`, `p256dh`, `auth`) | Bearer JWT |
| `DELETE` | `/api/v1/notifications/unsubscribe` | Elimina suscripción Push de un dispositivo | Bearer JWT |
| `POST` | `/api/v1/notifications/test` | Envía notificación Web Push de prueba desde el backend | Bearer JWT |

---

## 💻 Desarrollo Local y Pruebas

### Backend (Java 21 + Maven)
```bash
cd backend
mvn verify
```

### Frontend (Node 22+ / Vite)
```bash
cd frontend
npm install
npm run lint
npm test
npm run build
```

---

## 📚 Estado de Fases

- **Fase 1:** ✅ Monorepo, PostgreSQL + Flyway, `/api/v1/health`, RFC 7807, Docker Compose y CI.
- **Fase 2:** ✅ Modelo de datos (`V2__core_schema.sql`), Argon2id, JWT + Refresh rotativo (`HttpOnly` + CSRF + reuse detection), verificación de email, recuperación de contraseña, lockout, Bucket4j rate limiting y Google OIDC.
- **Fase 3:** ✅ Catálogo de 24 ejercicios en PostgreSQL (`V3__seed_exercises.sql`), motor determinista de rutinas por objetivo y zona horaria, historial de entrenamientos, cálculo justo de racha, `React Router` + `TanStack Query` + `react-hook-form` + `Zod`, onboarding previo al registro e importación idempotente desde `localStorage`.
- **Fase 4:** ✅ Web Push VAPID desde backend (`V4__push_subscriptions.sql` + `nl.martijndwars:web-push`), scheduler por zona horaria con deduplicación diaria y limpieza de `410 Gone`, Mailpit en Docker para correos SMTP dev, PWA instalable con app-shell offline (`sw.js` + `manifest.json`) y code splitting (`React.lazy`).
- **Fase 5:** ✅ Auditoría y endurecimiento OWASP Top 10 ([`docs/auditoria-seguridad-fase5.md`](docs/auditoria-seguridad-fase5.md)): protección SSRF en Web Push, aislamiento IDOR entre cuentas, CORS restrictivo, headers de seguridad (CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`), rate limiting global RFC 7807, resolución segura de IP cliente, Dependabot y escaneo Trivy en CI.
- **Siguiente:** Fase 6 (Monetización Freemium con pasarela de pagos Wompi/Stripe, webhooks idempotentes y control de acceso por plan).
