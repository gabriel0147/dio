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
    requireGlobalRole(context, ['admin', 'director'])

    const { userId } = await req.json()

    if (!userId) {
      throw new RequestError(400, 'User ID is required')
    }

    if (userId === context.user.id) {
      throw new RequestError(400, 'You cannot delete your own account')
    }

    // Delete from Auth. If the user was already removed manually, treat the
    // operation as idempotent and return success so the UI can reconcile.
    const { error } = await context.admin.auth.admin.deleteUser(userId)

    if (
      error &&
      !String(error.message || '')
        .toLowerCase()
        .includes('not found')
    ) {
      throw error
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const details = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: details.message }), {
      status: details.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
