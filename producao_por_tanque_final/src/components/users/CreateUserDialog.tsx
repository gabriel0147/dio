import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { UserRole } from '@/lib/types'
import { userService } from '@/services/userService'
import { toast } from 'sonner'
import { z } from 'zod'

const emailSchema = z.string().trim().email()

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
  onSuccess: () => void
}

export function CreateUserDialog({
  open,
  onOpenChange,
  currentUserId,
  onSuccess,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('operator')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [fullNameTouched, setFullNameTouched] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedFullName = fullName.trim()
  const isEmailValid = emailSchema.safeParse(normalizedEmail).success
  const isFullNameValid = normalizedFullName.length >= 2

  const handleCreateUser = async () => {
    setEmailTouched(true)
    setFullNameTouched(true)
    if (!isEmailValid || !isFullNameValid) return
    setIsSubmitting(true)
    try {
      await userService.createUser(
        normalizedEmail,
        role,
        normalizedFullName,
        currentUserId,
      )
      toast.success('Usuário criado com sucesso! Email de convite enviado.')
      setEmail('')
      setFullName('')
      setEmailTouched(false)
      setFullNameTouched(false)
      setRole('operator')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            O usuário receberá um email para definir sua senha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="usuario@empresa.com"
              aria-invalid={emailTouched && !isEmailValid}
              aria-describedby="create-user-email-error"
            />
            {emailTouched && !isEmailValid && (
              <p
                id="create-user-email-error"
                className="text-sm text-destructive"
              >
                Informe um email válido.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setFullNameTouched(true)}
              placeholder="Ex: João da Silva"
              aria-invalid={fullNameTouched && !isFullNameValid}
              aria-describedby="create-user-name-error"
            />
            {fullNameTouched && !isFullNameValid && (
              <p
                id="create-user-name-error"
                className="text-sm text-destructive"
              >
                Informe o nome completo.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Função (Role)</Label>
            <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
              <SelectTrigger id="role">
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
          <Button
            onClick={handleCreateUser}
            disabled={isSubmitting || !isEmailValid || !isFullNameValid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
              </>
            ) : (
              'Criar Usuário'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
