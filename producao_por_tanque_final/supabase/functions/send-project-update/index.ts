import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  requireAuthenticatedUser,
  requireProjectAccess,
  RequestError,
} from '../_shared/auth.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    const { projectId, type, data } = await req.json()

    if (!projectId || !type) {
      throw new RequestError(400, 'Missing projectId or type')
    }

    await requireProjectAccess(context, projectId, ['owner', 'editor'])

    const { data: project, error: projectError } = await context.admin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new RequestError(404, 'Project not found')
    }

    const { data: members, error: membersError } = await context.admin
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)

    if (membersError) throw membersError

    const { data: projectTeams, error: projectTeamsError } = await context.admin
      .from('project_team_roles')
      .select('team_id')
      .eq('project_id', projectId)

    if (projectTeamsError) throw projectTeamsError

    const teamIds = (projectTeams || []).map((team: any) => team.team_id)
    let teamUserIds: string[] = []
    if (teamIds.length > 0) {
      const { data: teamMembers, error: teamMembersError } = await context.admin
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds)

      if (teamMembersError) throw teamMembersError
      teamUserIds = (teamMembers || []).map((member: any) => member.user_id)
    }

    const userIds = Array.from(
      new Set([
        ...(members || []).map((member: any) => member.user_id),
        ...teamUserIds,
      ]),
    )
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profiles, error: profilesError } = await context.admin
      .from('user_profiles')
      .select('id, email_notification_preferences')
      .in('id', userIds)

    if (profilesError) throw profilesError

    const {
      data: { users },
      error: usersError,
    } = await context.admin.auth.admin.listUsers({ perPage: 1000 })

    if (usersError) throw usersError

    const recipients = (profiles || [])
      .filter(
        (profile: any) =>
          profile.email_notification_preferences?.project_updates === true,
      )
      .map(
        (profile: any) => users.find((user) => user.id === profile.id)?.email,
      )
      .filter((email): email is string => Boolean(email))

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const projectName = escapeHtml(project.name)
    let subject = `Atualização no projeto: ${project.name}`
    let htmlContent = `<p>Olá,</p><p>Houve uma nova atualização no projeto <strong>${projectName}</strong>.</p>`

    if (type === 'operation') {
      subject = `Nova Operação - ${project.name}`
      htmlContent += `<p>Uma nova operação de <strong>${escapeHtml(data?.type)}</strong> foi registrada.</p>`
      if (data?.comments) {
        htmlContent += `<p>Comentários: ${escapeHtml(data.comments)}</p>`
      }
    } else if (type === 'report') {
      subject = `Relatório Atualizado - ${project.name}`
      htmlContent += `<p>Um relatório de produção para a data <strong>${escapeHtml(data?.reportDate)}</strong> foi ${data?.status === 'closed' ? 'fechado' : 'atualizado'}.</p>`
    } else if (type === 'alert') {
      subject = `ALERTA - ${project.name}`
      htmlContent += '<p>Alertas foram gerados:</p><ul>'
      if (Array.isArray(data)) {
        data.forEach((alert: any) => {
          htmlContent += `<li>${escapeHtml(alert?.message)}</li>`
        })
      } else {
        htmlContent += `<li>${escapeHtml(data?.message)}</li>`
      }
      htmlContent += '</ul>'
    } else {
      throw new RequestError(400, 'Unsupported notification type')
    }

    const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '')
    if (siteUrl) {
      htmlContent += `<p><a href="${siteUrl}/project/${encodeURIComponent(projectId)}/dashboard">Acesse o projeto aqui</a></p>`
    }

    if (RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'RTM NBS <noreply@resend.dev>',
          to: recipients,
          subject,
          html: htmlContent,
        }),
      })

      if (!response.ok) {
        console.error('Resend rejected project update email', response.status)
        throw new RequestError(502, 'Email provider rejected the message')
      }
    } else {
      console.warn('RESEND_API_KEY not set; project update email was skipped')
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: RESEND_API_KEY ? recipients.length : 0,
        delivery: RESEND_API_KEY ? 'sent' : 'skipped',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: unknown) {
    const details = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: details.message }), {
      status: details.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
