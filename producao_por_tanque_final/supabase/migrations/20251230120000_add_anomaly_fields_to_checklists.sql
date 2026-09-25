ALTER TABLE public.well_checklists
ADD COLUMN anomaly_abnormal_noise BOOLEAN DEFAULT false,
ADD COLUMN anomaly_mechanical_issue BOOLEAN DEFAULT false,
ADD COLUMN anomaly_electrical_issue BOOLEAN DEFAULT false;
