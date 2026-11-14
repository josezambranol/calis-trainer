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
- **Siguiente:** Fase 3 (catálogo en BD y motor de rutinas en el servidor + integración con frontend).
