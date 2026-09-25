-- Make project_id nullable to support global categories
ALTER TABLE public.transfer_destination_categories ALTER COLUMN project_id DROP NOT NULL;

-- Add a unique index for global categories to prevent duplicates (name must be unique among globals)
CREATE UNIQUE INDEX IF NOT EXISTS unique_global_transfer_category_name ON public.transfer_destination_categories (name) WHERE project_id IS NULL;
