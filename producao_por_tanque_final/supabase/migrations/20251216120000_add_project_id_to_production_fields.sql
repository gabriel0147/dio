ALTER TABLE public.production_fields ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_production_fields_project_id ON public.production_fields(project_id);

-- Update RLS policies (optional but good practice)
-- Ensure users can see fields of their projects (assuming project access control exists via user_id on projects or similar)
-- For now, we rely on existing 'Authenticated users can view production_fields' policy which is permissive (true).
