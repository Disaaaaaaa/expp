-- ========================================
-- EXPP: Оқу топтары (Classes) кестелері
-- Supabase SQL Editor-да іске қосыңыз
-- ========================================

-- 1. classes кестесі
CREATE TABLE IF NOT EXISTS classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. class_members кестесі
CREATE TABLE IF NOT EXISTS class_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- 3. RLS қосу
ALTER TABLE classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- 4. classes саясаттары
DROP POLICY IF EXISTS "teachers_own_classes"   ON classes;
DROP POLICY IF EXISTS "students_view_classes"  ON classes;

CREATE POLICY "teachers_own_classes" ON classes
  USING (teacher_id = auth.uid());

CREATE POLICY "students_view_classes" ON classes
  FOR SELECT USING (
    id IN (
      SELECT class_id FROM class_members WHERE student_id = auth.uid()
    )
  );

-- 5. class_members саясаттары
DROP POLICY IF EXISTS "teacher_manage_members"      ON class_members;
DROP POLICY IF EXISTS "student_view_own_membership" ON class_members;

CREATE POLICY "teacher_manage_members" ON class_members
  USING (
    class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  );

CREATE POLICY "student_view_own_membership" ON class_members
  FOR SELECT USING (student_id = auth.uid());

-- 6. task_assignments кестесіне class_id бағаны қосу
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE SET NULL;
