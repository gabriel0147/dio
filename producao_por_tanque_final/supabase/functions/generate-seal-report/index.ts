import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireEntityProjectAccess,
} from '../_shared/auth.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    const { tankId, reportNumber, issuedAt } = await req.json()

    if (!tankId) {
      return new Response(JSON.stringify({ error: 'Missing tankId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await requireEntityProjectAccess(context, 'tanks', tankId)

    // Fetch User Details to display Emitter Name
    // We try to get user from token for security first
    const emitterEmail = context.user.email || 'Desconhecido'

    // Fetch Tank Data
    const { data: tank, error: tankError } = await context.admin
      .from('tanks')
      .select('tag, production_field:production_fields(name)')
      .eq('id', tankId)
      .single()

    if (tankError || !tank) {
      return new Response(JSON.stringify({ error: 'Tank not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch Seal Data
    const { data: sealData, error: sealError } = await context.admin
      .from('seal_data')
      .select('raw_data')
      .eq('tank_id', tankId)
      .order('date', { ascending: false }) // Most recent first

    if (sealError) {
      return new Response(JSON.stringify({ error: 'Error fetching data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let currentPage = pdfDoc.addPage()
    const { width, height } = currentPage.getSize()
    const margin = 50

    // --- Header Section ---
    let yPosition = height - margin

    // Title
    const title = 'Relatório de Registro de Lacres'
    const fontSizeTitle = 18
    const titleWidth = fontBold.widthOfTextAtSize(title, fontSizeTitle)

    currentPage.drawText(title, {
      x: (width - titleWidth) / 2,
      y: yPosition,
      size: fontSizeTitle,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    yPosition -= 40

    // Metadata Box
    const metadataFontSize = 10
    const metadataLineHeight = 15

    // Helper to draw metadata line
    const drawMetadata = (
      label: string,
      value: string,
      x: number,
      y: number,
    ) => {
      currentPage.drawText(label, {
        x,
        y,
        size: metadataFontSize,
        font: fontBold,
      })
      const labelWidth = fontBold.widthOfTextAtSize(label, metadataFontSize)
      currentPage.drawText(value, {
        x: x + labelWidth + 5,
        y,
        size: metadataFontSize,
        font: font,
      })
    }

    // Format issuance date
    const formattedDate = issuedAt
      ? new Date(issuedAt).toLocaleString('pt-BR')
      : new Date().toLocaleString('pt-BR')

    drawMetadata(
      'Número do Relatório:',
      reportNumber || 'N/A',
      margin,
      yPosition,
    )
    yPosition -= metadataLineHeight
    drawMetadata('Emissor:', emitterEmail, margin, yPosition)
    yPosition -= metadataLineHeight
    drawMetadata('Emissão:', formattedDate, margin, yPosition)
    yPosition -= metadataLineHeight
    drawMetadata('Tanque:', tank.tag, margin, yPosition)
    yPosition -= metadataLineHeight
    drawMetadata(
      'Campo:',
      tank.production_field?.name || 'N/A',
      margin,
      yPosition,
    )

    yPosition -= 30

    // --- Table Section ---
    const rowHeight = 20
    const fontSizeTable = 9

    // Columns: Data (15%), Hora (10%), L. Entrada (20%), L. Dreno (20%), L. Saída (20%), Situação (15%)
    const tableWidth = width - 2 * margin
    const colWidths = [
      tableWidth * 0.15, // Data
      tableWidth * 0.1, // Hora
      tableWidth * 0.2, // L. Entrada
      tableWidth * 0.2, // L. Dreno
      tableWidth * 0.2, // L. Saida
      tableWidth * 0.15, // Situacao
    ]
    const headers = [
      'Data',
      'Hora',
      'L. Entrada',
      'L. Dreno',
      'L. Saída',
      'Situação',
    ]

    // Draw Header Background
    currentPage.drawRectangle({
      x: margin,
      y: yPosition - 5,
      width: tableWidth,
      height: rowHeight,
      color: rgb(0.9, 0.9, 0.9),
    })

    // Draw Header Text
    let currentX = margin
    headers.forEach((header, i) => {
      // Center text in column roughly? or left align with padding
      currentPage.drawText(header, {
        x: currentX + 5,
        y: yPosition, // slightly adjusted for baseline
        size: fontSizeTable,
        font: fontBold,
      })
      currentX += colWidths[i]
    })

    yPosition -= rowHeight

    if (!sealData || sealData.length === 0) {
      currentPage.drawText(
        'Nenhum registro de lacre encontrado para este tanque.',
        {
          x: margin + 5,
          y: yPosition,
          size: fontSizeTable,
          font,
          color: rgb(0.4, 0.4, 0.4),
        },
      )
      yPosition -= rowHeight
    }

    // Draw Rows
    for (const record of sealData || []) {
      if (yPosition < margin) {
        currentPage = pdfDoc.addPage()
        yPosition = height - margin
      }

      const row = record.raw_data
      // Ensure date format is nice if it's YYYY-MM-DD
      let dateDisplay = row.data || ''
      if (dateDisplay.includes('-')) {
        const [y, m, d] = dateDisplay.split('-')
        if (y && m && d) dateDisplay = `${d}/${m}/${y}`
      }

      const rowData = [
        dateDisplay,
        row.hora || '',
        row.lacre_v_entrada || '',
        row.lacre_v_dreno || '',
        row.lacre_v_saida || '',
        row.situacao || '',
      ]

      currentX = margin
      rowData.forEach((text, i) => {
        let cellText = String(text)
        // Truncate if too long
        const maxWidth = colWidths[i] - 10
        if (font.widthOfTextAtSize(cellText, fontSizeTable) > maxWidth) {
          // simple char truncation approximation
          const avgCharWidth = 5
          const maxChars = Math.floor(maxWidth / avgCharWidth)
          if (cellText.length > maxChars)
            cellText = cellText.substring(0, maxChars) + '...'
        }

        currentPage.drawText(cellText, {
          x: currentX + 5,
          y: yPosition,
          size: fontSizeTable,
          font: font,
        })
        currentX += colWidths[i]
      })

      // Divider line
      currentPage.drawLine({
        start: { x: margin, y: yPosition - 5 },
        end: { x: width - margin, y: yPosition - 5 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })

      yPosition -= rowHeight
    }

    // Footer
    const footerText = `Documento gerado automaticamente pelo sistema RTM NBS. ID: ${reportNumber || 'N/A'}`
    currentPage.drawText(footerText, {
      x: margin,
      y: margin / 2,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="seal_report_${tankId}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const { status, message } = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
