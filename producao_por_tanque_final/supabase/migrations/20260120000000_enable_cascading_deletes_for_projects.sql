-- Migration to enable cascading deletes for projects and their related entities
-- This ensures that when a project is deleted, all its related data is automatically removed
-- without violating foreign key constraints.

-- 1. Project Direct Children

-- Tanks
ALTER TABLE tanks
DROP CONSTRAINT IF EXISTS tanks_project_id_fkey;

ALTER TABLE tanks
ADD CONSTRAINT tanks_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Project Members
ALTER TABLE project_members
DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;

ALTER TABLE project_members
ADD CONSTRAINT project_members_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Production Fields
ALTER TABLE production_fields
DROP CONSTRAINT IF EXISTS production_fields_project_id_fkey;

ALTER TABLE production_fields
ADD CONSTRAINT production_fields_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Transfer Destination Categories
ALTER TABLE transfer_destination_categories
DROP CONSTRAINT IF EXISTS transfer_destination_categories_project_id_fkey;

ALTER TABLE transfer_destination_categories
ADD CONSTRAINT transfer_destination_categories_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Alert Rules
ALTER TABLE alert_rules
DROP CONSTRAINT IF EXISTS alert_rules_project_id_fkey;

ALTER TABLE alert_rules
ADD CONSTRAINT alert_rules_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Project Team Roles
ALTER TABLE project_team_roles
DROP CONSTRAINT IF EXISTS project_team_roles_project_id_fkey;

ALTER TABLE project_team_roles
ADD CONSTRAINT project_team_roles_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Operational Supervision
ALTER TABLE operational_supervision
DROP CONSTRAINT IF EXISTS operational_supervision_project_id_fkey;

ALTER TABLE operational_supervision
ADD CONSTRAINT operational_supervision_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE CASCADE;

-- Audit Logs (Preserve history by setting NULL)
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_project_id_fkey;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projects(id)
ON DELETE SET NULL;


-- 2. Tanks Children (Deep Clean)

-- Tank Operations
ALTER TABLE tank_operations
DROP CONSTRAINT IF EXISTS tank_operations_tank_id_fkey;

ALTER TABLE tank_operations
ADD CONSTRAINT tank_operations_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;

-- Daily Production Reports
ALTER TABLE daily_production_reports
DROP CONSTRAINT IF EXISTS daily_production_reports_tank_id_fkey;

ALTER TABLE daily_production_reports
ADD CONSTRAINT daily_production_reports_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;

-- Production Data
ALTER TABLE production_data
DROP CONSTRAINT IF EXISTS production_data_tank_id_fkey;

ALTER TABLE production_data
ADD CONSTRAINT production_data_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;

-- Calibration Data
ALTER TABLE calibration_data
DROP CONSTRAINT IF EXISTS calibration_data_tank_id_fkey;

ALTER TABLE calibration_data
ADD CONSTRAINT calibration_data_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;

-- Seal Data
ALTER TABLE seal_data
DROP CONSTRAINT IF EXISTS seal_data_tank_id_fkey;

ALTER TABLE seal_data
ADD CONSTRAINT seal_data_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;

-- Well Checklists
ALTER TABLE well_checklists
DROP CONSTRAINT IF EXISTS well_checklists_tank_id_fkey;

ALTER TABLE well_checklists
ADD CONSTRAINT well_checklists_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;

-- Operational Supervision (Tank FK)
ALTER TABLE operational_supervision
DROP CONSTRAINT IF EXISTS operational_supervision_tank_id_fkey;

ALTER TABLE operational_supervision
ADD CONSTRAINT operational_supervision_tank_id_fkey
FOREIGN KEY (tank_id)
REFERENCES tanks(id)
ON DELETE CASCADE;
