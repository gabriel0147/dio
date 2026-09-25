import { supabase } from '@/lib/supabase/client'
import { DbCalibrationData } from '@/lib/db-types'
import type { Json } from '@/lib/supabase/types'
import {
  ProductionRow,
  CalibrationRow,
  SealRow,
  BatchCalibrationOperations,
  ProductionChartItem,
} from '@/lib/types'
import { auditService } from './auditService'
import { format } from 'date-fns'
import { calculateTransferChartBreakdowns } from '@/lib/productionChart'

const normalizeCalibrationHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const parseCalibrationNumber = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/\u00A0/g, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')

  return cleaned === '' ? NaN : parseFloat(cleaned)
}

const parseCalibrationCsvFile = async (
  file: File,
): Promise<CalibrationRow[]> => {
  const text = await file.text()
  const normalizedText = text.replace(/^\uFEFF/, '')
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('O arquivo CSV nao possui linhas de dados.')
  }

  const headerLine = lines[0]
  const delimiter =
    (headerLine.match(/;/g) || []).length >
    (headerLine.match(/,/g) || []).length
      ? ';'
      : ','

  const headers = headerLine
    .split(delimiter)
    .map((header) => normalizeCalibrationHeader(header))

  const heightIdx = headers.findIndex(
    (header) =>
      header === 'altura' ||
      header === 'altura (mm)' ||
      header === 'height' ||
      header === 'height (mm)' ||
      header === 'nivel',
  )
  const volumeIdx = headers.findIndex(
    (header) =>
      header === 'volume' ||
      header === 'volume (m3)' ||
      header === 'volume (m³)' ||
      header === 'vol',
  )
  const fcvIdx = headers.findIndex(
    (header) =>
      header === 'fcv' || header === 'fator' || header === 'fator de correcao',
  )

  if (heightIdx === -1 || volumeIdx === -1) {
    throw new Error(
      'Nao foi possivel identificar as colunas Altura e Volume no CSV.',
    )
  }

  const rows: CalibrationRow[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const values = lines[index].split(delimiter).map((value) => value.trim())
    const rawHeight = values[heightIdx] ?? ''
    const rawVolume = values[volumeIdx] ?? ''
    const rawFcv = fcvIdx >= 0 ? (values[fcvIdx] ?? '') : ''

    if (!rawHeight && !rawVolume && !rawFcv) {
      continue
    }

    const height = parseCalibrationNumber(rawHeight)
    const volume = parseCalibrationNumber(rawVolume)
    const fcv = rawFcv ? parseCalibrationNumber(rawFcv) : 1

    if (Number.isNaN(height) || Number.isNaN(volume) || Number.isNaN(fcv)) {
      throw new Error(
        `Linha ${index + 1} invalida no CSV. Verifique Altura e Volume.`,
      )
    }

    rows.push({
      id: `csv-${index}`,
      altura_mm: height,
      volume_m3: volume,
      fcv,
    })
  }

  if (rows.length === 0) {
    throw new Error('Nenhuma linha valida foi encontrada no CSV.')
  }

  return rows
}

const normalizePdfText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')

const mapCalibrationRow = (d: DbCalibrationData): CalibrationRow => ({
  id: d.id,
  altura_mm: Number(d.height_mm),
  volume_m3: Number(d.volume_m3),
  fcv: d.fcv ? Number(d.fcv) : undefined,
})

const escapePdfText = (value: string) =>
  normalizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

const wrapPdfText = (value: string, maxChars: number) => {
  const normalized = normalizePdfText(value)
  if (normalized.length <= maxChars) return [normalized]

  const words = normalized.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : [normalized.slice(0, maxChars)]
}

const formatSealDate = (value: string) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-')
    return `${day}/${month}/${year}`
  }
  return value
}

const buildPdfBlob = (pages: string[][]) => {
  const objects: string[] = []
  const pageRefs: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('<< /Type /Pages /Count 0 /Kids [] >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((lines) => {
    const contentLines = [
      'BT',
      '/F1 10 Tf',
      '14 TL',
      '50 800 Td',
      ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, 'T*']),
      'ET',
    ]
    const stream = contentLines.join('\n')
    const contentObjectId = objects.length + 1
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    const pageObjectId = objects.length + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    )
    pageRefs.push(`${pageObjectId} 0 R`)
  })

  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(' ')}] >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export const sheetService = {
  // Production Data
  async getProductionData(tankId: string): Promise<ProductionRow[]> {
    const { data, error } = await supabase
      .from('production_data')
      .select('raw_data')
      .eq('tank_id', tankId)
      .order('date', { ascending: true })

    if (error) throw error
    return data.map((d: any) => d.raw_data as ProductionRow)
  },

  async getProductionChartData(
    tankIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ProductionChartItem[]> {
    if (tankIds.length === 0) return []

    // Ensure we query with YYYY-MM-DD strings for report_date column
    const start = format(startDate, 'yyyy-MM-dd')
    const end = format(endDate, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('daily_production_reports')
      .select(
        'id, tank_id, report_date, calculated_well_production_m3, drained_volume_m3, transferred_volume_m3, emulsion_water_volume_m3, uncorrected_oil_volume_m3, total_bsw_percent, stock_variation',
      )
      .in('tank_id', tankIds)
      .gte('report_date', start)
      .lte('report_date', end)
      .order('report_date', { ascending: true })

    if (error) throw error

    const reportIds = data.map((report: any) => report.id)
    const reportIdChunks: string[][] = []
    for (let index = 0; index < reportIds.length; index += 100) {
      reportIdChunks.push(reportIds.slice(index, index + 100))
    }

    const operationResults = await Promise.all(
      reportIdChunks.map((ids) =>
        supabase
          .from('tank_operations')
          .select(
            'daily_report_id, type, volume_m3, water_volume_m3, volume_corrected_m3, oil_volume_m3',
          )
          .eq('type', 'transfer')
          .in('daily_report_id', ids),
      ),
    )

    const transferOperations = operationResults.flatMap((result) => {
      if (result.error) throw result.error
      return (result.data || []).map((operation: any) => ({
        dailyReportId: operation.daily_report_id,
        type: operation.type,
        volumeM3: operation.volume_m3,
        waterVolumeM3: operation.water_volume_m3,
        volumeCorrectedM3: operation.volume_corrected_m3,
        oilVolumeM3: operation.oil_volume_m3,
      }))
    })
    const transferBreakdowns =
      calculateTransferChartBreakdowns(transferOperations)

    return data.map((d: any) => {
      const transferred = Number(d.transferred_volume_m3 || 0)
      const transferBreakdown = transferBreakdowns.get(d.id)
      const hasCompleteTransferBreakdown =
        transferred === 0 || transferBreakdown !== undefined

      return {
        tank_id: d.tank_id,
        date: d.report_date,
        well_production: Number(d.calculated_well_production_m3 || 0),
        drained: Number(d.drained_volume_m3 || 0),
        transferred,
        water_production: Number(d.emulsion_water_volume_m3 || 0),
        uncorrected_oil_production: Number(d.uncorrected_oil_volume_m3 || 0),
        total_bsw_percent: Number(d.total_bsw_percent || 0),
        stock_variation: Number(d.stock_variation || 0),
        transfer_water_volume: hasCompleteTransferBreakdown
          ? transferBreakdown?.waterVolume || 0
          : null,
        transfer_oil_uncorrected_volume: hasCompleteTransferBreakdown
          ? transferBreakdown?.uncorrectedOilVolume || 0
          : null,
        transfer_oil_corrected_volume: hasCompleteTransferBreakdown
          ? transferBreakdown?.correctedOilVolume || 0
          : null,
      }
    })
  },

  async saveProductionData(tankId: string, rows: ProductionRow[]) {
    const { error: deleteError } = await supabase
      .from('production_data')
      .delete()
      .eq('tank_id', tankId)

    if (deleteError) throw deleteError

    if (rows.length === 0) return

    const dbRows = rows.map((row) => ({
      tank_id: tankId,
      date: row.D_Data_fim_periodo || null,
      gross_production: parseFloat(String(row.L_Prod_Total_QT_m3_d)) || 0,
      total_water_production:
        parseFloat(String(row.S_Agua_Total_Produzida_m3_d)) || 0,
      uncorrected_oil_production:
        parseFloat(String(row.P_Prod_Oleo_Sem_Correcao_m3_d)) || 0,
      corrected_oil_production:
        parseFloat(String(row.Q_Prod_Oleo_Corrigido_m3_d)) || 0,
      raw_data: row as unknown as Json,
    }))

    const { error } = await supabase.from('production_data').insert(dbRows)
    if (error) throw error
  },

  // Calibration Data
  async getCalibrationData(
    tankId: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ data: CalibrationRow[]; count: number }> {
    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('calibration_data')
        .select('*', { count: 'exact' })
        .eq('tank_id', tankId)
        .order('height_mm', { ascending: true })
        .range(from, to)

      if (error) throw error
      return {
        data: data.map(mapCalibrationRow),
        count: count || 0,
      }
    }

    const allRows: DbCalibrationData[] = []
    const chunkSize = 1000
    let count = 0
    let pageIndex = 0

    while (true) {
      const { data, error, count: totalCount } = await supabase
        .from('calibration_data')
        .select('*', { count: pageIndex === 0 ? 'exact' : undefined })
        .eq('tank_id', tankId)
        .order('height_mm', { ascending: true })
        .range(pageIndex * chunkSize, pageIndex * chunkSize + chunkSize - 1)

      if (error) throw error

      if (pageIndex === 0) count = totalCount || 0
      if (!data || data.length === 0) break

      allRows.push(...data)

      if (data.length < chunkSize) break
      pageIndex += 1
    }

    return {
      data: allRows.map(mapCalibrationRow),
      count,
    }
  },

  async getCalibrationWindow(
    tankId: string,
    heightMm: number,
  ): Promise<CalibrationRow[]> {
    if (!Number.isFinite(heightMm)) return []

    const [lowerResult, upperResult] = await Promise.all([
      supabase
        .from('calibration_data')
        .select('*')
        .eq('tank_id', tankId)
        .lte('height_mm', heightMm)
        .order('height_mm', { ascending: false })
        .limit(1),
      supabase
        .from('calibration_data')
        .select('*')
        .eq('tank_id', tankId)
        .gte('height_mm', heightMm)
        .order('height_mm', { ascending: true })
        .limit(1),
    ])

    if (lowerResult.error) throw lowerResult.error
    if (upperResult.error) throw upperResult.error

    const rowsById = new Map<string, DbCalibrationData>()
    ;[...(lowerResult.data || []), ...(upperResult.data || [])].forEach(
      (row) => rowsById.set(row.id, row as DbCalibrationData),
    )

    return Array.from(rowsById.values())
      .map(mapCalibrationRow)
      .sort((a, b) => a.altura_mm - b.altura_mm)
  },

  async saveCalibrationData(
    tankId: string,
    rows: CalibrationRow[],
    reason?: string,
    userId?: string,
  ) {
    const dbRows = rows.map((row) => ({
      height_mm: row.altura_mm,
      volume_m3: row.volume_m3,
      fcv: row.fcv,
    }))

    const { error } = await supabase.rpc('import_calibration_data', {
      p_tank_id: tankId,
      p_data: dbRows as any,
    })

    if (error) throw error

    if (reason && userId) {
      await auditService.createLog({
        userId,
        entityType: 'calibration',
        entityId: tankId,
        operationType: 'update_calibration',
        reason,
      })
    }
  },

  async batchUpdateCalibration(
    tankId: string,
    operations: BatchCalibrationOperations,
    reason: string,
    userId: string,
  ) {
    if (operations.deletes.length > 0) {
      const { error } = await supabase
        .from('calibration_data')
        .delete()
        .in('id', operations.deletes)
      if (error) throw error
    }

    if (operations.updates.length > 0) {
      const updates = operations.updates.map((row) => ({
        id: row.id,
        tank_id: tankId,
        height_mm: row.altura_mm,
        volume_m3: row.volume_m3,
        fcv: row.fcv,
      }))
      const { error } = await supabase
        .from('calibration_data')
        .upsert(updates)
        .select()
      if (error) throw error
    }

    if (operations.inserts.length > 0) {
      const inserts = operations.inserts.map((row) => ({
        tank_id: tankId,
        height_mm: row.altura_mm,
        volume_m3: row.volume_m3,
        fcv: row.fcv,
      }))
      const { error } = await supabase.from('calibration_data').insert(inserts)
      if (error) throw error
    }

    const summary = `Batch Update: ${operations.inserts.length} inserted, ${operations.updates.length} updated, ${operations.deletes.length} deleted.`
    await auditService.createLog({
      userId,
      entityType: 'calibration',
      entityId: tankId,
      operationType: 'batch_update',
      newValue: summary,
      reason,
    })
  },

  async importCalibrationData(
    tankId: string,
    file: File,
    reason: string,
    userId: string,
  ): Promise<number> {
    const isCsvFile =
      file.name.toLowerCase().endsWith('.csv') ||
      file.type.toLowerCase().includes('csv')

    if (isCsvFile) {
      const rows = await parseCalibrationCsvFile(file)
      await this.saveCalibrationData(tankId, rows, reason, userId)
      return rows.length
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tankId', tankId)

    const { data, error } = await supabase.functions.invoke(
      'import-calibration',
      {
        body: formData,
      },
    )

    if (error) {
      let errorMessage = 'Erro ao processar o arquivo.'

      if (error && typeof error === 'object' && 'context' in error) {
        const context = error.context
        if (context && typeof context === 'object' && 'json' in context) {
          try {
            const body = await context.json()
            if (body && body.error) {
              errorMessage = body.error
            }
          } catch {
            // ignore
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      if (data && data.error) {
        errorMessage = data.error
      }

      throw new Error(errorMessage)
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Erro desconhecido na importação.')
    }

    await auditService.createLog({
      userId,
      entityType: 'calibration',
      entityId: tankId,
      operationType: 'import_calibration',
      reason,
    })

    return data.count
  },

  async exportCalibrationData(tankId: string): Promise<Blob> {
    const { data } = await this.getCalibrationData(tankId)
    const escapeCsvCell = (value: number | string) => {
      const text = String(value)
      return text.includes(',') || text.includes('"') || text.includes('\n')
        ? `"${text.replace(/"/g, '""')}"`
        : text
    }

    const csvContent = [
      'Altura,Volume',
      ...data.map((row) =>
        [row.altura_mm, row.volume_m3].map(escapeCsvCell).join(','),
      ),
    ].join('\r\n')

    return new Blob([`\uFEFF${csvContent}\r\n`], {
      type: 'text/csv;charset=utf-8;',
    })
  },

  async deleteCalibrationData(tankId: string, reason: string, userId: string) {
    const { error } = await supabase
      .from('calibration_data')
      .delete()
      .eq('tank_id', tankId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'calibration_table',
      entityId: tankId,
      operationType: 'delete',
      reason,
    })
  },

  // Seal Data
  async getSealData(tankId: string): Promise<SealRow[]> {
    const { data, error } = await supabase
      .from('seal_data')
      .select('raw_data')
      .eq('tank_id', tankId)
      .order('date', { ascending: true })

    if (error) throw error
    // Ensure that data coming from DB is marked as saved
    return data.map((d: any) => ({ ...d.raw_data, isSaved: true }) as SealRow)
  },

  async saveSealData(tankId: string, rows: SealRow[]) {
    const { error: deleteError } = await supabase
      .from('seal_data')
      .delete()
      .eq('tank_id', tankId)

    if (deleteError) throw deleteError

    if (rows.length === 0) return

    const dbRows = rows.map((row) => ({
      tank_id: tankId,
      date: row.data || null,
      raw_data: row as unknown as Json,
    }))

    const { error } = await supabase.from('seal_data').insert(dbRows)
    if (error) throw error
  },

  async generateSealReport(
    tankId: string,
    reportNumber: string,
    issuedAt: string,
  ): Promise<Blob> {
    const { data, error } = await supabase.functions.invoke(
      'generate-seal-report',
      {
        body: { tankId, reportNumber, issuedAt },
      },
    )

    if (error) {
      console.error('Error generating report:', error)
      throw new Error(error.message || 'Erro ao gerar relatório.')
    }

    if (!data) {
      throw new Error('Nenhum dado retornado.')
    }

    // Check if response is error json
    if (data.type === 'application/json') {
      const text = await data.text()
      let errorMsg = 'Erro ao gerar relatório.'
      try {
        const json = JSON.parse(text)
        if (json.error) errorMsg = json.error
      } catch {
        // ignore
      }
      throw new Error(errorMsg)
    }

    return data
  },

  buildSealReportPdf({
    tankTag,
    productionField,
    emitterEmail,
    reportNumber,
    issuedAt,
    rows,
  }: {
    tankTag: string
    productionField?: string
    emitterEmail: string
    reportNumber: string
    issuedAt: string
    rows: SealRow[]
  }): Blob {
    const issuedLabel = new Date(issuedAt).toLocaleString('pt-BR')
    const lines: string[] = [
      'RELATORIO DE REGISTRO DE LACRES',
      '',
      `Numero do Relatorio: ${reportNumber}`,
      `Emissor: ${emitterEmail || 'Desconhecido'}`,
      `Emissao: ${issuedLabel}`,
      `Tanque: ${tankTag}`,
      `Campo: ${productionField || 'N/A'}`,
      '',
      'Historico de lacres',
      'Data | Hora | Entrada | Dreno | Saida | Situacao',
      '--------------------------------------------------------------------------',
    ]

    rows.forEach((row) => {
      const line = `${formatSealDate(row.data)} | ${row.hora || '-'} | ${row.lacre_v_entrada || '-'} | ${row.lacre_v_dreno || '-'} | ${row.lacre_v_saida || '-'} | ${row.situacao || '-'}`
      lines.push(...wrapPdfText(line, 95))
    })

    if (rows.length === 0) {
      lines.push('Nenhum registro de lacre encontrado para este tanque.')
    }

    lines.push('')
    lines.push(`Documento gerado automaticamente. ID: ${reportNumber}`)

    const pageSize = 48
    const pages: string[][] = []
    for (let index = 0; index < lines.length; index += pageSize) {
      pages.push(lines.slice(index, index + pageSize))
    }

    return buildPdfBlob(pages)
  },
}
