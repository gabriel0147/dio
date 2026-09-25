import { CalibrationRow, ProductionRow, TankOperation } from './types'
import { format, parseISO } from 'date-fns'
import { calculateCrudeApi11To20 } from './api11_1_crude'
import { INITIAL_PRODUCTION_ROW } from './initialData'

// Helper to get number from string/number, handling commas
export const val = (v: number | string | undefined): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    // Replace comma with dot for JS parsing
    const parsed = parseFloat(v.replace(',', '.'))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export const hasVal = (v: number | string | undefined): boolean => {
  if (typeof v === 'number') return true
  if (typeof v === 'string' && v.trim() !== '') return true
  return false
}

export const getProductionDayWindow = (date: Date) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export const getReportDateFromTimestamp = (timestamp: Date | string): Date => {
  if (typeof timestamp !== 'string') return timestamp

  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0)
  }

  return parseISO(timestamp)
}

export interface DailyMetrics {
  stockVariation: number
  drained: number
  transferred: number
  wellProduction: number
  fluidTempC: number
  totalBswPercent: number
  emulsionBswPercent: number
  densityAt20cGcm3: number
  transferObservedDensityGcm3: number | null
  fcv: number
  fe: number
  tempCorrectionFactorY: number
  correctedOilVolume: number
  emulsionWaterVolume: number
  uncorrectedOilVolume: number
  transferWaterVolume: number
  transferOilUncorrectedVolume: number
  transferOilCorrectedVolume: number
  transferFluidTemp: number | null
  transferFcv: number
  transferFe: number
  transferFdt: number
  transferBswPercent: number
  transferDestinations: string[]
}

export const calculateDailyMetrics = (
  operations: TankOperation[],
): DailyMetrics => {
  const sortedByEnd = [...operations].sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
  )
  const sortedChronological = [...operations].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )

  let drained = 0
  let transferred = 0
  let productionSum = 0
  let transferWaterSum = 0
  let transferCorrectedOilSum = 0
  const destinations = new Set<string>()

  sortedChronological.forEach((op) => {
    const volM3 = op.volumeM3 || 0
    if (op.type === 'drainage') {
      drained += volM3
    } else if (op.type === 'transfer') {
      transferred += volM3
      transferWaterSum += op.waterVolumeM3 || 0
      transferCorrectedOilSum += op.volumeCorrectedM3 || 0
      if (op.transferDestination) {
        destinations.add(op.transferDestination)
      }
    } else if (op.type === 'production' || op.type === 'stock_variation') {
      productionSum += volM3
    }
  })

  drained = Number(drained.toFixed(4))
  transferred = Number(transferred.toFixed(4))
  productionSum = Number(productionSum.toFixed(4))
  transferWaterSum = Number(transferWaterSum.toFixed(4))
  transferCorrectedOilSum = Number(transferCorrectedOilSum.toFixed(4))
  const transferOilUncorrectedVolume = Number(
    (transferred - transferWaterSum).toFixed(4),
  )

  const stockVariation = Number(productionSum.toFixed(4))
  const wellProduction = Number(
    (stockVariation + drained + transferred).toFixed(4),
  )

  const lastProductionOp = sortedByEnd.find(
    (op) => op.type === 'production' || op.type === 'stock_variation',
  )
  const lastTransferOp = sortedByEnd.find((op) => op.type === 'transfer')

  const transferOps = operations.filter((op) => op.type === 'transfer')
  let transferDensitySum = 0
  let transferDensityCount = 0

  transferOps.forEach((op) => {
    if (
      op.densityObservedGcm3 !== undefined &&
      op.densityObservedGcm3 !== null &&
      op.densityObservedGcm3 > 0
    ) {
      transferDensitySum += op.densityObservedGcm3
      transferDensityCount++
    }
  })

  const transferObservedDensityGcm3 =
    transferDensityCount > 0
      ? Number((transferDensitySum / transferDensityCount).toFixed(4))
      : null

  const totalBswPercent = lastProductionOp?.bswPercent ?? 0
  const emulsionBswPercent = lastTransferOp?.bswPercent ?? 0
  const densityAt20cGcm3 = lastProductionOp?.densityObservedGcm3 ?? 0
  const fcv = lastTransferOp?.fcv ?? 1.0
  const fe = lastTransferOp?.fe ?? 1.0
  const transferTempForCalc = lastTransferOp?.tempFluidC ?? 20
  const tempCorrectionFactorY = Number(
    (1 + (transferTempForCalc - 20) * 0.000012).toFixed(6),
  )
  const fluidTempC = lastProductionOp?.tempFluidC ?? 0

  const bswDecimal = totalBswPercent / 100
  const uncorrectedOilVolume = wellProduction * (1 - bswDecimal)
  const emulsionWaterVolume = wellProduction * bswDecimal
  const correctedOilVolume =
    uncorrectedOilVolume * tempCorrectionFactorY * fcv * fe

  return {
    stockVariation,
    drained,
    transferred,
    wellProduction,
    fluidTempC: Number(fluidTempC.toFixed(2)),
    totalBswPercent: Number(totalBswPercent.toFixed(4)),
    emulsionBswPercent: Number(emulsionBswPercent.toFixed(4)),
    densityAt20cGcm3: Number(densityAt20cGcm3.toFixed(4)),
    transferObservedDensityGcm3,
    fcv: Number(fcv.toFixed(6)),
    fe: Number(fe.toFixed(6)),
    tempCorrectionFactorY,
    correctedOilVolume: Number(correctedOilVolume.toFixed(4)),
    emulsionWaterVolume: Number(emulsionWaterVolume.toFixed(4)),
    uncorrectedOilVolume: Number(uncorrectedOilVolume.toFixed(4)),
    transferWaterVolume: transferWaterSum,
    transferOilUncorrectedVolume: transferOilUncorrectedVolume,
    transferOilCorrectedVolume: transferCorrectedOilSum,
    transferFluidTemp:
      lastTransferOp?.tempFluidC !== undefined &&
      lastTransferOp?.tempFluidC !== null
        ? Number(lastTransferOp.tempFluidC.toFixed(2))
        : null,
    transferFcv: Number(fcv.toFixed(6)),
    transferFe: Number(fe.toFixed(6)),
    transferFdt: tempCorrectionFactorY,
    transferBswPercent: Number(emulsionBswPercent.toFixed(4)),
    transferDestinations: Array.from(destinations),
  }
}

export const calculateProductionRow = (
  row: ProductionRow,
  prevRow: ProductionRow | undefined,
  calibrationData: CalibrationRow[],
): ProductionRow => {
  const newRow = { ...row }

  if (prevRow && !newRow.A_Data) {
    newRow.A_Data = prevRow.D_Data_fim_periodo
  }

  if (hasVal(newRow.B_Altura_Liq_Inicial_mm)) {
    const height = val(newRow.B_Altura_Liq_Inicial_mm)
    newRow.C_Volume_Inicial_m3 = lookupCalibrationValue(
      height,
      calibrationData,
      'volume_m3',
    )
  } else {
    newRow.C_Volume_Inicial_m3 = ''
  }

  if (hasVal(newRow.E_Altura_Liq_Final_mm)) {
    const height = val(newRow.E_Altura_Liq_Final_mm)
    newRow.F_Volume_Final_m3 = lookupCalibrationValue(
      height,
      calibrationData,
      'volume_m3',
    )
  } else {
    newRow.F_Volume_Final_m3 = ''
  }

  if (hasVal(newRow.F_Volume_Final_m3) && hasVal(newRow.C_Volume_Inicial_m3)) {
    const diff = val(newRow.F_Volume_Final_m3) - val(newRow.C_Volume_Inicial_m3)
    newRow.G_Diferenca_volumes = Number(diff.toFixed(4))
  } else {
    newRow.G_Diferenca_volumes = ''
  }

  const J = val(newRow.J_Volume_Drenado_Agua_m3)
  const K = val(newRow.K_Transferencia_Emulsao)
  const G = val(newRow.G_Diferenca_volumes)
  const grossProduction = G + J + K

  if (
    hasVal(newRow.G_Diferenca_volumes) &&
    newRow.D_Data_fim_periodo &&
    newRow.A_Data
  ) {
    try {
      const endDate = parseISO(newRow.D_Data_fim_periodo)
      const startDate = parseISO(newRow.A_Data)
      const diffTime = endDate.getTime() - startDate.getTime()
      const hours = diffTime / (1000 * 60 * 60)

      if (hours > 0) {
        const corrected = (grossProduction / hours) * 24
        newRow.H_Volume_Corrigido_24h = Number(corrected.toFixed(4))
      } else {
        newRow.H_Volume_Corrigido_24h = ''
      }
    } catch {
      newRow.H_Volume_Corrigido_24h = ''
    }
  } else {
    newRow.H_Volume_Corrigido_24h = hasVal(newRow.G_Diferenca_volumes)
      ? Number(grossProduction.toFixed(4))
      : ''
  }

  const I_prev = prevRow ? val(prevRow.I_Estoque_QT_m3) : 0
  if (hasVal(newRow.G_Diferenca_volumes)) {
    newRow.I_Estoque_QT_m3 = Number((G + I_prev).toFixed(4))
  } else {
    newRow.I_Estoque_QT_m3 = ''
  }

  newRow.L_Prod_Total_QT_m3_d = newRow.H_Volume_Corrigido_24h

  const L = val(newRow.L_Prod_Total_QT_m3_d)
  const U = hasVal(newRow.U_BSW_Total_Perc)
    ? val(newRow.U_BSW_Total_Perc) / 100
    : 0

  if (hasVal(newRow.L_Prod_Total_QT_m3_d) && hasVal(newRow.U_BSW_Total_Perc)) {
    newRow.M_Prod_Agua_Livre_QWF_m3_d = Number((L * U).toFixed(4))
  } else {
    newRow.M_Prod_Agua_Livre_QWF_m3_d = ''
  }

  const M = val(newRow.M_Prod_Agua_Livre_QWF_m3_d)
  const N_prev = prevRow ? val(prevRow.N_Estoque_Agua_Livre_QWF_m3) : 0
  if (hasVal(newRow.M_Prod_Agua_Livre_QWF_m3_d)) {
    newRow.N_Estoque_Agua_Livre_QWF_m3 = Number((M + N_prev - K).toFixed(4))
  } else {
    newRow.N_Estoque_Agua_Livre_QWF_m3 = ''
  }

  if (
    hasVal(newRow.L_Prod_Total_QT_m3_d) &&
    hasVal(newRow.M_Prod_Agua_Livre_QWF_m3_d)
  ) {
    newRow.O_Prod_Emulsao_QEM_m3_d = Number((L - M).toFixed(4))
  } else {
    newRow.O_Prod_Emulsao_QEM_m3_d = ''
  }

  const O = val(newRow.O_Prod_Emulsao_QEM_m3_d)
  const V = hasVal(newRow.V_BSW_Emulsao_Perc)
    ? val(newRow.V_BSW_Emulsao_Perc) / 100
    : 0

  if (
    hasVal(newRow.O_Prod_Emulsao_QEM_m3_d) &&
    hasVal(newRow.V_BSW_Emulsao_Perc)
  ) {
    newRow.P_Prod_Oleo_Sem_Correcao_m3_d = Number((O * (1 - V)).toFixed(4))
  } else {
    newRow.P_Prod_Oleo_Sem_Correcao_m3_d = ''
  }

  if (hasVal(newRow.W_Temp_Ambiente) && hasVal(newRow.X_Temp_Fluido)) {
    const X = val(newRow.X_Temp_Fluido)
    newRow.Y_Dilatacao_Termica = Number((1 + (X - 20) * 0.000012).toFixed(6))
  } else {
    newRow.Y_Dilatacao_Termica = ''
  }

  if (prevRow && !hasVal(newRow.Z_Densidade_Lab_20C)) {
    newRow.Z_Densidade_Lab_20C = prevRow.Z_Densidade_Lab_20C
  }

  newRow.AA_T_Observada_C = newRow.X_Temp_Fluido
  let effectiveFCV = 1.0

  if (hasVal(newRow.AB_FCV_Manual)) {
    effectiveFCV = val(newRow.AB_FCV_Manual)
    newRow.AB_FCV = effectiveFCV
  } else if (
    hasVal(newRow.Z_Densidade_Lab_20C) &&
    hasVal(newRow.AA_T_Observada_C)
  ) {
    const densityObs = val(newRow.Z_Densidade_Lab_20C)
    const tempObs = val(newRow.AA_T_Observada_C)
    if (densityObs > 0) {
      try {
        const api11Result = calculateCrudeApi11To20({
          massaEspObs_gcc: densityObs,
          tempFluidoC: tempObs,
        })
        effectiveFCV = api11Result.fcv20
        newRow.AB_FCV = effectiveFCV
      } catch (error) {
        console.error('Error calculating FCV:', error)
        newRow.AB_FCV = 1.0
      }
    } else {
      newRow.AB_FCV = 1.0
    }
  } else {
    newRow.AB_FCV = 1.0
  }

  if (hasVal(newRow.Z_Densidade_Lab_20C) && effectiveFCV > 0) {
    const z = val(newRow.Z_Densidade_Lab_20C)
    const correctedDensity = z / effectiveFCV
    newRow.AH_Referencia = Number(correctedDensity.toFixed(6))
  } else {
    newRow.AH_Referencia = ''
  }

  if (hasVal(newRow.P_Prod_Oleo_Sem_Correcao_m3_d)) {
    const P_val = val(newRow.P_Prod_Oleo_Sem_Correcao_m3_d)
    const Y_val = hasVal(newRow.Y_Dilatacao_Termica)
      ? val(newRow.Y_Dilatacao_Termica)
      : 1
    const AB_val = effectiveFCV
    const AC_val = hasVal(newRow.AC_Fator_Encolhimento_FE)
      ? val(newRow.AC_Fator_Encolhimento_FE)
      : 1

    newRow.Q_Prod_Oleo_Corrigido_m3_d = Number(
      (P_val * Y_val * AB_val * AC_val).toFixed(4),
    )
  } else {
    newRow.Q_Prod_Oleo_Corrigido_m3_d = ''
  }

  if (
    hasVal(newRow.O_Prod_Emulsao_QEM_m3_d) &&
    hasVal(newRow.P_Prod_Oleo_Sem_Correcao_m3_d)
  ) {
    newRow.R_Agua_Emulsao_m3_d = Number(
      (O - val(newRow.P_Prod_Oleo_Sem_Correcao_m3_d)).toFixed(4),
    )
  } else {
    newRow.R_Agua_Emulsao_m3_d = ''
  }

  if (
    hasVal(newRow.M_Prod_Agua_Livre_QWF_m3_d) &&
    hasVal(newRow.R_Agua_Emulsao_m3_d)
  ) {
    newRow.S_Agua_Total_Produzida_m3_d = Number(
      (M + val(newRow.R_Agua_Emulsao_m3_d)).toFixed(4),
    )
  } else {
    newRow.S_Agua_Total_Produzida_m3_d = ''
  }

  const S = val(newRow.S_Agua_Total_Produzida_m3_d)
  if (
    hasVal(newRow.S_Agua_Total_Produzida_m3_d) &&
    hasVal(newRow.L_Prod_Total_QT_m3_d) &&
    L !== 0
  ) {
    newRow.T_BSW_Total_Calculado = Number((S / L).toFixed(4))
  } else {
    newRow.T_BSW_Total_Calculado = ''
  }

  newRow.AD_Vol_Bruto_Transf_Emulsao = newRow.K_Transferencia_Emulsao
  const AD = val(newRow.AD_Vol_Bruto_Transf_Emulsao)
  if (
    hasVal(newRow.AD_Vol_Bruto_Transf_Emulsao) &&
    hasVal(newRow.V_BSW_Emulsao_Perc)
  ) {
    newRow.AE_Vol_Agua_Transf = Number((AD * V).toFixed(4))
  } else {
    newRow.AE_Vol_Agua_Transf = ''
  }

  const AE = val(newRow.AE_Vol_Agua_Transf)
  if (
    hasVal(newRow.AD_Vol_Bruto_Transf_Emulsao) &&
    hasVal(newRow.AE_Vol_Agua_Transf)
  ) {
    newRow.AF_Vol_Oleo_Transf_Sem_Corr = Number((AD - AE).toFixed(4))
  } else {
    newRow.AF_Vol_Oleo_Transf_Sem_Corr = ''
  }

  if (hasVal(newRow.AF_Vol_Oleo_Transf_Sem_Corr)) {
    const AF_val = val(newRow.AF_Vol_Oleo_Transf_Sem_Corr)
    const Y_val = hasVal(newRow.Y_Dilatacao_Termica)
      ? val(newRow.Y_Dilatacao_Termica)
      : 1
    const AB_val = effectiveFCV
    const AC_val = hasVal(newRow.AC_Fator_Encolhimento_FE)
      ? val(newRow.AC_Fator_Encolhimento_FE)
      : 1

    newRow.AG_Vol_Oleo_Transf_Com_Corr = Number(
      (AF_val * Y_val * AB_val * AC_val).toFixed(4),
    )
  } else {
    newRow.AG_Vol_Oleo_Transf_Com_Corr = ''
  }

  return newRow
}

export function lookupCalibrationValue(
  height: number,
  data: CalibrationRow[],
  field: 'volume_m3' | 'fcv',
): number {
  const defaultValue = field === 'fcv' ? 1.0 : 0
  if (!data || data.length === 0) return defaultValue

  const sortedData = data
    .filter((row) => Number.isFinite(row.altura_mm))
    .sort((a, b) => a.altura_mm - b.altura_mm)

  if (sortedData.length === 0) return defaultValue

  const getVal = (row: CalibrationRow) => row[field] ?? defaultValue

  // Boundary Checks
  if (height < sortedData[0].altura_mm) return defaultValue
  if (height === sortedData[0].altura_mm) return getVal(sortedData[0])

  const lastIndex = sortedData.length - 1
  if (height >= sortedData[lastIndex].altura_mm) {
    if (height === sortedData[lastIndex].altura_mm)
      return getVal(sortedData[lastIndex])
    return defaultValue
  }

  // Binary Search for correct interval [low, high]
  // We look for the first element *greater than or equal* to height.
  // Since we already handled boundaries, we search in [1, length-1].
  let low = 0
  let high = sortedData.length - 1
  let index = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = sortedData[mid].altura_mm

    // Strict equality check for exact match
    if (midVal === height) {
      return getVal(sortedData[mid])
    }

    if (midVal < height) {
      low = mid + 1
    } else {
      index = mid
      high = mid - 1
    }
  }

  // If we found an index where data[index] > height
  // The interval is between data[index-1] and data[index]
  if (index > 0) {
    const p2 = sortedData[index]
    const p1 = sortedData[index - 1]

    // Safety check if p1 exists (should always exist because index > 0)
    // p2 exists because index was found in range

    const heightDiff = p2.altura_mm - p1.altura_mm
    if (heightDiff === 0) return getVal(p1) // Avoid division by zero

    const val1 = getVal(p1)
    const val2 = getVal(p2)
    const slope = (val2 - val1) / heightDiff

    // Interpolation: y = y1 + (x - x1) * slope
    const interpolated = val1 + (height - p1.altura_mm) * slope
    return interpolated
  }

  // Fallback (should not be reached if logic holds and boundaries checked)
  return defaultValue
}

export function getCalibrationLevelRange(data: CalibrationRow[]) {
  if (!data || data.length === 0) return null

  const heights = data
    .map((row) => row.altura_mm)
    .filter((height) => Number.isFinite(height))

  if (heights.length === 0) return null

  return {
    min: Math.min(...heights),
    max: Math.max(...heights),
  }
}

export function isCalibrationLevelInRange(
  height: number | undefined | null,
  data: CalibrationRow[],
) {
  if (height === undefined || height === null || !Number.isFinite(height)) {
    return false
  }

  const range = getCalibrationLevelRange(data)
  if (!range) return false

  return height >= range.min && height <= range.max
}

export const calculateOperationData = (
  op: Partial<TankOperation>,
  calibrationData: CalibrationRow[],
): TankOperation => {
  const calculated = { ...op } as TankOperation

  if (op.initialLevelMm !== undefined) {
    calculated.initialVolumeM3 = lookupCalibrationValue(
      op.initialLevelMm,
      calibrationData,
      'volume_m3',
    )
  }
  if (op.finalLevelMm !== undefined) {
    calculated.finalVolumeM3 = lookupCalibrationValue(
      op.finalLevelMm,
      calibrationData,
      'volume_m3',
    )
  }

  if (
    calculated.initialVolumeM3 !== undefined &&
    calculated.finalVolumeM3 !== undefined
  ) {
    if (
      calculated.type === 'production' ||
      calculated.type === 'stock_variation'
    ) {
      calculated.volumeM3 =
        calculated.finalVolumeM3 - calculated.initialVolumeM3
    } else {
      calculated.volumeM3 = Math.abs(
        calculated.finalVolumeM3 - calculated.initialVolumeM3,
      )
    }
  }

  if (op.type === 'transfer' && calculated.volumeM3) {
    const fcv = op.fcv || 1.0
    const fe = op.fe || 1.0
    const bsw = (op.bswPercent || 0) / 100
    const temp = op.tempFluidC ?? op.tempAmbientC ?? 20

    const yFactor = 1 + (temp - 20) * 0.000012

    calculated.waterVolumeM3 = calculated.volumeM3 * bsw
    const oilUncorrected = calculated.volumeM3 - calculated.waterVolumeM3

    calculated.oilVolumeM3 = oilUncorrected * yFactor * fcv * fe
    calculated.volumeCorrectedM3 = calculated.oilVolumeM3
    calculated.ctl = yFactor
  } else if (
    (op.type === 'production' || op.type === 'stock_variation') &&
    calculated.volumeM3
  ) {
    const density = op.densityObservedGcm3
    const temp = op.tempFluidC ?? op.tempAmbientC

    if (density && temp) {
      try {
        const api11Result = calculateCrudeApi11To20({
          massaEspObs_gcc: density,
          tempFluidoC: temp,
        })
        calculated.ctl = api11Result.fcv20
      } catch (error) {
        console.error('Error calculating FCV in operation:', error)
        calculated.ctl = 1.0
      }
    } else {
      calculated.ctl = 1.0
    }

    calculated.volumeCorrectedM3 = calculated.volumeM3 * (calculated.ctl || 1.0)

    const bsw = (op.bswPercent || 0) / 100
    calculated.waterVolumeM3 = calculated.volumeCorrectedM3 * bsw
    calculated.oilVolumeM3 = calculated.volumeCorrectedM3 * (1 - bsw)
  } else if (op.type === 'drainage' && calculated.volumeM3) {
    calculated.volumeCorrectedM3 = calculated.volumeM3
    calculated.waterVolumeM3 = calculated.volumeM3
    calculated.oilVolumeM3 = 0
  }

  return calculated
}

export const consolidateDailyOperations = (
  date: Date,
  operations: TankOperation[],
  prevRow?: ProductionRow,
): ProductionRow => {
  const { start, end } = getProductionDayWindow(date)
  const dateKey = format(date, 'yyyy-MM-dd')

  const dailyOps = operations.filter((op) => {
    const opDateKey = format(getReportDateFromTimestamp(op.endTime), 'yyyy-MM-dd')
    return opDateKey === dateKey
  })

  const metrics = calculateDailyMetrics(dailyOps)

  const row: ProductionRow = {
    ...INITIAL_PRODUCTION_ROW,
    id: `consol-${date.getTime()}`,
    A_Data: start.toISOString(),
    D_Data_fim_periodo: end.toISOString(),
    J_Volume_Drenado_Agua_m3: metrics.drained,
    K_Transferencia_Emulsao: metrics.transferred,
    L_Prod_Total_QT_m3_d: metrics.wellProduction,
    S_Agua_Total_Produzida_m3_d: metrics.emulsionWaterVolume,
    Q_Prod_Oleo_Corrigido_m3_d: metrics.correctedOilVolume,
    P_Prod_Oleo_Sem_Correcao_m3_d: metrics.uncorrectedOilVolume,
    Z_Densidade_Lab_20C: metrics.densityAt20cGcm3,
    AB_FCV: metrics.fcv,
    X_Temp_Fluido: metrics.fluidTempC,
    AA_T_Observada_C: metrics.fluidTempC,
    T_BSW_Total_Calculado: metrics.totalBswPercent / 100,
    U_BSW_Total_Perc: metrics.totalBswPercent,
    V_BSW_Emulsao_Perc: metrics.emulsionBswPercent,
    H_Volume_Corrigido_24h: metrics.wellProduction,
  }

  if (dailyOps.length > 0) {
    const sorted = [...dailyOps].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    row.B_Altura_Liq_Inicial_mm = first.initialLevelMm
    row.E_Altura_Liq_Final_mm = last.finalLevelMm
  } else if (prevRow) {
    row.B_Altura_Liq_Inicial_mm = prevRow.E_Altura_Liq_Final_mm
    row.E_Altura_Liq_Final_mm = prevRow.E_Altura_Liq_Final_mm
  }

  return row
}
