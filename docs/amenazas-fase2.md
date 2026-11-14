# Modelo de Amenazas — Fase 2 (Autenticación y Modelo de Datos)

## 1. Activos críticos
- **Credenciales de usuario:** contraseñas y vínculos OIDC (`users.password_hash`, `users.google_sub`).
- **Sesiones:** Access tokens JWT y Refresh tokens opacos (`refresh_tokens`).
- **Flujos de recuperación:** tokens de verificación de correo y restablecimiento de contraseña.
- **Disponibilidad:** endpoints públicos de autenticación (`/api/v1/auth/**`).

## 2. Amenazas identificadas y controles implementados

| Amenaza | Vector de ataque | Mitigación implementada |
|---|---|---|
| **Filtración de contraseñas en BD** | Acceso no autorizado a tabla `users` | Hashing con **Argon2id** (`Argon2PasswordEncoder` + BouncyCastle `1.87`), resistente a GPU/ASIC. |
| **Robo o filtración de tokens en BD** | Lectura de `refresh_tokens` / `password_reset_tokens` | Solo se persiste el digest **SHA-256** del token opaco de 256 bits (`TokenHashService`), nunca el valor en claro. |
| **Robo de Refresh Token por XSS** | Inyección JS leyendo `localStorage` | El refresh token viaja únicamente en cookie **`HttpOnly`** restringida a `/api/v1/auth`, con `Secure` en producción y `SameSite`. |
| **Replay de Refresh Token robado** | Un atacante usa un refresh token ya rotado | **Detección de reuso por `family_id`:** al detectar un token con `revoked_at != null`, se revoca toda la familia de tokens inmediatamente. |
| **CSRF en `/refresh` o `/logout`** | Sitio externo fuerza peticiones con la cookie | Protección **CSRF explícita** (`CookieCsrfTokenRepository` + `SpaCsrfTokenRequestHandler`) exigiendo `X-XSRF-TOKEN` en `/refresh` y `/logout`. |
| **Fuerza bruta / Credential stuffing** | Pruebas masivas de contraseñas | **Bloqueo temporal** (15 min tras 5 fallos, `423 Locked`) con `noRollbackFor = ApiException.class` + **Rate Limiting** con Bucket4j por IP. |
| **Enumeración de cuentas** | Probar correos en login / forgot-password | Respuestas uniformes en `/login` (`401`), `/forgot-password` (`202`) y `/resend-verification` (`202`). |
| **Suplantación en login con Google** | Cliente envía email/sub falsificados en JSON | El servidor verifica criptográficamente el `idToken` contra las llaves JWKS de Google (`iss`, `aud`, `exp`, `email_verified=true`). |
| **Sesiones zombis tras cambio de clave** | Atacante mantiene sesión vieja tras reset | `resetPassword` revoca todos los `refresh_tokens` activos del usuario. |

## 3. Riesgos residuales (a cubrir en Fases 5 y 8)
1. **Rate limiter en memoria:** `AuthRateLimiter` usa `ConcurrentHashMap` local por instancia; si el backend escala a múltiples réplicas en Fase 8, deberá respaldarse con Redis o almacenamiento compartido.
2. **Headers de seguridad y CORS por entorno:** Se endurecerán de forma integral en la **Fase 5** (CSP, HSTS, CORS estricto por perfil).
