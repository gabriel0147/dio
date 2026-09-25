-- Align the events imported during the spreadsheet migration with the
-- operational timestamps recorded in Registro_Mestre.

UPDATE public.seal_events e
SET installed_at = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.seal_event_movements m
    WHERE m.event_id = e.id
      AND m.seal_number IN ('1627753', '1627754', '1627755', '1627756')
  ) THEN TIMESTAMPTZ '2026-07-15 10:00:00-03'
  ELSE TIMESTAMPTZ '2026-07-15 15:00:00-03'
END
WHERE e.event_type = 'initial_installation'
  AND e.observations =
    'Migrado do Registro Mestre da planilha de controle de lacres.'
  AND EXISTS (
    SELECT 1
    FROM public.seal_event_movements m
    WHERE m.event_id = e.id
      AND m.seal_number IN (
        '1627753',
        '1627754',
        '1627755',
        '1627756',
        '1627779',
        '1627727',
        '1627759',
        '1627704'
      )
  );
