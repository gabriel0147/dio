import { supabase } from '@/lib/supabase/client'
import { Team, TeamMember, TeamRole } from '@/lib/types'
import { auditService } from './auditService'

export const teamService = {
  async getTeams(userId: string): Promise<Team[]> {
    const [
      { data: ownedTeams, error: ownedError },
      { data: memberships, error: membershipsError },
    ] = await Promise.all([
      supabase
        .from('teams')
        .select('*')
        .eq('owner_user_id', userId)
        .order('name', { ascending: true }),
      supabase.from('team_members').select('team_id').eq('user_id', userId),
    ])

    if (ownedError) throw ownedError
    if (membershipsError) throw membershipsError

    const memberTeamIds = (memberships || []).map(
      (membership: any) => membership.team_id,
    )
    let memberTeams: any[] = []

    if (memberTeamIds.length > 0) {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .in('id', memberTeamIds)
        .order('name', { ascending: true })

      if (error) throw error
      memberTeams = data || []
    }

    const uniqueTeams = new Map<string, any>()
    ;[...(ownedTeams || []), ...memberTeams].forEach((team: any) => {
      uniqueTeams.set(team.id, team)
    })

    return Array.from(uniqueTeams.values()).map((d: any) => ({
      id: d.id,
      name: d.name,
      ownerUserId: d.owner_user_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async createTeam(name: string, userId: string): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert({ name, owner_user_id: userId })
      .select()
      .single()

    if (error) throw error

    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: data.id,
      user_id: userId,
      role: 'team_admin',
    })

    if (memberError && memberError.code !== '23505') throw memberError

    await auditService.createLog({
      userId,
      entityType: 'team',
      entityId: data.id,
      operationType: 'create_team',
      reason: 'Criação de time',
      newValue: name,
    })

    return {
      id: data.id,
      name: data.name,
      ownerUserId: data.owner_user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async updateTeam(id: string, name: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'team',
      entityId: id,
      operationType: 'update_team',
      reason: 'Atualização de nome do time',
      newValue: name,
    })
  },

  async deleteTeam(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'team',
      entityId: id,
      operationType: 'delete_team',
      reason: 'Exclusão de time',
    })
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)

    if (error) throw error

    const { data: allUsers, error: usersError } =
      await supabase.rpc('list_users_with_profiles')
    if (usersError) throw usersError

    // Fetch user profiles for avatars
    const userIds = members.map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, avatar_url')
      .in('id', userIds)

    return members.map((m: any) => {
      const user = allUsers?.find((u: any) => u.id === m.user_id)
      const profile = profiles?.find((p: any) => p.id === m.user_id)
      return {
        id: m.id,
        teamId: m.team_id,
        userId: m.user_id,
        role: m.role,
        email: user?.email,
        avatarUrl: profile?.avatar_url || null,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }
    })
  },

  async addMember(
    teamId: string,
    email: string,
    role: TeamRole,
    userId: string,
  ): Promise<void> {
    // Look up user by email
    const { data: users, error: listError } =
      await supabase.rpc('list_users_with_profiles')
    if (listError) throw listError

    const targetUser = users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
    )

    if (!targetUser) {
      throw new Error('Usuário não encontrado com este email.')
    }

    const { error } = await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: targetUser.id,
      role,
    })

    if (error) {
      if (error.code === '23505') {
        throw new Error('Usuário já é membro deste time.')
      }
      throw error
    }

    await auditService.createLog({
      userId,
      entityType: 'team_member',
      entityId: teamId, // logging team as entity context
      operationType: 'add_team_member',
      reason: 'Adição de membro ao time',
      newValue: `${email} (${role})`,
    })
  },

  async removeMember(
    teamId: string,
    memberUserId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberUserId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'team_member',
      entityId: teamId,
      operationType: 'remove_team_member',
      reason: 'Remoção de membro do time',
      oldValue: memberUserId,
    })
  },

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('owner_user_id')
      .eq('id', teamId)
      .single()

    if (teamError) throw teamError

    if (team.owner_user_id === userId) {
      throw new Error('O criador do time não pode sair dele.')
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'team_member',
      entityId: teamId,
      operationType: 'remove_team_member',
      reason: 'Saída voluntária do time',
      oldValue: userId,
    })
  },

  async updateMemberRole(
    teamId: string,
    memberUserId: string,
    role: TeamRole,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('user_id', memberUserId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'team_member',
      entityId: teamId,
      operationType: 'update_team_member_role',
      reason: 'Atualização de função no time',
      newValue: role,
    })
  },
}
