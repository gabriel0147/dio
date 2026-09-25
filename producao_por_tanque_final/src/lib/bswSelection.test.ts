import { describe, expect, it } from 'vitest'
import { selectApplicableLabBsw, type LabBswCandidate } from './bswSelection'

const candidate = (
  overrides: Partial<LabBswCandidate> = {},
): LabBswCandidate => ({
  testId: 'test-valid',
  tankId: 'tank-a',
  wellId: 'well-a',
  testEndAt: '2026-09-03T12:00:00.000Z',
  bswEmulsionPct: 25,
  status: 'valido',
  ...overrides,
})

describe('selectApplicableLabBsw', () => {
  it('selects the latest applicable valid or current laboratory result', () => {
    const selected = selectApplicableLabBsw(
      [
        candidate({ testId: 'older', testEndAt: '2026-09-01T12:00:00.000Z' }),
        candidate({ testId: 'latest', status: 'vigente' }),
      ],
      'tank-a',
      'well-a',
      '2026-09-03T13:00:00.000Z',
    )

    expect(selected?.testId).toBe('latest')
  })

  it('never uses future, invalid, other-tank or other-well results', () => {
    const selected = selectApplicableLabBsw(
      [
        candidate({ testId: 'future', testEndAt: '2026-09-04T12:00:00.000Z' }),
        candidate({ testId: 'invalid', status: 'invalido' }),
        candidate({ testId: 'other-tank', tankId: 'tank-b' }),
        candidate({ testId: 'other-well', wellId: 'well-b' }),
      ],
      'tank-a',
      'well-a',
      '2026-09-03T13:00:00.000Z',
    )

    expect(selected).toBeNull()
  })
})
