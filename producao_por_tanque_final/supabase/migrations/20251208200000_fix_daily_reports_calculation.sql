UPDATE daily_production_reports
SET
  stock_variation = stock_variation + COALESCE(drained_volume_m3, 0) + COALESCE(transferred_volume_m3, 0),
  calculated_well_production_m3 = calculated_well_production_m3 + COALESCE(drained_volume_m3, 0) + COALESCE(transferred_volume_m3, 0);
