-- Create SRT Mobile Tank Calibration table
CREATE TABLE IF NOT EXISTS srt_mobile_tank_calibration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES srt_mobile_tanks(id) ON DELETE CASCADE,
    height_mm NUMERIC NOT NULL,
    volume_m3 NUMERIC NOT NULL,
    fcv NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_srt_mobile_tank_calibration_tank_id ON srt_mobile_tank_calibration(tank_id);

-- RPC for bulk inserting calibration data
CREATE OR REPLACE FUNCTION import_srt_calibration_data(p_tank_id UUID, p_data JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO srt_mobile_tank_calibration (tank_id, height_mm, volume_m3, fcv)
    SELECT 
        p_tank_id,
        (x->>'height_mm')::numeric,
        (x->>'volume_m3')::numeric,
        (x->>'fcv')::numeric
    FROM jsonb_array_elements(p_data) AS x;
END;
$$ LANGUAGE plpgsql;
