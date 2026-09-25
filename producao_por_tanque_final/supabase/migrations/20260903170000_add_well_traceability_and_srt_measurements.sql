-- Identifica o poço em cada operação e consolidação diária.
ALTER TABLE public.tank_operations
  ADD COLUMN IF NOT EXISTS well_id UUID REFERENCES public.wells(id) ON DELETE SET NULL;

ALTER TABLE public.daily_production_reports
  ADD COLUMN IF NOT EXISTS well_id UUID REFERENCES public.wells(id) ON DELETE SET NULL;

UPDATE public.tank_operations operation
SET well_id = tank.well_id
FROM public.tanks tank
WHERE operation.tank_id = tank.id
  AND operation.well_id IS NULL
  AND tank.well_id IS NOT NULL;

UPDATE public.daily_production_reports report
SET well_id = tank.well_id
FROM public.tanks tank
WHERE report.tank_id = tank.id
  AND report.well_id IS NULL
  AND tank.well_id IS NOT NULL;

ALTER TABLE public.daily_production_reports
  DROP CONSTRAINT IF EXISTS daily_production_reports_tank_id_report_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_reports_tank_well_date_uidx
  ON public.daily_production_reports (tank_id, well_id, report_date)
  WHERE well_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_reports_legacy_tank_date_uidx
  ON public.daily_production_reports (tank_id, report_date)
  WHERE well_id IS NULL;

CREATE INDEX IF NOT EXISTS tank_operations_well_id_idx
  ON public.tank_operations (well_id);

CREATE INDEX IF NOT EXISTS tank_operations_tank_well_end_idx
  ON public.tank_operations (tank_id, well_id, end_time);

CREATE INDEX IF NOT EXISTS tank_operations_daily_report_id_idx
  ON public.tank_operations (daily_report_id);

CREATE INDEX IF NOT EXISTS daily_reports_well_id_idx
  ON public.daily_production_reports (well_id);

-- Nova metodologia de medição SRT. Os campos antigos são preservados para
-- leitura dos registros legados que não possuem uma medição inicial.
ALTER TABLE public.srt_well_tests
  ADD COLUMN IF NOT EXISTS initial_height_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS final_height_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS emulsion_height_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS initial_level_volume_m3 NUMERIC,
  ADD COLUMN IF NOT EXISTS final_level_volume_m3 NUMERIC,
  ADD COLUMN IF NOT EXISTS emulsion_level_volume_m3 NUMERIC,
  ADD COLUMN IF NOT EXISTS ftc NUMERIC,
  ADD COLUMN IF NOT EXISTS source_bsw_test_id UUID
    REFERENCES public.srt_well_tests(id) ON DELETE SET NULL;

UPDATE public.srt_well_tests
SET final_height_mm = total_height_mm,
    emulsion_height_mm = after_drainage_height_mm,
    ftc = fdt
WHERE initial_height_mm IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'srt_well_tests_measurement_heights_check'
      AND conrelid = 'public.srt_well_tests'::regclass
  ) THEN
    ALTER TABLE public.srt_well_tests
      ADD CONSTRAINT srt_well_tests_measurement_heights_check CHECK (
        initial_height_mm IS NULL
        OR (
          final_height_mm IS NOT NULL
          AND emulsion_height_mm IS NOT NULL
          AND initial_height_mm >= 0
          AND initial_height_mm <= emulsion_height_mm
          AND emulsion_height_mm <= final_height_mm
        )
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.well_bsw_manual_entries
  ADD COLUMN IF NOT EXISTS measured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_srt_test_id UUID
    REFERENCES public.srt_well_tests(id) ON DELETE SET NULL;

UPDATE public.well_bsw_manual_entries
SET measured_at = created_at
WHERE measured_at IS NULL;

ALTER TABLE public.well_bsw_manual_entries
  ALTER COLUMN measured_at SET DEFAULT now(),
  ALTER COLUMN measured_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'well_bsw_manual_entries_tank_id_fkey'
      AND conrelid = 'public.well_bsw_manual_entries'::regclass
  ) THEN
    ALTER TABLE public.well_bsw_manual_entries
      ADD CONSTRAINT well_bsw_manual_entries_tank_id_fkey
      FOREIGN KEY (tank_id) REFERENCES public.tanks(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS well_bsw_manual_source_test_idx
  ON public.well_bsw_manual_entries (source_srt_test_id);

CREATE INDEX IF NOT EXISTS well_bsw_manual_tank_well_date_idx
  ON public.well_bsw_manual_entries (tank_id, well_id, report_date DESC);

CREATE INDEX IF NOT EXISTS srt_tests_applicable_bsw_idx
  ON public.srt_well_tests (well_id, test_end_at DESC)
  WHERE status IN ('valido', 'vigente');

CREATE INDEX IF NOT EXISTS srt_tests_source_bsw_test_idx
  ON public.srt_well_tests (source_bsw_test_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'srt_well_tests_measurement_values_check'
      AND conrelid = 'public.srt_well_tests'::regclass
  ) THEN
    ALTER TABLE public.srt_well_tests
      ADD CONSTRAINT srt_well_tests_measurement_values_check CHECK (
        initial_height_mm IS NULL
        OR (
          test_end_at > test_start_at
          AND initial_height_mm < final_height_mm
          AND initial_level_volume_m3 IS NOT NULL
          AND final_level_volume_m3 IS NOT NULL
          AND emulsion_level_volume_m3 IS NOT NULL
          AND initial_level_volume_m3 >= 0
          AND initial_level_volume_m3 <= emulsion_level_volume_m3
          AND emulsion_level_volume_m3 <= final_level_volume_m3
          AND bsw_emulsion_pct IS NOT NULL
          AND bsw_emulsion_pct BETWEEN 0 AND 100
          AND fcv IS NOT NULL
          AND fcv > 0
          AND fe IS NOT NULL
          AND fe > 0
          AND ftc IS NOT NULL
          AND ftc > 0
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'well_bsw_manual_percentages_check'
      AND conrelid = 'public.well_bsw_manual_entries'::regclass
  ) THEN
    ALTER TABLE public.well_bsw_manual_entries
      ADD CONSTRAINT well_bsw_manual_percentages_check CHECK (
        bsw_emulsion_pct BETWEEN 0 AND 100
        AND bsw_total_pct BETWEEN 0 AND 100
      ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.require_new_srt_measurement_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.initial_height_mm IS NULL
     OR NEW.emulsion_height_mm IS NULL
     OR NEW.final_height_mm IS NULL
     OR NEW.initial_level_volume_m3 IS NULL
     OR NEW.emulsion_level_volume_m3 IS NULL
     OR NEW.final_level_volume_m3 IS NULL THEN
    RAISE EXCEPTION 'Novos testes exigem Mi, Me, Mf e os volumes absolutos da arqueação.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS srt_tests_require_new_measurement_fields
  ON public.srt_well_tests;
CREATE TRIGGER srt_tests_require_new_measurement_fields
  BEFORE INSERT ON public.srt_well_tests
  FOR EACH ROW EXECUTE FUNCTION public.require_new_srt_measurement_fields();

CREATE OR REPLACE FUNCTION public.validate_tank_well_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.well_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tanks tank
    JOIN public.wells well
      ON well.id = NEW.well_id
     AND well.production_field_id = tank.production_field_id
    WHERE tank.id = NEW.tank_id
  ) THEN
    RAISE EXCEPTION 'O tanque e o poço devem pertencer ao mesmo campo de produção.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tank_operations_validate_well_context
  ON public.tank_operations;
CREATE TRIGGER tank_operations_validate_well_context
  BEFORE INSERT OR UPDATE OF tank_id, well_id ON public.tank_operations
  FOR EACH ROW EXECUTE FUNCTION public.validate_tank_well_context();

DROP TRIGGER IF EXISTS daily_reports_validate_well_context
  ON public.daily_production_reports;
CREATE TRIGGER daily_reports_validate_well_context
  BEFORE INSERT OR UPDATE OF tank_id, well_id ON public.daily_production_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_tank_well_context();

DROP TRIGGER IF EXISTS manual_bsw_validate_well_context
  ON public.well_bsw_manual_entries;
CREATE TRIGGER manual_bsw_validate_well_context
  BEFORE INSERT OR UPDATE OF tank_id, well_id ON public.well_bsw_manual_entries
  FOR EACH ROW
  WHEN (NEW.tank_id IS NOT NULL)
  EXECUTE FUNCTION public.validate_tank_well_context();

CREATE OR REPLACE FUNCTION public.validate_manual_bsw_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_srt_test_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.srt_well_tests test
    JOIN public.srt_tank_sessions session ON session.id = test.session_id
    WHERE test.id = NEW.source_srt_test_id
      AND test.well_id = NEW.well_id
      AND session.tank_id = NEW.tank_id
      AND test.status IN ('valido', 'vigente')
      AND test.test_end_at <= NEW.measured_at
  ) THEN
    RAISE EXCEPTION 'O teste laboratorial não é aplicável ao tanque, poço e data informados.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manual_bsw_validate_source
  ON public.well_bsw_manual_entries;
CREATE TRIGGER manual_bsw_validate_source
  BEFORE INSERT OR UPDATE OF tank_id, well_id, measured_at, source_srt_test_id
  ON public.well_bsw_manual_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_manual_bsw_source();

CREATE OR REPLACE FUNCTION public.validate_srt_bsw_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_bsw_test_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.source_bsw_test_id = NEW.id THEN
    RAISE EXCEPTION 'Uma medição não pode usar a si mesma como origem de BSW.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.srt_well_tests source_test
    JOIN public.srt_tank_sessions source_session
      ON source_session.id = source_test.session_id
    JOIN public.srt_tank_sessions target_session
      ON target_session.id = NEW.session_id
    WHERE source_test.id = NEW.source_bsw_test_id
      AND source_test.well_id = NEW.well_id
      AND source_session.tank_id = target_session.tank_id
      AND source_test.status IN ('valido', 'vigente')
      AND source_test.test_end_at <= NEW.test_end_at
  ) THEN
    RAISE EXCEPTION 'O BSW de origem não é aplicável ao tanque, poço e horário da medição.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS srt_tests_validate_bsw_source
  ON public.srt_well_tests;
CREATE TRIGGER srt_tests_validate_bsw_source
  BEFORE INSERT OR UPDATE OF session_id, well_id, test_end_at, source_bsw_test_id
  ON public.srt_well_tests
  FOR EACH ROW EXECUTE FUNCTION public.validate_srt_bsw_source();

DROP POLICY IF EXISTS "Project members can view manual BSW"
  ON public.well_bsw_manual_entries;
DROP POLICY IF EXISTS "Project editors can manage manual BSW"
  ON public.well_bsw_manual_entries;

CREATE POLICY "Project members can view manual BSW"
  ON public.well_bsw_manual_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tanks tank
      WHERE tank.id = well_bsw_manual_entries.tank_id
        AND public.is_member_of_project(tank.project_id)
    )
    OR (
      tank_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.wells well
        JOIN public.production_fields field
          ON field.id = well.production_field_id
        WHERE well.id = well_bsw_manual_entries.well_id
          AND public.is_member_of_project(field.project_id)
      )
    )
    OR public.is_admin_or_director()
  );

CREATE POLICY "Project editors can manage manual BSW"
  ON public.well_bsw_manual_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tanks tank
      WHERE tank.id = well_bsw_manual_entries.tank_id
        AND public.can_edit_project(tank.project_id)
    )
    OR public.is_admin_or_director()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.tanks tank
        WHERE tank.id = well_bsw_manual_entries.tank_id
          AND public.can_edit_project(tank.project_id)
      )
      OR public.is_admin_or_director()
    )
  );

DROP VIEW IF EXISTS public.unified_well_bsw;

CREATE VIEW public.unified_well_bsw AS
SELECT
    m.id,
    m.tank_id,
    m.well_id,
    m.measured_at AS date,
    m.total_volume_m3,
    m.emulsion_volume_m3,
    m.free_water_volume_m3,
    m.emulsion_water_volume_m3,
    m.oil_volume_m3,
    m.total_water_volume_m3,
    m.bsw_emulsion_pct,
    m.bsw_total_pct,
    m.source_srt_test_id,
    'Lançado'::text AS origin,
    m.user_id,
    m.created_at
FROM public.well_bsw_manual_entries m
UNION ALL
SELECT
    t.id,
    s.tank_id,
    t.well_id,
    t.test_end_at AS date,
    t.v_liq_test AS total_volume_m3,
    t.v_emulsion AS emulsion_volume_m3,
    t.v_free_water AS free_water_volume_m3,
    t.v_water_in_emulsion AS emulsion_water_volume_m3,
    t.v_oil_test AS oil_volume_m3,
    t.v_water_total AS total_water_volume_m3,
    t.bsw_emulsion_pct,
    CASE
      WHEN t.v_liq_test > 0 THEN (t.v_water_total / t.v_liq_test) * 100
      ELSE 0
    END AS bsw_total_pct,
    t.id AS source_srt_test_id,
    'Teste'::text AS origin,
    t.responsible_user_id AS user_id,
    t.created_at
FROM public.srt_well_tests t
JOIN public.srt_tank_sessions s ON s.id = t.session_id
WHERE t.status IN ('valido', 'vigente');

ALTER VIEW public.unified_well_bsw SET (security_invoker = true);
REVOKE ALL ON public.unified_well_bsw FROM anon, PUBLIC;
GRANT SELECT ON public.unified_well_bsw TO authenticated;
