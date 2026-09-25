-- Ensure fcv column exists in calibration_data table
ALTER TABLE calibration_data ADD COLUMN IF NOT EXISTS fcv NUMERIC DEFAULT 1.0;

-- Update or create the import_calibration_data RPC function to handle FCV
CREATE OR REPLACE FUNCTION import_calibration_data(p_tank_id UUID, p_data JSONB)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing data for the tank
  DELETE FROM calibration_data WHERE tank_id = p_tank_id;
  
  -- Insert new data with FCV
  INSERT INTO calibration_data (tank_id, height_mm, volume_m3, fcv)
  SELECT
    p_tank_id,
    (x->>'height_mm')::NUMERIC,
    (x->>'volume_m3')::NUMERIC,
    COALESCE((x->>'fcv')::NUMERIC, 1.0)
  FROM jsonb_array_elements(p_data) AS x;
END;
$$;
