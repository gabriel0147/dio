CREATE OR REPLACE FUNCTION import_calibration_data(p_tank_id UUID, p_data JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if tank exists
  IF NOT EXISTS (SELECT 1 FROM public.tanks WHERE id = p_tank_id) THEN
    RAISE EXCEPTION 'Tank ID % does not exist', p_tank_id;
  END IF;

  -- Delete existing data for this tank
  DELETE FROM public.calibration_data WHERE tank_id = p_tank_id;

  -- Insert new data
  INSERT INTO public.calibration_data (tank_id, height_mm, volume_m3, fcv)
  SELECT
    p_tank_id,
    (x->>'height_mm')::NUMERIC,
    (x->>'volume_m3')::NUMERIC,
    (x->>'fcv')::NUMERIC
  FROM jsonb_array_elements(p_data) AS x;
END;
$$;
