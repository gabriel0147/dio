import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Team, TeamMember, TeamRole } from '@/lib/types'
import { teamService } from '@/services/teamService'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TeamMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team | null
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  team,
}: TeamMembersDialogProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('team_member')
  const [adding, setAdding] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const data = await teamService.getTeamMembers(team.id)
      setMembers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [team])

  useEffect(() => {
    if (open && team) {
      loadMembers()
    }
  }, [open, team, loadMembers])

  const handleAdd = async () => {
    if (!team || !user || !email.trim()) return
    setAdding(true)
    try {
      await teamService.addMember(team.id, email.trim(), role, user.id)
      toast.success('Membro adicionado.')
      setEmail('')
      loadMembers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userIdToRemove: string) => {
    if (!team || !user) return
    if (userIdToRemove === team.ownerUserId) {
      toast.error('O criador do time não pode ser removido da lista de membros.')
      return
    }
    if (!confirm('Remover este membro?')) return
    try {
      await teamService.removeMember(team.id, userIdToRemove, user.id)
      toast.success('Membro removido.')
      loadMembers()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleRoleChange = async (memberUserId: string, newRole: TeamRole) => {
    if (!team || !user) return
    if (memberUserId === team.ownerUserId) {
      toast.error('O criador do time permanece como administrador do time.')
      return
    }
    try {
      await teamService.updateMemberRole(
        team.id,
        memberUserId,
        newRole,
        user.id,
      )
      toast.success('Função atualizada.')
      loadMembers()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (!team) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Membros de {team.name}</DialogTitle>
          <DialogDescription>
            Gerencie quem faz parte deste time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 items-end mb-4">
          <div className="flex-1 space-y-1">
            <span className="text-xs font-medium">Email do Usuário</span>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="w-[150px] space-y-1">
            <span className="text-xs font-medium">Função</span>
            <Select value={role} onValueChange={(v: TeamRole) => setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_member">Membro</SelectItem>
                <SelectItem value="team_admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={adding || !email.trim()}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="border rounded-md max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum membro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.avatarUrl || ''} />
                          <AvatarFallback>
                            {m.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {m.userId.substring(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      {m.userId === team.ownerUserId ? (
                        <div className="text-xs font-medium text-primary">
                          Admin (criador)
                        </div>
                      ) : (
                        <Select
                          value={m.role}
                          onValueChange={(v: TeamRole) =>
                            handleRoleChange(m.userId, v)
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team_member">Membro</SelectItem>
                            <SelectItem value="team_admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(m.userId)}
                        className="h-7 w-7 text-destructive"
                        disabled={m.userId === team.ownerUserId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
