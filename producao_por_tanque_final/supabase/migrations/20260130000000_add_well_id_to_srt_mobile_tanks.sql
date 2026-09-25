ALTER TABLE public.srt_mobile_tanks ADD COLUMN well_id UUID REFERENCES public.wells(id);
