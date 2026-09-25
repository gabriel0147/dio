import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Wrench, Search, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { smtService } from '@/services/smtService'
import { SmtEquipment, SmtMaintenanceLog, SmtPreventivePlan } from '@/lib/types'
import { EquipmentForm } from '@/components/smt/EquipmentForm'
import { MaintenanceLogForm } from '@/components/smt/MaintenanceLogForm'
import { PreventivePlanForm } from '@/components/smt/PreventivePlanForm'
import { format, parseISO } from 'date-fns'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getUserFacingError } from '@/lib/user-facing-error'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'

export default function SmtDashboard() {
  const { projectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentProject, setCurrentProject, projects } = useProject()
  const { user } = useAuth()

  // Data State
  const [equipment, setEquipment] = useState<SmtEquipment[]>([])
  const [logs, setLogs] = useState<SmtMaintenanceLog[]>([])
  const [preventivePlans, setPreventivePlans] = useState<SmtPreventivePlan[]>(
    [],
  )
  const [_loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog States
  const [isEquipOpen, setIsEquipOpen] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [isPlanOpen, setIsPlanOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<SmtEquipment | null>(
    null,
  )
  const [editingLog, setEditingLog] = useState<SmtMaintenanceLog | null>(null)
  const [editingPlan, setEditingPlan] = useState<SmtPreventivePlan | null>(null)
  const [equipmentToDelete, setEquipmentToDelete] =
    useState<SmtEquipment | null>(null)
  const [planToDelete, setPlanToDelete] = useState<string | null>(null)

  // Default direto no dashboard para evitar uma tela intermediaria redundante
  const view = searchParams.get('view') || 'dashboard'

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
      return
    }

    if (!projectId && projects.length > 0) {
      const maintenanceProject = projects.find(
        (p) => p.projectScope === 'maintenance',
      )
      if (maintenanceProject && maintenanceProject.id !== currentProject?.id) {
        setCurrentProject(maintenanceProject)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [equipData, logsData, plansData] = await Promise.all([
        smtService.getEquipment(currentProject.id),
        smtService.getMaintenanceLogs(currentProject.id),
        smtService.getPreventivePlans(currentProject.id),
      ])
      setEquipment(equipData)
      setLogs(logsData)
      setPreventivePlans(plansData)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    // Load data only if we are in dashboard view to save resources
    if (view === 'dashboard') {
      loadData()
    }
  }, [loadData, view])

  const filteredEquipment = equipment.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase()),
  )

  const handleEditEquipment = (e: SmtEquipment) => {
    setEditingEquipment(e)
    setIsEquipOpen(true)
  }

  const handleCreateEquipment = () => {
    setEditingEquipment(null)
    setIsEquipOpen(true)
  }

  const handleDeleteEquipment = async () => {
    if (!user || !equipmentToDelete) return
    try {
      await smtService.deleteEquipment(equipmentToDelete.id, user.id)
      toast.success('Equipamento excluído.')
      setEquipmentToDelete(null)
      await loadData()
    } catch (error) {
      toast.error(
        getUserFacingError(error, 'Não foi possível excluir o equipamento.'),
      )
    }
  }

  const handleEditLog = (l: SmtMaintenanceLog) => {
    setEditingLog(l)
    setIsLogOpen(true)
  }

  const handleCreateLog = () => {
    setEditingLog(null)
    setIsLogOpen(true)
  }

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setIsPlanOpen(true)
  }

  const handleEditPlan = (p: SmtPreventivePlan) => {
    setEditingPlan(p)
    setIsPlanOpen(true)
  }

  const handleDeletePlan = async (id: string) => {
    setPlanToDelete(id)
  }

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return
    if (!user) return
    try {
      await smtService.deletePreventivePlan(planToDelete, user.id)
      toast.success('Plano excluído.')
      setPlanToDelete(null)
      await loadData()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
  }

  const handleEnterDashboard = () => {
    setSearchParams({ view: 'dashboard' })
  }

  const handleBackToEntry = () => {
    setSearchParams({ view: 'entry' })
  }

  if (!currentProject)
    return <div className="p-8 text-center">Carregando...</div>

  // Entry Card View
  if (view === 'entry') {
    return (
      <div className="container mx-auto p-6 h-[calc(100vh-100px)] flex flex-col justify-center items-center animate-fade-in">
        <Card
          className="w-full max-w-lg hover:border-orange-500/50 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] border-2 h-80 flex flex-col justify-center items-center text-center group"
          onClick={handleEnterDashboard}
        >
          <CardHeader className="flex flex-col items-center gap-4">
            <div className="mx-auto bg-orange-100 p-6 rounded-full group-hover:bg-orange-200 transition-colors">
              <Wrench className="h-16 w-16 text-orange-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-orange-700">
                SMT-Sistema de Manutenção
              </CardTitle>
              <CardDescription className="text-lg">
                Gestão de equipamentos, planos preventivos e ordens de serviço.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-orange-700 flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Sistema de Manutenção (SMT)
          </h1>
          <p className="text-muted-foreground">
            Gestão de equipamentos, planos preventivos e ordens de serviço.
          </p>
        </div>
        <Button variant="outline" onClick={handleBackToEntry}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Menu
        </Button>
      </div>

      <Tabs defaultValue="equipment">
        <TabsList>
          <TabsTrigger value="equipment">Equipamentos</TabsTrigger>
          <TabsTrigger value="preventive">Planos Preventivos</TabsTrigger>
          <TabsTrigger value="corrective">Histórico de Manutenções</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventário de Equipamentos</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar equipamento..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateEquipment}>
                  <Plus className="mr-2 h-4 w-4" /> Novo Equipamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Equipamento Pai</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold">
                        {item.code}
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.parentName || '-'}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.model || '-'}</TableCell>
                      <TableCell>{item.location || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'active' || item.status === 'new'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            item.status === 'active'
                              ? 'bg-green-600 hover:bg-green-700'
                              : item.status === 'new'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : item.status === 'in_maintenance'
                                  ? 'bg-orange-500 hover:bg-orange-600'
                                  : 'bg-gray-500 hover:bg-gray-600'
                          }
                        >
                          {item.status === 'active'
                            ? 'Ativo'
                            : item.status === 'new'
                              ? 'Novo'
                              : item.status === 'in_maintenance'
                                ? 'Em Manutenção'
                                : item.status === 'inactive'
                                  ? 'Inativo'
                                  : 'Sucata'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditEquipment(item)}
                          aria-label={`Editar equipamento ${item.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEquipmentToDelete(item)}
                          aria-label={`Excluir equipamento ${item.code}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preventive">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Planos de Manutenção Preventiva</CardTitle>
              <Button onClick={handleCreatePlan}>
                <Plus className="mr-2 h-4 w-4" /> Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Periodicidade</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Próxima Execução</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preventivePlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.equipmentName}
                      </TableCell>
                      <TableCell>
                        {plan.periodicityType === 'days'
                          ? 'Dias Corridos'
                          : 'Horas de Operação'}
                      </TableCell>
                      <TableCell>{plan.interval}</TableCell>
                      <TableCell>
                        {plan.nextScheduledDate
                          ? format(
                              parseISO(plan.nextScheduledDate),
                              'dd/MM/yyyy',
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {preventivePlans.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground h-24"
                      >
                        Nenhum plano preventivo cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corrective">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Manutenções</CardTitle>
              <Button onClick={handleCreateLog}>
                <Plus className="mr-2 h-4 w-4" /> Registrar Manutenção
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.startAt
                          ? format(parseISO(log.startAt), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>{log.equipmentName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.type === 'corrective'
                            ? 'Corretiva'
                            : 'Preventiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.failureDescription || '-'}
                      </TableCell>
                      <TableCell>
                        {log.status === 'open' ? (
                          <Badge className="bg-red-500">Aberto</Badge>
                        ) : log.status === 'in_progress' ? (
                          <Badge className="bg-blue-500">Em Execução</Badge>
                        ) : (
                          <Badge className="bg-green-500">Concluído</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLog(log)}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EquipmentForm
        open={isEquipOpen}
        onOpenChange={setIsEquipOpen}
        projectId={currentProject.id}
        equipment={editingEquipment}
        equipmentList={equipment}
        onSuccess={loadData}
      />

      <AlertDialog
        open={!!equipmentToDelete}
        onOpenChange={(open) => !open && setEquipmentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O equipamento {equipmentToDelete?.code} será removido. A exclusão
              será bloqueada se houver planos ou manutenções vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEquipment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MaintenanceLogForm
        open={isLogOpen}
        onOpenChange={setIsLogOpen}
        projectId={currentProject.id}
        equipmentList={equipment}
        log={editingLog}
        onSuccess={loadData}
      />

      <PreventivePlanForm
        open={isPlanOpen}
        onOpenChange={setIsPlanOpen}
        projectId={currentProject.id}
        equipmentList={equipment}
        plan={editingPlan}
        onSuccess={loadData}
      />
      <ConfirmActionDialog
        open={!!planToDelete}
        onOpenChange={(open) => !open && setPlanToDelete(null)}
        title="Excluir plano preventivo?"
        description="O plano será removido permanentemente do equipamento vinculado."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleConfirmDeletePlan}
      />
    </div>
  )
}
