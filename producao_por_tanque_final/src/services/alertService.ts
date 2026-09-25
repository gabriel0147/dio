import { supabase } from '@/lib/supabase/client'
import { AlertRule, AlertNotification } from '@/lib/types'
import { auditService } from './auditService'

export const alertService = {
  // Rules
  async getRules(projectId: string): Promise<AlertRule[]> {
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('project_id', projectId)
      .order('name')

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      userId: d.user_id,
      name: d.name,
      metricField: d.metric_field,
      condition: d.condition,
      thresholdValue: Number(d.threshold_value),
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createRule(
    rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    userId: string,
  ): Promise<AlertRule> {
    const { data, error } = await supabase
      .from('alert_rules')
      .insert({
        project_id: rule.projectId,
        user_id: userId,
        name: rule.name,
        metric_field: rule.metricField,
        condition: rule.condition,
        threshold_value: rule.thresholdValue,
      })
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'alert_rule',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de regra de alerta',
      newValue: JSON.stringify(data),
    })

    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      name: data.name,
      metricField: data.metric_field,
      condition: data.condition as any,
      thresholdValue: Number(data.threshold_value),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateRule(
    id: string,
    updates: Partial<Omit<AlertRule, 'id' | 'createdAt' | 'userId'>>,
    userId: string,
  ): Promise<void> {
    const dbUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.name) dbUpdates.name = updates.name
    if (updates.metricField) dbUpdates.metric_field = updates.metricField
    if (updates.condition) dbUpdates.condition = updates.condition
    if (updates.thresholdValue !== undefined)
      dbUpdates.threshold_value = updates.thresholdValue

    const { data, error } = await supabase
      .from('alert_rules')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'alert_rule',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de regra de alerta',
      newValue: JSON.stringify(data),
    })
  },

  async deleteRule(id: string, userId: string): Promise<void> {
    const { data: current } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('alert_rules').delete().eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'alert_rule',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de regra de alerta',
      oldValue: current ? JSON.stringify(current) : undefined,
    })
  },

  // Notifications
  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('alert_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  },

  async getNotifications(
    limit = 50,
  ): Promise<(AlertNotification & { ruleName: string })[]> {
    const { data, error } = await supabase
      .from('alert_notifications')
      .select(`*, alert_rules(name)`)
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      alertRuleId: d.alert_rule_id,
      dailyReportId: d.daily_report_id,
      triggeredAt: d.triggered_at,
      message: d.message,
      isRead: d.is_read,
      ruleName: d.alert_rules?.name || 'Regra Excluída',
    }))
  },

  async markAsRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const { error } = await supabase
      .from('alert_notifications')
      .update({ is_read: true })
      .in('id', ids)

    if (error) throw error
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('alert_notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) throw error
  },
}
