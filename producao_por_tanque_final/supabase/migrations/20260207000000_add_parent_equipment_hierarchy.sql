ALTER TABLE public.smt_equipment ADD COLUMN parent_id UUID REFERENCES public.smt_equipment(id);
CREATE INDEX idx_smt_equipment_parent_id ON public.smt_equipment(parent_id);
