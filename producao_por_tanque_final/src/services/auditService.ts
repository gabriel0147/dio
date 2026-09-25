import { supabase } from '@/lib/supabase/client'
import { AuditLog } from '@/lib/types'

interface AuditFilter {
  startDate?: Date
  endDate?: Date
  userId?: string
  operationType?: string
  projectId?: string
}

export const auditService = {
  async getLogs(filters: AuditFilter): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }
    if (filters.endDate) {
      // End of day
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('created_at', end.toISOString())
    }
    if (filters.userId && filters.userId !== 'all') {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.operationType && filters.operationType !== 'all') {
      query = query.eq('operation_type', filters.operationType)
    }
    if (filters.projectId && filters.projectId !== 'all') {
      query = query.eq('project_id', filters.projectId)
    }

    const { data, error } = await query
    if (error) throw error

    return data.map((l: any) => ({
      id: l.id,
      userId: l.user_id,
      projectId: l.project_id,
      entityType: l.entity_type,
      entityId: l.entity_id,
      operationType: l.operation_type,
      oldValue: l.old_value,
      newValue: l.new_value,
      reason: l.reason,
      createdAt: l.created_at,
    }))
  },

  async getDistinctOperationTypes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('operation_type')

    if (error) throw error
    const ops = Array.from(new Set(data.map((d: any) => d.operation_type)))
    return ops
  },

  async createLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: log.userId,
      project_id: log.projectId,
      entity_type: log.entityType,
      entity_id: log.entityId,
      operation_type: log.operationType,
      old_value: log.oldValue,
      new_value: log.newValue,
      reason: log.reason,
    })

    if (error) throw error
  },
}
