import { useState, useEffect, useMemo, useCallback } from 'react'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import { supervisionService } from '@/services/supervisionService'
import { SupervisionStatus } from '@/lib/types'
import { subDays, format } from 'date-fns'
import { DateRangePicker } from '@/components/DateRangePicker'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JustificationDialog } from '@/components/supervision/JustificationDialog'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  ShieldAlert,
  Droplets,
  MessageSquare,
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function OperationalManagement() {
  const {
    currentProject,
    productionFields,
    projects,
    isLoadingProjects,
    setCurrentProject,
  } = useProject()
  const { user, role } = useAuth()
  const [date, setDate] = useState<Date>(subDays(new Date(), 1))
  const [statusList, setStatusList] = useState<SupervisionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all')
  const [filterType, setFilterType] = useState<
    'all' | 'alerts' | 'missing' | 'complete'
  >('all')

  // Justification Dialog State
  const [justificationDialog, setJustificationDialog] = useState<{
    open: boolean
    tankId: string
    tankTag: string
    type: 'production' | 'checklist'
    existing?: string
  }>({ open: false, tankId: '', tankTag: '', type: 'production' })

  // Summary Metrics State
  const [summary, setSummary] = useState({
    totalHours: 0,
    downtimeHours: 0,
    stopReasons: {} as Record<string, number>,
    alertsCount: 0,
    auditedCount: 0,
  })

  const canAccess =
    role === 'admin' ||
    role === 'approver' ||
    role === 'supervisor' ||
    role === 'director' ||
    role === 'operations_manager'

  const productionProject = useMemo(
    () =>
      projects.find((project) => project.projectScope === 'production') ?? null,
    [projects],
  )

  useEffect(() => {
    if (productionProject && currentProject?.id !== productionProject.id) {
      setCurrentProject(productionProject)
    }
  }, [currentProject?.id, productionProject, setCurrentProject])

  const loadData = useCallback(async () => {
    if (!productionProject) {
      setStatusList([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [data, checklistSummary] = await Promise.all([
        supervisionService.getDailyStatus(productionProject.id, date),
        supervisionService.getChecklistsForSummary(productionProject.id, date),
      ])
      setStatusList(data)

      let totalHours = 0
      let downtimeHours = 0
      const stopReasons: Record<string, number> = {}
      const totalPotentialHours = checklistSummary.length * 24

      checklistSummary.forEach((c) => {
        totalHours += c.hoursOperating
        if (c.hasStopped && c.stopReason) {
          stopReasons[c.stopReason] = (stopReasons[c.stopReason] || 0) + 1
        }
      })

      downtimeHours = Math.max(0, totalPotentialHours - totalHours)

      const audited = data.filter(
        (s) => s.supervisionRecord?.status === 'audited',
      ).length
      const alerts = data.reduce((acc, curr) => {
        let count = 0
        if (curr.checklistAlerts.safetyRisk) count++
        if (curr.checklistAlerts.leak) count++
        if (curr.checklistAlerts.equipmentFailure) count++
        if (curr.checklistAlerts.anomaly) count++
        return acc + count
      }, 0)

      setSummary({
        totalHours,
        downtimeHours,
        stopReasons,
        alertsCount: alerts,
        auditedCount: audited,
      })
    } catch (e: any) {
      toast.error('Erro ao carregar dados: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [productionProject, date])

  useEffect(() => {
    if (!isLoadingProjects && canAccess) {
      loadData()
    }
  }, [isLoadingProjects, loadData, canAccess])

  const handleAuditDay = async () => {
    if (!productionProject || !user) return
    if (!confirm('Deseja marcar todos os registros do dia como Auditados?'))
      return

    try {
      await supervisionService.auditDay(productionProject.id, date, user.id)
      toast.success('Gestão salva com sucesso (Dia Auditado).')
      loadData()
    } catch (e: any) {
      toast.error('Erro ao auditar dia: ' + e.message)
    }
  }

  const handleSaveJustification = async (text: string) => {
    if (!productionProject || !user) return
    try {
      await supervisionService.saveJustification(
        productionProject.id,
        justificationDialog.tankId,
        date,
        justificationDialog.type,
        text,
        user.id,
      )
      toast.success('Justificativa salva com sucesso.')
      loadData()
    } catch (e: any) {
      toast.error('Erro ao salvar justificativa: ' + e.message)
    }
  }

  // Filtering
  const filteredList = useMemo(() => {
    return statusList.filter((item) => {
      // Field Filter
      if (
        selectedFieldId !== 'all' &&
        item.tank.productionFieldId !== selectedFieldId
      ) {
        return false
      }

      // Type Filter
      if (filterType === 'alerts') {
        const a = item.checklistAlerts
        return a.safetyRisk || a.leak || a.equipmentFailure || a.anomaly
      }
      if (filterType === 'missing') {
        return !item.hasProduction || !item.hasChecklist
      }
      if (filterType === 'complete') {
        return item.hasProduction && item.hasChecklist
      }

      return true
    })
  }, [statusList, selectedFieldId, filterType])

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 text-destructive" />
        <h2 className="text-xl font-semibold">Acesso Negado</h2>
        <p>Apenas supervisores e administradores podem acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão Operacional
          </h1>
          <p className="text-muted-foreground mt-1">
            Supervisão diária de atividades, produção e segurança.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            date={{ from: date, to: date }}
            setDate={(range) => {
              if (range?.from) setDate(range.from)
            }}
            className="w-[200px]"
          />
          <Button onClick={handleAuditDay}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Auditar Dia
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Resumo de Tempo (Horas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold">
                  {summary.totalHours.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">Operação</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">
                  {summary.downtimeHours.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">Parada</p>
              </div>
            </div>
            {Object.keys(summary.stopReasons).length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                <span className="font-semibold">Principais Motivos: </span>
                {Object.entries(summary.stopReasons)
                  .map(([reason, count]) => `${reason} (${count})`)
                  .join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={
            summary.alertsCount > 0
              ? 'bg-red-50/50 border-red-100'
              : 'bg-green-50/50 border-green-100'
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas & Anomalias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {summary.alertsCount > 0 ? (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
              <div>
                <p className="text-2xl font-bold">{summary.alertsCount}</p>
                <p className="text-xs text-muted-foreground">
                  Ocorrências críticas reportadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Status da Supervisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {summary.auditedCount} / {statusList.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ativos auditados para {format(date, 'dd/MM')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Acompanhamento de Ativos</CardTitle>
              <CardDescription>
                Lista detalhada por tanque/poço. Use os filtros para refinar.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedFieldId}
                onValueChange={setSelectedFieldId}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Campos</SelectItem>
                  {productionFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterType}
                // @ts-expect-error select types
                onValueChange={setFilterType}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="alerts">Com Alertas</SelectItem>
                  <SelectItem value="missing">Pendentes</SelectItem>
                  <SelectItem value="complete">Completos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead className="text-center">Produção</TableHead>
                  <TableHead className="text-center">Checklist</TableHead>
                  <TableHead>Alertas</TableHead>
                  <TableHead>Status Auditoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum ativo encontrado para os filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((item) => {
                    const isAudited =
                      item.supervisionRecord?.status === 'audited'
                    const alerts = item.checklistAlerts

                    return (
                      <TableRow key={item.tank.id}>
                        <TableCell className="font-medium">
                          {item.tank.tag}
                          {item.tank.wellName && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.tank.wellName})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item.tank.productionField}</TableCell>

                        {/* Production Status */}
                        <TableCell className="text-center">
                          {item.hasProduction ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              Sim
                            </Badge>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="destructive">Não</Badge>
                              {item.supervisionRecord
                                ?.justificationProduction ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Justificativa:{' '}
                                    {
                                      item.supervisionRecord
                                        .justificationProduction
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() =>
                                    setJustificationDialog({
                                      open: true,
                                      tankId: item.tank.id,
                                      tankTag: item.tank.tag,
                                      type: 'production',
                                    })
                                  }
                                >
                                  Justificar
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Checklist Status */}
                        <TableCell className="text-center">
                          {item.hasChecklist ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              Sim
                            </Badge>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="destructive">Não</Badge>
                              {item.supervisionRecord
                                ?.justificationChecklist ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Justificativa:{' '}
                                    {
                                      item.supervisionRecord
                                        .justificationChecklist
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() =>
                                    setJustificationDialog({
                                      open: true,
                                      tankId: item.tank.id,
                                      tankTag: item.tank.tag,
                                      type: 'checklist',
                                    })
                                  }
                                >
                                  Justificar
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Alerts */}
                        <TableCell>
                          <div className="flex gap-2">
                            {alerts.safetyRisk && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <ShieldAlert className="h-5 w-5 text-red-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Risco de Segurança (SMS)
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {alerts.leak && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Droplets className="h-5 w-5 text-red-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Vazamento Detectado
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {alerts.equipmentFailure && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Falha em Equipamento
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {alerts.stopped && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Clock className="h-5 w-5 text-gray-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Parada: {alerts.stopReason}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {alerts.anomaly &&
                              !alerts.safetyRisk &&
                              !alerts.leak &&
                              !alerts.equipmentFailure && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Anomalia Operacional
                                  </TooltipContent>
                                </Tooltip>
                              )}
                          </div>
                        </TableCell>

                        {/* Audit Status */}
                        <TableCell>
                          {isAudited ? (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                            >
                              Auditado
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Pendente
                            </span>
                          )}
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

      <JustificationDialog
        open={justificationDialog.open}
        onOpenChange={(val) =>
          setJustificationDialog((prev) => ({ ...prev, open: val }))
        }
        tankTag={justificationDialog.tankTag}
        type={justificationDialog.type}
        existingJustification={justificationDialog.existing}
        onSave={handleSaveJustification}
      />
    </div>
  )
}
