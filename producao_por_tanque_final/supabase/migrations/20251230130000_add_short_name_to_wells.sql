ALTER TABLE public.wells ADD COLUMN short_name TEXT;

-- Update existing records based on specific mapping
UPDATE public.wells SET short_name = 'ABC-01' WHERE name = '1-ABC-01-ES';
UPDATE public.wells SET short_name = 'MOS-01' WHERE name = '1-MOS-01-ES';
UPDATE public.wells SET short_name = 'NFA-07' WHERE name = '3-NFA-07-HPA-ES';
UPDATE public.wells SET short_name = 'NFA-11' WHERE name = '3-NFA-11-D-ES';
UPDATE public.wells SET short_name = 'MOS-02' WHERE name = '4-MOS-02-ES';
UPDATE public.wells SET short_name = '4-NFA-05' WHERE name = '4-NFA-05-ES';
UPDATE public.wells SET short_name = '4-NFA-12' WHERE name = '4-NFA-12-ES';
UPDATE public.wells SET short_name = 'SAI-01' WHERE name = '7-SAI-01-ES';
UPDATE public.wells SET short_name = 'SAI-02' WHERE name = '7-SAI-02-ES';
