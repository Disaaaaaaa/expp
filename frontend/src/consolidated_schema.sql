-- ============================================================================
-- EXPP Consolidated Database Schema for Supabase
-- ============================================================================
-- WARNING: Running this will drop existing tables and data!
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE TABLES
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

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' NOT NULL CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en' NOT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tasks
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

-- Task Sheets
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

-- 3. RESULT & SUBMISSION TABLES
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

-- 4. STATISTICS & PROGRESS
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    solved_tasks INTEGER DEFAULT 0 NOT NULL,
    total_task_attempts INTEGER DEFAULT 0 NOT NULL,
    solved_sheets INTEGER DEFAULT 0 NOT NULL,
    total_sheet_attempts INTEGER DEFAULT 0 NOT NULL,
    success_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    average_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    total_time_spent INTEGER DEFAULT 0 NOT NULL,
    tasks_by_difficulty JSONB DEFAULT '{"easy": 0, "medium": 0, "hard": 0}'::jsonb NOT NULL,
    tasks_by_topic JSONB DEFAULT '{}'::jsonb NOT NULL,
    tasks_by_type JSONB DEFAULT '{}'::jsonb NOT NULL,
    recent_activity INTEGER DEFAULT 0 NOT NULL,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0 NOT NULL,
    sheets_completed INTEGER DEFAULT 0 NOT NULL,
    time_spent INTEGER DEFAULT 0 NOT NULL,
    accuracy DECIMAL(5,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, date)
);

-- 5. ADVANCED FEATURES
CREATE TABLE IF NOT EXISTS spaced_repetition (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    last_reviewed TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    next_review TIMESTAMPTZ NOT NULL,
    review_count INTEGER DEFAULT 0 NOT NULL,
    ease_factor DECIMAL(4,2) DEFAULT 2.5 NOT NULL,
    interval INTEGER DEFAULT 1 NOT NULL,
    streak INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS adaptive_metrics (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    question_history JSONB DEFAULT '[]'::jsonb NOT NULL,
    topic_mastery JSONB DEFAULT '{}'::jsonb NOT NULL,
    learning_style JSONB DEFAULT '{"preferred_difficulty": "medium"}'::jsonb NOT NULL,
    overall_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. SECURITY HELPER: IS_ADMIN
-- SECURITY DEFINER is crucial here to avoid recursion in RLS
CREATE OR REPLACE FUNCTION is_admin(request_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = request_user_id AND is_admin = TRUE
    );
END;
$$;

-- 7. ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_repetition ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_metrics ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES (Fixed recursive issues)
CREATE POLICY "Profiles: Users can view/update own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Profiles: Admins can view all" ON profiles FOR SELECT USING (is_admin());

CREATE POLICY "Settings: Users can manage own" ON user_settings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Tasks: Users can view own non-deleted" ON tasks FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Tasks: Users can manage own" ON tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tasks: Admins can view all" ON tasks FOR SELECT USING (is_admin());

CREATE POLICY "Sheets: Users manage own" ON task_sheets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Submissions: Users manage own" ON task_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Stats/Progress: Users view own" ON user_statistics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "SpacedRep: Users manage own" ON spaced_repetition FOR ALL USING (auth.uid() = user_id);

-- 9. FUNCTIONS & TRIGGERS
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''));
    RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create settings
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;
CREATE TRIGGER on_profile_created AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- Soft delete function (Bypasses RLS for safety)
CREATE OR REPLACE FUNCTION soft_delete_tasks(task_ids UUID[], current_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE deleted_count INTEGER;
BEGIN
    UPDATE tasks SET deleted_at = NOW() WHERE id = ANY(task_ids) AND user_id = current_user_id AND deleted_at IS NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
GRANT EXECUTE ON FUNCTION soft_delete_tasks(UUID[], UUID) TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER update_profiles_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
