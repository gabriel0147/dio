import { describe, expect, it } from 'vitest'
import { calculateFtc, calculateSrtMeasurement } from './srtMeasurements'

const baseInput = {
  initialVolumeM3: 10,
  finalVolumeM3: 50,
  emulsionLevelVolumeM3: 20,
  bswEmulsionPct: 25,
  fcv: 1,
  fe: 1,
  ftc: 1,
  durationHours: 12,
}

describe('calculateSrtMeasurement', () => {
  it('applies the official volume, BSW and 24-hour formulas', () => {
    const result = calculateSrtMeasurement(baseInput)

    expect(result.totalVolumeM3).toBe(40)
    expect(result.emulsionVolumeM3).toBe(30)
    expect(result.freeWaterVolumeM3).toBe(10)
    expect(result.uncorrectedOilVolumeM3).toBe(22.5)
    expect(result.emulsionWaterVolumeM3).toBe(7.5)
    expect(result.totalWaterVolumeM3).toBe(17.5)
    expect(result.totalBswPct).toBe(43.75)
    expect(result.liquidPotential24hM3).toBe(80)
    expect(result.correctedOilPotential24hM3).toBe(45)
    expect(result.waterPotential24hM3).toBe(35)
  })

  it('uses corrected oil for the oil potential', () => {
    const result = calculateSrtMeasurement({
      ...baseInput,
      fcv: 1.1,
      fe: 0.99,
      ftc: 1.02,
    })

    expect(result.correctedOilVolumeM3).toBeCloseTo(24.99255, 6)
    expect(result.correctedOilPotential24hM3).toBeCloseTo(49.9851, 6)
  })

  it('handles BSWe boundaries of 0% and 100%', () => {
    const dry = calculateSrtMeasurement({ ...baseInput, bswEmulsionPct: 0 })
    const waterOnlyEmulsion = calculateSrtMeasurement({
      ...baseInput,
      bswEmulsionPct: 100,
    })

    expect(dry.uncorrectedOilVolumeM3).toBe(30)
    expect(dry.totalWaterVolumeM3).toBe(10)
    expect(waterOnlyEmulsion.uncorrectedOilVolumeM3).toBe(0)
    expect(waterOnlyEmulsion.totalWaterVolumeM3).toBe(40)
    expect(waterOnlyEmulsion.totalBswPct).toBe(100)
  })

  it('rejects invalid volume order, duration, BSW and factors', () => {
    expect(() =>
      calculateSrtMeasurement({
        ...baseInput,
        emulsionLevelVolumeM3: 60,
      }),
    ).toThrow('Vi ≤ Vm ≤ Vf')
    expect(() =>
      calculateSrtMeasurement({
        ...baseInput,
        initialVolumeM3: 30,
        emulsionLevelVolumeM3: 20,
      }),
    ).toThrow('Vi ≤ Vm ≤ Vf')
    expect(() =>
      calculateSrtMeasurement({
        ...baseInput,
        initialVolumeM3: -1,
      }),
    ).toThrow('Vi ≤ Vm ≤ Vf')
    expect(() =>
      calculateSrtMeasurement({
        ...baseInput,
        finalVolumeM3: 10,
        emulsionLevelVolumeM3: 10,
      }),
    ).toThrow('maior que zero')
    expect(() =>
      calculateSrtMeasurement({ ...baseInput, durationHours: 0 }),
    ).toThrow('duração')
    expect(() =>
      calculateSrtMeasurement({ ...baseInput, durationHours: -1 }),
    ).toThrow('duração')
    expect(() =>
      calculateSrtMeasurement({ ...baseInput, bswEmulsionPct: -1 }),
    ).toThrow('BSW')
    expect(() =>
      calculateSrtMeasurement({ ...baseInput, bswEmulsionPct: 101 }),
    ).toThrow('BSW')
    expect(() => calculateSrtMeasurement({ ...baseInput, fcv: 0 })).toThrow(
      'FCV',
    )
    expect(() => calculateSrtMeasurement({ ...baseInput, fe: 0 })).toThrow(
      'FCV',
    )
    expect(() => calculateSrtMeasurement({ ...baseInput, ftc: 0 })).toThrow(
      'FCV',
    )
    expect(() =>
      calculateSrtMeasurement({ ...baseInput, finalVolumeM3: Number.NaN }),
    ).toThrow('válidos')
  })
})

describe('calculateFtc', () => {
  it('keeps the existing temperature correction rule under the FTC name', () => {
    expect(calculateFtc(20)).toBe(1)
    expect(calculateFtc(0)).toBeCloseTo(0.99976, 6)
    expect(() => calculateFtc(Number.NaN)).toThrow('temperatura')
  })
})
