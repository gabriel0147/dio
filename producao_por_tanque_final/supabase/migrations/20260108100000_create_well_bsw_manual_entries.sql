-- Create table for manual BSW entries
CREATE TABLE IF NOT EXISTS well_bsw_manual_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id),
    report_date DATE NOT NULL,
    bsw_emulsion_pct NUMERIC NOT NULL DEFAULT 0,
    bsw_total_pct NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES user_profiles(id)
);

-- Enable RLS
ALTER TABLE well_bsw_manual_entries ENABLE ROW LEVEL SECURITY;

-- Policies (Assuming standard authenticated access for now, similar to other tables)
CREATE POLICY "Authenticated users can view manual bsw entries" ON well_bsw_manual_entries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert manual bsw entries" ON well_bsw_manual_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update manual bsw entries" ON well_bsw_manual_entries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete manual bsw entries" ON well_bsw_manual_entries
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create unified view for BSW records (Manual + Tests)
CREATE OR REPLACE VIEW unified_well_bsw AS
SELECT
    m.id,
    m.well_id,
    m.report_date::timestamp as date,
    m.bsw_emulsion_pct,
    m.bsw_total_pct,
    'Lançado' as origin,
    m.user_id,
    m.created_at
FROM well_bsw_manual_entries m
UNION ALL
SELECT
    t.id,
    t.well_id,
    t.test_end_at as date,
    t.bsw_emulsion_pct,
    CASE
        WHEN t.v_liq_test > 0 THEN (t.v_water_total / t.v_liq_test) * 100
        ELSE 0
    END as bsw_total_pct,
    'Teste' as origin,
    t.responsible_user_id as user_id,
    t.created_at
FROM srt_well_tests t
WHERE t.status IN ('valido', 'vigente');
