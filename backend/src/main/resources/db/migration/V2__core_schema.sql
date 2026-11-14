-- Migración V2: Modelo de datos principal para autenticación, perfiles, ejercicios e historial

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(120) NOT NULL,
    auth_provider VARCHAR(30) NOT NULL DEFAULT 'LOCAL',
    google_sub VARCHAR(255) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(30) NOT NULL DEFAULT 'USER',
    plan_tier VARCHAR(30) NOT NULL DEFAULT 'FREE',
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_auth_provider CHECK (auth_provider IN ('LOCAL', 'GOOGLE', 'BOTH')),
    CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT chk_users_plan_tier CHECK (plan_tier IN ('FREE', 'PREMIUM'))
);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL DEFAULT 'principiante',
    goal VARCHAR(40) NOT NULL DEFAULT 'fuerza_hipertrofia',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    scheduled_days JSONB NOT NULL DEFAULT '["lunes","miercoles","viernes"]'::jsonb,
    reminder_time VARCHAR(5) NOT NULL DEFAULT '19:00',
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Bogota',
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    voice_coach_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    streak INTEGER NOT NULL DEFAULT 0,
    last_completed_local_date DATE,
    total_workouts_completed INTEGER NOT NULL DEFAULT 0,
    adaptation_score INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_profile_level CHECK (level IN ('principiante', 'intermedio', 'avanzado')),
    CONSTRAINT chk_profile_goal CHECK (goal IN ('fuerza_hipertrofia', 'resistencia_quemagrasa', 'movilidad_salud')),
    CONSTRAINT chk_profile_duration CHECK (duration_minutes IN (15, 30, 45)),
    CONSTRAINT chk_profile_adaptation CHECK (adaptation_score BETWEEN -3 AND 3)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_token_id UUID,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);

CREATE TABLE exercises (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    target_muscle VARCHAR(150) NOT NULL,
    category VARCHAR(20) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    exercise_type VARCHAR(10) NOT NULL,
    default_amount INTEGER NOT NULL,
    rest_seconds INTEGER NOT NULL,
    instructions JSONB NOT NULL,
    tips TEXT NOT NULL,
    equipment VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_exercise_category CHECK (category IN ('push', 'pull', 'legs', 'core')),
    CONSTRAINT chk_exercise_difficulty CHECK (difficulty IN ('principiante', 'intermedio', 'avanzado')),
    CONSTRAINT chk_exercise_type CHECK (exercise_type IN ('reps', 'time'))
);

CREATE INDEX idx_exercises_category_difficulty ON exercises(category, difficulty);

CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    routine_title VARCHAR(150) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    local_date DATE NOT NULL,
    duration_seconds INTEGER NOT NULL,
    exercises_completed INTEGER NOT NULL,
    feedback VARCHAR(20) NOT NULL,
    adaptation_score_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_workout_feedback CHECK (feedback IN ('too_easy', 'just_right', 'too_hard'))
);

CREATE INDEX idx_workout_logs_user_completed ON workout_logs(user_id, completed_at DESC);
