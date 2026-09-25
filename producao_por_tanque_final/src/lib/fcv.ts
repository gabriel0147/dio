/**
 * Utility functions for FCV (Volume Correction Factor) calculation
 * based on provisional operational model.
 */

export interface FcvResult {
  alphaUtilizado: number
  deltaT: number
  fcv: number
  massaEspecifica20: number
}

// Table defining the relationship between Density (g/cm³) and Alpha coefficient
const ALPHA_TABLE = [
  { density: 0.87, alpha: 0.0009 },
  { density: 0.88, alpha: 0.00088 },
  { density: 0.89, alpha: 0.00086 },
  { density: 0.9, alpha: 0.00084 },
  { density: 0.91, alpha: 0.00082 },
  { density: 0.92, alpha: 0.0008 },
  { density: 0.93, alpha: 0.00078 },
  { density: 0.94, alpha: 0.00076 },
  { density: 0.95, alpha: 0.00074 },
  { density: 0.96, alpha: 0.00072 },
  { density: 0.97, alpha: 0.0007 },
  { density: 0.98, alpha: 0.00068 },
  { density: 0.99, alpha: 0.00066 },
  { density: 0.999, alpha: 0.00064 },
]

const BASE_TEMP_C = 20.0

/**
 * Calculates the Volume Correction Factor (FCV) and related metrics.
 *
 * @param tempFluidoC - Fluid Temperature in °C
 * @param massaEspecificaObsGcCm3 - Observed Specific Mass in g/cm³
 * @returns Object containing calculated metrics
 * @throws Error if density is outside the supported range (0.870 - 0.999)
 */
export function calculateFcv(
  tempFluidoC: number,
  massaEspecificaObsGcCm3: number,
): FcvResult {
  // 1. Validation: Range Check
  const minDensity = ALPHA_TABLE[0].density
  const maxDensity = ALPHA_TABLE[ALPHA_TABLE.length - 1].density

  // Using a small epsilon for floating point comparison safety if needed,
  // but straight comparison is usually fine for these specific bounds.
  if (
    massaEspecificaObsGcCm3 < minDensity ||
    massaEspecificaObsGcCm3 > maxDensity
  ) {
    throw new Error(
      `A massa específica observada (${massaEspecificaObsGcCm3}) está fora do intervalo permitido (${minDensity} a ${maxDensity}).`,
    )
  }

  // 2. Alpha Interpolation
  let alphaUtilizado = 0

  // Check for exact match first to avoid interpolation logic if not needed
  const exactMatch = ALPHA_TABLE.find(
    (row) => row.density === massaEspecificaObsGcCm3,
  )
  if (exactMatch) {
    alphaUtilizado = exactMatch.alpha
  } else {
    // Find the interval [p1, p2] where density falls
    for (let i = 0; i < ALPHA_TABLE.length - 1; i++) {
      const p1 = ALPHA_TABLE[i]
      const p2 = ALPHA_TABLE[i + 1]

      if (
        massaEspecificaObsGcCm3 >= p1.density &&
        massaEspecificaObsGcCm3 <= p2.density
      ) {
        // Linear Interpolation:
        // y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
        const slope = (p2.alpha - p1.alpha) / (p2.density - p1.density)
        alphaUtilizado =
          p1.alpha + (massaEspecificaObsGcCm3 - p1.density) * slope
        break
      }
    }
  }

  // Safety fallback (should be covered by range check)
  if (alphaUtilizado === 0) {
    throw new Error('Falha ao interpolar coeficiente Alpha.')
  }

  // 3. Delta T Calculation
  // Delta T = 20 - T_observed
  const deltaT = BASE_TEMP_C - tempFluidoC

  // 4. FCV Calculation
  // FCV = e^(alpha * deltaT)
  const fcv = Math.exp(alphaUtilizado * deltaT)

  // 5. Corrected Specific Mass (at 20°C)
  // Rho_20 = Rho_observed / FCV
  const massaEspecifica20 = massaEspecificaObsGcCm3 / fcv

  return {
    alphaUtilizado: Number(alphaUtilizado.toFixed(6)), // Display precision
    deltaT: Number(deltaT.toFixed(2)),
    fcv: Number(fcv.toFixed(6)),
    massaEspecifica20: Number(massaEspecifica20.toFixed(4)),
  }
}
