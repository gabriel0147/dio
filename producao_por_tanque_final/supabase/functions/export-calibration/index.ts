import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireEntityProjectAccess,
  RequestError,
} from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    const { tankId } = await req.json()

    if (!tankId) {
      throw new RequestError(400, 'tankId is required')
    }

    await requireEntityProjectAccess(context, 'tanks', tankId, [
      'owner',
      'editor',
      'viewer',
    ])

    const { data, error } = await context.admin
      .from('calibration_data')
      .select('height_mm, volume_m3, fcv')
      .eq('tank_id', tankId)
      .order('height_mm', { ascending: true })

    if (error) throw error

    // Generate CSV
    const headers = ['height_mm', 'volume_m3', 'fcv']
    const csvRows = [headers.join(',')]

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header]
        // Escape quotes if necessary
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`
        }
        return val === null || val === undefined ? '' : String(val)
      })
      csvRows.push(values.join(','))
    }

    const csvContent = csvRows.join('\n')

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="calibration_data_${tankId}.csv"`,
      },
      status: 200,
    })
  } catch (error: unknown) {
    const details = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: details.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: details.status,
    })
  }
})
