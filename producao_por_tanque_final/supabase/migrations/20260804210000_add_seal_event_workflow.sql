-- Transactional workflow used by the seal control screen.

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

CREATE OR REPLACE FUNCTION public.initialize_seal_points_from_spreadsheet(
  p_tank_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_id UUID;
  v_tank_tag TEXT;
  v_inserted INTEGER;
BEGIN
  SELECT t.project_id, t.tag
  INTO v_project_id, v_tank_tag
  FROM public.tanks t
  WHERE t.id = p_tank_id;

  IF v_project_id IS NULL OR NOT public.can_edit_project(v_project_id) THEN
    RAISE EXCEPTION 'Sem permissão para configurar pontos deste tanque.';
  END IF;

  INSERT INTO public.seal_points (
    tank_id,
    component_code,
    component_name,
    tag,
    location,
    function_description,
    required_position,
    created_by
  )
  SELECT
    p_tank_id,
    source.component_code,
    source.component_name,
    source.tag,
    source.location,
    source.function_description,
    source.required_position,
    auth.uid()
  FROM (
    VALUES
      (
        'V.Dr1',
        'Válvula de dreno 1',
        'V.Dr1',
        'Dreno inferior do tanque',
        'Evidenciar violação — posição fechada fora das operações de drenagem',
        'Fechada fora das operações de drenagem'
      ),
      (
        'V.Dr2',
        'Válvula de dreno 2',
        'V.Dr2',
        'Dreno inferior do tanque',
        'Evidenciar violação — posição fechada fora das operações de drenagem',
        'Fechada fora das operações de drenagem'
      ),
      (
        'V.En',
        'Válvula de entrada',
        'V.En',
        'Linha de entrada do tanque',
        'Proteção contra alinhamento indevido durante medição',
        'Conforme operação de medição'
      ),
      (
        'V.Es',
        'Válvula de saída',
        'V.Es',
        'Linha de saída do tanque',
        'Posição fechada durante apuração',
        'Fechada'
      )
  ) AS source(
    component_code,
    component_name,
    tag,
    location,
    function_description,
    required_position
  )
  WHERE NOT (
    v_tank_tag = 'TQ-02-001'
    AND source.component_code = 'V.Dr2'
  )
  ON CONFLICT (tank_id, lower(component_code)) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_seal_event(
  p_seal_point_id UUID,
  p_event_type TEXT,
  p_removed_seals TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_installed_seals TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_removed_at TIMESTAMPTZ DEFAULT NULL,
  p_installed_at TIMESTAMPTZ DEFAULT NULL,
  p_removal_reason TEXT DEFAULT NULL,
  p_removed_by_name TEXT DEFAULT NULL,
  p_installed_by_name TEXT DEFAULT NULL,
  p_final_position TEXT DEFAULT NULL,
  p_observations TEXT DEFAULT NULL
)
RETURNS TABLE(event_id UUID, event_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_id UUID;
  v_event_id UUID;
  v_status TEXT;
  v_removed TEXT[];
  v_installed TEXT[];
  v_seal TEXT;
  v_order INTEGER := 0;
  v_active_point UUID;
  v_can_approve BOOLEAN;
BEGIN
  SELECT t.project_id
  INTO v_project_id
  FROM public.seal_points sp
  JOIN public.tanks t ON t.id = sp.tank_id
  WHERE sp.id = p_seal_point_id
    AND sp.is_active;

  IF v_project_id IS NULL OR NOT public.can_edit_project(v_project_id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar eventos neste ponto.';
  END IF;

  IF p_event_type NOT IN (
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
  ) THEN
    RAISE EXCEPTION 'Tipo de evento inválido.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT btrim(value) ORDER BY btrim(value)), ARRAY[]::TEXT[])
  INTO v_removed
  FROM unnest(COALESCE(p_removed_seals, ARRAY[]::TEXT[])) AS value
  WHERE btrim(value) <> '';

  SELECT COALESCE(array_agg(DISTINCT btrim(value) ORDER BY btrim(value)), ARRAY[]::TEXT[])
  INTO v_installed
  FROM unnest(COALESCE(p_installed_seals, ARRAY[]::TEXT[])) AS value
  WHERE btrim(value) <> '';

  IF p_event_type IN (
    'authorized_break',
    'removal',
    'replacement',
    'reinstallation',
    'damaged',
    'lost'
  ) AND cardinality(v_removed) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um lacre retirado.';
  END IF;

  IF p_event_type IN (
    'initial_installation',
    'replacement',
    'reinstallation'
  ) AND cardinality(v_installed) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um novo lacre.';
  END IF;

  IF cardinality(v_removed) > 0 AND (
    p_removed_at IS NULL
    OR nullif(btrim(p_removed_by_name), '') IS NULL
    OR nullif(btrim(p_removal_reason), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Retirada exige data, responsável e motivo.';
  END IF;

  IF cardinality(v_installed) > 0 AND (
    p_installed_at IS NULL
    OR nullif(btrim(p_installed_by_name), '') IS NULL
    OR nullif(btrim(p_final_position), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Instalação exige data, responsável e posição final.';
  END IF;

  IF p_removed_at IS NOT NULL
    AND p_installed_at IS NOT NULL
    AND p_installed_at < p_removed_at THEN
    RAISE EXCEPTION 'A instalação não pode ocorrer antes da retirada.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(locked_seal, 0)
  )
  FROM (
    SELECT DISTINCT unnest(v_removed || v_installed) AS locked_seal
    ORDER BY locked_seal
  ) ordered_locks;

  FOREACH v_seal IN ARRAY v_removed LOOP
    WITH latest AS (
      SELECT DISTINCT ON (m.seal_number)
        m.seal_number,
        m.movement_type,
        e.seal_point_id
      FROM public.seal_event_movements m
      JOIN public.seal_events e ON e.id = m.event_id
      WHERE e.status = 'approved'
        AND m.seal_number = v_seal
      ORDER BY
        m.seal_number,
        e.approved_at DESC,
        e.event_sequence DESC,
        m.movement_order DESC
    )
    SELECT seal_point_id
    INTO v_active_point
    FROM latest
    WHERE movement_type = 'installed';

    IF v_active_point IS DISTINCT FROM p_seal_point_id THEN
      RAISE EXCEPTION 'O lacre % não está ativo neste ponto.', v_seal;
    END IF;
  END LOOP;

  FOREACH v_seal IN ARRAY v_installed LOOP
    WITH latest AS (
      SELECT DISTINCT ON (m.seal_number)
        m.seal_number,
        m.movement_type,
        e.seal_point_id
      FROM public.seal_event_movements m
      JOIN public.seal_events e ON e.id = m.event_id
      WHERE e.status = 'approved'
        AND m.seal_number = v_seal
      ORDER BY
        m.seal_number,
        e.approved_at DESC,
        e.event_sequence DESC,
        m.movement_order DESC
    )
    SELECT seal_point_id
    INTO v_active_point
    FROM latest
    WHERE movement_type = 'installed';

    IF v_active_point IS NOT NULL
      AND NOT (v_seal = ANY(v_removed) AND v_active_point = p_seal_point_id) THEN
      RAISE EXCEPTION 'O lacre % já está ativo em outro ponto.', v_seal;
    END IF;
  END LOOP;

  v_can_approve :=
    public.is_project_owner(v_project_id)
    OR public.get_my_role() IN (
      'approver',
      'admin',
      'supervisor',
      'operations_manager',
      'director',
      'regulation'
    );
  v_status := CASE WHEN v_can_approve THEN 'approved' ELSE 'pending_approval' END;

  INSERT INTO public.seal_events (
    seal_point_id,
    event_type,
    status,
    removed_at,
    removal_reason,
    removed_by_name,
    installed_at,
    installed_by_name,
    final_position,
    observations,
    submitted_by,
    submitted_at,
    approved_by,
    approved_at
  )
  VALUES (
    p_seal_point_id,
    p_event_type,
    v_status,
    p_removed_at,
    nullif(btrim(p_removal_reason), ''),
    nullif(btrim(p_removed_by_name), ''),
    p_installed_at,
    nullif(btrim(p_installed_by_name), ''),
    nullif(btrim(p_final_position), ''),
    nullif(btrim(p_observations), ''),
    auth.uid(),
    now(),
    CASE WHEN v_can_approve THEN auth.uid() ELSE NULL END,
    CASE WHEN v_can_approve THEN now() ELSE NULL END
  )
  RETURNING id INTO v_event_id;

  FOREACH v_seal IN ARRAY v_removed LOOP
    v_order := v_order + 1;
    INSERT INTO public.seal_event_movements (
      event_id,
      movement_order,
      seal_number,
      movement_type
    )
    VALUES (v_event_id, v_order, v_seal, 'removed');
  END LOOP;

  FOREACH v_seal IN ARRAY v_installed LOOP
    v_order := v_order + 1;
    INSERT INTO public.seal_event_movements (
      event_id,
      movement_order,
      seal_number,
      movement_type
    )
    VALUES (v_event_id, v_order, v_seal, 'installed');
  END LOOP;

  RETURN QUERY SELECT v_event_id, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_seal_points_from_spreadsheet(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_seal_points_from_spreadsheet(UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.register_seal_event(
  UUID,
  TEXT,
  TEXT[],
  TEXT[],
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_seal_event(
  UUID,
  TEXT,
  TEXT[],
  TEXT[],
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) TO authenticated;

COMMENT ON FUNCTION public.register_seal_event(
  UUID,
  TEXT,
  TEXT[],
  TEXT[],
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) IS
  'Validates and atomically registers a seal event, auto-approving authorized users.';
