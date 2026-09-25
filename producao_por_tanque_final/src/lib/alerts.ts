import { DailyProductionReport } from './types'

export interface AlertThresholds {
  fcv: { min: number; max: number }
  fe: { min: number; max: number }
  emulsionBswPercent: { min: number; max: number }
  totalBswPercent: { min: number; max: number }
  densityAt20cGcm3: { min: number; max: number }
  tempCorrectionFactorY: { min: number; max: number }
}

// Default thresholds - these would ideally be configurable per project/tank
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  fcv: { min: 0.9, max: 1.1 },
  fe: { min: 0.9, max: 1.1 },
  emulsionBswPercent: { min: 0, max: 80 }, // Warning if very high emulsion
  totalBswPercent: { min: 0, max: 98 }, // Warning if almost pure water
  densityAt20cGcm3: { min: 0.7, max: 1.1 },
  tempCorrectionFactorY: { min: 0.9, max: 1.1 },
}

export interface Alert {
  field: keyof AlertThresholds
  label: string
  value: number
  message: string
  severity: 'warning' | 'critical'
}

export function checkAlerts(
  report: DailyProductionReport,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
): Alert[] {
  const alerts: Alert[] = []

  const check = (
    field: keyof AlertThresholds,
    label: string,
    value: number | undefined,
  ) => {
    if (value === undefined || value === null) return
    const { min, max } = thresholds[field]
    if (value < min || value > max) {
      alerts.push({
        field,
        label,
        value,
        message: `${label} fora da faixa (${min} - ${max}): ${value.toFixed(4)}`,
        severity: 'warning', // Could differentiate based on deviation size
      })
    }
  }

  check('fcv', 'FCV', report.fcv)
  check('fe', 'FE', report.fe)
  check('emulsionBswPercent', 'BSW Emulsão', report.emulsionBswPercent)
  check('totalBswPercent', 'BSW Total', report.totalBswPercent)
  check('densityAt20cGcm3', 'Densidade @ 20°C', report.densityAt20cGcm3)
  check('tempCorrectionFactorY', 'Fator Y', report.tempCorrectionFactorY)

  return alerts
}
