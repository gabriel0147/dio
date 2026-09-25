import { describe, expect, it } from 'vitest'
import {
  calculateDailyMetrics,
  calculateOperationData,
  calculateProductionRow,
  getReportDateFromTimestamp,
  isCalibrationLevelInRange,
  lookupCalibrationValue,
} from './calculations'
import { INITIAL_PRODUCTION_ROW } from './initialData'
import type { CalibrationRow, TankOperation } from './types'

const calibration: CalibrationRow[] = [
  { id: '0', altura_mm: 0, volume_m3: 0, fcv: 1 },
  { id: '100', altura_mm: 100, volume_m3: 10, fcv: 1.01 },
  { id: '200', altura_mm: 200, volume_m3: 20, fcv: 1.02 },
]

describe('lookupCalibrationValue', () => {
  it('interpolates values inside the calibration table only', () => {
    expect(lookupCalibrationValue(150, calibration, 'volume_m3')).toBe(15)
    expect(lookupCalibrationValue(250, calibration, 'volume_m3')).toBe(0)
    expect(lookupCalibrationValue(-10, calibration, 'volume_m3')).toBe(0)
  })

  it('checks if a level is inside the calibration table range', () => {
    expect(isCalibrationLevelInRange(0, calibration)).toBe(true)
    expect(isCalibrationLevelInRange(200, calibration)).toBe(true)
    expect(isCalibrationLevelInRange(250, calibration)).toBe(false)
    expect(isCalibrationLevelInRange(-10, calibration)).toBe(false)
  })

  it('uses the calibration range even when rows are not sorted', () => {
    const unsortedCalibration: CalibrationRow[] = [
      { id: '1067', altura_mm: 1067, volume_m3: 13.959, fcv: 1 },
      { id: '245', altura_mm: 245, volume_m3: 4.664, fcv: 1 },
      { id: '640', altura_mm: 640, volume_m3: 7.431, fcv: 1 },
    ]

    expect(isCalibrationLevelInRange(1067, unsortedCalibration)).toBe(true)
    expect(lookupCalibrationValue(1067, unsortedCalibration, 'volume_m3')).toBe(
      13.959,
    )
    expect(lookupCalibrationValue(1200, unsortedCalibration, 'volume_m3')).toBe(
      0,
    )
  })
})

describe('getReportDateFromTimestamp', () => {
  it('keeps the saved calendar day instead of shifting by timezone', () => {
    const result = getReportDateFromTimestamp('2026-07-10T01:00:00.000Z')

    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(6)
    expect(result.getDate()).toBe(10)
  })
})

describe('calculateOperationData', () => {
  it('preserves a valid fluid temperature of zero degrees', () => {
    const result = calculateOperationData(
      {
        id: 'operation',
        tankId: 'tank',
        type: 'transfer',
        startTime: '2026-07-16T00:00:00.000Z',
        endTime: '2026-07-16T01:00:00.000Z',
        initialLevelMm: 0,
        finalLevelMm: 100,
        tempFluidC: 0,
        tempAmbientC: 25,
        bswPercent: 0,
        fcv: 1,
        fe: 1,
      },
      calibration,
    )

    expect(result.ctl).toBeCloseTo(0.99976, 6)
    expect(result.oilVolumeM3).toBeCloseTo(9.9976, 6)
  })
})

describe('calculateDailyMetrics', () => {
  it('reconciles the operational balance and the oil/water split', () => {
    const operations: TankOperation[] = [
      {
        id: 'stock',
        tankId: 'tank',
        type: 'stock_variation',
        startTime: '2026-07-16T00:00:00.000Z',
        endTime: '2026-07-16T08:00:00.000Z',
        initialLevelMm: 0,
        finalLevelMm: 0,
        volumeM3: 40,
        bswPercent: 25,
      },
      {
        id: 'drainage',
        tankId: 'tank',
        type: 'drainage',
        startTime: '2026-07-16T08:00:00.000Z',
        endTime: '2026-07-16T09:00:00.000Z',
        initialLevelMm: 0,
        finalLevelMm: 0,
        volumeM3: 10,
      },
      {
        id: 'transfer',
        tankId: 'tank',
        type: 'transfer',
        startTime: '2026-07-16T09:00:00.000Z',
        endTime: '2026-07-16T10:00:00.000Z',
        initialLevelMm: 0,
        finalLevelMm: 0,
        volumeM3: 50,
        waterVolumeM3: 5,
        volumeCorrectedM3: 44,
        bswPercent: 10,
      },
    ]

    const result = calculateDailyMetrics(operations)

    expect(result.wellProduction).toBe(100)
    expect(result.wellProduction).toBe(
      result.stockVariation + result.drained + result.transferred,
    )
    expect(result.uncorrectedOilVolume).toBe(75)
    expect(result.emulsionWaterVolume).toBe(25)
    expect(result.wellProduction).toBe(
      result.uncorrectedOilVolume + result.emulsionWaterVolume,
    )
    expect(result.transferWaterVolume).toBe(5)
    expect(result.transferOilUncorrectedVolume).toBe(45)
    expect(result.transferOilCorrectedVolume).toBe(44)
  })
})

describe('calculateProductionRow', () => {
  it('does not turn a reversed period into a valid 24-hour volume', () => {
    const result = calculateProductionRow(
      {
        ...INITIAL_PRODUCTION_ROW,
        id: 'reversed-period',
        A_Data: '2026-07-16T12:00:00.000Z',
        D_Data_fim_periodo: '2026-07-16T06:00:00.000Z',
        B_Altura_Liq_Inicial_mm: 0,
        E_Altura_Liq_Final_mm: 100,
        J_Volume_Drenado_Agua_m3: 0,
        K_Transferencia_Emulsao: 0,
      },
      undefined,
      calibration,
    )

    expect(result.G_Diferenca_volumes).toBe(10)
    expect(result.H_Volume_Corrigido_24h).toBe('')
  })

  it('uses total BSW as water fraction and leaves the remaining volume as oil/emulsion', () => {
    const result = calculateProductionRow(
      {
        ...INITIAL_PRODUCTION_ROW,
        id: 'bsw-split',
        A_Data: '2026-07-16T00:00:00.000Z',
        D_Data_fim_periodo: '2026-07-17T00:00:00.000Z',
        B_Altura_Liq_Inicial_mm: 0,
        E_Altura_Liq_Final_mm: 100,
        J_Volume_Drenado_Agua_m3: 990,
        K_Transferencia_Emulsao: 0,
        U_BSW_Total_Perc: 50,
        V_BSW_Emulsao_Perc: 0,
      },
      undefined,
      calibration,
    )

    expect(result.L_Prod_Total_QT_m3_d).toBe(1000)
    expect(result.M_Prod_Agua_Livre_QWF_m3_d).toBe(500)
    expect(result.O_Prod_Emulsao_QEM_m3_d).toBe(500)
    expect(result.P_Prod_Oleo_Sem_Correcao_m3_d).toBe(500)
    expect(result.S_Agua_Total_Produzida_m3_d).toBe(500)
  })

  it('does not invert water and oil when total BSW is not fifty percent', () => {
    const result = calculateProductionRow(
      {
        ...INITIAL_PRODUCTION_ROW,
        id: 'bsw-asymmetric-split',
        A_Data: '2026-07-16T00:00:00.000Z',
        D_Data_fim_periodo: '2026-07-17T00:00:00.000Z',
        B_Altura_Liq_Inicial_mm: 0,
        E_Altura_Liq_Final_mm: 100,
        J_Volume_Drenado_Agua_m3: 990,
        K_Transferencia_Emulsao: 0,
        U_BSW_Total_Perc: 20,
        V_BSW_Emulsao_Perc: 0,
      },
      undefined,
      calibration,
    )

    expect(result.L_Prod_Total_QT_m3_d).toBe(1000)
    expect(result.M_Prod_Agua_Livre_QWF_m3_d).toBe(200)
    expect(result.P_Prod_Oleo_Sem_Correcao_m3_d).toBe(800)
    expect(result.S_Agua_Total_Produzida_m3_d).toBe(200)
  })

  it('does not subtract drainage twice from current stock', () => {
    const result = calculateProductionRow(
      {
        ...INITIAL_PRODUCTION_ROW,
        id: 'stock-with-drainage',
        A_Data: '2026-07-16T00:00:00.000Z',
        D_Data_fim_periodo: '2026-07-17T00:00:00.000Z',
        B_Altura_Liq_Inicial_mm: 200,
        E_Altura_Liq_Final_mm: 100,
        J_Volume_Drenado_Agua_m3: 10,
        K_Transferencia_Emulsao: 0,
      },
      {
        ...INITIAL_PRODUCTION_ROW,
        id: 'previous',
        I_Estoque_QT_m3: 50,
      },
      calibration,
    )

    expect(result.G_Diferenca_volumes).toBe(-10)
    expect(result.I_Estoque_QT_m3).toBe(40)
    expect(result.L_Prod_Total_QT_m3_d).toBe(0)
  })
})
