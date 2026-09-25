import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireGlobalRole,
} from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    requireGlobalRole(context, ['admin', 'director'])

    // 1. Get all users from Auth (paginated, but we'll fetch page 1 for now or all if possible)
    // listUsers defaults to 50 users per page
    const {
      data: { users },
      error: authError,
    } = await context.admin.auth.admin.listUsers({
      perPage: 1000,
    })

    if (authError) throw authError

    // 2. Get all profiles
    const { data: profiles, error: profilesError } = await context.admin
      .from('user_profiles')
      .select('*')

    if (profilesError) throw profilesError

    // 3. Merge data
    const mergedUsers = users.map((u) => {
      const profile = profiles.find((p) => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        role: profile?.role || 'operator',
        fullName: profile?.full_name,
        avatarUrl: profile?.avatar_url,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }
    })

    return new Response(JSON.stringify(mergedUsers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
