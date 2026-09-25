import { supabase } from '@/lib/supabase/client'
import { WellChecklist } from '@/lib/types'
import { auditService } from './auditService'

const mapDbChecklist = (d: any): WellChecklist => ({
  id: d.id,
  tankId: d.tank_id,
  wellId: d.well_id,
  userId: d.user_id,
  date: d.date,
  safetyEpi: d.safety_epi,
  safetyAreaSafe: d.safety_area_safe,
  safetyLeakVisible: d.safety_leak_visible,
  safetyObservation: d.safety_observation,
  pumpingUnitOn: d.pumping_unit_on,
  pumpingUnitNormal: d.pumping_unit_normal,
  pumpingUnitNoiseVibration: d.pumping_unit_noise_vibration,
  pumpingUnitAbnormalType: d.pumping_unit_abnormal_type,
  motorOperating: d.motor_operating,
  reducerNoLeak: d.reducer_no_leak,
  oilLevelStatus: d.oil_level_status,
  hoursOperating: Number(d.hours_operating),
  hasStopped: d.has_stopped,
  stopReason: d.stop_reason,
  elevationMethod: d.elevation_method as 'bcp' | 'bm',
  freqHz: Number(d.freq_hz),
  rotationRpm: Number(d.rotation_rpm),
  currentA: Number(d.current_a),
  torquePercent: Number(d.torque_percent),
  ptBar: Number(d.pt_bar),
  prBar: Number(d.pr_bar),
  subGasM: Number(d.sub_gas_m),
  subNoGasM: Number(d.sub_no_gas_m),
  bmCpm: Number(d.bm_cpm),
  bmEfficiencyPercent: Number(d.bm_efficiency_percent),
  bmPdM3d: Number(d.bm_pd_m3d),
  bmRodsPercent: Number(d.bm_rods_percent),
  bmPprlLb: Number(d.bm_pprl_lb),
  bmMprlLb: Number(d.bm_mprl_lb),
  bmPeakTorque: Number(d.bm_peak_torque),
  bmDiffPercent: Number(d.bm_diff_percent),
  anomalyPumpBeat: d.anomaly_pump_beat,
  anomalyIrregularProduction: d.anomaly_irregular_production,
  anomalyAbnormalReturn: d.anomaly_abnormal_return,
  anomalyAbnormalNoise: d.anomaly_abnormal_noise,
  anomalyMechanicalIssue: d.anomaly_mechanical_issue,
  anomalyElectricalIssue: d.anomaly_electrical_issue,
  anomalyNone: d.anomaly_none,
  anomalyObservation: d.anomaly_observation,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
})

export const checklistService = {
  async getChecklists(tankId: string): Promise<WellChecklist[]> {
    const { data, error } = await supabase
      .from('well_checklists')
      .select('*')
      .eq('tank_id', tankId)
      .order('date', { ascending: false })

    if (error) throw error
    return data.map(mapDbChecklist)
  },

  async createChecklist(
    data: Omit<WellChecklist, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WellChecklist> {
    const checklistId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    const dbData = {
      id: checklistId,
      tank_id: data.tankId,
      well_id: data.wellId,
      user_id: data.userId,
      date: data.date,
      safety_epi: data.safetyEpi,
      safety_area_safe: data.safetyAreaSafe,
      safety_leak_visible: data.safetyLeakVisible,
      safety_observation: data.safetyObservation,
      pumping_unit_on: data.pumpingUnitOn,
      pumping_unit_normal: data.pumpingUnitNormal,
      pumping_unit_noise_vibration: data.pumpingUnitNoiseVibration,
      pumping_unit_abnormal_type: data.pumpingUnitAbnormalType,
      motor_operating: data.motorOperating,
      reducer_no_leak: data.reducerNoLeak,
      oil_level_status: data.oilLevelStatus,
      hours_operating: data.hoursOperating,
      has_stopped: data.hasStopped,
      stop_reason: data.stopReason,
      elevation_method: data.elevationMethod,
      freq_hz: data.freqHz,
      rotation_rpm: data.rotationRpm,
      current_a: data.currentA,
      torque_percent: data.torquePercent,
      pt_bar: data.ptBar,
      pr_bar: data.prBar,
      sub_gas_m: data.subGasM,
      sub_no_gas_m: data.subNoGasM,
      bm_cpm: data.bmCpm,
      bm_efficiency_percent: data.bmEfficiencyPercent,
      bm_pd_m3d: data.bmPdM3d,
      bm_rods_percent: data.bmRodsPercent,
      bm_pprl_lb: data.bmPprlLb,
      bm_mprl_lb: data.bmMprlLb,
      bm_peak_torque: data.bmPeakTorque,
      bm_diff_percent: data.bmDiffPercent,
      anomaly_pump_beat: data.anomalyPumpBeat,
      anomaly_irregular_production: data.anomalyIrregularProduction,
      anomaly_abnormal_return: data.anomalyAbnormalReturn,
      anomaly_abnormal_noise: data.anomalyAbnormalNoise,
      anomaly_mechanical_issue: data.anomalyMechanicalIssue,
      anomaly_electrical_issue: data.anomalyElectricalIssue,
      anomaly_none: data.anomalyNone,
      anomaly_observation: data.anomalyObservation,
      created_at: timestamp,
      updated_at: timestamp,
    }

    const { error } = await supabase.from('well_checklists').insert(dbData)

    if (error) throw error

    await auditService.createLog({
      userId: data.userId,
      entityType: 'checklist',
      entityId: checklistId,
      operationType: 'insert',
      reason: 'Criação de checklist operacional',
      newValue: JSON.stringify(dbData),
    })

    return mapDbChecklist(dbData)
  },
}
