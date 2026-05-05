-- ============================================================================
-- Test: Try Hard Delete Instead of Soft Delete
-- ============================================================================
-- This tests if the DELETE policy works (which should be simpler)
-- ============================================================================

-- The DELETE policy should already exist:
-- "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id)

-- Test by manually deleting a task (replace with your task ID):
-- DELETE FROM tasks WHERE id = 'your-task-id-here' AND user_id = auth.uid();

