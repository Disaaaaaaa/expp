-- ============================================================================
-- EXPP Database Schema for Supabase
-- ============================================================================
-- This file contains the complete database schema including:
-- - User profiles and authentication
-- - User settings
-- - Tasks and task sheets
-- - Task and sheet submissions
-- - Statistics and progress tracking
-- - Spaced repetition system
-- - Adaptive learning metrics
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- User profiles linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON profiles(is_admin) WHERE is_admin = TRUE;

-- Trigger function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, preferences)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->'preferences', '{}'::jsonb)
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' NOT NULL CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en' NOT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Trigger to create user_settings when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger for creating settings on profile creation
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile();

-- Trigger for user_settings updated_at
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium' NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    answers JSONB,
    solution TEXT,
    explanation TEXT,
    context TEXT,
    instructions TEXT,
    learning_outcome TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view own non-deleted tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks including deleted"
    ON tasks FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can manage all tasks"
    ON tasks FOR ALL
    USING (is_admin());

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_type_idx ON tasks(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_topic_idx ON tasks(topic) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_difficulty_idx ON tasks(difficulty) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_tags_idx ON tasks USING GIN(tags) WHERE deleted_at IS NULL;

-- Trigger for tasks updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TASK SHEETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_sheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tasks UUID[] NOT NULL DEFAULT '{}'::UUID[],
    tags TEXT[] DEFAULT '{}'::TEXT[],
    is_template BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE task_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_sheets
CREATE POLICY "Users can view own task sheets"
    ON task_sheets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create task sheets"
    ON task_sheets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sheets"
    ON task_sheets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sheets"
    ON task_sheets FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for task_sheets
CREATE INDEX IF NOT EXISTS task_sheets_user_id_idx ON task_sheets(user_id);
CREATE INDEX IF NOT EXISTS task_sheets_tasks_gin_idx ON task_sheets USING GIN(tasks);
CREATE INDEX IF NOT EXISTS task_sheets_tags_idx ON task_sheets USING GIN(tags);
CREATE INDEX IF NOT EXISTS task_sheets_created_at_idx ON task_sheets(created_at DESC);

-- Function to validate task IDs in task_sheets
CREATE OR REPLACE FUNCTION validate_task_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.tasks) AS task_id
        LEFT JOIN tasks ON tasks.id = task_id
        WHERE tasks.id IS NULL OR tasks.deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Invalid or deleted task ID found in tasks array';
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to validate task IDs
DROP TRIGGER IF EXISTS validate_task_sheet_tasks ON task_sheets;
CREATE TRIGGER validate_task_sheet_tasks
    BEFORE INSERT OR UPDATE ON task_sheets
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_ids();

-- Trigger for task_sheets updated_at
DROP TRIGGER IF EXISTS update_task_sheets_updated_at ON task_sheets;
CREATE TRIGGER update_task_sheets_updated_at
    BEFORE UPDATE ON task_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TASK SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    sheet_id UUID REFERENCES task_sheets(id) ON DELETE SET NULL,
    is_correct BOOLEAN NOT NULL,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    time_spent INTEGER NOT NULL CHECK (time_spent >= 0),
    user_answer TEXT,
    user_solution TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic TEXT,
    question_type TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_submissions
CREATE POLICY "Users can view own task submissions"
    ON task_submissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task submissions"
    ON task_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes for task_submissions
CREATE INDEX IF NOT EXISTS task_submissions_user_id_idx ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS task_submissions_task_id_idx ON task_submissions(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS task_submissions_sheet_id_idx ON task_submissions(sheet_id) WHERE sheet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS task_submissions_submitted_at_idx ON task_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS task_submissions_topic_idx ON task_submissions(topic) WHERE topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS task_submissions_difficulty_idx ON task_submissions(difficulty) WHERE difficulty IS NOT NULL;

-- ============================================================================
-- SHEET SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sheet_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sheet_id UUID REFERENCES task_sheets(id) ON DELETE SET NULL,
    total_tasks INTEGER NOT NULL CHECK (total_tasks > 0),
    correct_tasks INTEGER NOT NULL CHECK (correct_tasks >= 0 AND correct_tasks <= total_tasks),
    accuracy DECIMAL(5,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    total_time_spent INTEGER NOT NULL CHECK (total_time_spent >= 0),
    average_time_per_task DECIMAL(10,2) CHECK (average_time_per_task >= 0),
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE sheet_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sheet_submissions
CREATE POLICY "Users can view own sheet submissions"
    ON sheet_submissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sheet submissions"
    ON sheet_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes for sheet_submissions
CREATE INDEX IF NOT EXISTS sheet_submissions_user_id_idx ON sheet_submissions(user_id);
CREATE INDEX IF NOT EXISTS sheet_submissions_sheet_id_idx ON sheet_submissions(sheet_id) WHERE sheet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sheet_submissions_submitted_at_idx ON sheet_submissions(submitted_at DESC);

-- ============================================================================
-- USER STATISTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    solved_tasks INTEGER DEFAULT 0 NOT NULL CHECK (solved_tasks >= 0),
    total_task_attempts INTEGER DEFAULT 0 NOT NULL CHECK (total_task_attempts >= 0),
    solved_sheets INTEGER DEFAULT 0 NOT NULL CHECK (solved_sheets >= 0),
    total_sheet_attempts INTEGER DEFAULT 0 NOT NULL CHECK (total_sheet_attempts >= 0),
    success_rate DECIMAL(5,2) DEFAULT 0 NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
    average_score DECIMAL(5,2) DEFAULT 0 NOT NULL CHECK (average_score >= 0 AND average_score <= 100),
    total_time_spent INTEGER DEFAULT 0 NOT NULL CHECK (total_time_spent >= 0),
    tasks_by_difficulty JSONB DEFAULT '{"easy": 0, "medium": 0, "hard": 0}'::jsonb NOT NULL,
    tasks_by_topic JSONB DEFAULT '{}'::jsonb NOT NULL,
    tasks_by_type JSONB DEFAULT '{}'::jsonb NOT NULL,
    recent_activity INTEGER DEFAULT 0 NOT NULL CHECK (recent_activity >= 0),
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_statistics
CREATE POLICY "Users can view own statistics"
    ON user_statistics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics"
    ON user_statistics FOR UPDATE
    USING (auth.uid() = user_id);

-- Index for user_statistics
CREATE INDEX IF NOT EXISTS user_statistics_user_id_idx ON user_statistics(user_id);

-- Trigger for user_statistics updated_at
DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at
    BEFORE UPDATE ON user_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0 NOT NULL CHECK (tasks_completed >= 0),
    sheets_completed INTEGER DEFAULT 0 NOT NULL CHECK (sheets_completed >= 0),
    time_spent INTEGER DEFAULT 0 NOT NULL CHECK (time_spent >= 0),
    accuracy DECIMAL(5,2) DEFAULT 0 NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes for user_progress
CREATE INDEX IF NOT EXISTS user_progress_user_id_idx ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS user_progress_date_idx ON user_progress(date DESC);
CREATE INDEX IF NOT EXISTS user_progress_user_date_idx ON user_progress(user_id, date DESC);

-- ============================================================================
-- SPACED REPETITION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS spaced_repetition (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    last_reviewed TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    next_review TIMESTAMPTZ NOT NULL,
    review_count INTEGER DEFAULT 0 NOT NULL CHECK (review_count >= 0),
    ease_factor DECIMAL(4,2) DEFAULT 2.5 NOT NULL CHECK (ease_factor >= 1.3 AND ease_factor <= 3.0),
    interval INTEGER DEFAULT 1 NOT NULL CHECK (interval >= 1),
    correct_count INTEGER DEFAULT 0 NOT NULL CHECK (correct_count >= 0),
    incorrect_count INTEGER DEFAULT 0 NOT NULL CHECK (incorrect_count >= 0),
    streak INTEGER DEFAULT 0 NOT NULL CHECK (streak >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, question_id)
);

-- Enable Row Level Security
ALTER TABLE spaced_repetition ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spaced_repetition
CREATE POLICY "Users can view own spaced repetition items"
    ON spaced_repetition FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spaced repetition items"
    ON spaced_repetition FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spaced repetition items"
    ON spaced_repetition FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spaced repetition items"
    ON spaced_repetition FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for spaced_repetition
CREATE INDEX IF NOT EXISTS spaced_repetition_user_id_idx ON spaced_repetition(user_id);
CREATE INDEX IF NOT EXISTS spaced_repetition_question_id_idx ON spaced_repetition(question_id);
CREATE INDEX IF NOT EXISTS spaced_repetition_next_review_idx ON spaced_repetition(next_review);
CREATE INDEX IF NOT EXISTS spaced_repetition_user_next_review_idx ON spaced_repetition(user_id, next_review);

-- Trigger for spaced_repetition updated_at
DROP TRIGGER IF EXISTS update_spaced_repetition_updated_at ON spaced_repetition;
CREATE TRIGGER update_spaced_repetition_updated_at
    BEFORE UPDATE ON spaced_repetition
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADAPTIVE LEARNING METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS adaptive_metrics (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    question_history JSONB DEFAULT '[]'::jsonb NOT NULL,
    topic_mastery JSONB DEFAULT '{}'::jsonb NOT NULL,
    learning_style JSONB DEFAULT '{
        "preferred_difficulty": "medium",
        "optimal_time_per_question": 300,
        "topic_engagement": {}
    }'::jsonb NOT NULL,
    overall_score DECIMAL(5,2) DEFAULT 0 NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    improvement_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    weak_areas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    strong_areas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE adaptive_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for adaptive_metrics
CREATE POLICY "Users can view own adaptive metrics"
    ON adaptive_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own adaptive metrics"
    ON adaptive_metrics FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adaptive metrics"
    ON adaptive_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Index for adaptive_metrics
CREATE INDEX IF NOT EXISTS adaptive_metrics_user_id_idx ON adaptive_metrics(user_id);

-- Trigger for adaptive_metrics updated_at
DROP TRIGGER IF EXISTS update_adaptive_metrics_updated_at ON adaptive_metrics;
CREATE TRIGGER update_adaptive_metrics_updated_at
    BEFORE UPDATE ON adaptive_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STATISTICS UPDATE FUNCTIONS
-- ============================================================================

-- Function to update user statistics when a task submission is created
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_is_correct BOOLEAN;
    v_difficulty TEXT;
    v_topic TEXT;
    v_type TEXT;
    v_score DECIMAL;
    v_time_spent INTEGER;
    v_current_stats RECORD;
BEGIN
    v_user_id := NEW.user_id;
    v_is_correct := NEW.is_correct;
    v_difficulty := COALESCE(NEW.difficulty, 'medium');
    v_topic := COALESCE(NEW.topic, 'unknown');
    v_type := COALESCE(NEW.question_type, 'unknown');
    v_score := NEW.score;
    v_time_spent := NEW.time_spent;

    -- Get current statistics
    SELECT * INTO v_current_stats
    FROM user_statistics
    WHERE user_id = v_user_id;

    -- Insert or update user statistics
    IF v_current_stats IS NULL THEN
        INSERT INTO user_statistics (
            user_id,
            solved_tasks,
            total_task_attempts,
            success_rate,
            average_score,
            total_time_spent,
            tasks_by_difficulty,
            tasks_by_topic,
            tasks_by_type,
            recent_activity,
            last_activity_at,
            updated_at
        )
        VALUES (
            v_user_id,
            CASE WHEN v_is_correct THEN 1 ELSE 0 END,
            1,
            CASE WHEN v_is_correct THEN 100.0 ELSE 0.0 END,
            v_score,
            v_time_spent,
            jsonb_build_object(
                v_difficulty, CASE WHEN v_is_correct THEN 1 ELSE 0 END,
                'total_' || v_difficulty, 1
            ),
            jsonb_build_object(
                v_topic,
                jsonb_build_object(
                    'correct', CASE WHEN v_is_correct THEN 1 ELSE 0 END,
                    'total', 1
                )
            ),
            jsonb_build_object(
                v_type,
                jsonb_build_object(
                    'correct', CASE WHEN v_is_correct THEN 1 ELSE 0 END,
                    'total', 1
                )
            ),
            1,
            NOW(),
            NOW()
        );
    ELSE
        UPDATE user_statistics
        SET
            solved_tasks = solved_tasks + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
            total_task_attempts = total_task_attempts + 1,
            success_rate = CASE
                WHEN total_task_attempts + 1 > 0 THEN
                    ((solved_tasks + CASE WHEN v_is_correct THEN 1 ELSE 0 END)::DECIMAL / (total_task_attempts + 1)) * 100
                ELSE 0
            END,
            average_score = CASE
                WHEN total_task_attempts + 1 > 0 THEN
                    ((average_score * total_task_attempts + v_score) / (total_task_attempts + 1))
                ELSE v_score
            END,
            total_time_spent = total_time_spent + v_time_spent,
            tasks_by_difficulty = jsonb_set(
                COALESCE(tasks_by_difficulty, '{"easy": 0, "medium": 0, "hard": 0}'::jsonb),
                ARRAY[v_difficulty],
                to_jsonb(
                    COALESCE((tasks_by_difficulty->>v_difficulty)::INTEGER, 0) +
                    CASE WHEN v_is_correct THEN 1 ELSE 0 END
                )
            ) || jsonb_build_object(
                'total_' || v_difficulty,
                COALESCE((tasks_by_difficulty->>('total_' || v_difficulty))::INTEGER, 0) + 1
            ),
            tasks_by_topic = COALESCE(tasks_by_topic, '{}'::jsonb) || jsonb_build_object(
                v_topic,
                jsonb_build_object(
                    'correct',
                    COALESCE((tasks_by_topic->v_topic->>'correct')::INTEGER, 0) +
                    CASE WHEN v_is_correct THEN 1 ELSE 0 END,
                    'total',
                    COALESCE((tasks_by_topic->v_topic->>'total')::INTEGER, 0) + 1
                )
            ),
            tasks_by_type = COALESCE(tasks_by_type, '{}'::jsonb) || jsonb_build_object(
                v_type,
                jsonb_build_object(
                    'correct',
                    COALESCE((tasks_by_type->v_type->>'correct')::INTEGER, 0) +
                    CASE WHEN v_is_correct THEN 1 ELSE 0 END,
                    'total',
                    COALESCE((tasks_by_type->v_type->>'total')::INTEGER, 0) + 1
                )
            ),
            recent_activity = recent_activity + 1,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to update statistics when a task submission is created
DROP TRIGGER IF EXISTS task_submission_statistics_trigger ON task_submissions;
CREATE TRIGGER task_submission_statistics_trigger
    AFTER INSERT ON task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_statistics();

-- Function to update sheet statistics
CREATE OR REPLACE FUNCTION update_sheet_statistics()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_accuracy DECIMAL;
    v_current_stats RECORD;
BEGIN
    v_user_id := NEW.user_id;
    v_accuracy := NEW.accuracy;

    -- Get current statistics
    SELECT * INTO v_current_stats
    FROM user_statistics
    WHERE user_id = v_user_id;

    -- Insert or update user statistics for sheet completion
    IF v_current_stats IS NULL THEN
        INSERT INTO user_statistics (
            user_id,
            solved_sheets,
            total_sheet_attempts,
            updated_at
        )
        VALUES (
            v_user_id,
            CASE WHEN v_accuracy >= 60 THEN 1 ELSE 0 END,
            1,
            NOW()
        );
    ELSE
        UPDATE user_statistics
        SET
            solved_sheets = solved_sheets + CASE WHEN v_accuracy >= 60 THEN 1 ELSE 0 END,
            total_sheet_attempts = total_sheet_attempts + 1,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to update statistics when a sheet submission is created
DROP TRIGGER IF EXISTS sheet_submission_statistics_trigger ON sheet_submissions;
CREATE TRIGGER sheet_submission_statistics_trigger
    AFTER INSERT ON sheet_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_sheet_statistics();

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
-- Uses SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Direct query with SECURITY DEFINER bypasses RLS
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND is_admin = TRUE
    );
END;
$$;

-- Function to make a user admin (only admins can use this)
CREATE OR REPLACE FUNCTION make_admin(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can make other users admins';
    END IF;

    UPDATE profiles
    SET is_admin = TRUE
    WHERE id = target_user_id;
END;
$$;

-- Function to remove admin privileges (only admins can use this)
CREATE OR REPLACE FUNCTION remove_admin(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can remove admin privileges';
    END IF;

    UPDATE profiles
    SET is_admin = FALSE
    WHERE id = target_user_id;
END;
$$;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policy: Avatar images are publicly accessible
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's daily progress summary
CREATE OR REPLACE FUNCTION get_user_daily_progress(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    tasks_completed INTEGER,
    sheets_completed INTEGER,
    time_spent INTEGER,
    accuracy DECIMAL
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.date,
        up.tasks_completed,
        up.sheets_completed,
        up.time_spent,
        up.accuracy
    FROM user_progress up
    WHERE up.user_id = p_user_id
        AND up.date = p_date;
END;
$$;

-- Function to get user's statistics summary
CREATE OR REPLACE FUNCTION get_user_statistics_summary(p_user_id UUID)
RETURNS TABLE (
    solved_tasks INTEGER,
    total_task_attempts INTEGER,
    solved_sheets INTEGER,
    total_sheet_attempts INTEGER,
    success_rate DECIMAL,
    average_score DECIMAL,
    total_time_spent INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        us.solved_tasks,
        us.total_task_attempts,
        us.solved_sheets,
        us.total_sheet_attempts,
        us.success_rate,
        us.average_score,
        us.total_time_spent
    FROM user_statistics us
    WHERE us.user_id = p_user_id;
END;
$$;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
