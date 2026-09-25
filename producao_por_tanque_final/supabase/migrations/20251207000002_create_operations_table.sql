CREATE TYPE operation_type AS ENUM ('production', 'drainage', 'transfer');

CREATE TABLE tank_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    type operation_type NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Level Data
    initial_level_mm NUMERIC NOT NULL,
    final_level_mm NUMERIC NOT NULL,
    
    -- Calculated Volumes (Cached)
    initial_volume_m3 NUMERIC,
    final_volume_m3 NUMERIC,
    volume_m3 NUMERIC, -- The net volume change or flow
    
    -- Measurements (Nullable based on type)
    temp_fluid_c NUMERIC,
    temp_ambient_c NUMERIC,
    density_observed_gcm3 NUMERIC,
    bsw_percent NUMERIC,
    
    -- Calculated Corrections
    ctl NUMERIC DEFAULT 1.0,
    volume_corrected_m3 NUMERIC,
    water_volume_m3 NUMERIC,
    oil_volume_m3 NUMERIC,
    
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL
);

-- Index for faster querying by tank and date
CREATE INDEX idx_tank_operations_tank_date ON tank_operations(tank_id, start_time);
