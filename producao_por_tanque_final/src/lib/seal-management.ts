export const SEAL_EVENT_TYPES = [
  'initial_installation',
  'authorized_break',
  'removal',
  'replacement',
  'reinstallation',
  'damaged',
  'lost',
  'inspection',
  'cancellation',
  'other',
] as const

export type SealEventType = (typeof SEAL_EVENT_TYPES)[number]

export const SEAL_EVENT_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled',
] as const

export type SealEventStatus = (typeof SEAL_EVENT_STATUSES)[number]

export type SealMovementType = 'removed' | 'installed'

export type CurrentSealStatus =
  | 'no_record'
  | 'awaiting_seal'
  | 'position_mismatch'
  | 'installed'

export interface SealPoint {
  id: string
  tankId: string
  componentCode: string
  componentName: string
  tag: string | null
  location: string | null
  functionDescription: string | null
  requiredPosition: string
  isActive: boolean
}

export interface CurrentSealState extends SealPoint {
  projectId: string
  tankTag: string
  productionFieldId: string
  currentSealNumbers: string[]
  currentStatus: CurrentSealStatus
  latestEventId: string | null
  latestEventSequence: number | null
  latestEventType: SealEventType | null
  latestEventEffectiveAt: string | null
  latestEventApprovedAt: string | null
  latestInstallationAt: string | null
  latestInstalledByName: string | null
  finalPosition: string | null
  observations: string | null
}

export interface RegisterSealEventInput {
  sealPointId: string
  eventType: SealEventType
  removedSeals: string[]
  installedSeals: string[]
  effectiveAt: string
  removalReason?: string
  responsibleName?: string
  finalPosition?: string
  observations?: string
}

export interface SealEventHistory {
  id: string
  sequence: number
  eventType: SealEventType
  status: SealEventStatus
  removedAt: string | null
  installedAt: string | null
  removalReason: string | null
  removedByName: string | null
  installedByName: string | null
  finalPosition: string | null
  observations: string | null
  approvedAt: string | null
  createdAt: string
  removedSeals: string[]
  installedSeals: string[]
}
