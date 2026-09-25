import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { teamService } from '@/services/teamService'
import { Team } from '@/lib/types'
import { toast } from 'sonner'
import { TeamList } from '@/components/teams/TeamList'
import { TeamDialog } from '@/components/teams/TeamDialog'
import { TeamMembersDialog } from '@/components/teams/TeamMembersDialog'

export default function Teams() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(
    null,
  )

  const fetchTeams = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await teamService.getTeams(user.id)
      setTeams(data)
    } catch (e: any) {
      toast.error('Erro ao carregar times: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleCreate = () => {
    setEditingTeam(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (team: Team) => {
    setEditingTeam(team)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Excluir este time?')) return
    try {
      await teamService.deleteTeam(id, user.id)
      toast.success('Time excluído.')
      fetchTeams()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleLeave = async (id: string) => {
    if (!user || !confirm('Deseja sair deste time?')) return
    try {
      await teamService.leaveTeam(id, user.id)
      toast.success('Voce saiu do time.')
      fetchTeams()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Times</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie grupos de usuários para facilitar a colaboração.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Time
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Times</CardTitle>
          <CardDescription>Times que você criou ou participa.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamList
            teams={teams}
            currentUserId={user?.id}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLeave={handleLeave}
            onManageMembers={(team) => setManagingMembersTeam(team)}
          />
        </CardContent>
      </Card>

      <TeamDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        team={editingTeam}
        onSuccess={fetchTeams}
      />

      <TeamMembersDialog
        open={!!managingMembersTeam}
        onOpenChange={(open) => !open && setManagingMembersTeam(null)}
        team={managingMembersTeam}
      />
    </div>
  )
}
