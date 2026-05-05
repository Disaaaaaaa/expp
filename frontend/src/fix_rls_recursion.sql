-- ============================================================================
-- Fix RLS Infinite Recursion Issue
-- ============================================================================
-- This script fixes the infinite recursion in RLS policies by using
-- the is_admin() function instead of direct queries to profiles table
-- ============================================================================

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all tasks including deleted" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;

-- Recreate policies using is_admin() function to avoid recursion
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can view all tasks including deleted"
    ON tasks FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can manage all tasks"
    ON tasks FOR ALL
    USING (is_admin());

-- Ensure is_admin() function exists and is correct
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

