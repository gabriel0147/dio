export interface SrtMeasurementInput {
  initialVolumeM3: number
  finalVolumeM3: number
  emulsionLevelVolumeM3: number
  bswEmulsionPct: number
  fcv: number
  fe: number
  ftc: number
  durationHours: number
}

export interface SrtMeasurementResult {
  totalVolumeM3: number
  emulsionVolumeM3: number
  freeWaterVolumeM3: number
  uncorrectedOilVolumeM3: number
  emulsionWaterVolumeM3: number
  totalWaterVolumeM3: number
  totalBswPct: number
  correctedOilVolumeM3: number
  liquidPotential24hM3: number
  correctedOilPotential24hM3: number
  waterPotential24hM3: number
}

export function calculateFtc(temperatureC: number): number {
  if (!Number.isFinite(temperatureC)) {
    throw new RangeError('A temperatura deve ser um número válido.')
  }
  return 1 + (temperatureC - 20) * 0.000012
}

export function calculateSrtMeasurement(
  input: SrtMeasurementInput,
): SrtMeasurementResult {
  const values = Object.values(input)
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError('Todos os valores da medição devem ser válidos.')
  }
  if (
    input.initialVolumeM3 < 0 ||
    input.initialVolumeM3 > input.emulsionLevelVolumeM3 ||
    input.emulsionLevelVolumeM3 > input.finalVolumeM3
  ) {
    throw new RangeError('Os volumes devem respeitar Vi ≤ Vm ≤ Vf.')
  }
  if (input.bswEmulsionPct < 0 || input.bswEmulsionPct > 100) {
    throw new RangeError('O BSW da emulsão deve estar entre 0% e 100%.')
  }
  if (input.durationHours <= 0) {
    throw new RangeError('A duração da medição deve ser maior que zero.')
  }
  if (input.fcv <= 0 || input.fe <= 0 || input.ftc <= 0) {
    throw new RangeError('FCV, FE e FTC devem ser maiores que zero.')
  }

  const totalVolumeM3 = input.finalVolumeM3 - input.initialVolumeM3
  if (totalVolumeM3 <= 0) {
    throw new RangeError('O volume total medido deve ser maior que zero.')
  }

  const emulsionVolumeM3 =
    input.finalVolumeM3 - input.emulsionLevelVolumeM3
  const freeWaterVolumeM3 =
    input.emulsionLevelVolumeM3 - input.initialVolumeM3
  const bswFraction = input.bswEmulsionPct / 100
  const uncorrectedOilVolumeM3 = emulsionVolumeM3 * (1 - bswFraction)
  const emulsionWaterVolumeM3 = emulsionVolumeM3 * bswFraction
  const totalWaterVolumeM3 = freeWaterVolumeM3 + emulsionWaterVolumeM3
  const totalBswPct = (totalWaterVolumeM3 / totalVolumeM3) * 100
  const correctedOilVolumeM3 =
    uncorrectedOilVolumeM3 * input.fcv * input.fe * input.ftc

  return {
    totalVolumeM3,
    emulsionVolumeM3,
    freeWaterVolumeM3,
    uncorrectedOilVolumeM3,
    emulsionWaterVolumeM3,
    totalWaterVolumeM3,
    totalBswPct,
    correctedOilVolumeM3,
    liquidPotential24hM3: (totalVolumeM3 / input.durationHours) * 24,
    correctedOilPotential24hM3:
      (correctedOilVolumeM3 / input.durationHours) * 24,
    waterPotential24hM3: (totalWaterVolumeM3 / input.durationHours) * 24,
  }
}
