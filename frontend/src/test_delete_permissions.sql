-- ============================================================================
-- Test Delete Permissions
-- ============================================================================
-- Run this to check if your RLS policies are set up correctly
-- ============================================================================

-- 1. Check current UPDATE policy
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks' AND policyname = 'Users can update own tasks';

-- 2. Test if you can see your own tasks
SELECT id, text, user_id, deleted_at 
FROM tasks 
WHERE user_id = auth.uid() 
LIMIT 5;

-- 3. Check if UPDATE policy has WITH CHECK clause
-- If with_check is NULL, that's the problem!

