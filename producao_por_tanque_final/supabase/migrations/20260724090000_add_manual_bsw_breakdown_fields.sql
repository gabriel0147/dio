ALTER TABLE public.well_bsw_manual_entries
  ADD COLUMN IF NOT EXISTS total_volume_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emulsion_volume_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_water_volume_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emulsion_water_volume_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oil_volume_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_water_volume_m3 NUMERIC NOT NULL DEFAULT 0;

DROP VIEW IF EXISTS public.unified_well_bsw;

CREATE VIEW public.unified_well_bsw AS
SELECT
    m.id,
    m.well_id,
    m.report_date::timestamp as date,
    m.total_volume_m3,
    m.emulsion_volume_m3,
    m.free_water_volume_m3,
    m.emulsion_water_volume_m3,
    m.oil_volume_m3,
    m.total_water_volume_m3,
    m.bsw_emulsion_pct,
    m.bsw_total_pct,
    'Lançado' as origin,
    m.user_id,
    m.created_at
FROM public.well_bsw_manual_entries m
UNION ALL
SELECT
    t.id,
    t.well_id,
    t.test_end_at as date,
    t.v_liq_test as total_volume_m3,
    t.v_emulsion as emulsion_volume_m3,
    t.v_free_water as free_water_volume_m3,
    t.v_water_in_emulsion as emulsion_water_volume_m3,
    t.v_oil_test as oil_volume_m3,
    t.v_water_total as total_water_volume_m3,
    t.bsw_emulsion_pct,
    CASE
        WHEN t.v_liq_test > 0 THEN (t.v_water_total / t.v_liq_test) * 100
        ELSE 0
    END as bsw_total_pct,
    'Teste' as origin,
    t.responsible_user_id as user_id,
    t.created_at
FROM public.srt_well_tests t
WHERE t.status IN ('valido', 'vigente');

ALTER VIEW IF EXISTS public.unified_well_bsw SET (security_invoker = true);
