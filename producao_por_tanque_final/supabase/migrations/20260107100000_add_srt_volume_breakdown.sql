-- Add volume breakdown columns to srt_well_tests for robust data persistence
ALTER TABLE srt_well_tests ADD COLUMN IF NOT EXISTS v_emulsion NUMERIC DEFAULT 0;
ALTER TABLE srt_well_tests ADD COLUMN IF NOT EXISTS v_free_water NUMERIC DEFAULT 0;
ALTER TABLE srt_well_tests ADD COLUMN IF NOT EXISTS v_water_in_emulsion NUMERIC DEFAULT 0;
ALTER TABLE srt_well_tests ADD COLUMN IF NOT EXISTS v_water_total NUMERIC DEFAULT 0;

-- Ensure numeric precision is consistent
ALTER TABLE srt_well_tests ALTER COLUMN v_emulsion TYPE NUMERIC(20, 6);
ALTER TABLE srt_well_tests ALTER COLUMN v_free_water TYPE NUMERIC(20, 6);
ALTER TABLE srt_well_tests ALTER COLUMN v_water_in_emulsion TYPE NUMERIC(20, 6);
ALTER TABLE srt_well_tests ALTER COLUMN v_water_total TYPE NUMERIC(20, 6);
