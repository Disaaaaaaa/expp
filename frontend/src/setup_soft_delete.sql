-- ============================================================================
-- Setup Soft Delete for Tasks - RUN THIS FIRST
-- ============================================================================
-- This creates a function that will reliably handle soft deletes
-- ============================================================================

-- Step 1: Fix the UPDATE policy
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 2: Create the soft delete function
DROP FUNCTION IF EXISTS soft_delete_tasks(UUID[], UUID);

CREATE OR REPLACE FUNCTION soft_delete_tasks(
    task_ids UUID[],
    current_user_id UUID DEFAULT auth.uid()
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Update tasks that belong to the user and are not already deleted
    UPDATE tasks
    SET deleted_at = NOW()
    WHERE id = ANY(task_ids)
      AND user_id = current_user_id
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION soft_delete_tasks(UUID[], UUID) TO authenticated;

-- Test the function (optional - remove after testing)
-- SELECT soft_delete_tasks(ARRAY['your-task-id-here']::UUID[], auth.uid());

