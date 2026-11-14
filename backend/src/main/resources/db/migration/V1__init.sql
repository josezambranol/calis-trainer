-- Migración inicial V1 para CalisHome
-- Activa pgcrypto para generación segura de UUIDs en PostgreSQL (Fase 2+)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
