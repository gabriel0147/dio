import { supabase } from '@/lib/supabase/client'
import { TankOperation, OperationType } from '@/lib/types'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

const mapDbOperation = (d: any): TankOperation => ({
  id: d.id,
  tankId: d.tank_id,
  wellId: d.well_id || undefined,
  type: d.type as OperationType,
  startTime: d.start_time,
  endTime: d.end_time,
  initialLevelMm: d.initial_level_mm,
  finalLevelMm: d.final_level_mm,
  initialVolumeM3: d.initial_volume_m3,
  finalVolumeM3: d.final_volume_m3,
  volumeM3: d.volume_m3,
  tempFluidC: d.temp_fluid_c,
  tempAmbientC: d.temp_ambient_c,
  densityObservedGcm3: d.density_observed_gcm3,
  bswPercent: d.bsw_percent,
  ctl: d.ctl,
  fcv: d.fcv,
  fe: d.fe,
  volumeCorrectedM3: d.volume_corrected_m3,
  waterVolumeM3: d.water_volume_m3,
  oilVolumeM3: d.oil_volume_m3,
  transferDestination: d.transfer_destination,
  dailyReportId: d.daily_report_id,
  comments: d.comments,
  createdAt: d.created_at,
  userId: d.user_id,
})

export const operationService = {
  async getOperations(tankId: string, date?: Date): Promise<TankOperation[]> {
    let query = supabase
      .from('tank_operations')
      .select('*')
      .eq('tank_id', tankId)
      .order('start_time', { ascending: true })

    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)

      query = query
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    return data.map(mapDbOperation)
  },

  async getOperationsByTankIds(
    tankIds: string[],
    startDate?: Date,
    endDate?: Date,
    types?: OperationType[],
  ): Promise<TankOperation[]> {
    if (tankIds.length === 0) return []

    let query = supabase
      .from('tank_operations')
      .select('*')
      .in('tank_id', tankIds)
      .order('start_time', { ascending: false })

    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      query = query.gte('start_time', start.toISOString())
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('start_time', end.toISOString())
    }

    if (types && types.length > 0) {
      query = query.in('type', types)
    }

    const { data, error } = await query
    if (error) throw error

    return data.map(mapDbOperation)
  },

  async getLastClosedOperation(
    tankId: string,
    before?: string | Date,
  ): Promise<TankOperation | null> {
    let query = supabase
      .from('tank_operations')
      .select('*, report:daily_production_reports!inner(status)')
      .eq('tank_id', tankId)
      .eq('report.status', 'closed')
      .order('end_time', { ascending: false })
      .limit(1)

    if (before) {
      query = query.lte(
        'end_time',
        before instanceof Date ? before.toISOString() : before,
      )
    }

    const { data: op, error: opError } = await query.maybeSingle()
    if (opError) throw opError
    if (!op) return null

    return mapDbOperation(op)
  },

  async getLastOperationBefore(
    tankId: string,
    date: string | Date,
    excludeOpId?: string,
  ): Promise<TankOperation | null> {
    const dateStr = date instanceof Date ? date.toISOString() : date

    let query = supabase
      .from('tank_operations')
      .select('*')
      .eq('tank_id', tankId)
      .lte('end_time', dateStr)
      .order('end_time', { ascending: false })
      .limit(1)

    if (excludeOpId) {
      query = query.neq('id', excludeOpId)
    }

    const { data, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return mapDbOperation(data)
  },

  async getLastOperationByReportId(
    reportId: string,
  ): Promise<TankOperation | null> {
    const { data, error } = await supabase
      .from('tank_operations')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('end_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return mapDbOperation(data)
  },

  async createOperation(
    op: Omit<TankOperation, 'id'>,
    userId: string,
  ): Promise<TankOperation> {
    const dbOp = {
      tank_id: op.tankId,
      well_id: op.wellId || null,
      type: op.type as any,
      start_time: op.startTime,
      end_time: op.endTime,
      initial_level_mm: op.initialLevelMm,
      final_level_mm: op.finalLevelMm,
      initial_volume_m3: op.initialVolumeM3,
      final_volume_m3: op.finalVolumeM3,
      volume_m3: op.volumeM3,
      temp_fluid_c: op.tempFluidC,
      temp_ambient_c: op.tempAmbientC,
      density_observed_gcm3: op.densityObservedGcm3,
      bsw_percent: op.bswPercent,
      ctl: op.ctl,
      fcv: op.fcv,
      fe: op.fe,
      volume_corrected_m3: op.volumeCorrectedM3,
      water_volume_m3: op.waterVolumeM3,
      oil_volume_m3: op.oilVolumeM3,
      transfer_destination: op.transferDestination,
      daily_report_id: op.dailyReportId,
      comments: op.comments,
      user_id: userId,
    }

    const { data, error } = await supabase
      .from('tank_operations')
      .insert(dbOp)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'operation',
      entityId: data.id,
      operationType: 'insert',
      reason: `Adicionada operação de ${op.type}`,
      newValue: JSON.stringify(dbOp),
    })

    // Notify Project Members about important update
    // We need projectId. Get it from tank.
    // Fetch tank project_id
    try {
      const { data: tank } = await supabase
        .from('tanks')
        .select('project_id')
        .eq('id', op.tankId)
        .single()

      if (tank?.project_id) {
        await notificationService.notifyProjectUpdate(
          tank.project_id,
          'operation',
          data,
        )
      }
    } catch (e) {
      console.warn('Failed to send notification for operation', e)
    }

    return { ...op, id: data.id }
  },

  async updateOperation(
    id: string,
    updates: Partial<Omit<TankOperation, 'id' | 'createdAt' | 'userId'>>,
    userId: string,
  ): Promise<TankOperation> {
    const { data: current, error: fetchError } = await supabase
      .from('tank_operations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const dbUpdates: any = {}
    if (updates.startTime) dbUpdates.start_time = updates.startTime
    if (updates.endTime) dbUpdates.end_time = updates.endTime
    if (updates.initialLevelMm !== undefined)
      dbUpdates.initial_level_mm = updates.initialLevelMm
    if (updates.finalLevelMm !== undefined)
      dbUpdates.final_level_mm = updates.finalLevelMm
    if (updates.initialVolumeM3 !== undefined)
      dbUpdates.initial_volume_m3 = updates.initialVolumeM3
    if (updates.finalVolumeM3 !== undefined)
      dbUpdates.final_volume_m3 = updates.finalVolumeM3
    if (updates.volumeM3 !== undefined) dbUpdates.volume_m3 = updates.volumeM3
    if (updates.tempFluidC !== undefined)
      dbUpdates.temp_fluid_c = updates.tempFluidC
    if (updates.tempAmbientC !== undefined)
      dbUpdates.temp_ambient_c = updates.tempAmbientC
    if (updates.densityObservedGcm3 !== undefined)
      dbUpdates.density_observed_gcm3 = updates.densityObservedGcm3
    if (updates.bswPercent !== undefined)
      dbUpdates.bsw_percent = updates.bswPercent
    if (updates.ctl !== undefined) dbUpdates.ctl = updates.ctl
    if (updates.fcv !== undefined) dbUpdates.fcv = updates.fcv
    if (updates.fe !== undefined) dbUpdates.fe = updates.fe
    if (updates.volumeCorrectedM3 !== undefined)
      dbUpdates.volume_corrected_m3 = updates.volumeCorrectedM3
    if (updates.waterVolumeM3 !== undefined)
      dbUpdates.water_volume_m3 = updates.waterVolumeM3
    if (updates.oilVolumeM3 !== undefined)
      dbUpdates.oil_volume_m3 = updates.oilVolumeM3
    if (updates.transferDestination !== undefined)
      dbUpdates.transfer_destination = updates.transferDestination
    if (updates.dailyReportId !== undefined)
      dbUpdates.daily_report_id = updates.dailyReportId
    if (updates.comments !== undefined) dbUpdates.comments = updates.comments
    if (updates.type) dbUpdates.type = updates.type
    if (updates.wellId !== undefined) dbUpdates.well_id = updates.wellId || null

    dbUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tank_operations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'operation',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de operação',
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(data),
    })

    return mapDbOperation(data)
  },

  async deleteOperation(id: string, userId: string): Promise<void> {
    const { data: current, error: fetchError } = await supabase
      .from('tank_operations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase
      .from('tank_operations')
      .delete()
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'operation',
      entityId: id,
      operationType: 'delete',
      reason: 'Operação removida',
      oldValue: JSON.stringify(current),
    })
  },

  async linkOperationsToReport(
    operationIds: string[],
    reportId: string,
  ): Promise<void> {
    if (operationIds.length === 0) return

    const { error } = await supabase
      .from('tank_operations')
      .update({ daily_report_id: reportId })
      .in('id', operationIds)

    if (error) throw error
  },
}
