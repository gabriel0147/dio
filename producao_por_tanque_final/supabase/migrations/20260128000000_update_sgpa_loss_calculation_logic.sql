-- Migration to update estimated_loss_m3 in sgpa_events table to use UNCORRECTED oil volume from valid SRT tests.

WITH valid_tests AS (
    SELECT DISTINCT ON (well_id)
        well_id,
        v_oil_test, -- Using uncorrected oil volume strictly
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
                    (t.v_oil_test / (EXTRACT(EPOCH FROM (t.test_end_at - t.test_start_at)) / 3600)) -- Hourly rate from UNCORRECTED test volume
                    * (e.duration_min::numeric / 60) -- Event duration in hours
                    * (CASE WHEN e.event_type = 'DERATE' THEN COALESCE(e.impact_factor, 1) ELSE 1 END) -- Impact factor
                )
            ELSE 0
        END as loss
    FROM sgpa_events e
    JOIN valid_tests t ON e.well_id = t.well_id
    WHERE e.status = 'CLOSED'
)
UPDATE sgpa_events
SET estimated_loss_m3 = round(cl.loss, 2)
FROM calculated_loss cl
WHERE sgpa_events.id = cl.id;
