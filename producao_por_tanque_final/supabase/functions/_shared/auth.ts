import {
  createClient,
  type SupabaseClient,
  type User,
} from 'jsr:@supabase/supabase-js@2'

export type GlobalRole =
  | 'admin'
  | 'director'
  | 'operations_manager'
  | 'supervisor'
  | 'petroleum_engineer'
  | 'regulation'
  | 'approver'
  | 'operator'
  | 'maintenance'

export type ProjectRole = 'owner' | 'editor' | 'viewer'

export type AuthContext = {
  admin: SupabaseClient
  user: User
  role: GlobalRole
}

export class RequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RequestError'
    this.status = status
  }
}

const requireEnvironmentVariable = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new RequestError(500, `Missing ${name}`)
  return value
}

const readBearerToken = (req: Request) => {
  const authorization = req.headers.get('Authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) throw new RequestError(401, 'Unauthorized')
  return match[1].trim()
}

export const requireAuthenticatedUser = async (
  req: Request,
): Promise<AuthContext> => {
  const token = readBearerToken(req)
  const admin = createClient(
    requireEnvironmentVariable('SUPABASE_URL'),
    requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY'),
  )

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)

  if (userError || !user) throw new RequestError(401, 'Unauthorized')

  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile || profile.approval_status !== 'active') {
    throw new RequestError(403, 'Account is not active')
  }

  return {
    admin,
    user,
    role: profile.role as GlobalRole,
  }
}

export const requireGlobalRole = (
  context: AuthContext,
  allowedRoles: GlobalRole[],
) => {
  if (!allowedRoles.includes(context.role)) {
    throw new RequestError(403, 'Forbidden')
  }
}

export const requireProjectAccess = async (
  context: AuthContext,
  projectId: string,
  allowedRoles: ProjectRole[] = ['owner', 'editor', 'viewer'],
) => {
  if (context.role === 'admin' || context.role === 'director') return

  const { data: directMembership, error: directError } = await context.admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (directError) throw directError
  if (
    directMembership &&
    allowedRoles.includes(directMembership.role as ProjectRole)
  ) {
    return
  }

  const { data: teamRoles, error: teamRolesError } = await context.admin
    .from('project_team_roles')
    .select('team_id, role')
    .eq('project_id', projectId)
    .in('role', allowedRoles)

  if (teamRolesError) throw teamRolesError

  const teamIds = (teamRoles || []).map((item) => item.team_id)
  if (teamIds.length > 0) {
    const { data: teamMembership, error: teamMembershipError } =
      await context.admin
        .from('team_members')
        .select('id')
        .eq('user_id', context.user.id)
        .in('team_id', teamIds)
        .limit(1)
        .maybeSingle()

    if (teamMembershipError) throw teamMembershipError
    if (teamMembership) return
  }

  throw new RequestError(403, 'Forbidden')
}

export const requireEntityProjectAccess = async (
  context: AuthContext,
  table: 'tanks' | 'srt_mobile_tanks',
  entityId: string,
  allowedRoles: ProjectRole[] = ['owner', 'editor', 'viewer'],
) => {
  const { data: entity, error } = await context.admin
    .from(table)
    .select('project_id')
    .eq('id', entityId)
    .maybeSingle()

  if (error) throw error
  if (!entity?.project_id) throw new RequestError(404, 'Resource not found')

  await requireProjectAccess(context, entity.project_id, allowedRoles)
}

export const getErrorResponseDetails = (error: unknown) => {
  if (error instanceof RequestError) {
    return { status: error.status, message: error.message }
  }

  console.error(error)
  return { status: 500, message: 'Internal server error' }
}
