CREATE TABLE IF NOT EXISTS public.operational_supervision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    justification_production TEXT,
    justification_checklist TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'audited'
    audited_at TIMESTAMP WITH TIME ZONE,
    audited_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tank_id, report_date)
);

ALTER TABLE public.operational_supervision ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to ensure idempotency)

DROP POLICY IF EXISTS "Authenticated users can view operational supervision" ON public.operational_supervision;
CREATE POLICY "Authenticated users can view operational supervision" 
ON public.operational_supervision FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Approvers and admins can insert operational supervision" ON public.operational_supervision;
CREATE POLICY "Approvers and admins can insert operational supervision" 
ON public.operational_supervision FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'approver')
  )
);

DROP POLICY IF EXISTS "Approvers and admins can update operational supervision" ON public.operational_supervision;
CREATE POLICY "Approvers and admins can update operational supervision" 
ON public.operational_supervision FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'approver')
  )
);

DROP POLICY IF EXISTS "Approvers and admins can delete operational supervision" ON public.operational_supervision;
CREATE POLICY "Approvers and admins can delete operational supervision" 
ON public.operational_supervision FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'approver')
  )
);
