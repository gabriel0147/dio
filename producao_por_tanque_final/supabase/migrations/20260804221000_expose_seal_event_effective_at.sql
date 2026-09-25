-- The operational screen shows when the event happened, while approval time
-- remains available for audit and for choosing the latest approved record.

DROP VIEW IF EXISTS public.current_seal_state;

CREATE VIEW public.current_seal_state
WITH (security_invoker = TRUE)
AS
WITH latest_approved_event AS (
  SELECT DISTINCT ON (e.seal_point_id)
    e.id,
    e.seal_point_id,
    e.event_sequence,
    e.event_type,
    COALESCE(e.installed_at, e.removed_at, e.created_at) AS effective_at,
    e.approved_at,
    e.installed_at,
    e.installed_by_name,
    e.final_position,
    e.observations
  FROM public.seal_events e
  WHERE e.status = 'approved'
  ORDER BY
    e.seal_point_id,
    e.approved_at DESC,
    e.event_sequence DESC
),
latest_seal_movement AS (
  SELECT DISTINCT ON (m.seal_number)
    m.seal_number,
    m.movement_type,
    e.seal_point_id
  FROM public.seal_event_movements m
  JOIN public.seal_events e ON e.id = m.event_id
  WHERE e.status = 'approved'
  ORDER BY
    m.seal_number,
    e.approved_at DESC,
    e.event_sequence DESC,
    m.movement_order DESC
),
active_seals AS (
  SELECT
    seal_point_id,
    array_agg(seal_number ORDER BY seal_number) AS seal_numbers
  FROM latest_seal_movement
  WHERE movement_type = 'installed'
  GROUP BY seal_point_id
)
SELECT
  sp.id AS seal_point_id,
  sp.tank_id,
  t.project_id,
  t.tag AS tank_tag,
  t.production_field_id,
  sp.component_code,
  sp.component_name,
  sp.tag,
  sp.location,
  sp.function_description,
  sp.required_position,
  sp.is_active,
  COALESCE(active_seals.seal_numbers, ARRAY[]::TEXT[]) AS current_seal_numbers,
  latest_approved_event.id AS latest_event_id,
  latest_approved_event.event_sequence AS latest_event_sequence,
  latest_approved_event.event_type AS latest_event_type,
  latest_approved_event.effective_at AS latest_event_effective_at,
  latest_approved_event.approved_at AS latest_event_approved_at,
  latest_approved_event.installed_at AS latest_installation_at,
  latest_approved_event.installed_by_name AS latest_installed_by_name,
  latest_approved_event.final_position,
  latest_approved_event.observations,
  CASE
    WHEN latest_approved_event.id IS NULL THEN 'no_record'
    WHEN COALESCE(cardinality(active_seals.seal_numbers), 0) = 0
      THEN 'awaiting_seal'
    WHEN latest_approved_event.final_position IS NOT NULL
      AND lower(btrim(latest_approved_event.final_position))
        <> lower(btrim(sp.required_position))
      THEN 'position_mismatch'
    ELSE 'installed'
  END AS current_status
FROM public.seal_points sp
JOIN public.tanks t ON t.id = sp.tank_id
LEFT JOIN latest_approved_event
  ON latest_approved_event.seal_point_id = sp.id
LEFT JOIN active_seals
  ON active_seals.seal_point_id = sp.id;

GRANT SELECT ON public.current_seal_state TO authenticated;
