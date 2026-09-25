-- Create production_fields table
CREATE TABLE public.production_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create wells table
CREATE TABLE public.wells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    production_field_id UUID NOT NULL REFERENCES public.production_fields(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(name, production_field_id)
);

-- Enable Row Level Security
ALTER TABLE public.production_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wells ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Authenticated users can view production_fields" ON public.production_fields
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert production_fields" ON public.production_fields
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete production_fields" ON public.production_fields
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view wells" ON public.wells
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert wells" ON public.wells
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete wells" ON public.wells
    FOR DELETE TO authenticated USING (true);

-- Seed Initial Data
INSERT INTO public.production_fields (name) VALUES ('Mosquito'), ('Saíra');

DO $$
DECLARE
    mosquito_id UUID;
    saira_id UUID;
BEGIN
    SELECT id INTO mosquito_id FROM public.production_fields WHERE name = 'Mosquito';
    SELECT id INTO saira_id FROM public.production_fields WHERE name = 'Saíra';

    INSERT INTO public.wells (name, production_field_id) VALUES
    ('1-MOS-01-ES', mosquito_id),
    ('4-MOS-02-ES', mosquito_id),
    ('1-ABC-01-ES', mosquito_id),
    ('3-NFA-11-D-ES', saira_id),
    ('3-NFA-07-HPA-ES', saira_id),
    ('4-NFA-12-ES', saira_id),
    ('4-NFA-05-ES', saira_id),
    ('7-SAI-01-ES', saira_id),
    ('7-SAI-02-ES', saira_id);
END $$;

-- Update Tanks Table
ALTER TABLE public.tanks ADD COLUMN production_field_id UUID REFERENCES public.production_fields(id) ON DELETE RESTRICT;
ALTER TABLE public.tanks ADD COLUMN well_id UUID REFERENCES public.wells(id) ON DELETE SET NULL;

-- Migrate existing data (map text to id)
UPDATE public.tanks t
SET production_field_id = pf.id
FROM public.production_fields pf
WHERE t.production_field = pf.name;

-- Default any remaining nulls to 'Mosquito' (fallback)
UPDATE public.tanks 
SET production_field_id = (SELECT id FROM public.production_fields WHERE name = 'Mosquito') 
WHERE production_field_id IS NULL;

-- Enforce Not Null
ALTER TABLE public.tanks ALTER COLUMN production_field_id SET NOT NULL;

-- Drop old column
ALTER TABLE public.tanks DROP COLUMN production_field;

