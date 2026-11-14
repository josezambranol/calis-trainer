# 🏋️ CalisHome — Monorepo (PWA + API Spring Boot)

Aplicación web progresiva (**PWA**) para asignar y guiar rutinas de calistenia en casa con **100% cero material** (peso corporal, suelo y pared), sobrecarga progresiva adaptativa y recordatorios programados.

---

## 🏗️ Arquitectura del Monorepo

```text
calishome/
├── .github/workflows/ci.yml   # CI: lint, tests y build (Frontend + Backend)
├── docker-compose.yml         # Orquestación con 1 comando (Postgres + Backend + Frontend)
├── .env.example               # Plantilla de variables de entorno (sin secretos)
├── docs/decisiones.md         # Registro de decisiones arquitectónicas (ADRs)
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
   - **Backend Health (vía proxy o directo):** http://localhost:8080/api/v1/health
   - **Swagger / OpenAPI (perfil `dev`):** http://localhost:8080/swagger-ui.html

---

## 💻 Desarrollo Local (sin contenedor para app)

### 1. Base de datos PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Backend (Java 21 + Maven)
```bash
cd backend
mvn spring-boot:run
```
Pruebas del backend:
```bash
cd backend
mvn verify
```
*(Nota: `HealthIntegrationTest` usa Testcontainers con `postgres:16-alpine`; requiere Docker en ejecución y se omite automáticamente si el daemon no está activo en local).*

### 3. Frontend (Node 22+ / Vite)
```bash
cd frontend
npm install
npm run dev
```
Lint, pruebas unitarias y build:
```bash
cd frontend
npm run lint
npm test
npm run build
```

---

## 📚 Documentación y Hoja de Ruta

- **Decisiones técnicas (ADRs):** [`docs/decisiones.md`](docs/decisiones.md)
- **Estado actual de fase:** **Fase 1 completada** (cimientos del monorepo, PostgreSQL + Flyway, `/api/v1/health`, RFC 7807 Problem Details, seguridad base y CI).
