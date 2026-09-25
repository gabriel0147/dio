import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Team } from '@/lib/types'
import { teamService } from '@/services/teamService'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface TeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team | null
  onSuccess: () => void
}

export function TeamDialog({
  open,
  onOpenChange,
  team,
  onSuccess,
}: TeamDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(team ? team.name : '')
    }
  }, [open, team])

  const handleSubmit = async () => {
    if (!name.trim() || !user) return
    setSubmitting(true)
    try {
      if (team) {
        await teamService.updateTeam(team.id, name, user.id)
        toast.success('Time atualizado com sucesso.')
      } else {
        await teamService.createTeam(name, user.id)
        toast.success('Time criado com sucesso.')
      }
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? 'Editar Time' : 'Criar Novo Time'}</DialogTitle>
          <DialogDescription>Defina o nome para o seu time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="team-name">Nome do Time</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Operações Alpha"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
