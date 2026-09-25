-- Restaura os dados de teste originais de campos, pocos e tanque base.
-- Mantem comportamento idempotente para nao duplicar registros.

DO $$
DECLARE
  v_owner_user_id UUID;
  v_project_id UUID;
  v_mosquito_id UUID;
  v_saira_id UUID;
  v_well_id UUID;
BEGIN
  INSERT INTO public.production_fields (name)
  VALUES ('Mosquito')
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.production_fields (name)
  VALUES ('Saíra')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_mosquito_id
  FROM public.production_fields
  WHERE name = 'Mosquito';

  SELECT id INTO v_saira_id
  FROM public.production_fields
  WHERE name = 'Saíra';

  INSERT INTO public.wells (name, production_field_id)
  VALUES
    ('1-MOS-01-ES', v_mosquito_id),
    ('4-MOS-02-ES', v_mosquito_id),
    ('1-ABC-01-ES', v_mosquito_id),
    ('3-NFA-11-D-ES', v_saira_id),
    ('3-NFA-07-HPA-ES', v_saira_id),
    ('4-NFA-12-ES', v_saira_id),
    ('4-NFA-05-ES', v_saira_id),
    ('7-SAI-01-ES', v_saira_id),
    ('7-SAI-02-ES', v_saira_id)
  ON CONFLICT (name, production_field_id) DO NOTHING;

  SELECT id INTO v_owner_user_id
  FROM public.user_profiles
  ORDER BY created_at
  LIMIT 1;

  IF v_owner_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuario encontrado em user_profiles; projeto e tanque de teste nao foram recriados.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE name = 'SRP - Sistema de Registro da Produção'
  ) THEN
    INSERT INTO public.projects (name, description, created_by, module_type)
    VALUES (
      'SRP - Sistema de Registro da Produção',
      'Registro da Produção',
      v_owner_user_id,
      'srp'
    );
  END IF;

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE name = 'SRP - Sistema de Registro da Produção'
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (v_project_id, v_owner_user_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  SELECT id INTO v_well_id
  FROM public.wells
  WHERE name = '1-MOS-01-ES'
    AND production_field_id = v_mosquito_id
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tanks
    WHERE project_id = v_project_id
      AND tag = 'TQ-01'
  ) THEN
    INSERT INTO public.tanks (
      project_id,
      tag,
      production_field_id,
      well_id,
      geolocation
    )
    VALUES (
      v_project_id,
      'TQ-01',
      v_mosquito_id,
      v_well_id,
      'Campo Alpha'
    );
  END IF;
END $$;
