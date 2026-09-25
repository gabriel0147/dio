-- Add linear measurement columns to srt_well_tests
ALTER TABLE srt_well_tests ADD COLUMN IF NOT EXISTS total_height_mm NUMERIC;
ALTER TABLE srt_well_tests ADD COLUMN IF NOT EXISTS after_drainage_height_mm NUMERIC;
