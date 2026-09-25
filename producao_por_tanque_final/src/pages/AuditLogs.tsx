import { useState, useEffect, useCallback, useMemo } from 'react'
import { auditService } from '@/services/auditService'
import { userService } from '@/services/userService'
import { AuditLog, UserProfile } from '@/lib/types'
import { DateRangePicker } from '@/components/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, Loader2, FilterX, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'

export default function AuditLogs() {
  const { projects } = useProject()
  const { role, loading: authLoading } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedOperation, setSelectedOperation] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [operationTypes, setOperationTypes] = useState<string[]>([])

  const canViewLogs =
    role === 'admin' || role === 'director' || role === 'operations_manager'

  const loadFilters = useCallback(async () => {
    if (!canViewLogs) return
    try {
      // Fetch full user profiles (including emails via edge function inside userService)
      // and distinct operations in parallel
      const [users, ops] = await Promise.all([
        userService.listUsers(),
        auditService.getDistinctOperationTypes(),
      ])
      setUserProfiles(users)
      setOperationTypes(ops)
    } catch (error) {
      console.error('Error loading filters', error)
      toast.error('Erro ao carregar lista de usuários para filtro.')
    }
  }, [canViewLogs])

  useEffect(() => {
    if (canViewLogs) {
      loadFilters()
    }
  }, [loadFilters, canViewLogs])

  const fetchLogs = useCallback(async () => {
    if (!canViewLogs) return
    setLoading(true)
    try {
      const data = await auditService.getLogs({
        startDate: dateRange?.from,
        endDate: dateRange?.to,
        userId: selectedUser,
        operationType: selectedOperation,
        projectId: selectedProject,
      })
      setLogs(data)
    } catch (error: any) {
      toast.error('Erro ao carregar logs: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedUser, selectedOperation, selectedProject, canViewLogs])

  useEffect(() => {
    if (canViewLogs) {
      fetchLogs()
    }
  }, [fetchLogs, canViewLogs])

  const clearFilters = () => {
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    })
    setSelectedUser('all')
    setSelectedOperation('all')
    setSelectedProject('all')
  }

  const getProjectName = (id?: string) => {
    if (!id) return '-'
    return projects.find((p) => p.id === id)?.name || id
  }

  // Create a map for O(1) user lookup
  const userMap = useMemo(() => {
    return new Map(userProfiles.map((u) => [u.id, u]))
  }, [userProfiles])

  const getUserDisplay = (userId: string) => {
    const user = userMap.get(userId)
    if (user) {
      return {
        name: user.fullName || 'Sem Nome',
        email: user.email || 'Sem Email',
        found: true,
      }
    }
    return {
      name: 'Usuário Desconhecido',
      email: userId, // Show ID if unknown as secondary info
      found: false,
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canViewLogs) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-fade-in">
        <ShieldAlert className="h-16 w-16 mb-4 text-destructive/50" />
        <h2 className="text-2xl font-bold text-foreground">Acesso Negado</h2>
        <p className="mt-2 text-center max-w-md">
          Você não tem permissão para visualizar os logs de auditoria. Esta área
          é restrita a Administradores, Diretores e Gerentes de Operações.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Rastreamento de alterações e conformidade.
          </p>
        </div>
        <Button variant="outline" onClick={clearFilters} size="sm">
          <FilterX className="mr-2 h-4 w-4" /> Limpar Filtros
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Projeto</label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuário</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {userProfiles.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || 'Sem Nome'} {u.email ? `(${u.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Operação</label>
              <Select
                value={selectedOperation}
                onValueChange={setSelectedOperation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as operações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as operações</SelectItem>
                  {operationTypes.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Carregando logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum log encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const userInfo = getUserDisplay(log.userId)
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-xs">
                          {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium">{userInfo.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {userInfo.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {getProjectName(log.projectId)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.operationType}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="capitalize">
                            {log.entityType.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Log</DialogTitle>
                                <DialogDescription>
                                  ID: {log.id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">
                                      Data
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {format(
                                        new Date(log.createdAt),
                                        'dd/MM/yyyy HH:mm:ss',
                                        { locale: ptBR },
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">
                                      Usuário
                                    </h4>
                                    <p className="text-sm text-muted-foreground font-medium">
                                      {userInfo.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {userInfo.email}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">
                                      Projeto
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {getProjectName(log.projectId)}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">
                                      Entidade
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {log.entityType} ({log.entityId})
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-sm font-medium mb-1">
                                    Motivo
                                  </h4>
                                  <div className="p-3 bg-muted rounded-md text-sm">
                                    {log.reason}
                                  </div>
                                </div>

                                {(log.oldValue || log.newValue) && (
                                  <div className="grid grid-cols-2 gap-4 mt-2">
                                    {log.oldValue && (
                                      <div>
                                        <h4 className="text-sm font-medium mb-1 text-red-600">
                                          Valor Antigo
                                        </h4>
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm break-all">
                                          {log.oldValue}
                                        </div>
                                      </div>
                                    )}
                                    {log.newValue && (
                                      <div>
                                        <h4 className="text-sm font-medium mb-1 text-green-600">
                                          Novo Valor
                                        </h4>
                                        <div className="p-3 bg-green-50 border border-green-100 rounded-md text-sm break-all">
                                          {log.newValue}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
