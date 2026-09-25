import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'
import { EventList } from '@/components/sgpa/EventList'
import { EventForm } from '@/components/sgpa/EventForm'
import { sgpaService } from '@/services/sgpaService'
import { SgpaEvent } from '@/lib/types'
import { useProject } from '@/context/ProjectContext'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth } from 'date-fns'
import {
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  TrendingDown,
  BarChart2,
  PieChart,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { InteractiveRechartsLegend } from '@/components/charts/InteractiveRechartsLegend'
import { useIsolatedChartSeries } from '@/hooks/use-isolated-chart-series'

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
]

export default function SgpaDashboard() {
  const navigate = useNavigate()
  const { wells, currentProject, isLoadingProjects } = useProject()
  const { user } = useAuth()
  const [events, setEvents] = useState<SgpaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [selectedWellId, setSelectedWellId] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const categoryLegend = useIsolatedChartSeries<string>()
  const [editingEvent, setEditingEvent] = useState<SgpaEvent | null>(null)
  const [eventToDelete, setEventToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sgpaService.getEvents({
        wellId: selectedWellId === 'all' ? undefined : selectedWellId,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
        projectId: currentProject?.id,
      })
      setEvents(data)
    } catch {
      toast.error('Erro ao carregar eventos.')
    } finally {
      setLoading(false)
    }
  }, [currentProject?.id, dateRange, selectedWellId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const metrics = useMemo(() => {
    let stopMin = 0
    let derateMin = 0
    let openCount = 0
    let totalLoss = 0

    events.forEach((ev) => {
      if (ev.status === 'OPEN') openCount++
      const dur = ev.durationMin || 0
      if (ev.eventType === 'STOP') {
        stopMin += dur
      } else {
        derateMin += dur * (ev.impactFactor || 0)
      }
      totalLoss += ev.estimatedLossM3 || 0
    })

    return { stopMin, derateMin, openCount, totalLoss }
  }, [events])

  const chartsData = useMemo(() => {
    // Loss by Well
    const lossByWell: Record<string, number> = {}
    events.forEach((ev) => {
      const wellName = ev.wellName || 'Desconhecido'
      lossByWell[wellName] =
        (lossByWell[wellName] || 0) + (ev.estimatedLossM3 || 0)
    })
    const lossByWellData = Object.entries(lossByWell)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Loss by Category
    const lossByCategory: Record<string, number> = {}
    events.forEach((ev) => {
      const category = ev.category || 'Outros'
      lossByCategory[category] =
        (lossByCategory[category] || 0) + (ev.estimatedLossM3 || 0)
    })
    const lossByCategoryData = Object.entries(lossByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return { lossByWellData, lossByCategoryData }
  }, [events])

  const handleCreate = () => {
    setEditingEvent(null)
    setFormOpen(true)
  }

  const handleEdit = (ev: SgpaEvent) => {
    setEditingEvent(ev)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    setEventToDelete(id)
  }

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return
    if (!user) return
    try {
      const result = await sgpaService.deleteEvent(eventToDelete, user.id)
      if (result.attachmentCleanupFailed) {
        toast.warning(
          'Evento excluído, mas não foi possível remover todos os anexos.',
        )
      } else {
        toast.success('Evento excluído.')
      }
      setEventToDelete(null)
      await loadEvents()
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Diário de Paradas (SGPA)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de perdas e restrições operacionais.
          </p>
        </div>
        <Button onClick={handleCreate} size="lg">
          <Plus className="mr-2 h-5 w-5" /> Registrar Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-red-50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Paradas Totais (STOP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {(metrics.stopMin / 60).toFixed(1)} h
            </div>
            <p className="text-xs text-red-700">
              Perda total de produção (100%)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Restrições (DERATE)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {(metrics.derateMin / 60).toFixed(1)} h
            </div>
            <p className="text-xs text-orange-700">
              Perda equivalente ponderada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Perda Estimada (IPNP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {metrics.totalLoss.toFixed(2)} m³
            </div>
            <p className="text-xs text-blue-700">Volume total não produzido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Eventos em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openCount}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção imediata
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" /> Perda por Poço (m³)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <BarChart
                data={chartsData.lossByWellData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 4, 4, 0]}
                  name="Perda (m³)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" /> Perda por Categoria
            </CardTitle>
            {categoryLegend.isolatedKey && (
              <Button variant="link" className="h-auto w-fit p-0" onClick={categoryLegend.showAll}>
                Exibir todas
              </Button>
            )}
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <RechartsPieChart>
                <Pie
                  data={chartsData.lossByCategoryData.map((entry) => ({
                    ...entry,
                    value:
                      categoryLegend.isolatedKey === null ||
                      categoryLegend.isolatedKey === entry.name
                        ? entry.value
                        : 0,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent, value }) =>
                    Number(value) > 0
                      ? `${name} ${(percent * 100).toFixed(0)}%`
                      : ''
                  }
                >
                  {chartsData.lossByCategoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend
                  content={
                    <InteractiveRechartsLegend
                      activeKey={categoryLegend.isolatedKey}
                      onItemClick={categoryLegend.toggleSeries}
                      getItemKey={(item) => String(item.value)}
                    />
                  }
                />
              </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Histórico de Eventos</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Todos os Poços" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Poços</SelectItem>
                  {wells.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-[260px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10">Carregando...</div>
          ) : (
            <EventList
              events={events}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadEvents}
        initialEvent={editingEvent}
      />
      <ConfirmActionDialog
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        title="Excluir evento SGPA?"
        description="O evento será removido permanentemente e a ação ficará registrada na auditoria."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
