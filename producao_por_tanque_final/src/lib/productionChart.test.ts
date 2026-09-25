import { describe, expect, it } from 'vitest'
import {
  addNullableVolume,
  calculateTransferChartBreakdowns,
  calculateVolumeWeightedBsw,
} from './productionChart'

describe('calculateVolumeWeightedBsw', () => {
  it('weights BSW changes in the same period by gross volume', () => {
    expect(
      calculateVolumeWeightedBsw([
        { well_production: 100, total_bsw_percent: 10 },
        { well_production: 50, total_bsw_percent: 20 },
      ]),
    ).toBeCloseTo(13.333333, 6)
  })

  it('consolidates records from multiple selected tanks', () => {
    expect(
      calculateVolumeWeightedBsw([
        { well_production: 100, total_bsw_percent: 10 },
        { well_production: 50, total_bsw_percent: 20 },
        { well_production: 200, total_bsw_percent: 5 },
      ]),
    ).toBeCloseTo(8.571429, 6)
  })

  it('weights each tank, well and date record independently', () => {
    expect(
      calculateVolumeWeightedBsw([
        {
          tank_id: 'tank-a',
          well_id: 'well-a',
          date: '2026-09-01',
          well_production: 40,
          total_bsw_percent: 10,
        },
        {
          tank_id: 'tank-a',
          well_id: 'well-b',
          date: '2026-09-01',
          well_production: 20,
          total_bsw_percent: 40,
        },
        {
          tank_id: 'tank-b',
          well_id: 'well-a',
          date: '2026-09-02',
          well_production: 40,
          total_bsw_percent: 20,
        },
      ]),
    ).toBe(20)
  })

  it('keeps a valid zero BSW in the weighted calculation', () => {
    expect(
      calculateVolumeWeightedBsw([
        { well_production: 100, total_bsw_percent: 0 },
        { well_production: 100, total_bsw_percent: 20 },
      ]),
    ).toBe(10)
  })

  it('ignores records without positive gross volume', () => {
    expect(
      calculateVolumeWeightedBsw([
        { well_production: 0, total_bsw_percent: 90 },
        { well_production: -10, total_bsw_percent: 50 },
        { well_production: 100, total_bsw_percent: 12 },
      ]),
    ).toBe(12)
  })

  it('returns no result when there is no volume or BSW is invalid', () => {
    expect(calculateVolumeWeightedBsw([])).toBeNull()
    expect(
      calculateVolumeWeightedBsw([
        { well_production: 100, total_bsw_percent: 101 },
      ]),
    ).toBeNull()
  })
})

describe('calculateTransferChartBreakdowns', () => {
  it('keeps gross volume equal to water plus uncorrected oil', () => {
    const result = calculateTransferChartBreakdowns([
      {
        dailyReportId: 'report-1',
        type: 'transfer',
        volumeM3: 100,
        waterVolumeM3: 12,
        volumeCorrectedM3: 86.5,
      },
      {
        dailyReportId: 'report-1',
        type: 'transfer',
        volumeM3: 50,
        waterVolumeM3: 8,
        volumeCorrectedM3: 41.25,
      },
    ]).get('report-1')

    expect(result).toEqual({
      grossVolume: 150,
      waterVolume: 20,
      uncorrectedOilVolume: 130,
      correctedOilVolume: 127.75,
    })
    expect(result!.grossVolume).toBe(
      result!.waterVolume + result!.uncorrectedOilVolume,
    )
  })

  it('ignores non-transfer operations and operations without a report', () => {
    const result = calculateTransferChartBreakdowns([
      {
        dailyReportId: 'report-1',
        type: 'drainage',
        volumeM3: 10,
      },
      {
        type: 'transfer',
        volumeM3: 10,
      },
    ])

    expect(result.size).toBe(0)
  })
})

describe('addNullableVolume', () => {
  it('sums available values', () => {
    expect(addNullableVolume(12, 8)).toBe(20)
  })

  it('preserves unavailable historical breakdowns during aggregation', () => {
    expect(addNullableVolume(12, null)).toBeNull()
    expect(addNullableVolume(null, 8)).toBeNull()
  })
})
