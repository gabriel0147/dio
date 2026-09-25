ALTER TABLE public.fcv_calculation_logs
  ADD COLUMN IF NOT EXISTS calculation_reason TEXT,
  ADD COLUMN IF NOT EXISTS requested_by_user_id UUID REFERENCES auth.users(id);

UPDATE public.fcv_calculation_logs
SET requested_by_user_id = user_id
WHERE requested_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_fcv_logs_requested_by_user_id
  ON public.fcv_calculation_logs(requested_by_user_id);

