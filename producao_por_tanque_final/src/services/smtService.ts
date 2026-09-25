import { supabase } from '@/lib/supabase/client'
import { SmtEquipment, SmtPreventivePlan, SmtMaintenanceLog } from '@/lib/types'
import { auditService } from './auditService'

export const smtService = {
  // Equipment
  async getEquipment(projectId: string): Promise<SmtEquipment[]> {
    const { data, error } = await supabase
      .from('smt_equipment')
      .select('*, parent:parent_id(name)')
      .eq('project_id', projectId)
      .order('name')

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      sbpAssetId: d.sbp_asset_id,
      parentId: d.parent_id,
      parentName: d.parent?.name,
      code: d.code,
      name: d.name,
      category: d.category,
      manufacturer: d.manufacturer,
      model: d.model,
      serialNumber: d.serial_number,
      acquisitionDate: d.acquisition_date,
      location: d.location,
      costCenter: d.cost_center,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createEquipment(
    equipment: Omit<SmtEquipment, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<SmtEquipment> {
    const { data, error } = await supabase
      .from('smt_equipment')
      .insert({
        project_id: equipment.projectId,
        sbp_asset_id: equipment.sbpAssetId,
        parent_id: equipment.parentId,
        code: equipment.code,
        name: equipment.name,
        category: equipment.category,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serial_number: equipment.serialNumber,
        acquisition_date: equipment.acquisitionDate,
        location: equipment.location,
        cost_center: equipment.costCenter,
        status: equipment.status,
      })
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'smt_equipment',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de equipamento SMT',
      newValue: JSON.stringify(data),
    })

    return {
      id: data.id,
      projectId: data.project_id,
      sbpAssetId: data.sbp_asset_id,
      parentId: data.parent_id,
      code: data.code,
      name: data.name,
      category: data.category,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serial_number,
      acquisitionDate: data.acquisition_date,
      location: data.location,
      costCenter: data.cost_center,
      status: data.status as SmtEquipment['status'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateEquipment(
    id: string,
    updates: Partial<SmtEquipment>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.sbpAssetId !== undefined)
      dbUpdates.sbp_asset_id = updates.sbpAssetId
    if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId
    if (updates.code) dbUpdates.code = updates.code
    if (updates.name) dbUpdates.name = updates.name
    if (updates.category) dbUpdates.category = updates.category
    if (updates.manufacturer !== undefined)
      dbUpdates.manufacturer = updates.manufacturer
    if (updates.model !== undefined) dbUpdates.model = updates.model
    if (updates.serialNumber !== undefined)
      dbUpdates.serial_number = updates.serialNumber
    if (updates.acquisitionDate !== undefined)
      dbUpdates.acquisition_date = updates.acquisitionDate
    if (updates.location !== undefined) dbUpdates.location = updates.location
    if (updates.costCenter !== undefined)
      dbUpdates.cost_center = updates.costCenter
    if (updates.status) dbUpdates.status = updates.status

    const { error } = await supabase
      .from('smt_equipment')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'smt_equipment',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de equipamento SMT',
      newValue: JSON.stringify(dbUpdates),
    })
  },

  async deleteEquipment(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('smt_equipment').delete().eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'smt_equipment',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de equipamento SMT',
    })
  },

  // Preventive Plans
  async getPreventivePlans(projectId: string): Promise<SmtPreventivePlan[]> {
    const { data, error } = await supabase
      .from('smt_preventive_plans')
      .select('*, equipment:smt_equipment(name)')
      .eq('project_id', projectId)

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      equipmentId: d.equipment_id,
      equipmentName: d.equipment?.name,
      periodicityType: d.periodicity_type,
      interval: d.interval,
      checklist: d.checklist,
      nextScheduledDate: d.next_scheduled_date,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createPreventivePlan(
    plan: Omit<SmtPreventivePlan, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<SmtPreventivePlan> {
    const { data, error } = await supabase
      .from('smt_preventive_plans')
      .insert({
        project_id: plan.projectId,
        equipment_id: plan.equipmentId,
        periodicity_type: plan.periodicityType,
        interval: plan.interval,
        checklist: plan.checklist,
        next_scheduled_date: plan.nextScheduledDate,
      })
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'smt_preventive_plan',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de plano preventivo',
      newValue: JSON.stringify(data),
    })

    return {
      id: data.id,
      projectId: data.project_id,
      equipmentId: data.equipment_id,
      periodicityType:
        data.periodicity_type as SmtPreventivePlan['periodicityType'],
      interval: data.interval,
      checklist: data.checklist,
      nextScheduledDate: data.next_scheduled_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updatePreventivePlan(
    id: string,
    updates: Partial<SmtPreventivePlan>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.equipmentId) dbUpdates.equipment_id = updates.equipmentId
    if (updates.periodicityType)
      dbUpdates.periodicity_type = updates.periodicityType
    if (updates.interval !== undefined) dbUpdates.interval = updates.interval
    if (updates.checklist) dbUpdates.checklist = updates.checklist
    if (updates.nextScheduledDate !== undefined)
      dbUpdates.next_scheduled_date = updates.nextScheduledDate

    const { error } = await supabase
      .from('smt_preventive_plans')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'smt_preventive_plan',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de plano preventivo',
      newValue: JSON.stringify(dbUpdates),
    })
  },

  async deletePreventivePlan(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('smt_preventive_plans')
      .delete()
      .eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'smt_preventive_plan',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de plano preventivo',
    })
  },

  // Maintenance Logs
  async getMaintenanceLogs(
    projectId: string,
    equipmentId?: string,
  ): Promise<SmtMaintenanceLog[]> {
    let query = supabase
      .from('smt_maintenance_logs')
      .select('*, equipment:smt_equipment(name), user:user_profiles(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId)
    }

    const { data, error } = await query

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      equipmentId: d.equipment_id,
      equipmentName: d.equipment?.name,
      preventivePlanId: d.preventive_plan_id,
      type: d.type,
      status: d.status,
      failureDescription: d.failure_description,
      cause: d.cause,
      actionTaken: d.action_taken,
      startAt: d.start_at,
      endAt: d.end_at,
      responsibleUserId: d.responsible_user_id,
      responsibleUserName: d.user?.full_name,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createMaintenanceLog(
    log: Omit<SmtMaintenanceLog, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<SmtMaintenanceLog> {
    const { data, error } = await supabase
      .from('smt_maintenance_logs')
      .insert({
        project_id: log.projectId,
        equipment_id: log.equipmentId,
        preventive_plan_id: log.preventivePlanId,
        type: log.type,
        status: log.status,
        failure_description: log.failureDescription,
        cause: log.cause,
        action_taken: log.actionTaken,
        start_at: log.startAt,
        end_at: log.endAt,
        responsible_user_id: log.responsibleUserId,
      })
      .select()
      .single()

    if (error) throw error

    // Automatically update equipment status if needed
    if (log.status === 'in_progress' || log.status === 'open') {
      await this.updateEquipment(
        log.equipmentId,
        { status: 'in_maintenance' },
        userId,
      )
    } else if (log.status === 'finished') {
      await this.updateEquipment(log.equipmentId, { status: 'active' }, userId)
    }

    await auditService.createLog({
      userId,
      entityType: 'smt_maintenance_log',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Registro de manutenção',
      newValue: JSON.stringify(data),
    })

    return {
      id: data.id,
      projectId: data.project_id,
      equipmentId: data.equipment_id,
      preventivePlanId: data.preventive_plan_id,
      type: data.type as SmtMaintenanceLog['type'],
      status: data.status as SmtMaintenanceLog['status'],
      failureDescription: data.failure_description,
      cause: data.cause,
      actionTaken: data.action_taken,
      startAt: data.start_at,
      endAt: data.end_at,
      responsibleUserId: data.responsible_user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateMaintenanceLog(
    id: string,
    updates: Partial<SmtMaintenanceLog>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.status) dbUpdates.status = updates.status
    if (updates.failureDescription !== undefined)
      dbUpdates.failure_description = updates.failureDescription
    if (updates.cause !== undefined) dbUpdates.cause = updates.cause
    if (updates.actionTaken !== undefined)
      dbUpdates.action_taken = updates.actionTaken
    if (updates.startAt !== undefined) dbUpdates.start_at = updates.startAt
    if (updates.endAt !== undefined) dbUpdates.end_at = updates.endAt
    if (updates.responsibleUserId !== undefined)
      dbUpdates.responsible_user_id = updates.responsibleUserId

    // Fetch current log to check equipment_id
    const { data: currentLog } = await supabase
      .from('smt_maintenance_logs')
      .select('equipment_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('smt_maintenance_logs')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    // Update equipment status on log finish
    if (updates.status === 'finished' && currentLog) {
      await this.updateEquipment(
        currentLog.equipment_id,
        { status: 'active' },
        userId,
      )
    }

    await auditService.createLog({
      userId,
      entityType: 'smt_maintenance_log',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de manutenção',
      newValue: JSON.stringify(dbUpdates),
    })
  },
}
