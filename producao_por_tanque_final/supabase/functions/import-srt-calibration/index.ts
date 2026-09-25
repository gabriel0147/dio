import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireEntityProjectAccess,
} from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    const formData = await req.formData()
    const file = formData.get('file')
    const tankId = formData.get('tankId')
    const mode = formData.get('mode') // 'overwrite' or 'append'

    if (!file || !tankId) {
      return new Response(
        JSON.stringify({ error: 'File and tankId are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'Invalid file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    await requireEntityProjectAccess(
      context,
      'srt_mobile_tanks',
      String(tankId),
      ['owner', 'editor'],
    )

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Use header:1 to get array of arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as any[][]

    if (!rawData || rawData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found in excel file' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // --- Robust Header Detection Logic ---

    // Scoring functions
    const getHeightScore = (header: string): number => {
      const h = header.toLowerCase().trim()
      const alphanumeric = h.replace(/[^a-z0-9]/g, '')

      // Exact matches (highest priority)
      if (['h', 'height', 'altura', 'nivel', 'level', 'cm', 'mm'].includes(h))
        return 100
      if (['heightmm', 'alturamm', 'nivelmm', 'hmm'].includes(alphanumeric))
        return 100

      // Strong starts-with matches
      if (
        h.startsWith('height') ||
        h.startsWith('altura') ||
        h.startsWith('nivel')
      )
        return 90

      // Contains matches
      if (h.includes('height') || h.includes('altura')) return 80
      if (h.includes('(mm)') || h.includes('(cm)')) return 60 // Contextual clue

      return 0
    }

    const getVolumeScore = (header: string): number => {
      const h = header.toLowerCase().trim()
      const alphanumeric = h.replace(/[^a-z0-9]/g, '')

      // Exact matches
      if (['v', 'vol', 'volume', 'capacity', 'capacidade', 'm3'].includes(h))
        return 100
      if (['volumem3', 'volm3', 'vm3', 'capacitym3'].includes(alphanumeric))
        return 100

      // Strong starts-with matches
      if (h.startsWith('volume') || h.startsWith('vol') || h.startsWith('cap'))
        return 90

      // Contains matches
      if (h.includes('volume') || h.includes('volumen')) return 80
      if (h.includes('m3') || h.includes('litro')) return 60

      return 0
    }

    const getFcvScore = (header: string): number => {
      const h = header.toLowerCase().trim()
      const alphanumeric = h.replace(/[^a-z0-9]/g, '')

      if (['fcv', 'fator', 'factor'].includes(h)) return 100
      if (['fcv', 'factor'].includes(alphanumeric)) return 100
      if (h.includes('factor') || h.includes('fator')) return 80
      return 0
    }

    // Find the header row
    // We scan the first 20 rows. We pick the row that yields the best combined score for Height and Volume.
    let headerRowIndex = -1
    let bestTotalScore = 0
    let bestMapping = { heightIdx: -1, volumeIdx: -1, fcvIdx: -1 }

    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i]
      if (!row || !Array.isArray(row) || row.length === 0) continue

      let bestH = { idx: -1, score: 0 }
      let bestV = { idx: -1, score: 0 }
      let bestF = { idx: -1, score: 0 }

      // Scan columns in this row
      row.forEach((cell, idx) => {
        const val = String(cell || '')
        const hScore = getHeightScore(val)
        const vScore = getVolumeScore(val)
        const fScore = getFcvScore(val)

        if (hScore > bestH.score) bestH = { idx, score: hScore }
        if (vScore > bestV.score) bestV = { idx, score: vScore }
        if (fScore > bestF.score) bestF = { idx, score: fScore }
      })

      // We need at least a decent match for both Height and Volume to consider this a header row
      // Threshold: 50 each
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

    // If heuristic failed, fallback to assuming first row if it looks vaguely alphanumeric
    if (headerRowIndex === -1 && rawData.length > 0) {
      console.log(
        'Robust detection failed, falling back to simple scan on first row',
      )
      headerRowIndex = 0
      const row = rawData[0]
      if (Array.isArray(row)) {
        row.forEach((cell, idx) => {
          const val = String(cell || '')
          if (getHeightScore(val) > 50 && bestMapping.heightIdx === -1)
            bestMapping.heightIdx = idx
          else if (getVolumeScore(val) > 50 && bestMapping.volumeIdx === -1)
            bestMapping.volumeIdx = idx
          else if (getFcvScore(val) > 50 && bestMapping.fcvIdx === -1)
            bestMapping.fcvIdx = idx
        })
      }
    }

    const { heightIdx, volumeIdx, fcvIdx } = bestMapping

    if (heightIdx === -1 || volumeIdx === -1) {
      return new Response(
        JSON.stringify({
          error: `Could not identify 'Height' and 'Volume' columns. Please check your headers.`,
          details: { bestMapping, headerRowIndex },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (heightIdx === volumeIdx) {
      return new Response(
        JSON.stringify({
          error: `Ambiguous columns: Height and Volume mapped to the same column (Index ${heightIdx}).`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // --- Extract Data ---
    const validRows: any[] = []

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || !Array.isArray(row)) continue

      const rawH = row[heightIdx]
      const rawV = row[volumeIdx]

      // Skip empty lines
      if (rawH === undefined && rawV === undefined) continue

      // Parse numbers
      // Handle comma as decimal separator if string
      const parseNum = (val: any) => {
        if (typeof val === 'number') return val
        if (typeof val === 'string') {
          const cleaned = val.trim().replace(',', '.')
          return cleaned === '' ? NaN : parseFloat(cleaned)
        }
        return NaN
      }

      const height = parseNum(rawH)
      let volume = parseNum(rawV)

      if (isNaN(height) || isNaN(volume)) continue

      // CRITICAL UPDATE: Apply scaling factor for Volume (divide by 1000)
      // As requested in the User Story: "input of 2500 must be stored as 2.5"
      volume = volume / 1000.0

      // Handle FCV
      let fcv = 1.0
      if (fcvIdx !== -1 && row[fcvIdx] !== undefined) {
        const valF = parseNum(row[fcvIdx])
        if (!isNaN(valF)) fcv = valF
      }

      // Explicitly map keys to avoid confusion
      validRows.push({
        height_mm: height,
        volume_m3: volume,
        fcv: fcv,
      })
    }

    if (validRows.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'No valid data rows found (check numeric values for Height/Volume)',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const supabaseClient = context.admin

    if (mode === 'overwrite') {
      const { error: deleteError } = await supabaseClient
        .from('srt_mobile_tank_calibration')
        .delete()
        .eq('tank_id', tankId)

      if (deleteError) throw deleteError
    }

    // Use RPC for bulk insert
    const { error } = await supabaseClient.rpc('import_srt_calibration_data', {
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
