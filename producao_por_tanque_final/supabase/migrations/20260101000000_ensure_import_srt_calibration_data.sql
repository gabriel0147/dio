-- Recreate the import_srt_calibration_data function to ensure correct mapping of JSON keys to table columns
-- This migration ensures that the database function expects exactly the keys 'height_mm', 'volume_m3', and 'fcv'
-- which corresponds to the Edge Function update that scales volume by 1/1000.
CREATE OR REPLACE FUNCTION import_srt_calibration_data(p_tank_id UUID, p_data JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO srt_mobile_tank_calibration (tank_id, height_mm, volume_m3, fcv)
    SELECT 
        p_tank_id,
        COALESCE((x->>'height_mm')::numeric, 0),
        COALESCE((x->>'volume_m3')::numeric, 0),
        COALESCE((x->>'fcv')::numeric, 1.0)
    FROM jsonb_array_elements(p_data) AS x;
END;
$$ LANGUAGE plpgsql;

