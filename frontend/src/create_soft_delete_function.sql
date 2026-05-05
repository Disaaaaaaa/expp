-- ============================================================================
-- Create Soft Delete Function for Tasks
-- ============================================================================
-- This function uses SECURITY DEFINER to bypass RLS and handle soft deletes
-- ============================================================================

-- Drop function if it exists
DROP FUNCTION IF EXISTS soft_delete_tasks(UUID[], UUID);

-- Create function to soft delete tasks
CREATE OR REPLACE FUNCTION soft_delete_tasks(
    task_ids UUID[],
    current_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(deleted_count INTEGER)
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
    
    RETURN QUERY SELECT deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_tasks(UUID[], UUID) TO authenticated;

