import { useState, useMemo, useEffect, useRef } from 'react'
import { useProject } from '@/context/ProjectContext'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/DateRangePicker'
import { subDays, parseISO, format, startOfYear, endOfYear } from 'date-fns'
import { DateRange } from 'react-day-picker'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Filter, Settings2, Trash2, FileText, LockKeyhole } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import { DailyProductionReport, ProductionChartItem } from '@/lib/types'
import { sheetService } from '@/services/sheetService'
import { reportService } from '@/services/reportService'
import { toast } from 'sonner'
import { ProductionMetricsCards } from '@/components/dashboard/ProductionMetricsCards'
import {
  ProductionEvolutionChart,
  type ProductionChartDataPoint,
} from '@/components/dashboard/ProductionEvolutionChart'
import { DailyProductionOverview } from '@/components/dashboard/DailyProductionOverview'
import {
  addNullableVolume,
  calculateVolumeWeightedBsw,
} from '@/lib/productionChart'

type Granularity = 'day' | 'month' | 'year'

const hasMovementValue = (value: number) =>
  Math.abs(Number(value || 0)) > 0.000001

const getReportMovementLabel = (report: DailyProductionReport) => {
  const movements: string[] = []

  if (hasMovementValue(report.stockVariation)) movements.push('Estoque')
  if (hasMovementValue(report.drainedVolumeM3)) movements.push('Drenagem')
  if (hasMovementValue(report.transferredVolumeM3)) {
    movements.push('Transferência')
  }

  return movements.length > 0 ? movements.join(' / ') : 'Sem movimento'
}

const getReportStatusLabel = (status: DailyProductionReport['status']) =>
  status === 'closed' ? 'Fechado' : 'Aberto'

export default function Dashboard() {
  const { projectId } = useParams()
  const {
    currentProject,
    currentProjectRole,
    setCurrentProject,
    projects,
    clearProjectData,
  } = useProject()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [selectedTankIds, setSelectedTankIds] = useState<string[]>([])
  const lastProjectIdRef = useRef<string | null>(null)

  // Chart Data State
  const [chartDataItems, setChartDataItems] = useState<ProductionChartItem[]>(
    [],
  )

  // New state for Daily Production Overview
  const [dailyReports, setDailyReports] = useState<DailyProductionReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)

  // Grouping state
  const [groupByField, setGroupByField] = useState(false)

  // Clear Data state
  const [isClearingData, setIsClearingData] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Set current project based on URL
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  // Initialize selected tanks
  useEffect(() => {
    if (currentProject && currentProject.id !== lastProjectIdRef.current) {
      setSelectedTankIds(currentProject.tanks.map((t) => t.id))
      lastProjectIdRef.current = currentProject.id
    }
  }, [currentProject])

  // Fetch Chart Data
  useEffect(() => {
    const fetchChartData = async () => {
      if (
        !currentProject ||
        selectedTankIds.length === 0 ||
        !dateRange?.from ||
        !dateRange?.to
      ) {
        setChartDataItems([])
        return
      }

      try {
        const data = await sheetService.getProductionChartData(
          selectedTankIds,
          dateRange.from,
          dateRange.to,
        )
        setChartDataItems(data)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      }
    }

    fetchChartData()
  }, [currentProject, selectedTankIds, dateRange])

  // Fetch Daily Reports for Overview Section
  useEffect(() => {
    const fetchReports = async () => {
      if (!currentProject || !dateRange?.from || !dateRange?.to) {
        setDailyReports([])
        return
      }

      setIsLoadingReports(true)
      try {
        const tankIds = currentProject.tanks
          .filter((t) => selectedTankIds.includes(t.id))
          .map((t) => t.id)

        if (tankIds.length > 0) {
          const reports = await reportService.getReportsByDateRangeForExport(
            tankIds,
            dateRange.from,
            dateRange.to,
          )
          setDailyReports(reports)
        } else {
          setDailyReports([])
        }
      } catch (error) {
        console.error('Error fetching daily reports:', error)
      } finally {
        setIsLoadingReports(false)
      }
    }

    fetchReports()
  }, [currentProject, dateRange, selectedTankIds])

  const handleTankToggle = (tankId: string) => {
    setSelectedTankIds((prev) =>
      prev.includes(tankId)
        ? prev.filter((id) => id !== tankId)
        : [...prev, tankId],
    )
  }

  const handleSelectAllTanks = () => {
    if (currentProject) {
      setSelectedTankIds(currentProject.tanks.map((t) => t.id))
    }
  }

  const handleClearTanks = () => {
    setSelectedTankIds([])
  }

  const handleClearProjectData = async () => {
    if (!currentProject) return
    setIsClearingData(true)
    try {
      await clearProjectData(currentProject.id)
      setDailyReports([])
      setChartDataItems([])
      const tankIds = currentProject.tanks
        .filter((t) => selectedTankIds.includes(t.id))
        .map((t) => t.id)
      if (tankIds.length > 0 && dateRange?.from && dateRange?.to) {
        const reports = await reportService.getReportsByDateRangeForExport(
          tankIds,
          dateRange.from,
          dateRange.to,
        )
        setDailyReports(reports)
      }
    } catch (error) {
      console.error('Failed to clear data', error)
    } finally {
      setIsClearingData(false)
    }
  }

  const handleExportCsv = async () => {
    if (!currentProject || !dateRange?.from || !dateRange?.to) {
      toast.error('Selecione um período e projeto para exportar.')
      return
    }

    const tankIds = currentProject.tanks
      .filter((t) => selectedTankIds.includes(t.id))
      .map((t) => t.id)

    if (tankIds.length === 0) {
      toast.error('Selecione pelo menos um tanque.')
      return
    }

    setIsExporting(true)
    try {
      const reports = await reportService.getReportsByDateRangeForExport(
        tankIds,
        dateRange.from,
        dateRange.to,
      )

      if (reports.length === 0) {
        toast.info(
          'Nenhum dado encontrado para o período e filtros selecionados.',
        )
        setIsExporting(false)
        return
      }

      const headers = [
        'Data do Relatorio',
        'Tanque',
        'Poço',
        'Campo de Producao',
        'Inicio',
        'Fim',
        'Status',
        'Movimento',
        'Producao do Poco (m3)',
        'Oleo Corrigido (m3)',
        'Oleo sem Correcao (m3)',
        'Volume Drenado (m3)',
        'Volume Transferido (m3)',
        'Variacao do Estoque (m3)',
        'BSW Total (%)',
        'BSW da Emulsao (%)',
        'Densidade a 20C (g/cm3)',
        'Temperatura do Fluido (C)',
        'Densidade Observada na Transferencia (g/cm3)',
        'FTC - Fator de Correcao da Temperatura',
        'FCV',
        'FE',
        'Fechado em',
        'Fechado por',
      ]

      const rows = reports.map((r) => [
        r.reportDate,
        r.tankTag,
        r.wellName || 'Não identificado',
        r.productionFieldName,
        r.startDatetime,
        r.endDatetime,
        getReportStatusLabel(r.status),
        getReportMovementLabel(r),
        r.calculatedWellProductionM3,
        r.correctedOilVolumeM3,
        r.uncorrectedOilVolumeM3,
        r.drainedVolumeM3,
        r.transferredVolumeM3,
        r.stockVariation,
        r.totalBswPercent,
        r.emulsionBswPercent,
        r.densityAt20cGcm3,
        r.fluidTempC,
        r.transferObservedDensityGcm3,
        r.tempCorrectionFactorY,
        r.fcv,
        r.fe,
        r.closedAt,
        r.closedBy,
      ])

      const separator = ';'
      const csvContent = [
        headers.join(separator),
        ...rows.map((row) =>
          row
            .map((cell) => {
              if (cell === null || cell === undefined) return ''
              const cellStr = String(cell)
              if (
                cellStr.includes(separator) ||
                cellStr.includes('"') ||
                cellStr.includes('\n') ||
                cellStr.includes('\r')
              ) {
                return `"${cellStr.replace(/"/g, '""')}"`
              }
              return cellStr
            })
            .join(separator),
        ),
      ].join('\r\n')

      const blob = new Blob([`\uFEFF${csvContent}`], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      const fileName = `daily_production_overview_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Download concluído!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Erro ao exportar CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  const metrics = useMemo(() => {
    const sums = chartDataItems.reduce(
      (acc, item) => ({
        wellProduction: acc.wellProduction + (item.well_production || 0),
        drained: acc.drained + (item.drained || 0),
        transferred: acc.transferred + (item.transferred || 0),
        waterProduction: acc.waterProduction + (item.water_production || 0),
        uncorrectedOil:
          acc.uncorrectedOil + (item.uncorrected_oil_production || 0),
      }),
      {
        wellProduction: 0,
        drained: 0,
        transferred: 0,
        waterProduction: 0,
        uncorrectedOil: 0,
      },
    )

    return {
      ...sums,
      weightedBswTotal: calculateVolumeWeightedBsw(chartDataItems),
    }
  }, [chartDataItems])

  const chartData = useMemo(() => {
    const grouped: Record<string, ProductionChartDataPoint> = {}

    chartDataItems.forEach((item) => {
      const dateObj = parseISO(item.date)
      let key = ''
      if (granularity === 'day') {
        key = format(dateObj, 'dd/MM/yyyy')
      } else if (granularity === 'month') {
        key = format(dateObj, 'MM/yyyy')
      } else {
        key = format(dateObj, 'yyyy')
      }

      if (!grouped[key]) {
        grouped[key] = {
          name: key,
          sortDate: dateObj.getTime(),
          wellProduction: 0,
          drained: 0,
          transferred: 0,
          waterProduction: 0,
          uncorrectedOil: 0,
          stockVariation: 0,
          transferWater: 0,
          transferOilUncorrected: 0,
          transferOilCorrected: 0,
        }
      }

      const point = grouped[key]
      point.wellProduction += item.well_production || 0
      point.drained += item.drained || 0
      point.transferred += item.transferred || 0
      point.waterProduction += item.water_production || 0
      point.uncorrectedOil += item.uncorrected_oil_production || 0
      point.stockVariation += item.stock_variation || 0
      point.transferWater = addNullableVolume(
        point.transferWater,
        item.transfer_water_volume,
      )
      point.transferOilUncorrected = addNullableVolume(
        point.transferOilUncorrected,
        item.transfer_oil_uncorrected_volume,
      )
      point.transferOilCorrected = addNullableVolume(
        point.transferOilCorrected,
        item.transfer_oil_corrected_volume,
      )
    })

    return Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate)
  }, [chartDataItems, granularity])

  const setPreset = (type: 'day' | 'month' | 'year') => {
    const now = new Date()
    setGranularity(type)
    if (type === 'day') {
      setDateRange({ from: subDays(now, 30), to: now })
    } else if (type === 'month') {
      setDateRange({ from: startOfYear(now), to: endOfYear(now) })
    } else if (type === 'year') {
      setDateRange({ from: subDays(now, 365 * 5), to: now })
    }
  }

  // Only Owner can clear data
  const canClearData = currentProjectRole === 'owner'

  if (!currentProject)
    return <div className="p-8 text-center">Carregando projeto...</div>

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="max-w-[800px]">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
            Gestão da Produção NBS Petróleo e Gás
          </h1>
          <p className="text-muted-foreground mt-2">
            Visão geral da produção do projeto {currentProject.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/project/${currentProject.id}/seals`}>
            <Button className="bg-teal-700 hover:bg-teal-800">
              <LockKeyhole className="mr-2 h-4 w-4" />
              Controle de Lacres
            </Button>
          </Link>

          {/* New Report Button */}
          <Link to={`/project/${currentProject.id}/reports/seals`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Relatórios de Lacre
            </Button>
          </Link>

          <div className="flex items-center border rounded-md bg-background">
            <Button
              variant={granularity === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreset('day')}
              className="rounded-none rounded-l-md px-3"
            >
              Dia
            </Button>
            <Button
              variant={granularity === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreset('month')}
              className="rounded-none px-3"
            >
              Mês
            </Button>
            <Button
              variant={granularity === 'year' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreset('year')}
              className="rounded-none rounded-r-md px-3"
            >
              Ano
            </Button>
          </div>

          <DateRangePicker date={dateRange} setDate={setDateRange} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Gerenciar Dados</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {canClearData && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Dados do Projeto
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Tem certeza que deseja limpar os dados?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os dados de
                        operações e relatórios diários de produção deste projeto
                        serão permanentemente excluídos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearProjectData}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={isClearingData}
                      >
                        {isClearingData ? 'Limpando...' : 'Sim, excluir dados'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar Tanques</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={
                  selectedTankIds.length === currentProject.tanks.length &&
                  currentProject.tanks.length > 0
                }
                onCheckedChange={(checked) =>
                  checked ? handleSelectAllTanks() : handleClearTanks()
                }
              >
                Todos os Tanques
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {currentProject.tanks.map((tank) => (
                <DropdownMenuCheckboxItem
                  key={tank.id}
                  checked={selectedTankIds.includes(tank.id)}
                  onCheckedChange={() => handleTankToggle(tank.id)}
                >
                  {tank.tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProductionMetricsCards metrics={metrics} />

      <ProductionEvolutionChart data={chartData} granularity={granularity} />

      <DailyProductionOverview
        reports={dailyReports}
        isLoading={isLoadingReports}
        groupByField={groupByField}
        onGroupByFieldChange={setGroupByField}
        onExport={handleExportCsv}
        isExporting={isExporting}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        tanks={currentProject.tanks}
      />
    </div>
  )
}
