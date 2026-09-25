import { useState, useEffect, useCallback } from 'react'
import { useProject } from '@/context/ProjectContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, UserPlus, Shield, Users } from 'lucide-react'
import { ProjectRole, Team, ProjectTeamRole } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { teamService } from '@/services/teamService'
import { projectService } from '@/services/projectService'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function CollaboratorManager() {
  const {
    currentProject,
    currentProjectRole,
    members,
    isLoadingMembers,
    fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useProject()
  const { user, role: userGlobalRole } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  // Teams Logic
  const [projectTeams, setProjectTeams] = useState<ProjectTeamRole[]>([])
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedTeamRole, setSelectedTeamRole] =
    useState<ProjectRole>('viewer')
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)

  const isGlobalAdmin =
    userGlobalRole === 'admin' || userGlobalRole === 'director'
  const isOwner = currentProjectRole === 'owner' || isGlobalAdmin

  const fetchProjectTeams = useCallback(async () => {
    if (!currentProject) return
    try {
      const data = await projectService.getProjectTeams(currentProject.id)
      setProjectTeams(data)
    } catch (e) {
      console.error(e)
    }
  }, [currentProject])

  const fetchAvailableTeams = useCallback(async () => {
    if (!user) return
    try {
      const data = await teamService.getTeams(user.id)
      setAvailableTeams(data)
    } catch (e) {
      console.error(e)
    }
  }, [user])

  useEffect(() => {
    if (currentProject) {
      fetchMembers()
      fetchProjectTeams()
      if (isOwner && user) {
        fetchAvailableTeams()
      }
    }
  }, [
    currentProject,
    fetchMembers,
    user,
    isOwner,
    fetchProjectTeams,
    fetchAvailableTeams,
  ])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    try {
      await inviteMember(inviteEmail.trim())
      setInviteEmail('')
    } catch (error) {
      // Error is already toasted in context, but we catch here to avoid unhandled rejection in component
      console.error('Failed to invite member:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
    const member = members.find((m) => m.id === memberId)
    if (member && member.userId === user?.id && newRole !== 'owner') {
      if (
        !confirm('Você está removendo seu acesso de Proprietário. Tem certeza?')
      )
        return
    }
    await updateMemberRole(memberId, newRole)
  }

  const handleRemove = async (memberId: string) => {
    if (
      confirm('Tem certeza que deseja remover este colaborador do projeto?')
    ) {
      await removeMember(memberId)
    }
  }

  const handleAddTeam = async () => {
    if (!currentProject || !user || !selectedTeamId) return
    setIsLoadingTeams(true)
    try {
      await projectService.assignTeamToProject(
        currentProject.id,
        selectedTeamId,
        selectedTeamRole,
        user.id,
      )
      toast.success('Time adicionado ao projeto.')
      fetchProjectTeams()
      setSelectedTeamId('')
    } catch (e: any) {
      toast.error('Erro ao adicionar time: ' + e.message)
    } finally {
      setIsLoadingTeams(false)
    }
  }

  const handleUpdateTeamRole = async (id: string, role: ProjectRole) => {
    if (!user) return
    try {
      await projectService.updateTeamProjectRole(id, role, user.id)
      fetchProjectTeams()
      toast.success('Permissão do time atualizada.')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleRemoveTeam = async (id: string) => {
    if (!user) return
    if (!confirm('Remover este time do projeto?')) return
    try {
      await projectService.removeTeamFromProject(id, user.id)
      fetchProjectTeams()
      toast.success('Time removido.')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (!currentProject) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Colaboradores do Projeto</CardTitle>
            <CardDescription>
              Gerencie quem tem acesso ao projeto {currentProject.name}.
            </CardDescription>
          </div>
          {isOwner && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              {isGlobalAdmin ? 'Administrador Global' : 'Você é Proprietário'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Usuários Individuais</TabsTrigger>
            <TabsTrigger value="teams">Times</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {isOwner && (
              <div className="flex gap-4 items-end bg-muted/20 p-4 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">
                    Convidar Colaborador
                  </label>
                  <Input
                    placeholder="email@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                </div>
                <Button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim()}
                >
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Convidar
                </Button>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    {isOwner && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMembers ? (
                    <TableRow>
                      <TableCell
                        colSpan={isOwner ? 5 : 4}
                        className="h-24 text-center"
                      >
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isOwner ? 5 : 4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum membro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatarUrl || ''} />
                              <AvatarFallback>
                                {member.email?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {member.userId === user?.id && (
                              <span className="text-xs text-muted-foreground">
                                (Você)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          {isOwner ? (
                            <Select
                              value={member.role}
                              onValueChange={(val: ProjectRole) =>
                                handleRoleChange(member.id, val)
                              }
                              disabled={
                                member.userId === user?.id &&
                                members.filter((m) => m.role === 'owner')
                                  .length === 1
                              }
                            >
                              <SelectTrigger className="w-[130px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">
                                  Proprietário
                                </SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">
                                  Visualizador
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="capitalize">
                              {member.role === 'owner'
                                ? 'Proprietário'
                                : member.role === 'editor'
                                  ? 'Editor'
                                  : 'Visualizador'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </TableCell>
                        {isOwner && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(member.id)}
                              disabled={member.userId === user?.id}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            {isOwner && (
              <div className="flex gap-4 items-end bg-muted/20 p-4 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Adicionar Time</label>
                  <Select
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um time" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px] space-y-2">
                  <label className="text-sm font-medium">Função</label>
                  <Select
                    value={selectedTeamRole}
                    onValueChange={(v: ProjectRole) => setSelectedTeamRole(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddTeam}
                  disabled={isLoadingTeams || !selectedTeamId}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Função no Projeto</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    {isOwner && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTeams.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isOwner ? 4 : 3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum time associado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectTeams.map((pt) => (
                      <TableRow key={pt.id}>
                        <TableCell className="font-medium">
                          {pt.teamName}
                        </TableCell>
                        <TableCell>
                          {isOwner ? (
                            <Select
                              value={pt.role}
                              onValueChange={(val: ProjectRole) =>
                                handleUpdateTeamRole(pt.id, val)
                              }
                            >
                              <SelectTrigger className="w-[130px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">
                                  Visualizador
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{pt.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(pt.createdAt).toLocaleDateString()}
                        </TableCell>
                        {isOwner && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTeam(pt.id)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {!isOwner && (
          <p className="text-sm text-muted-foreground text-center bg-muted/20 p-2 rounded mt-4">
            Você tem permissão de{' '}
            <strong>
              {currentProjectRole === 'editor' ? 'Editor' : 'Visualizador'}
            </strong>{' '}
            neste projeto. Apenas proprietários podem gerenciar colaboradores e
            times.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
