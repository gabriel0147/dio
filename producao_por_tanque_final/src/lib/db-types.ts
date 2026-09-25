import { ProductionRow, SealRow } from './types'

// ... existing interfaces ...
export interface DbProject {
  id: string
  name: string
  description: string | null
  created_by: string | null
  logo_url: string | null
  created_at: string
  updated_at: string | null
}

export interface DbProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
  updated_at: string
}

export interface DbProductionField {
  id: string
  name: string
  project_id: string | null
  created_at: string
  updated_at: string | null
}

export interface DbWell {
  id: string
  name: string
  short_name?: string | null
  production_field_id: string
  created_at: string
  updated_at: string | null
}

export interface DbTank {
  id: string
  project_id: string
  tag: string
  production_field_id: string
  well_id: string | null
  geolocation: string | null
  created_at: string
  updated_at: string | null
  production_field?: DbProductionField
  well?: DbWell
}

export interface DbTransferDestinationCategory {
  id: string
  name: string
  project_id: string
  created_at: string
  updated_at: string | null
}

export interface DbProductionData {
  id: string
  tank_id: string
  date: string | null
  gross_production: number | null
  total_water_production: number | null
  uncorrected_oil_production: number | null
  corrected_oil_production: number | null
  raw_data: ProductionRow
  created_at: string
}

export interface DbCalibrationData {
  id: string
  tank_id: string
  height_mm: number
  volume_m3: number
  fcv: number | null
  created_at: string
}

export interface DbSealData {
  id: string
  tank_id: string
  date: string | null
  raw_data: SealRow
  created_at: string
}

export interface DbAuditLog {
  id: string
  user_id: string
  project_id: string | null
  entity_type: string
  entity_id: string
  operation_type: string
  old_value: string | null
  new_value: string | null
  reason: string
  created_at: string
}

export interface DbAlertRule {
  id: string
  project_id: string
  user_id: string
  name: string
  metric_field: string
  condition: string
  threshold_value: number
  created_at: string
  updated_at: string
}

export interface DbAlertNotification {
  id: string
  alert_rule_id: string
  daily_report_id: string
  triggered_at: string
  message: string
  is_read: boolean
}

export interface DbUserProfile {
  id: string
  role:
    | 'operator'
    | 'approver'
    | 'admin'
    | 'supervisor'
    | 'petroleum_engineer'
    | 'operations_manager'
    | 'director'
    | 'regulation'
    | 'maintenance'
  email_notification_preferences: any
  full_name?: string | null
  approval_status?: 'pending' | 'active' | 'rejected'
  approved_at?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
}

export interface DbAppSettings {
  key: string
  value: string
  updated_at: string
  updated_by: string | null
}

export interface DbTeam {
  id: string
  name: string
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface DbTeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'team_admin' | 'team_member'
  created_at: string
  updated_at: string
}

export interface DbProjectTeamRole {
  id: string
  project_id: string
  team_id: string
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
  updated_at: string
}

export interface DbWellChecklist {
  id: string
  tank_id: string
  well_id: string | null
  user_id: string
  date: string
  safety_epi: boolean
  safety_area_safe: boolean
  safety_leak_visible: boolean
  safety_observation: string | null
  pumping_unit_on: boolean
  pumping_unit_normal: boolean
  pumping_unit_noise_vibration: boolean
  pumping_unit_abnormal_type: string | null
  motor_operating: boolean
  reducer_no_leak: boolean
  oil_level_status: string
  hours_operating: number
  has_stopped: boolean
  stop_reason: string | null
  elevation_method: string
  freq_hz: number | null
  rotation_rpm: number | null
  current_a: number | null
  torque_percent: number | null
  pt_bar: number | null
  pr_bar: number | null
  sub_gas_m: number | null
  sub_no_gas_m: number | null
  bm_cpm: number | null
  bm_efficiency_percent: number | null
  bm_pd_m3d: number | null
  bm_rods_percent: number | null
  bm_pprl_lb: number | null
  bm_mprl_lb: number | null
  bm_peak_torque: number | null
  bm_diff_percent: number | null
  anomaly_pump_beat: boolean
  anomaly_irregular_production: boolean
  anomaly_abnormal_return: boolean
  anomaly_abnormal_noise: boolean
  anomaly_mechanical_issue: boolean
  anomaly_electrical_issue: boolean
  anomaly_none: boolean
  anomaly_observation: string | null
  created_at: string
  updated_at: string
}

export interface DbOperationalSupervision {
  id: string
  project_id: string
  tank_id: string
  report_date: string
  justification_production: string | null
  justification_checklist: string | null
  status: string
  audited_at: string | null
  audited_by: string | null
  created_at: string
}

export interface DbSrtMobileTank {
  id: string
  project_id: string | null
  tank_name: string
  capacity: number | null
  unit: string | null
  notes: string | null
  active: boolean
  well_id: string | null
  created_at: string
  updated_at: string
}

export interface DbSrtTankSession {
  id: string
  project_id: string | null
  tank_id: string
  well_id: string | null
  start_at: string
  end_at: string | null
  responsible_user_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbSrtWellTest {
  id: string
  session_id: string
  well_id: string
  test_start_at: string
  test_end_at: string
  test_type: 'apropriacao' | 'operacional' | 'diagnostico' | 'comissionamento'
  status: 'rascunho' | 'valido' | 'invalido' | 'vigente'
  responsible_user_id: string | null
  notes: string | null
  v_liq_test: number | null
  v_oil_test: number | null
  v_wat_test: number | null
  v_gas_test: number | null
  v_emulsion?: number | null
  v_free_water?: number | null
  v_water_in_emulsion?: number | null
  v_water_total?: number | null
  total_height_mm: number | null
  after_drainage_height_mm: number | null
  initial_height_mm?: number | null
  final_height_mm?: number | null
  emulsion_height_mm?: number | null
  initial_level_volume_m3?: number | null
  final_level_volume_m3?: number | null
  emulsion_level_volume_m3?: number | null
  source_bsw_test_id?: string | null
  fe: number | null
  fcv: number | null
  fdt: number | null
  ftc?: number | null
  v_oil_corrected: number | null
  temperature_avg: number | null
  density: number | null
  density_ref_temp: number | null
  ipsw_value: number | null
  ipsw_unit: string | null
  analysis_notes: string | null
  lab_report_attachment: string | null
  bsw_emulsion_pct: number | null
  bsw_method: string | null
  bsw_quality: string | null
  created_at: string
  updated_at: string
}

export interface DbWellBSWManualEntry {
  id: string
  tank_id?: string | null
  well_id: string
  report_date: string
  measured_at?: string
  bsw_emulsion_pct: number
  bsw_total_pct: number
  created_at: string
  user_id: string
  source_srt_test_id?: string | null
}

export interface DbSgpaCause {
  id: string
  category: string
  cause_name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbSgpaAsset {
  id: string
  asset_type: string
  tag: string
  well_id: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface DbSgpaEvent {
  id: string
  well_id: string
  event_date: string
  event_type: string
  status: string
  start_at: string
  end_at: string | null
  duration_min: number | null
  category: string
  cause_id: string | null
  asset_id: string | null
  failure_flag: boolean
  impact_factor: number | null
  estimated_loss_m3: number | null
  responsible_user_id: string | null
  work_order_ref: string | null
  notes: string | null
  attachments: string[] | null
  created_at: string
  updated_at: string
}

export interface DbFcvCalculationLog {
  id: string
  user_id: string
  requested_by_user_id?: string | null
  calculated_at: string
  fluid_temp_c: number
  observed_density_gcm3: number
  density_at_20c_gcm3: number
  fcv: number
  reference_base: string
  pressure_kpag: number
  applied_norm: string
  algorithm_version: string
  calculation_reason?: string | null
}

export interface DbDailyProductionReport {
  id: string
  tank_id: string
  well_id?: string | null
  report_date: string
  start_datetime: string
  end_datetime: string
  stock_variation: number | null
  total_bsw_percent: number | null
  drained_volume_m3: number | null
  transferred_volume_m3: number | null
  uncorrected_oil_volume_m3: number | null
  emulsion_water_volume_m3: number | null
  temp_correction_factor_y: number | null
  corrected_oil_volume_m3: number | null
  emulsion_bsw_percent: number | null
  fluid_temp_c: number | null
  fcv: number | null
  fe: number | null
  density_at_20c_gcm3: number | null
  transfer_observed_density_gcm3: number | null
  calculated_well_production_m3: number | null
  status: string
  created_at: string
  updated_at: string | null
  closed_at: string | null
  closed_by: string | null
}

export interface DbSbpAsset {
  id: string
  project_id: string
  asset_number: string
  description: string
  category: string
  acquisition_date: string | null
  acquisition_value: number | null
  estimated_useful_life: number | null
  location: string | null
  responsible: string | null
  situation: string
  created_at: string
  updated_at: string
}

export interface DbSmtEquipment {
  id: string
  project_id: string
  sbp_asset_id: string | null
  parent_id: string | null
  code: string
  name: string
  category: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  acquisition_date: string | null
  location: string | null
  cost_center: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface DbSmtPreventivePlan {
  id: string
  project_id: string
  equipment_id: string
  periodicity_type: string
  interval: number
  checklist: any | null
  next_scheduled_date: string | null
  created_at: string
  updated_at: string
}

export interface DbSmtMaintenanceLog {
  id: string
  project_id: string
  equipment_id: string
  preventive_plan_id: string | null
  type: string
  status: string
  failure_description: string | null
  cause: string | null
  action_taken: string | null
  start_at: string | null
  end_at: string | null
  responsible_user_id: string | null
  created_at: string
  updated_at: string
}
