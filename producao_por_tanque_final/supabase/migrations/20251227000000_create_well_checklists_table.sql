CREATE TABLE IF NOT EXISTS public.well_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
    well_id UUID REFERENCES public.wells(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Safety
    safety_epi BOOLEAN NOT NULL DEFAULT false,
    safety_area_safe BOOLEAN NOT NULL DEFAULT false,
    safety_leak_visible BOOLEAN NOT NULL DEFAULT false,
    safety_observation TEXT,

    -- Equipment (Pumping Unit)
    pumping_unit_on BOOLEAN NOT NULL DEFAULT false,
    pumping_unit_normal BOOLEAN NOT NULL DEFAULT true,
    pumping_unit_noise_vibration BOOLEAN NOT NULL DEFAULT false,
    pumping_unit_abnormal_type TEXT, 

    -- Motor/Reducer
    motor_operating BOOLEAN NOT NULL DEFAULT false,
    reducer_no_leak BOOLEAN NOT NULL DEFAULT true,
    oil_level_status TEXT NOT NULL DEFAULT 'ok',

    -- Daily Operation
    hours_operating NUMERIC NOT NULL DEFAULT 0,
    has_stopped BOOLEAN NOT NULL DEFAULT false,
    stop_reason TEXT,

    -- Sonolog (Common)
    elevation_method TEXT NOT NULL DEFAULT 'bcp',
    freq_hz NUMERIC DEFAULT 0,
    rotation_rpm NUMERIC DEFAULT 0,
    current_a NUMERIC DEFAULT 0,
    torque_percent NUMERIC DEFAULT 0,
    pt_bar NUMERIC DEFAULT 0,
    pr_bar NUMERIC DEFAULT 0,
    sub_gas_m NUMERIC DEFAULT 0,
    sub_no_gas_m NUMERIC DEFAULT 0,

    -- Sonolog (BM Specific)
    bm_cpm NUMERIC DEFAULT 0,
    bm_efficiency_percent NUMERIC DEFAULT 0,
    bm_pd_m3d NUMERIC DEFAULT 0,
    bm_rods_percent NUMERIC DEFAULT 0,
    bm_pprl_lb NUMERIC DEFAULT 0,
    bm_mprl_lb NUMERIC DEFAULT 0,
    bm_peak_torque NUMERIC DEFAULT 0,
    bm_diff_percent NUMERIC DEFAULT 0,

    -- Anomalies
    anomaly_pump_beat BOOLEAN DEFAULT false,
    anomaly_irregular_production BOOLEAN DEFAULT false,
    anomaly_abnormal_return BOOLEAN DEFAULT false,
    anomaly_none BOOLEAN DEFAULT true,
    anomaly_observation TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.well_checklists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view well checklists" 
ON public.well_checklists FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert well checklists" 
ON public.well_checklists FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklists" 
ON public.well_checklists FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklists" 
ON public.well_checklists FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
