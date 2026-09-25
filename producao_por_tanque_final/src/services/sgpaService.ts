import { supabase } from '@/lib/supabase/client'
import {
  SgpaCause,
  SgpaAsset,
  SgpaEvent,
  SgpaCauseCategory,
  SgpaAssetType,
  SgpaEventType,
  SgpaEventStatus,
} from '@/lib/types'
import { auditService } from './auditService'
import { differenceInMinutes, parseISO } from 'date-fns'
import {
  getAppAssetPath,
  getSgpaAttachmentExtension,
} from '@/lib/sgpaAttachments'

export const sgpaService = {
  // --- Causes ---
  async getCauses(onlyActive = true): Promise<SgpaCause[]> {
    let query = supabase.from('sgpa_causes').select('*').order('cause_name')
    if (onlyActive) {
      query = query.eq('is_active', true)
    }
    const { data, error } = await query
    if (error) throw error
    return data.map((d: any) => ({
      id: d.id,
      category: d.category as SgpaCauseCategory,
      causeName: d.cause_name,
      description: d.description,
      isActive: d.is_active,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createCause(cause: Partial<SgpaCause>, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('sgpa_causes')
      .insert({
        category: cause.category,
        cause_name: cause.causeName,
        description: cause.description,
        is_active: cause.isActive,
      })
      .select()
      .single()

    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'sgpa_cause',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de causa SGPA',
      newValue: JSON.stringify(data),
    })
  },

  async updateCause(
    id: string,
    updates: Partial<SgpaCause>,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('sgpa_causes')
      .update({
        category: updates.category,
        cause_name: updates.causeName,
        description: updates.description,
        is_active: updates.isActive,
      })
      .eq('id', id)

    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'sgpa_cause',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de causa SGPA',
      newValue: JSON.stringify(updates),
    })
  },

  async deleteCause(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('sgpa_causes').delete().eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'sgpa_cause',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de causa SGPA',
    })
  },

  // --- Assets ---
  async getAssets(
    wellId?: string,
    onlyActive = true,
    projectId?: string,
  ): Promise<SgpaAsset[]> {
    let query = supabase
      .from('sgpa_assets')
      .select(
        '*, well:wells!inner(name, production_field:production_fields!inner(project_id))',
      )
      .order('tag')

    if (wellId) {
      query = query.eq('well_id', wellId)
    }
    if (onlyActive) {
      query = query.eq('active', true)
    }
    if (projectId) {
      query = query.eq('well.production_field.project_id', projectId)
    }

    const { data, error } = await query
    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      assetType: d.asset_type as SgpaAssetType,
      tag: d.tag,
      wellId: d.well_id,
      wellName: d.well?.name,
      active: d.active,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createAsset(asset: Partial<SgpaAsset>, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('sgpa_assets')
      .insert({
        asset_type: asset.assetType,
        tag: asset.tag,
        well_id: asset.wellId,
        active: asset.active,
      })
      .select()
      .single()

    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'sgpa_asset',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Criação de ativo SGPA',
      newValue: JSON.stringify(data),
    })
  },

  async updateAsset(
    id: string,
    updates: Partial<SgpaAsset>,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('sgpa_assets')
      .update({
        asset_type: updates.assetType,
        tag: updates.tag,
        well_id: updates.wellId,
        active: updates.active,
      })
      .eq('id', id)

    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'sgpa_asset',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de ativo SGPA',
      newValue: JSON.stringify(updates),
    })
  },

  async deleteAsset(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('sgpa_assets').delete().eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'sgpa_asset',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de ativo SGPA',
    })
  },

  // --- Events ---
  async getEvents(filters: {
    wellId?: string
    startDate?: Date
    endDate?: Date
    status?: SgpaEventStatus
    projectId?: string
  }): Promise<SgpaEvent[]> {
    let query = supabase
      .from('sgpa_events')
      .select(
        '*, cause:sgpa_causes(cause_name), asset:sgpa_assets(tag), well:wells!inner(name, production_field:production_fields!inner(project_id))',
      )
      .order('start_at', { ascending: false })

    if (filters.wellId && filters.wellId !== 'all') {
      query = query.eq('well_id', filters.wellId)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.startDate) {
      query = query.gte('event_date', filters.startDate.toISOString())
    }
    if (filters.endDate) {
      query = query.lte('event_date', filters.endDate.toISOString())
    }
    if (filters.projectId) {
      query = query.eq('well.production_field.project_id', filters.projectId)
    }

    const { data, error } = await query
    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      wellId: d.well_id,
      wellName: d.well?.name,
      eventDate: d.event_date,
      eventType: d.event_type as SgpaEventType,
      status: d.status as SgpaEventStatus,
      startAt: d.start_at,
      endAt: d.end_at,
      durationMin: d.duration_min,
      category: d.category as SgpaCauseCategory,
      causeId: d.cause_id,
      causeName: d.cause?.cause_name,
      assetId: d.asset_id,
      assetTag: d.asset?.tag,
      failureFlag: d.failure_flag,
      impactFactor: d.impact_factor,
      estimatedLossM3:
        d.estimated_loss_m3 !== null ? Number(d.estimated_loss_m3) : undefined,
      responsibleUserId: d.responsible_user_id,
      workOrderRef: d.work_order_ref,
      notes: d.notes,
      attachments: d.attachments,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async getEventById(id: string): Promise<SgpaEvent | null> {
    const { data, error } = await supabase
      .from('sgpa_events')
      .select(
        '*, cause:sgpa_causes(cause_name), asset:sgpa_assets(tag), well:wells(name)',
      )
      .eq('id', id)
      .single()

    if (error) return null

    return {
      id: data.id,
      wellId: data.well_id,
      wellName: data.well?.name,
      eventDate: data.event_date,
      eventType: data.event_type as SgpaEventType,
      status: data.status as SgpaEventStatus,
      startAt: data.start_at,
      endAt: data.end_at,
      durationMin: data.duration_min,
      category: data.category as SgpaCauseCategory,
      causeId: data.cause_id,
      causeName: data.cause?.cause_name,
      assetId: data.asset_id,
      assetTag: data.asset?.tag,
      failureFlag: data.failure_flag,
      impactFactor: data.impact_factor,
      estimatedLossM3:
        data.estimated_loss_m3 !== null
          ? Number(data.estimated_loss_m3)
          : undefined,
      responsibleUserId: data.responsible_user_id,
      workOrderRef: data.work_order_ref,
      notes: data.notes,
      attachments: data.attachments,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async checkOverlap(
    wellId: string,
    startAt: string,
    endAt: string | null,
    excludeEventId?: string,
  ): Promise<boolean> {
    let query = supabase
      .from('sgpa_events')
      .select('id, start_at, end_at, status')
      .eq('well_id', wellId)
      .neq('status', 'CANCELLED')

    if (excludeEventId) {
      query = query.neq('id', excludeEventId)
    }

    const { data: events, error } = await query
    if (error) throw error

    const newStart = new Date(startAt).getTime()
    const newEnd = endAt ? new Date(endAt).getTime() : Infinity

    return events.some((ev: any) => {
      const existingStart = new Date(ev.start_at).getTime()
      const existingEnd = ev.end_at ? new Date(ev.end_at).getTime() : Infinity

      return existingStart < newEnd && existingEnd > newStart
    })
  },

  async createEvent(
    event: Partial<SgpaEvent>,
    userId: string,
  ): Promise<SgpaEvent> {
    if (!event.wellId || !event.startAt || !event.eventType) {
      throw new Error('Campos obrigatórios faltando.')
    }

    // Overlap Check
    const hasOverlap = await this.checkOverlap(
      event.wellId,
      event.startAt,
      event.endAt || null,
    )
    if (hasOverlap) {
      throw new Error(
        'Conflito de horário: Já existe um evento registrado neste período para este poço.',
      )
    }

    // Auto-calculate Duration
    let durationMin = 0
    if (event.startAt && event.endAt) {
      durationMin = differenceInMinutes(
        parseISO(event.endAt),
        parseISO(event.startAt),
      )
    }

    const dbData = {
      well_id: event.wellId,
      event_date: event.eventDate || event.startAt.split('T')[0],
      event_type: event.eventType,
      status: event.status || 'OPEN',
      start_at: event.startAt,
      end_at: event.endAt,
      duration_min: durationMin > 0 ? durationMin : null,
      category: event.category,
      cause_id: event.causeId,
      asset_id: event.assetId,
      failure_flag: event.failureFlag || false,
      impact_factor: event.impactFactor,
      estimated_loss_m3: event.estimatedLossM3 ?? null,
      responsible_user_id: userId,
      work_order_ref: event.workOrderRef,
      notes: event.notes,
      attachments: event.attachments,
    }

    const { data, error } = await supabase
      .from('sgpa_events')
      .insert(dbData)
      .select()
      .single()

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'sgpa_event',
      entityId: data.id,
      operationType: 'insert',
      reason: 'Registro de evento SGPA',
      newValue: JSON.stringify(dbData),
    })

    return this.getEventById(data.id) as Promise<SgpaEvent>
  },

  async updateEvent(
    id: string,
    updates: Partial<SgpaEvent> & { estimatedLossM3?: number | null },
    userId: string,
  ): Promise<void> {
    const current = await this.getEventById(id)
    if (!current) throw new Error('Evento não encontrado')

    const wellId = updates.wellId || current.wellId
    const startAt = updates.startAt || current.startAt
    const endAt =
      updates.endAt !== undefined ? updates.endAt : current.endAt || null

    if (updates.startAt || updates.endAt || updates.wellId) {
      const hasOverlap = await this.checkOverlap(wellId, startAt, endAt, id)
      if (hasOverlap) {
        throw new Error(
          'Conflito de horário: Já existe um evento registrado neste período para este poço.',
        )
      }
    }

    let durationMin = current.durationMin
    if (startAt && endAt) {
      durationMin = differenceInMinutes(parseISO(endAt), parseISO(startAt))
    } else if (!endAt) {
      durationMin = null // Reset duration if reopened
    }

    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.wellId) dbUpdates.well_id = updates.wellId
    if (updates.eventDate) dbUpdates.event_date = updates.eventDate
    if (updates.eventType) dbUpdates.event_type = updates.eventType
    if (updates.status) dbUpdates.status = updates.status
    if (updates.startAt) dbUpdates.start_at = updates.startAt
    if (updates.endAt !== undefined) dbUpdates.end_at = updates.endAt
    if (durationMin !== undefined) dbUpdates.duration_min = durationMin
    if (updates.category) dbUpdates.category = updates.category
    if (updates.causeId !== undefined) dbUpdates.cause_id = updates.causeId
    if (updates.assetId !== undefined) dbUpdates.asset_id = updates.assetId
    if (updates.failureFlag !== undefined)
      dbUpdates.failure_flag = updates.failureFlag
    if (updates.impactFactor !== undefined)
      dbUpdates.impact_factor = updates.impactFactor
    // Explicitly handle estimated loss, allowing reset to null
    if ('estimatedLossM3' in updates) {
      dbUpdates.estimated_loss_m3 = updates.estimatedLossM3
    }
    if (updates.workOrderRef !== undefined)
      dbUpdates.work_order_ref = updates.workOrderRef
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.attachments) dbUpdates.attachments = updates.attachments

    const { error } = await supabase
      .from('sgpa_events')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'sgpa_event',
      entityId: id,
      operationType: 'update',
      reason: 'Atualização de evento SGPA',
      newValue: JSON.stringify(dbUpdates),
    })
  },

  async deleteEvent(
    id: string,
    userId: string,
  ): Promise<{ attachmentCleanupFailed: boolean }> {
    const current = await this.getEventById(id)
    if (!current) throw new Error('Evento não encontrado')

    const { error } = await supabase.from('sgpa_events').delete().eq('id', id)
    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'sgpa_event',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de evento SGPA',
    })

    try {
      await this.removeAttachments(current.attachments || [])
      return { attachmentCleanupFailed: false }
    } catch (cleanupError) {
      console.error('Error removing SGPA event attachments:', cleanupError)
      return { attachmentCleanupFailed: true }
    }
  },

  async uploadAttachment(file: File): Promise<string> {
    const fileExt = getSgpaAttachmentExtension(file)
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
    const filePath = `sgpa/${fileName}`

    const { error } = await supabase.storage
      .from('app-assets')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath)
    return data.publicUrl
  },

  async removeAttachments(publicUrls: string[]): Promise<void> {
    const paths = publicUrls
      .map(getAppAssetPath)
      .filter((path): path is string => path !== null)

    if (paths.length === 0) return

    const { error } = await supabase.storage.from('app-assets').remove(paths)
    if (error) throw error
  },
}
