import { supabase } from '@/lib/supabase/client'
import {
  CurrentSealState,
  CurrentSealStatus,
  RegisterSealEventInput,
  SealEventHistory,
  SealEventStatus,
  SealEventType,
} from '@/lib/seal-management'
import { Database } from '@/lib/supabase/types'

type CurrentSealStateRow =
  Database['public']['Views']['current_seal_state']['Row']

const requireValue = <T>(
  value: T | null,
  field: keyof CurrentSealStateRow,
): T => {
  if (value === null) {
    throw new Error(`Situação atual de lacre inválida: ${field} ausente.`)
  }

  return value
}

const mapCurrentSealState = (row: CurrentSealStateRow): CurrentSealState => ({
  id: requireValue(row.seal_point_id, 'seal_point_id'),
  tankId: requireValue(row.tank_id, 'tank_id'),
  projectId: requireValue(row.project_id, 'project_id'),
  tankTag: requireValue(row.tank_tag, 'tank_tag'),
  productionFieldId: requireValue(
    row.production_field_id,
    'production_field_id',
  ),
  componentCode: requireValue(row.component_code, 'component_code'),
  componentName: requireValue(row.component_name, 'component_name'),
  tag: row.tag,
  location: row.location,
  functionDescription: row.function_description,
  requiredPosition: requireValue(row.required_position, 'required_position'),
  isActive: requireValue(row.is_active, 'is_active'),
  currentSealNumbers: row.current_seal_numbers ?? [],
  currentStatus: requireValue(
    row.current_status,
    'current_status',
  ) as CurrentSealStatus,
  latestEventId: row.latest_event_id,
  latestEventSequence: row.latest_event_sequence,
  latestEventType: row.latest_event_type as SealEventType | null,
  latestEventEffectiveAt: row.latest_event_effective_at,
  latestEventApprovedAt: row.latest_event_approved_at,
  latestInstallationAt: row.latest_installation_at,
  latestInstalledByName: row.latest_installed_by_name,
  finalPosition: row.final_position,
  observations: row.observations,
})

export const sealManagementService = {
  async getCurrentState(projectId: string): Promise<CurrentSealState[]> {
    const { data, error } = await supabase
      .from('current_seal_state')
      .select('*')
      .eq('project_id', projectId)
      .order('tank_tag')
      .order('component_code')

    if (error) throw error

    return data.map(mapCurrentSealState)
  },

  async initializePointsFromSpreadsheet(tankId: string): Promise<number> {
    const { data, error } = await supabase.rpc(
      'initialize_seal_points_from_spreadsheet',
      { p_tank_id: tankId },
    )

    if (error) throw error
    return data
  },

  async registerEvent(
    input: RegisterSealEventInput,
  ): Promise<{ eventId: string; status: SealEventStatus }> {
    const hasRemoval = input.removedSeals.length > 0
    const hasInstallation = input.installedSeals.length > 0
    const { data, error } = await supabase.rpc('register_seal_event', {
      p_seal_point_id: input.sealPointId,
      p_event_type: input.eventType,
      p_removed_seals: input.removedSeals,
      p_installed_seals: input.installedSeals,
      p_removed_at: hasRemoval ? input.effectiveAt : null,
      p_installed_at: hasInstallation ? input.effectiveAt : null,
      p_removal_reason: input.removalReason || null,
      p_removed_by_name: hasRemoval ? input.responsibleName || null : null,
      p_installed_by_name: hasInstallation
        ? input.responsibleName || null
        : null,
      p_final_position: input.finalPosition || null,
      p_observations: input.observations || null,
    })

    if (error) throw error
    const result = data[0]
    if (!result) throw new Error('O banco não retornou o evento registrado.')

    return {
      eventId: result.event_id,
      status: result.event_status as SealEventStatus,
    }
  },

  async getPointHistory(sealPointId: string): Promise<SealEventHistory[]> {
    const { data: events, error: eventError } = await supabase
      .from('seal_events')
      .select('*')
      .eq('seal_point_id', sealPointId)
      .order('event_sequence', { ascending: false })
      .limit(50)

    if (eventError) throw eventError
    if (events.length === 0) return []

    const { data: movements, error: movementError } = await supabase
      .from('seal_event_movements')
      .select('*')
      .in(
        'event_id',
        events.map((event) => event.id),
      )
      .order('movement_order')

    if (movementError) throw movementError

    const movementsByEvent = new Map<
      string,
      { removed: string[]; installed: string[] }
    >()
    movements.forEach((movement) => {
      const group = movementsByEvent.get(movement.event_id) ?? {
        removed: [],
        installed: [],
      }
      group[
        movement.movement_type === 'removed' ? 'removed' : 'installed'
      ].push(movement.seal_number)
      movementsByEvent.set(movement.event_id, group)
    })

    return events.map((event) => {
      const movementGroup = movementsByEvent.get(event.id)
      return {
        id: event.id,
        sequence: event.event_sequence,
        eventType: event.event_type as SealEventType,
        status: event.status as SealEventStatus,
        removedAt: event.removed_at,
        installedAt: event.installed_at,
        removalReason: event.removal_reason,
        removedByName: event.removed_by_name,
        installedByName: event.installed_by_name,
        finalPosition: event.final_position,
        observations: event.observations,
        approvedAt: event.approved_at,
        createdAt: event.created_at,
        removedSeals: movementGroup?.removed ?? [],
        installedSeals: movementGroup?.installed ?? [],
      }
    })
  },
}
