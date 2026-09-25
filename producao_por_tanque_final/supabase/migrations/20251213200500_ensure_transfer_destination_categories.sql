CREATE TABLE IF NOT EXISTS public.transfer_destination_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Ensure the trigger exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transfer_destination_categories_modtime') THEN
        CREATE TRIGGER update_transfer_destination_categories_modtime
            BEFORE UPDATE ON public.transfer_destination_categories
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
    END IF;
END
$$;

-- Force schema cache reload by notifying pgrst
NOTIFY pgrst, 'reload config';
