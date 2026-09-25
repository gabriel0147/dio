CREATE TABLE IF NOT EXISTS fcv_calculation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  fluid_temp_c DOUBLE PRECISION NOT NULL,
  observed_density_gcm3 DOUBLE PRECISION NOT NULL,
  density_at_20c_gcm3 DOUBLE PRECISION NOT NULL,
  fcv DOUBLE PRECISION NOT NULL,
  reference_base TEXT DEFAULT '20 °C' NOT NULL,
  pressure_kpag DOUBLE PRECISION DEFAULT 0 NOT NULL,
  applied_norm TEXT DEFAULT 'API MPMS 11.1 / ASTM D1250 – Crude' NOT NULL,
  algorithm_version TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE fcv_calculation_logs ENABLE ROW LEVEL SECURITY;

-- Policy for inserting logs (Authenticated users can insert their own logs)
CREATE POLICY "Users can insert their own calculation logs"
  ON fcv_calculation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for viewing logs (Authenticated users can view logs - assuming audit visibility)
CREATE POLICY "Users can view calculation logs"
  ON fcv_calculation_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- No update or delete policies to ensure immutability
-- (Explicitly preventing modification by omission of UPDATE/DELETE policies)

-- Indexes for performance
CREATE INDEX idx_fcv_logs_user_id ON fcv_calculation_logs(user_id);
CREATE INDEX idx_fcv_logs_calculated_at ON fcv_calculation_logs(calculated_at);
