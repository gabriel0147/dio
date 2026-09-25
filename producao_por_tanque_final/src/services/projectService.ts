import { supabase } from '@/lib/supabase/client'
import { DbTank } from '@/lib/db-types'
import {
  Project,
  ProjectScope,
  Tank,
  ProductionField,
  Well,
  TransferDestinationCategory,
  ProjectMember,
  ProjectRole,
  ProjectTeamRole,
  ProjectHubSummary,
} from '@/lib/types'
import { auditService } from './auditService'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'

export const projectService = {
  // ... existing methods ...
  async getProjects(userId?: string, userRole?: string): Promise<Project[]> {
    if (!userId) return []

    try {
      let uniqueProjects: any[] = []

      // If Admin or Director, fetch all projects directly
      if (userRole === 'admin' || userRole === 'director') {
        const { data: allProjects, error } = await supabase
          .from('projects')
          .select(
            'id, name, description, logo_url, module_type, project_scope, created_at, updated_at',
          )
          .order('created_at', { ascending: false })

        if (error) throw error

        // Admins/Directors effectively have 'owner' permissions on all projects
        uniqueProjects = allProjects.map((p) => ({ ...p, role: 'owner' }))
      } else {
        // Standard flow: fetch projects based on membership
        const [directMembersResponse, teamMembersResponse] = await Promise.all([
          supabase
            .from('project_members')
            .select(
              `
            role,
            project:projects (
              id,
              name,
              description,
              logo_url,
              module_type,
              project_scope,
              created_at,
              updated_at
            )
          `,
            )
            .eq('user_id', userId),
          supabase.from('team_members').select('team_id').eq('user_id', userId),
        ])

        if (directMembersResponse.error) throw directMembersResponse.error
        if (teamMembersResponse.error) throw teamMembersResponse.error

        const teamIds = teamMembersResponse.data?.map((tm) => tm.team_id) || []

        let teamProjects: any[] = []
        if (teamIds.length > 0) {
          const { data: teamRoles, error: teamRolesError } = await supabase
            .from('project_team_roles')
            .select(
              `
            role,
            project:projects (
              id,
              name,
              description,
              logo_url,
              module_type,
              project_scope,
              created_at,
              updated_at
            )
          `,
            )
            .in('team_id', teamIds)

          if (teamRolesError) throw teamRolesError
          if (teamRoles) teamProjects = teamRoles
        }

        const projectMap = new Map<string, any>()

        directMembersResponse.data?.forEach((m: any) => {
          if (m.project) {
            projectMap.set(m.project.id, { ...m.project, role: m.role })
          }
        })

        const rolePriority = { owner: 3, editor: 2, viewer: 1 }

        teamProjects.forEach((tp: any) => {
          if (tp.project) {
            const existing = projectMap.get(tp.project.id)
            const newRoleVal =
              rolePriority[tp.role as keyof typeof rolePriority] || 0
            const existingRoleVal = existing
              ? rolePriority[existing.role as keyof typeof rolePriority] || 0
              : 0

            if (!existing || newRoleVal > existingRoleVal) {
              projectMap.set(tp.project.id, { ...tp.project, role: tp.role })
            }
          }
        })

        uniqueProjects = Array.from(projectMap.values())
        uniqueProjects.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        )
      }

      const projectIds = uniqueProjects.map((p) => p.id)
      if (projectIds.length === 0) return []

      const { data: tanksData, error: tanksError } = await supabase
        .from('tanks')
        .select(`*, production_field:production_fields(*), well:wells(*)`)
        .in('project_id', projectIds)
        .order('tag', { ascending: true })

      if (tanksError) throw tanksError

      const tanks = tanksData as unknown as DbTank[]

      return uniqueProjects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        logoUrl: p.logo_url || null,
        role: p.role,
        moduleType: p.module_type || null,
        projectScope: p.project_scope || 'production',
        tanks: (tanks || [])
          .filter((t: DbTank) => t.project_id === p.id)
          .map((t: DbTank) => ({
            id: t.id,
            tag: t.tag,
            productionField: t.production_field?.name || 'Desconhecido',
            productionFieldId: t.production_field_id,
            wellName: t.well?.name,
            wellId: t.well_id || undefined,
            geolocation: t.geolocation || '',
            sheets: [
              {
                id: `prod-${t.id}`,
                name: 'Registro de Operações',
                type: 'production',
              },
              {
                id: `check-${t.id}`,
                name: 'Checklist Operacional',
                type: 'checklist',
              },
              {
                id: `cal-${t.id}`,
                name: 'Tabela Arqueação',
                type: 'calibration',
              },
              { id: `seal-${t.id}`, name: 'Registro de Lacres', type: 'seal' },
              {
                id: `reports-${t.id}`,
                name: 'Relatórios Consolidados',
                type: 'reports',
              },
            ],
          })),
      })) as Project[]
    } catch (error: any) {
      console.error(`FATAL ERROR in getProjects execution:`, error)
      throw error
    }
  },

  async createProject(
    name: string,
    description: string,
    userId: string,
    projectScope: ProjectScope,
  ): Promise<any> {
    const projectId = uuidv4()

    const { error } = await supabase.from('projects').insert({
      id: projectId,
      name,
      description,
      created_by: userId,
      module_type: null,
      project_scope: projectScope,
    } as any)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'project',
      entityId: projectId,
      operationType: 'insert',
      reason: 'Criação de projeto',
      newValue: name,
      projectId,
    })

    return {
      id: projectId,
      name,
      description,
      created_by: userId,
      module_type: null,
      project_scope: projectScope,
    }
  },

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) throw error

    await auditService.createLog({
      userId,
      entityType: 'project',
      entityId: projectId,
      operationType: 'delete',
      reason: 'Exclusão de projeto',
    })
  },

  async uploadProjectLogo(
    projectId: string,
    file: File,
    userId: string,
  ): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('O logo do projeto deve ser uma imagem.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('O logo do projeto deve ter no máximo 5 MB.')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `project-${uuidv4()}.${fileExt}`
    // The project id is the first folder so Storage RLS can authorize the write.
    const filePath = `${projectId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('project-logos')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('project-logos')
      .getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    const { error: dbError } = await supabase
      .from('projects')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', projectId)

    if (dbError) throw dbError

    await auditService.createLog({
      userId,
      projectId,
      entityType: 'project',
      entityId: projectId,
      operationType: 'update_project_logo',
      newValue: publicUrl,
      reason: 'Upload de logo do projeto',
    })

    return publicUrl
  },

  async removeProjectLogo(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', projectId)

    if (error) throw error

    await auditService.createLog({
      userId,
      projectId,
      entityType: 'project',
      entityId: projectId,
      operationType: 'update_project_logo',
      newValue: 'NULL',
      reason: 'Remoção de logo do projeto',
    })
  },

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const { data: members, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const { data: allUsers, error: usersError } = await supabase.rpc(
      'list_users_with_profiles',
    )
    if (usersError) throw usersError

    // Fetch avatars
    const userIds = members.map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, avatar_url')
      .in('id', userIds)

    return members.map((m: any) => {
      const userProfile = allUsers?.find((u: any) => u.id === m.user_id)
      const profile = profiles?.find((p: any) => p.id === m.user_id)
      return {
        id: m.id,
        projectId: m.project_id,
        userId: m.user_id,
        email: userProfile?.email || 'Email not found',
        avatarUrl: profile?.avatar_url || null,
        role: m.role,
        createdAt: m.created_at,
      }
    })
  },

  async inviteMember(
    projectId: string,
    email: string,
    userId: string,
  ): Promise<void> {
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { projectId, email },
    })

    if (error) {
      let errorMessage = error.message || 'Erro ao convidar membro.'

      // Try to extract detailed message from function response if available
      if (typeof error === 'object' && 'context' in error) {
        const context = (error as any).context
        if (
          context &&
          typeof context === 'object' &&
          typeof context.json === 'function'
        ) {
          try {
            const body = await context.json()
            if (body && body.error) {
              errorMessage = body.error
            }
          } catch {
            // fallback to error.message
          }
        }
      }

      throw new Error(errorMessage)
    }

    if (data?.error) throw new Error(data.error)

    await auditService.createLog({
      userId,
      projectId,
      entityType: 'project_member',
      entityId: projectId,
      operationType: 'add_member',
      newValue: email,
      reason: 'Convite de colaborador',
    })
  },

  async updateMemberRole(
    memberId: string,
    role: ProjectRole,
    userId: string,
  ): Promise<void> {
    const { data: member } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('id', memberId)
      .single()

    const { error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('id', memberId)

    if (error) throw error

    await auditService.createLog({
      userId,
      projectId: member?.project_id,
      entityType: 'project_member',
      entityId: memberId,
      operationType: 'update_member_role',
      newValue: role,
      reason: 'Atualização de permissão',
    })
  },

  async removeMember(memberId: string, userId: string): Promise<void> {
    const { data: member } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('id', memberId)
      .single()

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)

    if (error) throw error

    await auditService.createLog({
      userId,
      projectId: member?.project_id,
      entityType: 'project_member',
      entityId: memberId,
      operationType: 'remove_member',
      reason: 'Remoção de colaborador',
    })
  },

  async getProjectTeams(projectId: string): Promise<ProjectTeamRole[]> {
    const { data, error } = await supabase
      .from('project_team_roles')
      .select(`*, team:teams(name)`)
      .eq('project_id', projectId)

    if (error) throw error

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      teamId: d.team_id,
      role: d.role,
      teamName: d.team?.name,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  },

  async assignTeamToProject(
    projectId: string,
    teamId: string,
    role: ProjectRole,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase.from('project_team_roles').insert({
      project_id: projectId,
      team_id: teamId,
      role,
    })

    if (error) throw error

    await auditService.createLog({
      userId,
      projectId,
      entityType: 'project_team_role',
      entityId: teamId,
      operationType: 'assign_team_to_project',
      reason: 'Atribuição de time ao projeto',
      newValue: role,
    })
  },

  async updateTeamProjectRole(
    id: string,
    role: ProjectRole,
    userId: string,
  ): Promise<void> {
    const { data } = await supabase
      .from('project_team_roles')
      .select('project_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('project_team_roles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      projectId: data?.project_id,
      entityType: 'project_team_role',
      entityId: id,
      operationType: 'update_project_team_role',
      reason: 'Atualização de permissão de time',
      newValue: role,
    })
  },

  async removeTeamFromProject(id: string, userId: string): Promise<void> {
    const { data } = await supabase
      .from('project_team_roles')
      .select('project_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('project_team_roles')
      .delete()
      .eq('id', id)

    if (error) throw error

    await auditService.createLog({
      userId,
      projectId: data?.project_id,
      entityType: 'project_team_role',
      entityId: id,
      operationType: 'remove_team_from_project',
      reason: 'Remoção de time do projeto',
    })
  },

  async createTank(
    projectId: string,
    tank: Omit<Tank, 'id' | 'sheets'>,
  ): Promise<DbTank> {
    const { data, error } = await supabase
      .from('tanks')
      .insert({
        project_id: projectId,
        tag: tank.tag,
        production_field_id: tank.productionFieldId,
        well_id: tank.wellId || null,
        geolocation: tank.geolocation,
      } as any)
      .select()
      .single()
    if (error) throw error
    return data as unknown as DbTank
  },

  async updateTank(
    tankId: string,
    updates: any,
    reason: string,
    userId: string,
  ): Promise<void> {
    // 1. Fetch old value
    const { data: oldTank, error: fetchError } = await supabase
      .from('tanks')
      .select('*')
      .eq('id', tankId)
      .single()

    if (fetchError) throw fetchError

    // 2. Update and get new value
    const { data: newTank, error: updateError } = await supabase
      .from('tanks')
      .update({
        tag: updates.tag,
        production_field_id: updates.productionFieldId,
        well_id: updates.wellId,
        geolocation: updates.geolocation,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', tankId)
      .select()
      .single()

    if (updateError) throw updateError

    // 3. Log
    await auditService.createLog({
      userId,
      projectId: oldTank?.project_id,
      entityType: 'tanks',
      entityId: tankId,
      operationType: 'UPDATE',
      oldValue: JSON.stringify(oldTank),
      newValue: JSON.stringify(newTank),
      reason,
    })
  },

  async deleteTank(tankId: string, userId: string): Promise<void> {
    const { data: tank, error: fetchError } = await supabase
      .from('tanks')
      .select('project_id, tag')
      .eq('id', tankId)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase.from('tanks').delete().eq('id', tankId)
    if (error) throw error

    await auditService.createLog({
      userId,
      projectId: tank.project_id,
      entityType: 'tanks',
      entityId: tankId,
      operationType: 'delete',
      reason: `Exclusão do tanque ${tank.tag}`,
      oldValue: JSON.stringify(tank),
    })
  },

  async getProductionFields(projectId?: string): Promise<ProductionField[]> {
    let query = supabase.from('production_fields').select('*').order('name')
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`)
    }
    const { data, error } = await query
    if (error) throw error
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      projectId: d.project_id,
    }))
  },

  async createProductionField(
    name: string,
    userId: string,
    projectId?: string,
  ): Promise<ProductionField> {
    const { data, error } = await supabase
      .from('production_fields')
      .insert({ name, project_id: projectId || null })
      .select()
      .single()
    if (error) throw error
    await auditService.createLog({
      userId,
      projectId,
      entityType: 'production_field',
      entityId: data.id,
      operationType: 'insert',
      newValue: name,
      reason: 'Criação de campo de produção',
    })
    return { id: data.id, name: data.name, projectId: data.project_id }
  },

  async updateProductionField(
    id: string,
    name: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('production_fields')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'production_field',
      entityId: id,
      operationType: 'update',
      newValue: name,
      reason: 'Atualização de campo de produção',
    })
  },

  async deleteProductionField(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('production_fields')
      .delete()
      .eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'production_field',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de campo de produção',
    })
  },

  async getWells(projectId?: string): Promise<Well[]> {
    let allowedProductionFieldIds: string[] | null = null

    if (projectId) {
      const { data: fields, error: fieldsError } = await supabase
        .from('production_fields')
        .select('id')
        .or(`project_id.eq.${projectId},project_id.is.null`)

      if (fieldsError) throw fieldsError

      allowedProductionFieldIds = (fields || []).map((field: any) => field.id)
      if (allowedProductionFieldIds.length === 0) return []
    }

    let query = supabase
      .from('wells')
      .select('id, name, short_name, production_field_id')
      .order('name')

    if (allowedProductionFieldIds) {
      query = query.in('production_field_id', allowedProductionFieldIds)
    }

    const { data, error } = await query
    if (error) throw error
    return data.map((w: any) => ({
      id: w.id,
      name: w.name,
      shortName: w.short_name,
      productionFieldId: w.production_field_id,
    }))
  },

  async createWell(
    name: string,
    productionFieldId: string,
    userId: string,
    shortName?: string,
  ): Promise<Well> {
    const { data, error } = await supabase
      .from('wells')
      .insert({
        name,
        production_field_id: productionFieldId,
        short_name: shortName,
      })
      .select()
      .single()
    if (error) throw error
    await auditService.createLog({
      userId,
      entityType: 'well',
      entityId: data.id,
      operationType: 'insert',
      newValue: name,
      reason: 'Criação de poço',
    })
    return {
      id: data.id,
      name: data.name,
      shortName: data.short_name,
      productionFieldId: data.production_field_id,
    }
  },

  async deleteWell(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('wells').delete().eq('id', id)
    if (error) {
      if (
        error.code === '23503' ||
        error.message?.includes('foreign key constraint')
      ) {
        throw new Error(
          'Não é possível excluir este poço porque ele possui registros vinculados, como testes SRT. Remova ou reatribua esses registros antes de excluir o poço.',
        )
      }
      throw error
    }
    await auditService.createLog({
      userId,
      entityType: 'well',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de poço',
    })
  },

  async getTransferDestinationCategories(
    projectIds?: string[],
  ): Promise<TransferDestinationCategory[]> {
    let query = supabase
      .from('transfer_destination_categories')
      .select('*')
      .order('name')

    if (projectIds && projectIds.length > 0) {
      const idsString = projectIds.join(',')
      query = query.or(`project_id.is.null,project_id.in.(${idsString})`)
    }

    const { data, error } = await query
    if (error) throw error
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      projectId: c.project_id,
    }))
  },

  async createTransferDestinationCategory(
    name: string,
    userId: string,
    projectId?: string | null,
  ): Promise<TransferDestinationCategory> {
    const { data, error } = await supabase
      .from('transfer_destination_categories')
      .insert({ project_id: projectId || null, name })
      .select()
      .single()
    if (error) throw error
    await auditService.createLog({
      userId,
      projectId: projectId || undefined,
      entityType: 'transfer_category',
      entityId: data.id,
      operationType: 'insert',
      newValue: name,
      reason: 'Criação de categoria de destino',
    })
    return { id: data.id, name: data.name, projectId: data.project_id }
  },

  async updateTransferDestinationCategory(
    id: string,
    name: string,
    userId: string,
  ): Promise<void> {
    const { data } = await supabase
      .from('transfer_destination_categories')
      .select('project_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('transfer_destination_categories')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      projectId: data?.project_id,
      entityType: 'transfer_category',
      entityId: id,
      operationType: 'update',
      newValue: name,
      reason: 'Atualização de categoria de destino',
    })
  },

  async deleteTransferDestinationCategory(
    id: string,
    userId: string,
  ): Promise<void> {
    const { data } = await supabase
      .from('transfer_destination_categories')
      .select('project_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('transfer_destination_categories')
      .delete()
      .eq('id', id)
    if (error) throw error
    await auditService.createLog({
      userId,
      projectId: data?.project_id,
      entityType: 'transfer_category',
      entityId: id,
      operationType: 'delete',
      reason: 'Exclusão de categoria de destino',
    })
  },

  async clearProjectData(projectId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke(
      'clear-project-data',
      { body: { projectId } },
    )
    if (error) throw error
    if (data && data.error) throw new Error(data.error)
  },

  async getProjectHubSummary(projectId: string): Promise<ProjectHubSummary> {
    // 1. Assets Count (SBP)
    const { count: assetsCount, error: assetsError } = await supabase
      .from('sbp_assets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (assetsError) {
      console.error('Error fetching assets count for hub:', assetsError)
    }

    // 2. Open Events Count (Maintenance)
    const { count: openEventsCount, error: eventsError } = await supabase
      .from('sgpa_events')
      .select(
        '*, well:wells!inner(production_field:production_fields!inner(project_id))',
        { count: 'exact', head: true },
      )
      .eq('well.production_field.project_id', projectId)
      .eq('status', 'OPEN')

    if (eventsError) {
      console.error('Error fetching events count for hub:', eventsError)
    }

    // 3. Production Reports Status (Production)
    // Get total reports for today or recent
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: reports, error: reportsError } = await supabase
      .from('daily_production_reports')
      .select('status, tank:tanks!inner(project_id)')
      .eq('tank.project_id', projectId)
      .eq('report_date', today)

    if (reportsError) {
      console.error('Error fetching reports status for hub:', reportsError)
    }

    const closed = reports?.filter((r) => r.status === 'closed').length || 0
    const draft = reports?.filter((r) => r.status === 'draft').length || 0

    return {
      activeAssetsCount: assetsCount || 0,
      openEventsCount: openEventsCount || 0,
      productionReportsStatus: {
        total: reports?.length || 0,
        closed,
        draft,
      },
    }
  },
}
