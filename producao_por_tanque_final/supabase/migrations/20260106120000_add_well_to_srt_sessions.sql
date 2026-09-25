ALTER TABLE public.srt_tank_sessions ADD COLUMN well_id UUID REFERENCES public.wells(id);
