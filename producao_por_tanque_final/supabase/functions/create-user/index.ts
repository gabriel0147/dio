import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireGlobalRole,
  type GlobalRole,
} from '../_shared/auth.ts'

const ASSIGNABLE_ROLES: GlobalRole[] = [
  'admin',
  'director',
  'operations_manager',
  'supervisor',
  'petroleum_engineer',
  'regulation',
  'approver',
  'operator',
  'maintenance',
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    requireGlobalRole(context, ['admin', 'director'])

    const { email, role, fullName } = await req.json()
    if (
      typeof email !== 'string' ||
      !email.trim() ||
      !ASSIGNABLE_ROLES.includes(role as GlobalRole)
    ) {
      return new Response(
        JSON.stringify({ error: 'A valid email and role are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const redirectTo = Deno.env.get('SITE_URL') || undefined
    const { data: inviteData, error: inviteError } =
      await context.admin.auth.admin.inviteUserByEmail(email.trim(), {
        data: { full_name: fullName || null },
        redirectTo,
      })

    if (inviteError) throw inviteError
    if (!inviteData.user) {
      throw new Error('Invite succeeded but no user was returned')
    }

    const { error: profileUpdateError } = await context.admin
      .from('user_profiles')
      .upsert({
        id: inviteData.user.id,
        role,
        full_name: fullName || null,
        approval_status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: context.user.id,
        updated_at: new Date().toISOString(),
      })

    if (profileUpdateError) throw profileUpdateError

    const fixedMemberships = [
      {
        project_id: '11111111-1111-1111-1111-111111111111',
        user_id: inviteData.user.id,
        role: 'viewer',
      },
      {
        project_id: '22222222-2222-2222-2222-222222222222',
        user_id: inviteData.user.id,
        role: 'viewer',
      },
    ]

    const { error: membershipError } = await context.admin
      .from('project_members')
      .upsert(fixedMemberships, { onConflict: 'project_id,user_id' })

    if (membershipError) throw membershipError

    return new Response(
      JSON.stringify({ user: inviteData.user, invited: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    const { status, message } = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
