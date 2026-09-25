import { supabase } from '@/lib/supabase/client'
import { SupervisionStatus, Tank, OperationalSupervision } from '@/lib/types'
import { format } from 'date-fns'

export const supervisionService = {
  async getDailyStatus(
    projectId: string,
    date: Date,
  ): Promise<SupervisionStatus[]> {
    const dateStr = format(date, 'yyyy-MM-dd')

    const [tanksResult, productionResult, checklistsResult, supervisionResult] =
      await Promise.all([
        supabase
          .from('tanks')
          .select('*, production_fields!inner(name)')
          .eq('project_id', projectId),
        supabase
          .from('daily_production_reports')
          .select('*, tanks!inner(project_id)')
          .eq('report_date', dateStr)
          .eq('tanks.project_id', projectId),
        supabase
          .from('well_checklists')
          .select('*, tanks!inner(project_id)')
          .eq('date', dateStr)
          .eq('tanks.project_id', projectId),
        supabase
          .from('operational_supervision')
          .select('*')
          .eq('project_id', projectId)
          .eq('report_date', dateStr),
      ])

    if (tanksResult.error) throw tanksResult.error
    if (productionResult.error) throw productionResult.error
    if (checklistsResult.error) throw checklistsResult.error
    if (supervisionResult.error) throw supervisionResult.error

    const tanks = tanksResult.data || []
    const production = productionResult.data || []
    const checklists = checklistsResult.data || []
    const supervision = supervisionResult.data || []

    const statusList: SupervisionStatus[] = tanks.map((tank: any) => {
      const prod = production.find((p) => p.tank_id === tank.id)
      const check = checklists.find((c) => c.tank_id === tank.id)
      const sup = supervision.find((s) => s.tank_id === tank.id)

      const tankObj: Tank = {
        id: tank.id,
        tag: tank.tag,
        productionField: tank.production_fields?.name || '',
        productionFieldId: tank.production_field_id,
        wellName: tank.well_name,
        wellId: tank.well_id,
        geolocation: tank.geolocation,
        sheets: [], // Not needed for this view
      }

      // Checklist Alert Logic
      const alerts = {
        safetyRisk: false,
        leak: false,
        equipmentFailure: false,
        anomaly: false,
        stopped: false,
        stopReason: '',
      }

      if (check) {
        if (!check.safety_epi || !check.safety_area_safe)
          alerts.safetyRisk = true
        if (check.safety_leak_visible || !check.reducer_no_leak)
          alerts.leak = true
        if (check.pumping_unit_noise_vibration || !check.pumping_unit_normal)
          alerts.equipmentFailure = true
        if (
          check.anomaly_pump_beat ||
          check.anomaly_irregular_production ||
          check.anomaly_abnormal_return
        )
          alerts.anomaly = true
        if (check.has_stopped) {
          alerts.stopped = true
          alerts.stopReason = check.stop_reason || ''
        }
      }

      return {
        tank: tankObj,
        hasProduction: !!prod,
        hasChecklist: !!check,
        checklistAlerts: alerts,
        supervisionRecord: sup
          ? {
              id: sup.id,
              projectId: sup.project_id,
              tankId: sup.tank_id,
              reportDate: sup.report_date,
              justificationProduction: sup.justification_production,
              justificationChecklist: sup.justification_checklist,
              status: sup.status as OperationalSupervision['status'],
              auditedAt: sup.audited_at,
              auditedBy: sup.audited_by,
              createdAt: sup.created_at,
            }
          : undefined,
      }
    })

    return statusList
  },

  async getChecklistsForSummary(projectId: string, date: Date): Promise<any[]> {
    const dateStr = format(date, 'yyyy-MM-dd')
    // Need to join tanks to filter by project
    const { data, error } = await supabase
      .from('well_checklists')
      .select('*, tanks!inner(production_fields!inner(project_id))')
      .eq('date', dateStr)
      .eq('tanks.production_fields.project_id', projectId)

    if (error) throw error

    return (data || []).map((item: any) => ({
      hoursOperating: item.hours_operating,
      hasStopped: item.has_stopped,
      stopReason: item.stop_reason,
    }))
  },

  async auditDay(projectId: string, date: Date, userId: string) {
    const dateStr = format(date, 'yyyy-MM-dd')

    const statusList = await this.getDailyStatus(projectId, date)

    const upserts = statusList.map((item) => ({
      project_id: projectId,
      tank_id: item.tank.id,
      report_date: dateStr,
      status: 'audited',
      audited_at: new Date().toISOString(),
      audited_by: userId,
      // If record exists, keep justifications, else null
      ...(item.supervisionRecord?.id ? { id: item.supervisionRecord.id } : {}),
    }))

    const { error } = await supabase
      .from('operational_supervision')
      .upsert(upserts, { onConflict: 'tank_id,report_date' })

    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: userId,
      project_id: projectId,
      entity_type: 'supervision',
      entity_id: projectId,
      operation_type: 'supervision_audit',
      reason: `Audited day ${dateStr}`,
    })
  },

  async saveJustification(
    projectId: string,
    tankId: string,
    date: Date,
    type: 'production' | 'checklist',
    text: string,
    userId: string,
  ) {
    const dateStr = format(date, 'yyyy-MM-dd')

    // Check if record exists
    const { data: existing } = await supabase
      .from('operational_supervision')
      .select('id')
      .eq('tank_id', tankId)
      .eq('report_date', dateStr)
      .single()

    const payload: any = {
      project_id: projectId,
      tank_id: tankId,
      report_date: dateStr,
      status: 'pending', // Reset to pending if justification changes? Or keep current. Let's keep existing or default pending.
    }

    if (type === 'production') payload.justification_production = text
    if (type === 'checklist') payload.justification_checklist = text

    if (existing) payload.id = existing.id

    const { error } = await supabase
      .from('operational_supervision')
      .upsert(payload, { onConflict: 'tank_id,report_date' })

    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: userId,
      project_id: projectId,
      entity_type: 'supervision',
      entity_id: tankId,
      operation_type: 'update_supervision_justification',
      reason: `Updated ${type} justification for ${dateStr}`,
    })
  },
}
