import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireEntityProjectAccess,
} from '../_shared/auth.ts'

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const getHeightScore = (value: unknown) => {
  const normalized = normalizeHeader(value)
  if (!normalized) return 0
  if (normalized === 'altura' || normalized === 'altura (mm)') return 100
  if (normalized === 'height' || normalized === 'height (mm)') return 95
  if (normalized === 'nivel' || normalized === 'level') return 85
  if (normalized.includes('altura')) return 80
  if (normalized.includes('height')) return 75
  if (normalized.includes('nivel') || normalized.includes('level')) return 65
  return 0
}

const getVolumeScore = (value: unknown) => {
  const normalized = normalizeHeader(value)
  if (!normalized) return 0
  if (normalized === 'volume' || normalized === 'volume (m3)') return 100
  if (normalized === 'vol') return 90
  if (normalized.includes('volume')) return 80
  return 0
}

const getFcvScore = (value: unknown) => {
  const normalized = normalizeHeader(value)
  if (!normalized) return 0
  if (normalized === 'fcv') return 100
  if (normalized === 'fator' || normalized === 'fator de correcao') return 85
  if (normalized.includes('fcv')) return 80
  if (normalized.includes('fator')) return 70
  return 0
}

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN

  const cleaned = value
    .trim()
    .replace(/\u00A0/g, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')

  return cleaned === '' ? NaN : parseFloat(cleaned)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    const formData = await req.formData()
    const file = formData.get('file')
    const tankId = formData.get('tankId')

    if (!file || !tankId) {
      return new Response(
        JSON.stringify({ error: 'Arquivo e tanque sao obrigatorios.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'Arquivo invalido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    await requireEntityProjectAccess(context, 'tanks', String(tankId), [
      'owner',
      'editor',
    ])

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), {
      type: 'array',
      raw: false,
      dense: true,
    })

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma aba encontrada no arquivo.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as unknown[][]

    if (!rawData || rawData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum dado encontrado no arquivo.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    let headerRowIndex = -1
    let bestTotalScore = 0
    let bestMapping = { heightIdx: -1, volumeIdx: -1, fcvIdx: -1 }

    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i]
      if (!row || !Array.isArray(row) || row.length === 0) continue

      let bestH = { idx: -1, score: 0 }
      let bestV = { idx: -1, score: 0 }
      let bestF = { idx: -1, score: 0 }

      row.forEach((cell, idx) => {
        const hScore = getHeightScore(cell)
        const vScore = getVolumeScore(cell)
        const fScore = getFcvScore(cell)

        if (hScore > bestH.score) bestH = { idx, score: hScore }
        if (vScore > bestV.score) bestV = { idx, score: vScore }
        if (fScore > bestF.score) bestF = { idx, score: fScore }
      })

      if (bestH.score >= 50 && bestV.score >= 50 && bestH.idx !== bestV.idx) {
        const totalScore = bestH.score + bestV.score
        if (totalScore > bestTotalScore) {
          bestTotalScore = totalScore
          headerRowIndex = i
          bestMapping = {
            heightIdx: bestH.idx,
            volumeIdx: bestV.idx,
            fcvIdx: bestF.idx,
          }
        }
      }
    }

    if (headerRowIndex === -1 && rawData.length > 0) {
      headerRowIndex = 0
      const row = rawData[0]
      if (Array.isArray(row)) {
        row.forEach((cell, idx) => {
          if (getHeightScore(cell) > 50 && bestMapping.heightIdx === -1) {
            bestMapping.heightIdx = idx
          } else if (
            getVolumeScore(cell) > 50 &&
            bestMapping.volumeIdx === -1
          ) {
            bestMapping.volumeIdx = idx
          } else if (getFcvScore(cell) > 50 && bestMapping.fcvIdx === -1) {
            bestMapping.fcvIdx = idx
          }
        })
      }
    }

    const { heightIdx, volumeIdx, fcvIdx } = bestMapping

    if (heightIdx === -1 || volumeIdx === -1 || heightIdx === volumeIdx) {
      return new Response(
        JSON.stringify({
          error:
            'Nao foi possivel identificar as colunas Altura e Volume. Verifique o cabecalho do arquivo.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const validRows: Array<{
      height_mm: number
      volume_m3: number
      fcv: number
    }> = []

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || !Array.isArray(row)) continue

      const rawHeight = row[heightIdx]
      const rawVolume = row[volumeIdx]
      const rawFcv = fcvIdx !== -1 ? row[fcvIdx] : undefined

      if (
        (rawHeight === '' || rawHeight === undefined) &&
        (rawVolume === '' || rawVolume === undefined) &&
        (rawFcv === '' || rawFcv === undefined)
      ) {
        continue
      }

      const height = parseNumber(rawHeight)
      const volume = parseNumber(rawVolume)
      const fcv =
        rawFcv === '' || rawFcv === undefined ? 1.0 : parseNumber(rawFcv)

      if (Number.isNaN(height) || Number.isNaN(volume) || Number.isNaN(fcv)) {
        continue
      }

      validRows.push({
        height_mm: height,
        volume_m3: volume,
        fcv,
      })
    }

    if (validRows.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Nenhuma linha valida foi encontrada. Verifique se Altura, Volume e FCV estao preenchidos com numeros.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const { error } = await context.admin.rpc('import_calibration_data', {
      p_tank_id: tankId,
      p_data: validRows,
    })

    if (error) {
      console.error('Supabase RPC error:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, count: validRows.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    const details = getErrorResponseDetails(error)
    return new Response(
      JSON.stringify({
        error: details.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: details.status,
      },
    )
  }
})
