import { describe, expect, it } from 'vitest'
import { nextIsolatedChartSeries } from './use-isolated-chart-series'

describe('interactive chart series isolation', () => {
  it('isolates the clicked series and restores all on a second click', () => {
    expect(nextIsolatedChartSeries(null, 'oil')).toBe('oil')
    expect(nextIsolatedChartSeries('oil', 'oil')).toBeNull()
  })

  it('switches directly from one isolated series to another', () => {
    expect(nextIsolatedChartSeries('oil', 'water')).toBe('water')
  })
})
