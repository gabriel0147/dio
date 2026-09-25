import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireGlobalRole,
  RequestError,
} from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    requireGlobalRole(context, [
      'admin',
      'director',
      'operations_manager',
      'petroleum_engineer',
      'supervisor',
    ])

    const { startDate, endDate, format = 'csv' } = await req.json()

    if (!startDate || !endDate) {
      throw new RequestError(400, 'startDate and endDate are required')
    }

    const { data, error } = await context.admin
      .from('fcv_calculation_logs')
      .select('*')
      .gte('calculated_at', startDate)
      .lte('calculated_at', endDate)
      .order('calculated_at', { ascending: false })

    if (error) throw error

    if (format === 'json') {
      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="fcv_logs.json"`,
        },
        status: 200,
      })
    }

    // CSV Format
    const headers = [
      'id',
      'user_id',
      'requested_by_user_id',
      'calculated_at',
      'fluid_temp_c',
      'observed_density_gcm3',
      'density_at_20c_gcm3',
      'fcv',
      'reference_base',
      'applied_norm',
      'algorithm_version',
      'calculation_reason',
    ]

    const csvRows = [headers.join(',')]

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header]
        if (val === null || val === undefined) return ''
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`
        return String(val)
      })
      csvRows.push(values.join(','))
    }

    const csvContent = csvRows.join('\n')

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="fcv_logs.csv"`,
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
