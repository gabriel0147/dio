-- Match legacy spreadsheet tank tags even when the application uses a
-- different dash grouping (for example TQ-02-001 and TQ-002-01).

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
  v_tank_digits TEXT;
  v_inserted INTEGER;
BEGIN
  SELECT t.project_id, t.tag, regexp_replace(t.tag, '\D', '', 'g')
  INTO v_project_id, v_tank_tag, v_tank_digits
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
    v_tank_digits IN ('02001', '00201')
    AND source.component_code = 'V.Dr2'
  )
  ON CONFLICT (tank_id, lower(component_code)) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initialize_seal_points_from_spreadsheet(UUID)
TO authenticated;
