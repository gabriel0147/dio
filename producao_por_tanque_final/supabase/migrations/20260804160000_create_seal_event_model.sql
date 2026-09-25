-- Foundation for the event-based seal control workflow.
-- The legacy public.seal_data table remains untouched until its data is migrated.

CREATE TABLE public.seal_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  component_code TEXT NOT NULL,
  component_name TEXT NOT NULL,
  tag TEXT,
  location TEXT,
  function_description TEXT,
  required_position TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
    DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seal_points_component_code_not_blank
    CHECK (btrim(component_code) <> ''),
  CONSTRAINT seal_points_component_name_not_blank
    CHECK (btrim(component_name) <> ''),
  CONSTRAINT seal_points_required_position_not_blank
    CHECK (btrim(required_position) <> '')
);

CREATE UNIQUE INDEX seal_points_tank_component_code_uidx
  ON public.seal_points (tank_id, lower(component_code));
CREATE INDEX seal_points_tank_id_idx
  ON public.seal_points (tank_id);
CREATE INDEX seal_points_active_tank_idx
  ON public.seal_points (tank_id, component_code)
  WHERE is_active;

CREATE TRIGGER seal_points_set_updated_at
  BEFORE UPDATE ON public.seal_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.seal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  seal_point_id UUID NOT NULL
    REFERENCES public.seal_points(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  removed_by_name TEXT,
  installed_at TIMESTAMPTZ,
  installed_by_name TEXT,
  final_position TEXT,
  observations TEXT,
  submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
    DEFAULT auth.uid(),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancelled_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seal_events_event_type_check CHECK (
    event_type IN (
      'initial_installation',
      'authorized_break',
      'removal',
      'replacement',
      'reinstallation',
      'damaged',
      'lost',
      'inspection',
      'cancellation',
      'other'
    )
  ),
  CONSTRAINT seal_events_status_check CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'cancelled'
    )
  ),
  CONSTRAINT seal_events_timestamp_order_check CHECK (
    removed_at IS NULL
    OR installed_at IS NULL
    OR installed_at >= removed_at
  ),
  CONSTRAINT seal_events_approval_metadata_check CHECK (
    status <> 'approved'
    OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  ),
  CONSTRAINT seal_events_rejection_metadata_check CHECK (
    status <> 'rejected'
    OR nullif(btrim(rejection_reason), '') IS NOT NULL
  ),
  CONSTRAINT seal_events_cancellation_metadata_check CHECK (
    status <> 'cancelled'
    OR (
      cancelled_at IS NOT NULL
      AND cancelled_by IS NOT NULL
      AND nullif(btrim(cancellation_reason), '') IS NOT NULL
    )
  )
);

CREATE INDEX seal_events_point_sequence_idx
  ON public.seal_events (seal_point_id, event_sequence DESC);
CREATE INDEX seal_events_point_approved_idx
  ON public.seal_events (seal_point_id, approved_at DESC, event_sequence DESC)
  WHERE status = 'approved';
CREATE INDEX seal_events_pending_approval_idx
  ON public.seal_events (created_at, seal_point_id)
  WHERE status = 'pending_approval';
CREATE INDEX seal_events_submitted_by_idx
  ON public.seal_events (submitted_by);

CREATE TRIGGER seal_events_set_updated_at
  BEFORE UPDATE ON public.seal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.seal_event_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL
    REFERENCES public.seal_events(id) ON DELETE CASCADE,
  movement_order INTEGER NOT NULL,
  seal_number TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seal_event_movements_order_positive
    CHECK (movement_order > 0),
  CONSTRAINT seal_event_movements_number_not_blank
    CHECK (
      btrim(seal_number) <> ''
      AND seal_number = btrim(seal_number)
    ),
  CONSTRAINT seal_event_movements_type_check
    CHECK (movement_type IN ('removed', 'installed')),
  CONSTRAINT seal_event_movements_event_order_unique
    UNIQUE (event_id, movement_order),
  CONSTRAINT seal_event_movements_event_seal_action_unique
    UNIQUE (event_id, seal_number, movement_type)
);

CREATE INDEX seal_event_movements_event_id_idx
  ON public.seal_event_movements (event_id);
CREATE INDEX seal_event_movements_seal_number_idx
  ON public.seal_event_movements (seal_number, event_id);

ALTER TABLE public.seal_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seal_event_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view seal points"
  ON public.seal_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tanks t
      WHERE t.id = seal_points.tank_id
        AND public.is_member_of_project(t.project_id)
    )
  );

CREATE POLICY "Project editors can insert seal points"
  ON public.seal_points
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.tanks t
      WHERE t.id = seal_points.tank_id
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Project editors can update seal points"
  ON public.seal_points
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tanks t
      WHERE t.id = seal_points.tank_id
        AND public.can_edit_project(t.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tanks t
      WHERE t.id = seal_points.tank_id
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Project editors can delete seal points without history"
  ON public.seal_points
  FOR DELETE
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1
      FROM public.seal_events e
      WHERE e.seal_point_id = seal_points.id
    )
    AND EXISTS (
      SELECT 1
      FROM public.tanks t
      WHERE t.id = seal_points.tank_id
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Project members can view seal events"
  ON public.seal_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seal_points sp
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE sp.id = seal_events.seal_point_id
        AND public.is_member_of_project(t.project_id)
    )
  );

CREATE POLICY "Project editors can create seal event drafts"
  ON public.seal_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND submitted_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.seal_points sp
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE sp.id = seal_events.seal_point_id
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Authors can update their seal event drafts"
  ON public.seal_events
  FOR UPDATE
  TO authenticated
  USING (
    status = 'draft'
    AND submitted_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.seal_points sp
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE sp.id = seal_events.seal_point_id
        AND public.can_edit_project(t.project_id)
    )
  )
  WITH CHECK (
    status = 'draft'
    AND submitted_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.seal_points sp
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE sp.id = seal_events.seal_point_id
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Authors can delete their seal event drafts"
  ON public.seal_events
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND submitted_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.seal_points sp
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE sp.id = seal_events.seal_point_id
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Project members can view seal movements"
  ON public.seal_event_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seal_events e
      JOIN public.seal_points sp ON sp.id = e.seal_point_id
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE e.id = seal_event_movements.event_id
        AND public.is_member_of_project(t.project_id)
    )
  );

CREATE POLICY "Authors can insert movements into their drafts"
  ON public.seal_event_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seal_events e
      JOIN public.seal_points sp ON sp.id = e.seal_point_id
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE e.id = seal_event_movements.event_id
        AND e.status = 'draft'
        AND e.submitted_by = (SELECT auth.uid())
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Authors can update movements in their drafts"
  ON public.seal_event_movements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seal_events e
      JOIN public.seal_points sp ON sp.id = e.seal_point_id
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE e.id = seal_event_movements.event_id
        AND e.status = 'draft'
        AND e.submitted_by = (SELECT auth.uid())
        AND public.can_edit_project(t.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seal_events e
      JOIN public.seal_points sp ON sp.id = e.seal_point_id
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE e.id = seal_event_movements.event_id
        AND e.status = 'draft'
        AND e.submitted_by = (SELECT auth.uid())
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE POLICY "Authors can delete movements from their drafts"
  ON public.seal_event_movements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seal_events e
      JOIN public.seal_points sp ON sp.id = e.seal_point_id
      JOIN public.tanks t ON t.id = sp.tank_id
      WHERE e.id = seal_event_movements.event_id
        AND e.status = 'draft'
        AND e.submitted_by = (SELECT auth.uid())
        AND public.can_edit_project(t.project_id)
    )
  );

CREATE VIEW public.current_seal_state
WITH (security_invoker = TRUE)
AS
WITH latest_approved_event AS (
  SELECT DISTINCT ON (e.seal_point_id)
    e.id,
    e.seal_point_id,
    e.event_sequence,
    e.event_type,
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
LEFT JOIN latest_approved_event
  ON latest_approved_event.seal_point_id = sp.id
LEFT JOIN active_seals
  ON active_seals.seal_point_id = sp.id;

GRANT SELECT ON public.seal_points TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seal_points TO authenticated;
GRANT SELECT ON public.seal_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seal_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.seal_events_event_sequence_seq
  TO authenticated;
GRANT SELECT ON public.seal_event_movements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seal_event_movements TO authenticated;
GRANT SELECT ON public.current_seal_state TO authenticated;

COMMENT ON TABLE public.seal_points IS
  'Configured sealable components within a tank.';
COMMENT ON TABLE public.seal_events IS
  'Event log for seal operations. Direct authenticated writes are limited to drafts.';
COMMENT ON TABLE public.seal_event_movements IS
  'Individual seal removals and installations belonging to an event.';
COMMENT ON VIEW public.current_seal_state IS
  'Current seal state derived exclusively from approved, non-cancelled events.';
