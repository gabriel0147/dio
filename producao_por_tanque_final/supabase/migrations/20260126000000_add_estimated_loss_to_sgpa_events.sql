-- Add estimated_loss_m3 column to sgpa_events table if it doesn't exist
ALTER TABLE sgpa_events ADD COLUMN IF NOT EXISTS estimated_loss_m3 NUMERIC;

-- Create an index for reporting performance
CREATE INDEX IF NOT EXISTS idx_sgpa_events_estimated_loss ON sgpa_events(estimated_loss_m3);

-- Backfill existing CLOSED events with estimated loss based on valid SRT tests
WITH valid_tests AS (
    SELECT DISTINCT ON (well_id)
        well_id,
        v_oil_corrected,
        v_oil_test,
        test_start_at,
        test_end_at
    FROM srt_well_tests
    WHERE status = 'vigente' AND test_type = 'apropriacao'
    ORDER BY well_id, test_end_at DESC
),
calculated_loss AS (
    SELECT
        e.id,
        CASE
            WHEN t.well_id IS NOT NULL AND e.duration_min > 0 AND (EXTRACT(EPOCH FROM (t.test_end_at - t.test_start_at)) > 0) THEN
                (
                    (COALESCE(t.v_oil_corrected, t.v_oil_test) / (EXTRACT(EPOCH FROM (t.test_end_at - t.test_start_at)) / 3600)) -- Hourly rate from test
                    * (e.duration_min::numeric / 60) -- Event duration in hours
                    * (CASE WHEN e.event_type = 'DERATE' THEN COALESCE(e.impact_factor, 1) ELSE 1 END) -- Impact factor
                )
            ELSE 0
        END as loss
    FROM sgpa_events e
    JOIN valid_tests t ON e.well_id = t.well_id
    WHERE e.status = 'CLOSED'
      AND (e.estimated_loss_m3 IS NULL)
)
UPDATE sgpa_events
SET estimated_loss_m3 = round(cl.loss, 2)
FROM calculated_loss cl
WHERE sgpa_events.id = cl.id;
