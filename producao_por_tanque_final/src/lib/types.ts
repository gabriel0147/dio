// ... existing types ...
export type UserRole =
  | 'operator'
  | 'approver'
  | 'admin'
  | 'supervisor'
  | 'petroleum_engineer'
  | 'operations_manager'
  | 'director'
  | 'regulation'
  | 'maintenance'

export type UserApprovalStatus = 'pending' | 'active' | 'rejected'

export type ProjectRole = 'owner' | 'editor' | 'viewer'
export type TeamRole = 'team_admin' | 'team_member'
export type ProjectModule = 'srp' | 'sgp' | 'smt' | 'sbp' | 'srt' | 'sgpa'
export type ProjectScope = 'production' | 'maintenance'

export interface UserNotificationPreferences {
  projectUpdates: boolean
  teamInvites?: boolean
}

export interface UserProfile {
  id: string
  email?: string
  fullName?: string | null
  role: UserRole
  approvalStatus: UserApprovalStatus
  approvedAt?: string | null
  approvedBy?: string | null
  avatarUrl?: string | null
  emailNotificationPreferences?: UserNotificationPreferences
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  email?: string
  avatarUrl?: string | null
  role: ProjectRole
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  logoUrl?: string | null
  role?: ProjectRole
  moduleType?: ProjectModule | null
  projectScope?: ProjectScope | null
  tanks: Tank[]
}

export interface Tank {
  id: string
  tag: string
  productionField: string
  productionFieldId: string
  wellName?: string
  wellId?: string
  geolocation: string
  sheets: Sheet[]
}

export interface ProductionField {
  id: string
  name: string
  projectId?: string | null
}

export interface Well {
  id: string
  name: string
  shortName?: string
  productionFieldId: string
}

export interface TransferDestinationCategory {
  id: string
  name: string
  projectId?: string | null
}

export interface Sheet {
  id: string
  name: string
  type: 'production' | 'calibration' | 'seal' | 'reports' | 'checklist'
}

export interface ProductionRow {
  id: string
  A_Data: string
  B_Altura_Liq_Inicial_mm: number | string
  C_Volume_Inicial_m3: number | string
  D_Data_fim_periodo: string
  E_Altura_Liq_Final_mm: number | string
  F_Volume_Final_m3: number | string
  G_Diferenca_volumes: number | string
  H_Volume_Corrigido_24h: number | string
  I_Estoque_QT_m3: number | string
  J_Volume_Drenado_Agua_m3: number | string
  K_Transferencia_Emulsao: number | string
  L_Prod_Total_QT_m3_d: number | string
  M_Prod_Agua_Livre_QWF_m3_d: number | string
  N_Estoque_Agua_Livre_QWF_m3: number | string
  O_Prod_Emulsao_QEM_m3_d: number | string
  P_Prod_Oleo_Sem_Correcao_m3_d: number | string
  Q_Prod_Oleo_Corrigido_m3_d: number | string
  R_Agua_Emulsao_m3_d: number | string
  S_Agua_Total_Produzida_m3_d: number | string
  T_BSW_Total_Calculado: number | string
  U_BSW_Total_Perc: number | string
  V_BSW_Emulsao_Perc: number | string
  W_Temp_Ambiente: number | string
  X_Temp_Fluido: number | string
  Y_Dilatacao_Termica: number | string
  Z_Densidade_Lab_20C: number | string
  AA_T_Observada_C: number | string
  AB_FCV: number | string
  AB_FCV_Manual?: number | string
  AC_Fator_Encolhimento_FE: number | string
  AD_Vol_Bruto_Transf_Emulsao: number | string
  AE_Vol_Agua_Transf: number | string
  AF_Vol_Oleo_Transf_Sem_Corr: number | string
  AG_Vol_Oleo_Transf_Com_Corr: number | string
  AH_Referencia: number | string
}

export interface ProductionChartItem {
  tank_id: string
  date: string
  well_production: number
  drained: number
  transferred: number
  water_production: number
  uncorrected_oil_production: number
  total_bsw_percent: number
  stock_variation: number
  transfer_water_volume: number | null
  transfer_oil_uncorrected_volume: number | null
  transfer_oil_corrected_volume: number | null
}

export interface CalibrationRow {
  id: string
  altura_mm: number
  volume_m3: number
  fcv?: number
}

export interface SealRow {
  id: string
  tanque: string
  data: string
  hora: string
  situacao: string
  lacre_v_entrada: string
  lacre_v_dreno: string
  lacre_v_saida: string
  isSaved?: boolean
}

export interface AuditLog {
  id: string
  userId: string
  projectId?: string
  entityType:
    | 'tank'
    | 'tanks'
    | 'calibration'
    | 'production_field'
    | 'well'
    | 'calibration_table'
    | 'operation'
    | 'report'
    | 'transfer_category'
    | 'alert_rule'
    | 'user'
    | 'project'
    | 'project_member'
    | 'team'
    | 'team_member'
    | 'project_team_role'
    | 'checklist'
    | 'supervision'
    | 'srt_mobile_tank'
    | 'srt_session'
    | 'srt_test'
    | 'srt_calibration'
    | 'well_bsw_manual_entry'
    | 'sgpa_event'
    | 'sgpa_cause'
    | 'sgpa_asset'
    | 'sbp_asset'
    | 'smt_equipment'
    | 'smt_preventive_plan'
    | 'smt_maintenance_log'
  entityId: string
  operationType:
    | 'update_tank_tag'
    | 'UPDATE'
    | 'update_tank_production_field'
    | 'update_tank_well'
    | 'update_calibration'
    | 'import_calibration'
    | 'insert'
    | 'delete'
    | 'update'
    | 'batch_update'
    | 'close_report'
    | 'create_user'
    | 'delete_user'
    | 'update_user_role'
    | 'update_user_profile'
    | 'update_project_logo'
    | 'add_member'
    | 'remove_member'
    | 'update_member_role'
    | 'create_team'
    | 'update_team'
    | 'delete_team'
    | 'add_team_member'
    | 'remove_team_member'
    | 'update_team_member_role'
    | 'assign_team_to_project'
    | 'remove_team_from_project'
    | 'update_project_team_role'
    | 'supervision_audit'
    | 'import_srt_calibration'
    | 'clear_srt_calibration'
  oldValue?: string
  newValue?: string
  reason: string
  createdAt: string
}

export interface BatchCalibrationOperations {
  inserts: Omit<CalibrationRow, 'id'>[]
  updates: CalibrationRow[]
  deletes: string[]
}

export type OperationType =
  | 'production'
  | 'drainage'
  | 'transfer'
  | 'stock_variation'

export interface TankOperation {
  id: string
  tankId: string
  wellId?: string
  wellName?: string
  type: OperationType
  startTime: string
  endTime: string
  initialLevelMm: number
  finalLevelMm: number
  initialVolumeM3?: number
  finalVolumeM3?: number
  volumeM3?: number
  tempFluidC?: number
  tempAmbientC?: number
  densityObservedGcm3?: number
  bswPercent?: number
  ctl?: number
  fcv?: number
  fe?: number
  volumeCorrectedM3?: number
  waterVolumeM3?: number
  oilVolumeM3?: number
  transferDestination?: string
  dailyReportId?: string
  comments?: string
  createdAt?: string
  userId?: string
}

export interface DailyProductionReport {
  id: string
  tankId: string
  wellId?: string
  wellName?: string
  reportDate: string
  startDatetime: string
  endDatetime: string
  stockVariation: number
  totalBswPercent: number
  drainedVolumeM3: number
  transferredVolumeM3: number
  uncorrectedOilVolumeM3: number
  emulsionWaterVolumeM3: number
  tempCorrectionFactorY: number
  correctedOilVolumeM3: number
  emulsionBswPercent: number
  fluidTempC: number
  fcv: number
  fe: number
  densityAt20cGcm3?: number
  transferObservedDensityGcm3?: number
  calculatedWellProductionM3: number
  status: 'draft' | 'closed'
  createdAt: string
  closedAt?: string
  closedBy?: string
  closedByUser?: {
    fullName?: string | null
    email?: string
  }
}

export interface AlertRule {
  id: string
  projectId: string
  userId: string
  name: string
  metricField: string
  condition: 'gt' | 'lt' | 'eq' | 'neq'
  thresholdValue: number
  createdAt: string
  updatedAt: string
}

export interface AlertNotification {
  id: string
  alertRuleId: string
  dailyReportId: string
  triggeredAt: string
  message: string
  isRead: boolean
  alertRule?: AlertRule
  dailyReport?: DailyProductionReport
}

export interface Team {
  id: string
  name: string
  ownerUserId: string
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  email?: string
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectTeamRole {
  id: string
  projectId: string
  teamId: string
  role: ProjectRole
  teamName?: string
  createdAt: string
  updatedAt: string
}

export interface WellChecklist {
  id: string
  tankId: string
  wellId?: string
  userId: string
  date: string

  // Safety
  safetyEpi: boolean
  safetyAreaSafe: boolean
  safetyLeakVisible: boolean
  safetyObservation?: string

  // Equipment
  pumpingUnitOn: boolean
  pumpingUnitNormal: boolean
  pumpingUnitNoiseVibration: boolean
  pumpingUnitAbnormalType?: string

  motorOperating: boolean
  reducerNoLeak: boolean
  oilLevelStatus: string

  // Operation
  hoursOperating: number
  hasStopped: boolean
  stopReason?: string

  // Sonolog
  elevationMethod: 'bcp' | 'bm'
  freqHz: number
  rotationRpm: number
  currentA: number
  torquePercent: number
  ptBar: number
  prBar: number
  subGasM: number
  subNoGasM: number

  bmCpm: number
  bmEfficiencyPercent: number
  bmPdM3d: number
  bmRodsPercent: number
  bmPprlLb: number
  bmMprlLb: number
  bmPeakTorque: number
  bmDiffPercent: number

  // Anomalies
  anomalyPumpBeat: boolean
  anomalyIrregularProduction: boolean
  anomalyAbnormalReturn: boolean
  anomalyAbnormalNoise: boolean
  anomalyMechanicalIssue: boolean
  anomalyElectricalIssue: boolean
  anomalyNone: boolean
  anomalyObservation?: string

  createdAt: string
  updatedAt: string
}

export interface OperationalSupervision {
  id: string
  projectId: string
  tankId: string
  reportDate: string
  justificationProduction?: string
  justificationChecklist?: string
  status: 'pending' | 'audited'
  auditedAt?: string
  auditedBy?: string
  createdAt: string
}

export interface SupervisionStatus {
  tank: Tank
  hasProduction: boolean
  hasChecklist: boolean
  checklistAlerts: {
    safetyRisk: boolean
    leak: boolean
    equipmentFailure: boolean
    anomaly: boolean
    stopped: boolean
    stopReason?: string
  }
  supervisionRecord?: OperationalSupervision
}

// SRT Types
export interface SrtMobileTank {
  id: string
  projectId?: string
  tankName: string
  capacity: number
  unit: string
  notes?: string
  active: boolean
  wellId?: string
  createdAt: string
  updatedAt: string
}

export interface SrtTankSession {
  id: string
  projectId?: string
  tankId: string
  tankName?: string
  wellId?: string
  wellName?: string
  startAt: string
  endAt?: string
  responsibleUserId?: string
  responsibleUserName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type SrtTestType =
  | 'apropriacao'
  | 'operacional'
  | 'diagnostico'
  | 'comissionamento'
export type SrtTestStatus = 'rascunho' | 'valido' | 'invalido' | 'vigente'

export interface SrtWellTest {
  id: string
  sessionId: string
  wellId: string
  wellName?: string
  testStartAt: string
  testEndAt: string
  testType: SrtTestType
  status: SrtTestStatus
  responsibleUserId?: string
  notes?: string

  // Volumes
  vLiqTest: number // Stores Gross/Total Fluid Volume
  vOilTest: number // Net Oil
  vWatTest: number // Total Water
  vGasTest: number

  // Breakdown - Added for better granularity
  vEmulsion?: number
  vFreeWater?: number
  vWaterInEmulsion?: number
  vWaterTotal?: number

  // Linear Measurements
  totalHeightMm?: number
  afterDrainageHeightMm?: number
  initialHeightMm?: number
  finalHeightMm?: number
  emulsionHeightMm?: number
  initialLevelVolumeM3?: number
  finalLevelVolumeM3?: number
  emulsionLevelVolumeM3?: number
  sourceBswTestId?: string

  // Corrections
  fe?: number
  fcv?: number
  fdt?: number
  ftc?: number
  vOilCorrected?: number

  // Phys-Chem
  temperatureAvg?: number
  density?: number
  densityRefTemp?: number
  ipswValue?: number
  ipswUnit?: string
  analysisNotes?: string
  labReportAttachment?: string

  // BSW
  bswEmulsionPct: number
  bswMethod?: string
  bswQuality?: string

  // Computed (Frontend Use)
  durationH?: number
  qLiq?: number
  qOil?: number
  qWat?: number
  potLiq24h?: number
  potOil24h?: number
  potWat24h?: number
  bswTotalPct?: number

  createdAt: string
  updatedAt: string
}

export interface SrtCalibrationRow {
  id: string
  tankId: string
  heightMm: number
  volumeM3: number
  fcv?: number
  createdAt: string
}

export interface WellBSWRecord {
  id: string
  tankId?: string
  wellId: string
  wellName?: string
  date: string
  totalVolumeM3?: number
  emulsionVolumeM3?: number
  freeWaterVolumeM3?: number
  emulsionWaterVolumeM3?: number
  oilVolumeM3?: number
  totalWaterVolumeM3?: number
  bswEmulsionPct: number
  bswTotalPct: number
  sourceSrtTestId?: string
  origin: 'Lançado' | 'Teste'
  userId?: string
  createdAt: string
}

// SGPA Types
export type SgpaCauseCategory =
  | 'Operacional'
  | 'Mecânica'
  | 'Elétrica'
  | 'Processo'
  | 'Externa'
  | 'Segurança'
  | 'Medição'

export type SgpaAssetType =
  | 'BCP'
  | 'Motor'
  | 'Inversor'
  | 'BM'
  | 'Coluna'
  | 'Válvula'
  | 'Linha'
  | 'Instrumentação'
  | 'Outro'

export type SgpaEventType = 'STOP' | 'DERATE'
export type SgpaEventStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'

export interface SgpaCause {
  id: string
  category: SgpaCauseCategory
  causeName: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SgpaAsset {
  id: string
  assetType: SgpaAssetType
  tag: string
  wellId: string
  wellName?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SgpaEvent {
  id: string
  wellId: string
  wellName?: string
  eventDate: string
  eventType: SgpaEventType
  status: SgpaEventStatus
  startAt: string
  endAt?: string
  durationMin?: number
  category: SgpaCauseCategory
  causeId?: string
  causeName?: string
  assetId?: string
  assetTag?: string
  failureFlag: boolean
  impactFactor?: number
  estimatedLossM3?: number
  responsibleUserId?: string
  workOrderRef?: string
  notes?: string
  attachments?: string[]
  createdAt: string
  updatedAt: string
}

export interface ProjectHubSummary {
  activeAssetsCount: number
  openEventsCount: number
  productionReportsStatus: {
    total: number
    closed: number
    draft: number
  }
}

// SBP Types
export interface SbpAsset {
  id: string
  projectId: string
  assetNumber: string
  description: string
  category: string
  acquisitionDate?: string | null
  acquisitionValue?: number | null
  estimatedUsefulLife?: number | null
  location?: string | null
  responsible?: string | null
  situation: 'active' | 'in_use' | 'idle' | 'retired'
  createdAt: string
  updatedAt: string
}

// SMT Types
export interface SmtEquipment {
  id: string
  projectId: string
  sbpAssetId?: string | null
  parentId?: string | null
  parentName?: string | null
  code: string
  name: string
  category: string
  manufacturer?: string | null
  model?: string | null
  serialNumber?: string | null
  acquisitionDate?: string | null
  location?: string | null
  costCenter?: string | null
  status: 'active' | 'in_maintenance' | 'inactive' | 'scrapped' | 'new'
  createdAt: string
  updatedAt: string
}

export interface SmtPreventivePlan {
  id: string
  projectId: string
  equipmentId: string
  equipmentName?: string
  periodicityType: 'days' | 'hours'
  interval: number
  checklist: any // JSON structure
  nextScheduledDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface SmtMaintenanceLog {
  id: string
  projectId: string
  equipmentId: string
  equipmentName?: string
  preventivePlanId?: string | null
  type: 'preventive' | 'corrective'
  status: 'open' | 'in_progress' | 'finished'
  failureDescription?: string | null
  cause?: string | null
  actionTaken?: string | null
  startAt?: string | null
  endAt?: string | null
  responsibleUserId?: string | null
  responsibleUserName?: string | null
  createdAt: string
  updatedAt: string
}
