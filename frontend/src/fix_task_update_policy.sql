-- ============================================================================
-- Fix Task Update RLS Policy
-- ============================================================================
-- This script fixes the UPDATE policy for tasks table to allow soft deletes
-- The policy was missing the WITH CHECK clause which is required for UPDATE
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;

-- Recreate the policy with both USING and WITH CHECK clauses
CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

