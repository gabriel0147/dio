-- Create alert_rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric_field TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, name)
);

-- Create alert_notifications table
CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES daily_production_reports(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL
);

-- Indexes
CREATE INDEX idx_alert_notifications_rule ON alert_notifications(alert_rule_id);
CREATE INDEX idx_alert_notifications_read ON alert_notifications(is_read);
CREATE INDEX idx_alert_rules_project ON alert_rules(project_id);

-- Trigger function to check alerts
CREATE OR REPLACE FUNCTION check_daily_report_alerts() RETURNS TRIGGER AS $$
DECLARE
  tank_project_id UUID;
  rule RECORD;
  metric_val NUMERIC;
  is_triggered BOOLEAN;
BEGIN
  -- Only check if status is 'closed' or if we want real-time even on drafts. 
  -- Assuming alerts are meaningful on closed/finalized reports or updates.
  -- Let's check on any update/insert to be proactive.

  -- Get project_id from the tank associated with the report
  SELECT project_id INTO tank_project_id FROM tanks WHERE id = NEW.tank_id;

  IF tank_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Iterate over rules for this project
  FOR rule IN SELECT * FROM alert_rules WHERE project_id = tank_project_id LOOP
    
    -- Extract metric value dynamically based on rule.metric_field
    metric_val := NULL;
    
    CASE rule.metric_field
      WHEN 'corrected_oil_volume_m3' THEN metric_val := NEW.corrected_oil_volume_m3;
      WHEN 'total_bsw_percent' THEN metric_val := NEW.total_bsw_percent;
      WHEN 'drained_volume_m3' THEN metric_val := NEW.drained_volume_m3;
      WHEN 'uncorrected_oil_volume_m3' THEN metric_val := NEW.uncorrected_oil_volume_m3;
      WHEN 'emulsion_bsw_percent' THEN metric_val := NEW.emulsion_bsw_percent;
      WHEN 'fluid_temp_c' THEN metric_val := NEW.fluid_temp_c;
      WHEN 'stock_variation' THEN metric_val := NEW.stock_variation;
      WHEN 'transferred_volume_m3' THEN metric_val := NEW.transferred_volume_m3;
      WHEN 'calculated_well_production_m3' THEN metric_val := NEW.calculated_well_production_m3;
      WHEN 'fcv' THEN metric_val := NEW.fcv;
      WHEN 'fe' THEN metric_val := NEW.fe;
      ELSE metric_val := NULL;
    END CASE;

    -- Evaluate condition if metric is present
    IF metric_val IS NOT NULL THEN
      is_triggered := FALSE;
      
      IF rule.condition = 'gt' AND metric_val > rule.threshold_value THEN
        is_triggered := TRUE;
      ELSIF rule.condition = 'lt' AND metric_val < rule.threshold_value THEN
        is_triggered := TRUE;
      ELSIF rule.condition = 'eq' AND metric_val = rule.threshold_value THEN
        is_triggered := TRUE;
      ELSIF rule.condition = 'neq' AND metric_val <> rule.threshold_value THEN
        is_triggered := TRUE;
      END IF;

      -- If triggered, check if notification already exists for this rule+report to avoid duplicates
      IF is_triggered THEN
        IF NOT EXISTS (
            SELECT 1 FROM alert_notifications 
            WHERE alert_rule_id = rule.id AND daily_report_id = NEW.id
        ) THEN
            INSERT INTO alert_notifications (alert_rule_id, daily_report_id, message, triggered_at)
            VALUES (
                rule.id, 
                NEW.id, 
                'Alerta "' || rule.name || '" acionado: ' || rule.metric_field || ' (' || metric_val || ') ' || 
                CASE rule.condition 
                    WHEN 'gt' THEN '>'
                    WHEN 'lt' THEN '<'
                    WHEN 'eq' THEN '='
                    WHEN 'neq' THEN '!='
                    ELSE rule.condition
                END || ' ' || rule.threshold_value,
                NOW()
            );
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_check_daily_report_alerts ON daily_production_reports;
CREATE TRIGGER trigger_check_daily_report_alerts
  AFTER INSERT OR UPDATE ON daily_production_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_report_alerts();
