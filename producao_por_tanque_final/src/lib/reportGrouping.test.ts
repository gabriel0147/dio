import { describe, expect, it } from 'vitest'
import type { TankOperation } from './types'
import { groupOperationsByWell } from './reportGrouping'

const operation = (id: string, wellId?: string): TankOperation => ({
  id,
  tankId: 'tank-a',
  wellId,
  type: 'production',
  startTime: '2026-09-03T10:00:00.000Z',
  endTime: '2026-09-03T11:00:00.000Z',
  initialLevelMm: 10,
  finalLevelMm: 20,
  userId: 'user-a',
})

describe('groupOperationsByWell', () => {
  it('keeps two wells in the same tank and date as independent groups', () => {
    const groups = groupOperationsByWell([
      operation('operation-a', 'well-a'),
      operation('operation-b', 'well-b'),
    ])

    expect([...groups.keys()]).toEqual(['well-a', 'well-b'])
    expect(groups.get('well-a')?.map((item) => item.id)).toEqual([
      'operation-a',
    ])
    expect(groups.get('well-b')?.map((item) => item.id)).toEqual([
      'operation-b',
    ])
  })

  it('does not invent a well for legacy unidentified operations', () => {
    expect(groupOperationsByWell([operation('legacy')]).size).toBe(0)
  })
})
