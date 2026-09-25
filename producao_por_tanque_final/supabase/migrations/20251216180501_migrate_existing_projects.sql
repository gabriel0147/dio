-- Populate project_members from existing projects (assuming user_id column still exists)
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, user_id, 'owner'::public.project_role
FROM public.projects
WHERE user_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;
