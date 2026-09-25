export interface TransferChartOperation {
  dailyReportId?: string | null
  type: string
  volumeM3?: number | null
  waterVolumeM3?: number | null
  volumeCorrectedM3?: number | null
  oilVolumeM3?: number | null
}

export interface TransferChartBreakdown {
  grossVolume: number
  waterVolume: number
  uncorrectedOilVolume: number
  correctedOilVolume: number
}

export interface VolumeWeightedBswItem {
  tank_id?: string
  well_id?: string
  date?: string
  well_production: number
  total_bsw_percent: number
}

export function calculateVolumeWeightedBsw(
  items: VolumeWeightedBswItem[],
): number | null {
  let weightedBswSum = 0
  let grossVolumeSum = 0

  for (const item of items) {
    const grossVolume = Number(item.well_production)
    const bswPercent = Number(item.total_bsw_percent)

    if (!Number.isFinite(grossVolume) || grossVolume <= 0) continue
    if (!Number.isFinite(bswPercent) || bswPercent < 0 || bswPercent > 100) {
      return null
    }

    weightedBswSum += grossVolume * bswPercent
    grossVolumeSum += grossVolume
  }

  if (grossVolumeSum === 0) return null
  return weightedBswSum / grossVolumeSum
}

export function calculateTransferChartBreakdowns(
  operations: TransferChartOperation[],
): Map<string, TransferChartBreakdown> {
  const breakdowns = new Map<string, TransferChartBreakdown>()

  for (const operation of operations) {
    if (operation.type !== 'transfer' || !operation.dailyReportId) continue

    const current = breakdowns.get(operation.dailyReportId) || {
      grossVolume: 0,
      waterVolume: 0,
      uncorrectedOilVolume: 0,
      correctedOilVolume: 0,
    }
    const grossVolume = Number(operation.volumeM3 || 0)
    const waterVolume = Number(operation.waterVolumeM3 || 0)
    const correctedOilVolume = Number(
      operation.volumeCorrectedM3 ?? operation.oilVolumeM3 ?? 0,
    )

    current.grossVolume += grossVolume
    current.waterVolume += waterVolume
    current.uncorrectedOilVolume += grossVolume - waterVolume
    current.correctedOilVolume += correctedOilVolume
    breakdowns.set(operation.dailyReportId, current)
  }

  for (const breakdown of breakdowns.values()) {
    breakdown.grossVolume = Number(breakdown.grossVolume.toFixed(4))
    breakdown.waterVolume = Number(breakdown.waterVolume.toFixed(4))
    breakdown.uncorrectedOilVolume = Number(
      breakdown.uncorrectedOilVolume.toFixed(4),
    )
    breakdown.correctedOilVolume = Number(
      breakdown.correctedOilVolume.toFixed(4),
    )
  }

  return breakdowns
}

export function addNullableVolume(
  accumulated: number | null,
  value: number | null,
): number | null {
  if (accumulated === null || value === null) return null
  return accumulated + value
}
