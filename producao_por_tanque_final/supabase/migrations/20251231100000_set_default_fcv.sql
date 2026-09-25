-- Set default value for fcv column in srt_mobile_tank_calibration table
ALTER TABLE srt_mobile_tank_calibration ALTER COLUMN fcv SET DEFAULT 1.0;

-- Update existing records where fcv is null to 1.0
UPDATE srt_mobile_tank_calibration SET fcv = 1.0 WHERE fcv IS NULL;
