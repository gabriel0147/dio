import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/use-auth'
import { userService } from '@/services/userService'
import { UserProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersTable } from '@/components/users/UsersTable'
import { CreateUserDialog } from '@/components/users/CreateUserDialog'
import { EditUserDialog } from '@/components/users/EditUserDialog'
import { AccessLevelsSummary } from '@/components/users/AccessLevelsSummary'

export default function UserManagement() {
  const { user, role, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  const canManageUsers = role === 'admin' || role === 'director'

  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      navigate('/')
    }
  }, [authLoading, canManageUsers, navigate])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userService.listUsers()
      setUsers(data)
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers()
    }
  }, [canManageUsers])

  const handleEditClick = (selectedUser: UserProfile) => {
    setEditingUser(selectedUser)
    setIsEditOpen(true)
  }

  const handleDeleteUser = async (userIdToDelete: string) => {
    if (!user) return
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      await userService.deleteUser(userIdToDelete, user.id)
      toast.success('Usuário excluído com sucesso.')
      fetchUsers()
    } catch (error: any) {
      toast.error('Erro ao excluir usuário: ' + error.message)
    }
  }

  const handleApproveUser = async (userIdToApprove: string) => {
    if (!user) return

    try {
      await userService.approveUserAccount(userIdToApprove, user.id)
      toast.success('Conta aprovada com sucesso.')
      fetchUsers()
    } catch (error: any) {
      toast.error('Erro ao aprovar usuário: ' + error.message)
    }
  }

  const handleRejectUser = async (userIdToReject: string) => {
    if (!user) return

    try {
      await userService.rejectUserAccount(userIdToReject, user.id)
      toast.success('Solicitação recusada.')
      fetchUsers()
    } catch (error: any) {
      toast.error('Erro ao recusar usuário: ' + error.message)
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canManageUsers) return null

  const pendingUsers = users.filter((item) => item.approvalStatus === 'pending')
  const activeUsers = users.filter((item) => item.approvalStatus === 'active')
  const rejectedUsers = users.filter(
    (item) => item.approvalStatus === 'rejected',
  )

  return (
    <div className="container mx-auto animate-fade-in space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Usuários
          </h1>
          <p className="mt-1 text-muted-foreground">
            Controle de acesso, aprovações de cadastro e contas do sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Info className="mr-2 h-4 w-4" /> Níveis de acesso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Estrutura de níveis de acesso</DialogTitle>
              </DialogHeader>
              <AccessLevelsSummary />
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Adicionar novo usuário
              </Button>
            </DialogTrigger>
            <CreateUserDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              currentUserId={user?.id || ''}
              onSuccess={fetchUsers}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={pendingUsers}
            loading={loading}
            currentUserId={user?.id || ''}
            onApprove={handleApproveUser}
            onReject={handleRejectUser}
            onDelete={handleDeleteUser}
            emptyMessage="Nenhuma solicitação pendente no momento."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={activeUsers}
            loading={loading}
            currentUserId={user?.id || ''}
            onEdit={handleEditClick}
            onDelete={handleDeleteUser}
            emptyMessage="Nenhum usuário ativo encontrado."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações Recusadas</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={rejectedUsers}
            loading={loading}
            currentUserId={user?.id || ''}
            onDelete={handleDeleteUser}
            emptyMessage="Nenhuma solicitação recusada."
          />
        </CardContent>
      </Card>

      <EditUserDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={editingUser}
        currentUserId={user?.id || ''}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
