import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  getErrorResponseDetails,
  RequestError,
  requireAuthenticatedUser,
  requireProjectAccess,
} from '../_shared/auth.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] || character,
  )

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const context = await requireAuthenticatedUser(req)
    const { projectId, email } = await req.json()

    if (typeof projectId !== 'string' || typeof email !== 'string') {
      throw new RequestError(400, 'Missing projectId or email')
    }

    await requireProjectAccess(context, projectId, ['owner'])

    const { data: project, error: projectError } = await context.admin
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) throw projectError
    if (!project) throw new RequestError(404, 'Project not found')

    const normalizedEmail = email.trim().toLowerCase()
    const {
      data: { users },
      error: listError,
    } = await context.admin.auth.admin.listUsers({ perPage: 1000 })

    if (listError) throw listError
    const targetUser = users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    )
    if (!targetUser) {
      throw new RequestError(
        404,
        'O usuario deve estar cadastrado na Gestao Global de Usuarios antes de ser adicionado a um projeto.',
      )
    }

    const { data: targetProfile, error: targetProfileError } =
      await context.admin
        .from('user_profiles')
        .select('approval_status')
        .eq('id', targetUser.id)
        .maybeSingle()

    if (targetProfileError) throw targetProfileError
    if (targetProfile?.approval_status !== 'active') {
      throw new RequestError(409, 'A conta convidada ainda nao esta ativa.')
    }

    const { data: newMember, error: insertError } = await context.admin
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: targetUser.id,
        role: 'viewer',
      })
      .select()
      .single()

    if (insertError?.code === '23505') {
      throw new RequestError(409, 'O usuario ja e membro deste projeto.')
    }
    if (insertError) throw insertError

    let emailDelivered = false
    if (RESEND_API_KEY) {
      const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '')
      const projectUrl = `${siteUrl}/project/${projectId}/dashboard`
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'RTM NBS <noreply@resend.dev>',
          to: [normalizedEmail],
          subject: `Convite para o projeto: ${project.name}`,
          html: `
            <p>Ola,</p>
            <p>Voce foi convidado por <strong>${escapeHtml(context.user.email || '')}</strong> para colaborar no projeto <strong>${escapeHtml(project.name)}</strong>.</p>
            <p><a href="${escapeHtml(projectUrl)}">Acessar projeto</a></p>
          `,
        }),
      })

      if (!response.ok) {
        const details = await response.text()
        console.error('Resend invitation failed:', response.status, details)
      } else {
        emailDelivered = true
      }
    }

    return new Response(
      JSON.stringify({ success: true, member: newMember, emailDelivered }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    const { status, message } = getErrorResponseDetails(error)
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
