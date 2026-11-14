-- Migración V6: Biometría, programación por fechas con verificación de faltas y registro nutricional

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2) NOT NULL DEFAULT 72.00,
    ADD COLUMN IF NOT EXISTS height_cm INTEGER NOT NULL DEFAULT 173,
    ADD COLUMN IF NOT EXISTS age INTEGER NOT NULL DEFAULT 27,
    ADD COLUMN IF NOT EXISTS biological_sex VARCHAR(10) NOT NULL DEFAULT 'M',
    ADD COLUMN IF NOT EXISTS activity_level VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
    ADD COLUMN IF NOT EXISTS daily_water_goal_ml INTEGER NOT NULL DEFAULT 2500;

ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS chk_profile_weight_kg,
    DROP CONSTRAINT IF EXISTS chk_profile_height_cm,
    DROP CONSTRAINT IF EXISTS chk_profile_age,
    DROP CONSTRAINT IF EXISTS chk_profile_sex,
    DROP CONSTRAINT IF EXISTS chk_profile_activity,
    DROP CONSTRAINT IF EXISTS chk_profile_water_goal;

ALTER TABLE user_profiles
    ADD CONSTRAINT chk_profile_weight_kg CHECK (weight_kg BETWEEN 30 AND 250),
    ADD CONSTRAINT chk_profile_height_cm CHECK (height_cm BETWEEN 120 AND 230),
    ADD CONSTRAINT chk_profile_age CHECK (age BETWEEN 14 AND 95),
    ADD CONSTRAINT chk_profile_sex CHECK (biological_sex IN ('M', 'F')),
    ADD CONSTRAINT chk_profile_activity CHECK (activity_level IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE')),
    ADD CONSTRAINT chk_profile_water_goal CHECK (daily_water_goal_ml BETWEEN 1000 AND 6000);

CREATE TABLE IF NOT EXISTS scheduled_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    routine_title VARCHAR(150) NOT NULL,
    focus VARCHAR(150) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(25) NOT NULL DEFAULT 'SCHEDULED',
    missed_reason VARCHAR(120),
    completed_workout_id UUID REFERENCES workout_logs(id) ON DELETE SET NULL,
    rescheduled_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scheduled_user_date UNIQUE (user_id, scheduled_date),
    CONSTRAINT chk_scheduled_status CHECK (status IN ('SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_user_date
    ON scheduled_workouts (user_id, scheduled_date DESC);

CREATE TABLE IF NOT EXISTS nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    food_name VARCHAR(140) NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    protein_grams NUMERIC(6,1) NOT NULL DEFAULT 0,
    carbs_grams NUMERIC(6,1) NOT NULL DEFAULT 0,
    fats_grams NUMERIC(6,1) NOT NULL DEFAULT 0,
    water_ml INTEGER NOT NULL DEFAULT 0,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_nutrition_meal_type CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'HYDRATION')),
    CONSTRAINT chk_nutrition_non_negative CHECK (
        calories >= 0 AND protein_grams >= 0 AND carbs_grams >= 0 AND fats_grams >= 0 AND water_ml >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date
    ON nutrition_logs (user_id, local_date DESC, logged_at DESC);
