-- Create Enums for SGPA
DO $$ BEGIN
    CREATE TYPE sgpa_cause_category AS ENUM ('Operacional', 'Mecânica', 'Elétrica', 'Processo', 'Externa', 'Segurança', 'Medição');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sgpa_asset_type AS ENUM ('BCP', 'Motor', 'Inversor', 'BM', 'Coluna', 'Válvula', 'Linha', 'Instrumentação', 'Outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sgpa_event_type AS ENUM ('STOP', 'DERATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sgpa_event_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SGPA Causes Table
CREATE TABLE IF NOT EXISTS sgpa_causes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category sgpa_cause_category NOT NULL,
    cause_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SGPA Assets Table
CREATE TABLE IF NOT EXISTS sgpa_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type sgpa_asset_type NOT NULL,
    tag TEXT NOT NULL,
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SGPA Events Table
CREATE TABLE IF NOT EXISTS sgpa_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    event_date DATE NOT NULL, -- Reference date for reporting
    event_type sgpa_event_type NOT NULL,
    status sgpa_event_status NOT NULL DEFAULT 'OPEN',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    duration_min INTEGER,
    category sgpa_cause_category NOT NULL,
    cause_id UUID REFERENCES sgpa_causes(id),
    asset_id UUID REFERENCES sgpa_assets(id),
    failure_flag BOOLEAN DEFAULT false,
    impact_factor NUMERIC CHECK (impact_factor >= 0 AND impact_factor <= 1),
    responsible_user_id UUID REFERENCES user_profiles(id),
    work_order_ref TEXT,
    notes TEXT,
    attachments TEXT[], -- Array of URLs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sgpa_events_well_id ON sgpa_events(well_id);
CREATE INDEX IF NOT EXISTS idx_sgpa_events_status ON sgpa_events(status);
CREATE INDEX IF NOT EXISTS idx_sgpa_events_date ON sgpa_events(event_date);
CREATE INDEX IF NOT EXISTS idx_sgpa_assets_well_id ON sgpa_assets(well_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they exist to allow idempotency
DROP TRIGGER IF EXISTS update_sgpa_events_updated_at ON sgpa_events;
CREATE TRIGGER update_sgpa_events_updated_at BEFORE UPDATE ON sgpa_events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_sgpa_causes_updated_at ON sgpa_causes;
CREATE TRIGGER update_sgpa_causes_updated_at BEFORE UPDATE ON sgpa_causes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_sgpa_assets_updated_at ON sgpa_assets;
CREATE TRIGGER update_sgpa_assets_updated_at BEFORE UPDATE ON sgpa_assets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
