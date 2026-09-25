export interface Api11CrudeInput {
  tempFluidoC: number
  massaEspObs_gcc: number
}

export interface Api11CrudeResult {
  density20_gcc: number
  fcv20: number
  rho60_kgm3: number
  ctl_60_to_20: number
  alpha60: number
}

// Explicit Algorithm Version Constant
export const ALGORITHM_VERSION = 'api11_1_crude_v1.0.0'

// Constants for Crude Oil (Commodity Group A) - API 11.1
const K0_A = 341.0957
const K1_A = 0.0
const K2_A = 0.0

const BASE_C = 20.0
const T60C = 15.555556
const CT = 1.8 // 9/5

// Calculates Alpha60 based on Rho60 (kg/m3) for Crude Oil
function calculateAlpha60(rho60_kgm3: number): number {
  // alpha60 = K0/rho60^2 + K1/rho60 + K2
  return K0_A / (rho60_kgm3 * rho60_kgm3) + K1_A / rho60_kgm3 + K2_A
}

// Calculates VCF (Volume Correction Factor) from a target temperature relative to 20C base
// using the provided Alpha60 and the specified formula structure.
// This calculates the factor related to conversion to Base 20C.
// Based on the formula provided in requirements:
// x = CT * alpha60 * (tC - baseC)
// y = CT * alpha60 * deltaT (constant)
// Returns exp( -x * (1 + 0.8*x + y) )
// Interpretation: This returns rho_temp / rho_20
function calculateVcf20(tempC: number, alpha60: number): number {
  // x = CT * alpha60 * (tC - baseC)
  const x = CT * alpha60 * (tempC - BASE_C)

  // deltaT = 2 * (baseC - T60C)
  // 2 * (20 - 15.555556) = 8.888888...
  const deltaT = 2 * (BASE_C - T60C)

  // y = CT * alpha60 * deltaT
  const y = CT * alpha60 * deltaT

  // Result
  return Math.exp(-x * (1 + 0.8 * x + y))
}

export function calculateCrudeApi11To20(
  input: Api11CrudeInput,
): Api11CrudeResult {
  const { tempFluidoC, massaEspObs_gcc } = input

  // Input Validation
  if (typeof tempFluidoC !== 'number' || isNaN(tempFluidoC)) {
    throw new Error('A temperatura do fluido deve ser um número válido.')
  }
  if (
    typeof massaEspObs_gcc !== 'number' ||
    isNaN(massaEspObs_gcc) ||
    massaEspObs_gcc <= 0
  ) {
    throw new Error(
      'A massa específica observada deve ser um número maior que zero.',
    )
  }

  // Convert Obs Density (g/cm3) to kg/m3
  const rhoObs_kgm3 = massaEspObs_gcc * 1000

  // Iteration to find rho60 (Base Density @ 60F)
  // Relationship: rhoObs = rho60 * CTL(60F -> tObs)
  // Derived as: rhoObs = rho60 * (vcf_obs / vcf_60)
  // Where vcf_obs = rhoObs / rho20 and vcf_60 = rho60 / rho20

  let rho60 = rhoObs_kgm3 // Initial guess
  let converged = false
  const MAX_ITER = 50
  const EPSILON = 0.000001 // Tolerance for convergence

  for (let i = 0; i < MAX_ITER; i++) {
    const alpha = calculateAlpha60(rho60)

    // Calculate VCFs (factors relative to 20C)
    // vcf_60 = rho60 / rho20
    const vcf_60 = calculateVcf20(T60C, alpha)

    // vcf_obs = rhoObs / rho20
    const vcf_obs = calculateVcf20(tempFluidoC, alpha)

    // Calculate rhoObs based on current rho60 guess
    // rhoObs_calc = rho20 * vcf_obs = (rho60 / vcf_60) * vcf_obs
    const rhoObs_calc = rho60 * (vcf_obs / vcf_60)

    const diff = rhoObs_kgm3 - rhoObs_calc

    if (Math.abs(diff) < EPSILON) {
      converged = true
      break
    }

    // Update guess using substitution method
    // rho60_new = rhoObs_target / (vcf_obs / vcf_60)
    rho60 = rhoObs_kgm3 / (vcf_obs / vcf_60)
  }

  if (!converged) {
    throw new Error(
      'Falha na convergência do cálculo da densidade @ 60F após ' +
        MAX_ITER +
        ' iterações.',
    )
  }

  // Final Calculations
  const alphaFinal = calculateAlpha60(rho60)
  const vcf_60_final = calculateVcf20(T60C, alphaFinal)
  const vcf_obs_final = calculateVcf20(tempFluidoC, alphaFinal)

  // rho20 = rho60 / vcf_60
  const rho20_kgm3 = rho60 / vcf_60_final

  // fcv20 (Volume Correction Factor to 20C)
  // V20 = Vobs * FCV
  // FCV = rhoObs / rho20 = vcf_obs_final
  const fcv20 = vcf_obs_final

  // ctl_60_to_20 (Volume Correction from 60F to 20C)
  // V20 = V60 * CTL
  // CTL = rho60 / rho20 = vcf_60_final
  const ctl_60_to_20 = vcf_60_final

  return {
    density20_gcc: Number((rho20_kgm3 / 1000).toFixed(6)),
    fcv20: Number(fcv20.toFixed(6)),
    rho60_kgm3: Number(rho60.toFixed(6)),
    ctl_60_to_20: Number(ctl_60_to_20.toFixed(6)),
    alpha60: Number(alphaFinal.toFixed(7)),
  }
}

export function example() {
  const cases: Api11CrudeInput[] = [
    { tempFluidoC: 42, massaEspObs_gcc: 0.92 },
    { tempFluidoC: 42, massaEspObs_gcc: 0.97 },
  ]

  console.log('--- API 11.1 Crude Oil (Group A) Simulation ---')
  cases.forEach((c) => {
    try {
      const res = calculateCrudeApi11To20(c)
      console.log(
        `Input: ${c.massaEspObs_gcc.toFixed(3)} g/cm3 @ ${c.tempFluidoC}°C`,
      )
      console.log(
        `Result: Density@20C=${res.density20_gcc}, FCV=${res.fcv20}, Rho60=${res.rho60_kgm3}, CTL(60->20)=${res.ctl_60_to_20}, Alpha60=${res.alpha60}`,
      )
    } catch (e: any) {
      console.error(`Error for input ${JSON.stringify(c)}: ${e.message}`)
    }
  })
}
