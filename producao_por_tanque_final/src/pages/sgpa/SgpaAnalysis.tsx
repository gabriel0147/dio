import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { DateRangePicker } from '@/components/DateRangePicker'
import { sgpaService } from '@/services/sgpaService'
import { SgpaEvent } from '@/lib/types'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useProject } from '@/context/ProjectContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { InteractiveRechartsLegend } from '@/components/charts/InteractiveRechartsLegend'
import { useIsolatedChartSeries } from '@/hooks/use-isolated-chart-series'

export default function SgpaAnalysis() {
  const navigate = useNavigate()
  const { currentProject, isLoadingProjects } = useProject()
  const [events, setEvents] = useState<SgpaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const durationLegend = useIsolatedChartSeries<string>()
  const frequencyLegend = useIsolatedChartSeries<string>()

  useEffect(() => {
    if (!isLoadingProjects && !currentProject) {
      navigate('/producao-nbs', { replace: true })
    }
  }, [currentProject, isLoadingProjects, navigate])

  useEffect(() => {
    if (isLoadingProjects || !currentProject) {
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await sgpaService.getEvents({
          startDate: dateRange?.from,
          endDate: dateRange?.to,
          projectId: currentProject.id,
        })
        setEvents(data)
      } catch {
        toast.error('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentProject, dateRange, isLoadingProjects])

  const paretoData = useMemo(() => {
    const causes: Record<string, { duration: number; count: number }> = {}
    events.forEach((ev) => {
      const name = ev.causeName || 'Não especificado'
      if (!causes[name]) causes[name] = { duration: 0, count: 0 }
      causes[name].duration += ev.durationMin || 0
      causes[name].count += 1
    })

    return Object.entries(causes)
      .map(([name, val]) => ({
        name,
        durationHours: parseFloat((val.duration / 60).toFixed(1)),
        count: val.count,
      }))
      .sort((a, b) => b.durationHours - a.durationHours)
      .slice(0, 10)
  }, [events])

  const assetRanking = useMemo(() => {
    const assets: Record<string, { count: number; duration: number }> = {}
    events
      .filter((ev) => ev.failureFlag && ev.assetTag)
      .forEach((ev) => {
        const tag = ev.assetTag!
        if (!assets[tag]) assets[tag] = { count: 0, duration: 0 }
        assets[tag].count += 1
        assets[tag].duration += ev.durationMin || 0
      })

    return Object.entries(assets)
      .map(([tag, val]) => ({
        tag,
        count: val.count,
        durationHours: parseFloat((val.duration / 60).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [events])

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Análise Operacional
        </h1>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pareto de Causas (Por Duração)</CardTitle>
            <CardDescription>
              Top 10 causas com maior impacto em horas.
            </CardDescription>
            {durationLegend.isolatedKey && (
              <Button variant="link" className="h-auto w-fit p-0" onClick={durationLegend.showAll}>
                Exibir todas
              </Button>
            )}
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Carregando analise...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={paretoData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Legend
                    content={
                      <InteractiveRechartsLegend
                        activeKey={durationLegend.isolatedKey}
                        onItemClick={durationLegend.toggleSeries}
                        getItemKey={(item) => String(item.dataKey)}
                      />
                    }
                  />
                  <Bar
                    dataKey="durationHours"
                    name="Horas Paradas"
                    fill="#ef4444"
                    radius={[0, 4, 4, 0]}
                    hide={!durationLegend.isVisible('durationHours')}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pareto de Causas (Por Frequência)</CardTitle>
            <CardDescription>Top 10 causas mais frequentes.</CardDescription>
            {frequencyLegend.isolatedKey && (
              <Button variant="link" className="h-auto w-fit p-0" onClick={frequencyLegend.showAll}>
                Exibir todas
              </Button>
            )}
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Carregando analise...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...paretoData].sort((a, b) => b.count - a.count)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Legend
                    content={
                      <InteractiveRechartsLegend
                        activeKey={frequencyLegend.isolatedKey}
                        onItemClick={frequencyLegend.toggleSeries}
                        getItemKey={(item) => String(item.dataKey)}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    name="Qtd Eventos"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    hide={!frequencyLegend.isVisible('count')}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Falhas de Ativos (Bad Actors)</CardTitle>
          <CardDescription>
            Equipamentos com maior número de falhas registradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo (Tag)</TableHead>
                  <TableHead className="text-right">Ocorrências</TableHead>
                  <TableHead className="text-right">
                    Duração Total (h)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading &&
                  assetRanking.map((asset) => (
                    <TableRow key={asset.tag}>
                      <TableCell className="font-medium">{asset.tag}</TableCell>
                      <TableCell className="text-right">
                        {asset.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.durationHours}
                      </TableCell>
                    </TableRow>
                  ))}
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-4 text-muted-foreground"
                    >
                      Carregando analise...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && assetRanking.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-4 text-muted-foreground"
                    >
                      Nenhuma falha de ativo registrada no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
