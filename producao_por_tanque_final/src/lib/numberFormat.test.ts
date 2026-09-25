import { describe, expect, it } from 'vitest'
import { safeToFixed } from './numberFormat'

describe('safeToFixed', () => {
  it('formats numeric values returned as strings without throwing', () => {
    expect(safeToFixed('61.62', 2)).toBe('61.62')
    expect(safeToFixed('61,62', 2)).toBe('61.62')
  })

  it('returns the fallback for invalid values', () => {
    expect(safeToFixed(undefined, 2, '—')).toBe('—')
    expect(safeToFixed('not-a-number', 2)).toBe('-')
  })
})
