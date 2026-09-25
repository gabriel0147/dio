import {
  Check,
  Loader2,
  Pencil,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  UserApprovalStatus,
  UserProfile,
  UserRole,
} from '@/lib/types'

interface UsersTableProps {
  users: UserProfile[]
  loading: boolean
  currentUserId: string
  onEdit?: (user: UserProfile) => void
  onDelete?: (userId: string) => void
  onApprove?: (userId: string) => void
  onReject?: (userId: string) => void
  emptyMessage?: string
}

export function UsersTable({
  users,
  loading,
  currentUserId,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  emptyMessage = 'Nenhum usuário encontrado.',
}: UsersTableProps) {
  const formatCreatedAt = (value?: string | null) => {
    if (!value) return '-'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'

    return parsed.toLocaleDateString()
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-600 hover:bg-red-700">Admin</Badge>
      case 'director':
        return (
          <Badge className="bg-purple-700 hover:bg-purple-800">Diretor</Badge>
        )
      case 'regulation':
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700">Regulação</Badge>
        )
      case 'operations_manager':
        return (
          <Badge className="bg-orange-600 hover:bg-orange-700">
            Ger. Operações
          </Badge>
        )
      case 'petroleum_engineer':
        return (
          <Badge className="bg-cyan-600 hover:bg-cyan-700">
            Eng. Petróleo
          </Badge>
        )
      case 'supervisor':
        return (
          <Badge className="bg-teal-600 hover:bg-teal-700">Supervisor</Badge>
        )
      case 'approver':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">Aprovador</Badge>
        )
      case 'operator':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Operador</Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getApprovalBadge = (status: UserApprovalStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 hover:bg-green-700">Ativa</Badge>
      case 'rejected':
        return <Badge variant="destructive">Recusada</Badge>
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[180px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={u.avatarUrl || ''}
                        alt={u.fullName || u.email}
                      />
                      <AvatarFallback>
                        {u.fullName
                          ? u.fullName.charAt(0).toUpperCase()
                          : u.email?.charAt(0).toUpperCase() || <UserIcon />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {u.fullName || 'Sem nome'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(u.role)}</TableCell>
                <TableCell>{getApprovalBadge(u.approvalStatus)}</TableCell>
                <TableCell>{formatCreatedAt(u.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {u.approvalStatus === 'pending' ? (
                      <>
                        {onApprove ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onApprove(u.id)}
                            title="Aprovar conta"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : null}
                        {onReject ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onReject(u.id)}
                            title="Recusar conta"
                          >
                            <X className="h-4 w-4 text-amber-700" />
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {onEdit ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(u)}
                            title="Editar usuário"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        ) : null}
                      </>
                    )}
                    {onDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={u.id === currentUserId}
                        onClick={() => onDelete(u.id)}
                        title="Excluir usuário"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
