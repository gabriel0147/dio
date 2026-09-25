-- Create SRT Mobile Tanks table
CREATE TABLE IF NOT EXISTS srt_mobile_tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_name TEXT NOT NULL UNIQUE,
    capacity NUMERIC,
    unit TEXT DEFAULT 'm3',
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SRT Tank Sessions table
CREATE TABLE IF NOT EXISTS srt_tank_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES srt_mobile_tanks(id),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    responsible_user_id UUID REFERENCES user_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Enum for Test Type (if not exists)
DO $$ BEGIN
    CREATE TYPE srt_test_type AS ENUM ('oficial', 'operacional', 'diagnostico', 'comissionamento');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Enum for Test Status (if not exists)
DO $$ BEGIN
    CREATE TYPE srt_test_status AS ENUM ('rascunho', 'valido', 'invalido', 'vigente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SRT Well Tests table
CREATE TABLE IF NOT EXISTS srt_well_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES srt_tank_sessions(id),
    well_id UUID NOT NULL REFERENCES wells(id),
    test_start_at TIMESTAMPTZ NOT NULL,
    test_end_at TIMESTAMPTZ NOT NULL,
    test_type srt_test_type NOT NULL DEFAULT 'operacional',
    status srt_test_status NOT NULL DEFAULT 'rascunho',
    responsible_user_id UUID REFERENCES user_profiles(id),
    notes TEXT,
    
    -- Volumes
    v_liq_test NUMERIC DEFAULT 0,
    v_oil_test NUMERIC DEFAULT 0,
    v_wat_test NUMERIC DEFAULT 0,
    v_gas_test NUMERIC DEFAULT 0,
    
    -- Phys-Chem
    temperature_avg NUMERIC,
    density NUMERIC,
    density_ref_temp NUMERIC,
    ipsw_value NUMERIC,
    ipsw_unit TEXT,
    analysis_notes TEXT,
    lab_report_attachment TEXT,
    
    -- BSW Data
    bsw_emulsion_pct NUMERIC DEFAULT 0,
    bsw_method TEXT,
    bsw_quality TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_srt_well_tests_well_id ON srt_well_tests(well_id);
CREATE INDEX IF NOT EXISTS idx_srt_well_tests_status ON srt_well_tests(status);
CREATE INDEX IF NOT EXISTS idx_srt_tank_sessions_tank_id ON srt_tank_sessions(tank_id);

-- Trigger to handle 'vigente' status exclusiveness per well
CREATE OR REPLACE FUNCTION handle_srt_vigente_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'vigente' THEN
        -- Set any existing 'vigente' test for this well to 'valido'
        UPDATE srt_well_tests
        SET status = 'valido', updated_at = NOW()
        WHERE well_id = NEW.well_id 
          AND status = 'vigente'
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_srt_vigente_status ON srt_well_tests;
CREATE TRIGGER trigger_srt_vigente_status
BEFORE INSERT OR UPDATE ON srt_well_tests
FOR EACH ROW
WHEN (NEW.status = 'vigente')
EXECUTE FUNCTION handle_srt_vigente_status();

-- Function to get current test by well
CREATE OR REPLACE FUNCTION get_current_test_by_well(p_well_id UUID)
RETURNS SETOF srt_well_tests AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM srt_well_tests
    WHERE well_id = p_well_id AND status = 'vigente'
    ORDER BY test_end_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
