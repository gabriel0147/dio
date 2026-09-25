-- Recreate the import_srt_calibration_data function to ensure correct mapping of JSON keys to table columns
-- This ensures that height and volume are not swapped and FCV defaults to 1.0 if missing
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
