ALTER TABLE public.srt_mobile_tanks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.srt_tank_sessions
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

UPDATE public.srt_mobile_tanks mt
SET project_id = pf.project_id
FROM public.wells w
JOIN public.production_fields pf ON pf.id = w.production_field_id
WHERE mt.project_id IS NULL
  AND mt.well_id = w.id
  AND pf.project_id IS NOT NULL;

UPDATE public.srt_tank_sessions ts
SET project_id = pf.project_id
FROM public.wells w
JOIN public.production_fields pf ON pf.id = w.production_field_id
WHERE ts.project_id IS NULL
  AND ts.well_id = w.id
  AND pf.project_id IS NOT NULL;

UPDATE public.srt_tank_sessions ts
SET project_id = mt.project_id
FROM public.srt_mobile_tanks mt
WHERE ts.project_id IS NULL
  AND ts.tank_id = mt.id
  AND mt.project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_srt_mobile_tanks_project_id
  ON public.srt_mobile_tanks(project_id);

CREATE INDEX IF NOT EXISTS idx_srt_tank_sessions_project_id
  ON public.srt_tank_sessions(project_id);
