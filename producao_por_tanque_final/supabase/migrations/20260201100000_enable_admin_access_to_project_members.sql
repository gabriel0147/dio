-- Allow Admins and Directors to manage project members and team roles
-- This relies on the function public.is_admin_or_director() created in previous migrations

-- 1. Project Members Policies
-- Drop potential conflicting policies if any specific admin policy exists, though previous migrations focused on other tables
DROP POLICY IF EXISTS "Admins and Directors can manage project members" ON public.project_members;

CREATE POLICY "Admins and Directors can manage project members"
    ON public.project_members
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );

-- 2. Project Team Roles Policies
DROP POLICY IF EXISTS "Admins and Directors can manage project team roles" ON public.project_team_roles;

CREATE POLICY "Admins and Directors can manage project team roles"
    ON public.project_team_roles
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );
