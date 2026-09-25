import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import {
  UserApprovalStatus,
  UserNotificationPreferences,
  UserProfile,
  UserRole,
} from '@/lib/types'

export const userService = {
  FIXED_PROJECT_IDS: {
    production: '11111111-1111-1111-1111-111111111111',
    maintenance: '22222222-2222-2222-2222-222222222222',
  },

  async listUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.rpc('list_users_with_profiles')

    if (error) throw error

    return (data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName || u.full_name,
      role: u.role as UserRole,
      approvalStatus: (u.approvalStatus ||
        u.approval_status ||
        'pending') as UserApprovalStatus,
      approvedAt: u.approvedAt || u.approved_at,
      approvedBy: u.approvedBy || u.approved_by,
      avatarUrl: u.avatarUrl || u.avatar_url,
      createdAt: u.createdAt || u.created_at,
      updatedAt: u.updatedAt || u.updated_at,
    }))
  },

  async createUser(
    email: string,
    role: UserRole,
    fullName: string,
    currentUserId: string,
  ) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error(
          'Sua sessao expirou. Faca login novamente para criar usuarios.',
        )
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, role, fullName },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        entity_type: 'user',
        entity_id: data.user?.id || 'new-user',
        operation_type: 'create_user',
        reason: `User created with role ${role} and name ${fullName}`,
        new_value: JSON.stringify({ email, role, fullName }),
      })

      return data
    } catch (error: any) {
      const maybeResponse =
        error instanceof FunctionsHttpError ? error.context : error?.context

      if (maybeResponse && typeof maybeResponse.json === 'function') {
        try {
          const response = await maybeResponse.json()
          if (response?.error) {
            throw new Error(response.error)
          }
        } catch (parseError) {
          if (parseError instanceof Error) {
            throw parseError
          }
          throw new Error(
            'A Edge Function retornou um erro ao criar o usuario.',
          )
        }
      }

      throw error
    }
  },

  async updateUserRole(userId: string, role: UserRole, currentUserId: string) {
    // Deprecated in favor of updateUserProfile but kept for compatibility
    await this.updateUserProfile(userId, role, undefined, currentUserId)
  },

  async updateUserProfile(
    userId: string,
    role: UserRole,
    fullName: string | undefined,
    currentUserId: string,
  ) {
    // Get old data first for audit
    const { data: oldUser } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single()

    const updates: any = {
      role,
      updated_at: new Date().toISOString(),
    }

    if (fullName !== undefined) {
      updates.full_name = fullName
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: currentUserId,
      entity_type: 'user',
      entity_id: userId,
      operation_type: 'update_user_profile',
      reason: 'User profile update',
      old_value: JSON.stringify(oldUser),
      new_value: JSON.stringify(updates),
    })
  },

  async deleteUser(userId: string, currentUserId: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error(
          'Sua sessao expirou. Faca login novamente para excluir usuarios.',
        )
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        entity_type: 'user',
        entity_id: userId,
        operation_type: 'delete_user',
        reason: 'User deletion',
      })
    } catch (error: any) {
      const maybeResponse =
        error instanceof FunctionsHttpError ? error.context : error?.context

      if (maybeResponse && typeof maybeResponse.json === 'function') {
        try {
          const response = await maybeResponse.json()
          const message = response?.error || ''

          if (
            message.toLowerCase().includes('not found') ||
            message.toLowerCase().includes('user not found')
          ) {
            return
          }

          if (message) {
            throw new Error(message)
          }
        } catch (parseError) {
          if (parseError instanceof Error) {
            throw parseError
          }
        }
      }

      if (
        typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('not found')
      ) {
        return
      }

      throw error
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) return null

    return {
      id: data.id,
      role: data.role as UserRole,
      approvalStatus: (data.approval_status || 'pending') as UserApprovalStatus,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      emailNotificationPreferences: data.email_notification_preferences as any,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  async approveUserAccount(userId: string, currentUserId: string) {
    const updates = {
      approval_status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: currentUserId,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error

    const memberships = [
      {
        project_id: this.FIXED_PROJECT_IDS.production,
        user_id: userId,
        role: 'viewer' as const,
      },
      {
        project_id: this.FIXED_PROJECT_IDS.maintenance,
        user_id: userId,
        role: 'viewer' as const,
      },
    ]

    const { error: membershipError } = await supabase
      .from('project_members')
      .upsert(memberships, { onConflict: 'project_id,user_id' })

    if (membershipError) throw membershipError

    await supabase.from('audit_logs').insert({
      user_id: currentUserId,
      entity_type: 'user',
      entity_id: userId,
      operation_type: 'update_user_profile',
      reason: 'Aprovacao de conta solicitada por usuario',
      new_value: JSON.stringify(updates),
    })
  },

  async rejectUserAccount(userId: string, currentUserId: string) {
    const updates = {
      approval_status: 'rejected',
      approved_at: null,
      approved_by: currentUserId,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: currentUserId,
      entity_type: 'user',
      entity_id: userId,
      operation_type: 'update_user_profile',
      reason: 'Rejeicao de conta solicitada por usuario',
      new_value: JSON.stringify(updates),
    })
  },

  async updatePreferences(
    userId: string,
    preferences: UserNotificationPreferences,
  ) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ email_notification_preferences: preferences as any })
      .eq('id', userId)

    if (error) throw error
  },

  async uploadAvatar(userId: string, file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Selecione um arquivo de imagem valido.')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('A imagem deve ter no maximo 5 MB.')
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `avatar-${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (dbError) throw dbError

    return publicUrl
  },

  async removeAvatar(userId: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ avatar_url: null })
      .eq('id', userId)

    if (error) throw error
  },
}
