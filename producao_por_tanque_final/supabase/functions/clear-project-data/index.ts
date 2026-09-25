import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireProjectAccess,
  RequestError,
} from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)

    const { projectId } = await req.json()
    if (!projectId) {
      throw new RequestError(400, 'ProjectId is required')
    }

    await requireProjectAccess(context, projectId, ['owner'])
    const supabaseAdmin = context.admin

    // Get all Tank IDs for this project
    const { data: tanks, error: tanksError } = await supabaseAdmin
      .from('tanks')
      .select('id')
      .eq('project_id', projectId)

    if (tanksError) {
      throw new Error('Failed to retrieve tanks: ' + tanksError.message)
    }

    const tankIds = tanks.map((t: any) => t.id)

    if (tankIds.length > 0) {
      // 1. Delete Tank Operations (References Reports, so delete first if FK exists, but reports ref operations? No, usually Ops ref Reports or independent.
      // In this schema: tank_operations has daily_report_id FK to daily_production_reports.
      // So MUST delete tank_operations FIRST.
      const { error: opsError } = await supabaseAdmin
        .from('tank_operations')
        .delete()
        .in('tank_id', tankIds)

      if (opsError) {
        throw new Error('Failed to delete operations: ' + opsError.message)
      }

      // 2. Delete Daily Production Reports
      const { error: reportsError } = await supabaseAdmin
        .from('daily_production_reports')
        .delete()
        .in('tank_id', tankIds)

      if (reportsError) {
        throw new Error('Failed to delete reports: ' + reportsError.message)
      }

      // 3. Delete Production Data (The spreadhseet rows)
      const { error: prodDataError } = await supabaseAdmin
        .from('production_data')
        .delete()
        .in('tank_id', tankIds)

      if (prodDataError) {
        throw new Error(
          'Failed to delete production data: ' + prodDataError.message,
        )
      }

      // 4. Delete Seal Data (Optional but cleaner)
      const { error: sealDataError } = await supabaseAdmin
        .from('seal_data')
        .delete()
        .in('tank_id', tankIds)

      if (sealDataError) {
        throw new Error('Failed to delete seal data: ' + sealDataError.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project data cleared successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    const details = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: details.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: details.status,
    })
  }
})
