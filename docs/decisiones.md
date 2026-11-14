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
- **Compromiso:** En entornos locales donde Docker Desktop esté apagado, `@Testcontainers(disabledWithoutDocker = true)` omite el test de integración sin romper el ciclo rápido de tests unitarios (`HealthServiceTest` y `HealthControllerWebTest`), mientras que en CI (`ubuntu-latest`) Docker está siempre activo y ejecuta toda la suite.

## ADR-005: Errores Uniformes RFC 7807 Problem Details + Seguridad por Defecto
- **Decisión:** Habilitar `spring.mvc.problemdetails.enabled=true` y personalizar `SecurityConfig` y `GlobalExceptionHandler` para que toda respuesta de error (incluyendo `401 Unauthorized` de Spring Security) devuelva `application/problem+json` sin filtrar trazas de pila ni secretos.
- **Por qué:** Evita respuestas inconsistentes entre errores de negocio, validación y seguridad, y protege información interna en producción.

## ADR-006: Proxy de Desarrollo en Vite (`/api` -> `:8080`) y Nginx en Docker
- **Decisión:** Configurar `server.proxy` en `frontend/vite.config.ts` para desarrollo local y proxy reverso en `frontend/nginx.conf` para Docker Compose.
- **Por qué:** Permite que frontend y backend compartan origen (`same-origin`) en desarrollo y Docker, preparando el camino para cookies `HttpOnly + SameSite` en la Fase 2 sin conflictos tempranos de CORS.
