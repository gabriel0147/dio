ALTER TABLE public.smt_equipment DROP CONSTRAINT IF EXISTS smt_equipment_status_check;
ALTER TABLE public.smt_equipment ADD CONSTRAINT smt_equipment_status_check CHECK (status IN ('active', 'in_maintenance', 'inactive', 'scrapped', 'new'));
