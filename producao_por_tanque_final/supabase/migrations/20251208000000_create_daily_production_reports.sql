CREATE TABLE IF NOT EXISTS daily_production_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metrics
  stock_variation NUMERIC,
  total_bsw_percent NUMERIC,
  drained_volume_m3 NUMERIC,
  transferred_volume_m3 NUMERIC,
  uncorrected_oil_volume_m3 NUMERIC,
  emulsion_water_volume_m3 NUMERIC,
  temp_correction_factor_y NUMERIC,
  corrected_oil_volume_m3 NUMERIC,
  emulsion_bsw_percent NUMERIC,
  fluid_temp_c NUMERIC,
  fcv NUMERIC,
  fe NUMERIC,
  calculated_well_production_m3 NUMERIC,
  
  -- Status and Audit
  status TEXT NOT NULL DEFAULT 'closed', -- 'draft', 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id),
  
  UNIQUE(tank_id, report_date)
);

-- Index for faster lookup by date/tank
CREATE INDEX idx_daily_reports_tank_date ON daily_production_reports(tank_id, report_date);

-- Add report_id to tank_operations to link ops to a report (optional but good for traceability)
ALTER TABLE tank_operations ADD COLUMN IF NOT EXISTS daily_report_id UUID REFERENCES daily_production_reports(id);

