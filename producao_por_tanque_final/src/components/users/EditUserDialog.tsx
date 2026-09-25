import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UserProfile, UserRole } from '@/lib/types'
import { userService } from '@/services/userService'
import { toast } from 'sonner'

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile | null
  currentUserId: string
  onSuccess: () => void
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSuccess,
}: EditUserDialogProps) {
  const [role, setRole] = useState<UserRole>('operator')
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setFullName(user.fullName || '')
    }
  }, [user])

  const handleUpdate = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await userService.updateUserProfile(
        user.id,
        role,
        fullName,
        currentUserId,
      )
      toast.success('Usuário atualizado com sucesso.')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Alterar dados e permissões para {user?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-fullname">Nome Completo</Label>
            <Input
              id="edit-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome Completo"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-role">Função (Role)</Label>
            <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="petroleum_engineer">
                  Engenheiro de Petróleo
                </SelectItem>
                <SelectItem value="regulation">Regulação</SelectItem>
                <SelectItem value="approver">Aprovador (Obsoleto)</SelectItem>
                <SelectItem value="operations_manager">
                  Gerente de Operações
                </SelectItem>
                <SelectItem value="director">Diretor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
