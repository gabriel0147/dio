-- 1. Modify audit_logs table
ALTER TABLE public.audit_logs ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. Create teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    owner_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Create team_members table
CREATE TYPE public.team_role AS ENUM ('team_admin', 'team_member');

CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.team_role NOT NULL DEFAULT 'team_member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(team_id, user_id)
);

-- 4. Create project_team_roles table
CREATE TABLE public.project_team_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    role public.project_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(project_id, team_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_roles ENABLE ROW LEVEL SECURITY;

-- Policies for Teams
-- Everyone can view teams they are member of or owner of
CREATE POLICY "Users can view teams they belong to" ON public.teams
    FOR SELECT
    USING (
        auth.uid() = owner_user_id OR
        EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
    );

-- Owners can update their teams
CREATE POLICY "Owners can update their teams" ON public.teams
    FOR UPDATE
    USING (auth.uid() = owner_user_id);

-- Owners can delete their teams
CREATE POLICY "Owners can delete their teams" ON public.teams
    FOR DELETE
    USING (auth.uid() = owner_user_id);

-- Authenticated users can create teams
CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);

-- Policies for Team Members
-- Team members can view other members of their teams
CREATE POLICY "View team members" ON public.team_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teams t 
            WHERE t.id = team_members.team_id 
            AND (t.owner_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid()))
        )
    );

-- Team owners and team admins can manage members
CREATE POLICY "Manage team members" ON public.team_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_members.team_id
            AND (
                t.owner_user_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid() AND tm.role = 'team_admin')
            )
        )
    );

-- Policies for Project Team Roles
-- Project members (owners) can manage team assignments
CREATE POLICY "Project owners can manage team roles" ON public.project_team_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_team_roles.project_id
            AND pm.user_id = auth.uid()
            AND pm.role = 'owner'
        )
    );

-- Users can view team roles if they are in the project or in the team assigned
CREATE POLICY "View project team roles" ON public.project_team_roles
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_team_roles.project_id AND pm.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = project_team_roles.team_id AND tm.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.teams t WHERE t.id = project_team_roles.team_id AND t.owner_user_id = auth.uid())
    );
