import { useState, useEffect, useMemo, useCallback } from 'react'
import { useProject } from '@/context/ProjectContext'
import { operationService } from '@/services/operationService'
import { DailyProductionReport, TankOperation } from '@/lib/types'
import {
  getProductionDayWindow,
  calculateDailyMetrics,
} from '@/lib/calculations'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Check,
  Lock,
  RefreshCw,
  X,
  PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DailyReportViewProps {
  tankId: string
  initialDate: Date
  onClearSelection: () => void
  isViewer?: boolean
  initialWellId?: string
}

export function DailyReportView({
  tankId,
  initialDate,
  onClearSelection,
  isViewer = false,
  initialWellId,
}: DailyReportViewProps) {
  const {
    currentProject,
    wells,
    getReportByDate,
    closeReport,
    createDailyReport,
  } = useProject()
  const [date, setDate] = useState<Date>(initialDate)
  const tank = currentProject?.tanks.find((item) => item.id === tankId)
  const eligibleWells = useMemo(
    () =>
      wells.filter(
        (well) => well.productionFieldId === tank?.productionFieldId,
      ),
    [tank?.productionFieldId, wells],
  )
  const [wellId, setWellId] = useState(
    initialWellId || tank?.wellId || eligibleWells[0]?.id || '',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<DailyProductionReport | null>(null)
  const [operations, setOperations] = useState<TankOperation[]>([])
  const [isCreatingReport, setIsCreatingReport] = useState(false)

  // Need to reload when initialDate prop changes (e.g. clicking View from history)
  useEffect(() => {
    setDate(initialDate)
    setWellId(initialWellId || tank?.wellId || eligibleWells[0]?.id || '')
  }, [eligibleWells, initialDate, initialWellId, tank?.wellId])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Check if closed report exists
      if (!wellId) {
        setReport(null)
        setOperations([])
        return
      }
      const existingReport = await getReportByDate(tankId, date, wellId)
      setReport(existingReport)

      // 2. Load operations for the window
      const { start, end } = getProductionDayWindow(date)

      const allOps = await operationService.getOperations(tankId)

      const filteredOps = allOps.filter((op) => {
        const opTime = new Date(op.endTime).getTime()
        return (
          op.wellId === wellId &&
          opTime >= start.getTime() &&
          opTime <= end.getTime()
        )
      })

      setOperations(filteredOps)
    } finally {
      setLoading(false)
    }
  }, [tankId, date, getReportByDate, wellId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const calculatedMetrics = useMemo(() => {
    const { start, end } = getProductionDayWindow(date)
    const opsMetrics = calculateDailyMetrics(operations)

    if (report) {
      return {
        ...opsMetrics,
        stockVariation: report.stockVariation,
        drained: report.drainedVolumeM3,
        transferred: report.transferredVolumeM3,
        wellProduction: report.calculatedWellProductionM3,
        totalBswPercent: report.totalBswPercent,
        emulsionBswPercent: report.emulsionBswPercent,
        fluidTempC: report.fluidTempC,
        densityAt20cGcm3:
          report.densityAt20cGcm3 ?? opsMetrics.densityAt20cGcm3,
        fcv: report.fcv,
        fe: report.fe,
        tempCorrectionFactorY: report.tempCorrectionFactorY,
        correctedOilVolume: report.correctedOilVolumeM3,
        emulsionWaterVolume: report.emulsionWaterVolumeM3,
        uncorrectedOilVolume: report.uncorrectedOilVolumeM3,
        transferFluidTemp: report.fluidTempC,
        transferObservedDensityGcm3:
          report.transferObservedDensityGcm3 ??
          opsMetrics.transferObservedDensityGcm3,
        window: {
          start: new Date(report.startDatetime),
          end: new Date(report.endDatetime),
        },
      }
    }

    return {
      ...opsMetrics,
      window: { start, end },
    }
  }, [operations, report, date])

  const handleCloseReport = async () => {
    if (isViewer) return
    if (
      !confirm(
        'Tem certeza que deseja fechar a produção deste dia? Esta ação não pode ser desfeita.',
      )
    )
      return

    const { start, end } = getProductionDayWindow(date)
    const metrics = calculateDailyMetrics(operations)

    const newReport: Omit<
      DailyProductionReport,
      'id' | 'createdAt' | 'closedAt'
    > = {
      tankId,
      wellId,
      reportDate: format(date, 'yyyy-MM-dd'),
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
      status: 'closed',
      stockVariation: metrics.stockVariation,
      drainedVolumeM3: metrics.drained,
      transferredVolumeM3: metrics.transferred,
      calculatedWellProductionM3: metrics.wellProduction,
      totalBswPercent: metrics.totalBswPercent,
      uncorrectedOilVolumeM3: metrics.uncorrectedOilVolume,
      emulsionWaterVolumeM3: metrics.emulsionWaterVolume,
      tempCorrectionFactorY: metrics.tempCorrectionFactorY,
      correctedOilVolumeM3: metrics.correctedOilVolume,
      emulsionBswPercent: metrics.emulsionBswPercent,
      fluidTempC: metrics.fluidTempC,
      fcv: metrics.fcv,
      fe: metrics.fe,
      densityAt20cGcm3: metrics.densityAt20cGcm3,
      transferObservedDensityGcm3: metrics.transferObservedDensityGcm3,
    }

    await closeReport(newReport)
    await loadData()
  }

  const handleCreateDraft = async () => {
    if (isViewer) return
    try {
      setIsCreatingReport(true)
      await createDailyReport(tankId, date, wellId)
      toast.success('Boletim de medição iniciado (Rascunho).')
      await loadData()
    } catch (e: any) {
      toast.error('Erro ao iniciar boletim: ' + e.message)
    } finally {
      setIsCreatingReport(false)
    }
  }

  const {
    window: { start, end },
  } = calculatedMetrics

  const hasData = report !== null || operations.length > 0
  const hasTransferOps = operations.some((op) => op.type === 'transfer')

  const formatValue = (
    val: number | undefined | null,
    unit = '',
    precision = 2,
  ) => {
    if (!hasData) return 'N/A'
    if (val === undefined || val === null) return '0'
    return `${val.toFixed(precision)} ${unit}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, 'PPP', { locale: ptBR })
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={wellId} onValueChange={setWellId}>
            <SelectTrigger className="w-[220px]" aria-label="Poço do relatório">
              <SelectValue placeholder="Selecione o poço" />
            </SelectTrigger>
            <SelectContent>
              {eligibleWells.map((well) => (
                <SelectItem key={well.id} value={well.id}>
                  {well.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {report ? (
            <Badge
              variant={report.status === 'closed' ? 'secondary' : 'outline'}
              className={cn(
                'gap-1',
                report.status === 'draft' &&
                  'bg-yellow-50 text-yellow-700 border-yellow-200',
              )}
            >
              {report.status === 'closed' ? (
                <>
                  <Lock className="h-3 w-3" /> Fechado
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" /> Em Aberto (Rascunho)
                </>
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              Não Iniciado
            </Badge>
          )}

          {isSameDay(date, initialDate) === false && (
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="mr-2 h-4 w-4" /> Limpar Seleção
            </Button>
          )}
        </div>

        {!isViewer && (
          <>
            {report && report.status === 'draft' && (
              <Button onClick={handleCloseReport}>
                <Check className="mr-2 h-4 w-4" /> Fechar Produção
              </Button>
            )}

            {!report && (
              <Button
                onClick={handleCreateDraft}
                disabled={isCreatingReport}
                variant="outline"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Iniciar Boletim
              </Button>
            )}
          </>
        )}
      </div>

      <Card className="bg-muted/20 border-muted">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Relatório de Produção de {format(date, 'dd/MM/yyyy')}
            </span>
            <span>
              Início dia {format(start, 'dd/MM/yyyy')} às {format(start, 'HH')}h
            </span>
            <span>
              Término dia {format(end, 'dd/MM/yyyy')} às {format(end, 'HH')}h
            </span>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground">
          Nenhum dado disponível para a data selecionada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produção do Poço</CardTitle>
              <CardDescription>Resumo da produção do poço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Produção Total do Poço
                </span>
                <span className="font-semibold text-primary">
                  {formatValue(calculatedMetrics.wellProduction, 'm³', 3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Produção de Óleo sem Correção
                </span>
                <span>
                  {formatValue(calculatedMetrics.uncorrectedOilVolume, 'm³', 3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Produção de Água
                </span>
                <span>
                  {formatValue(calculatedMetrics.emulsionWaterVolume, 'm³', 3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">BSW Total</span>
                <span>
                  {formatValue(calculatedMetrics.totalBswPercent, '%', 2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operação de Estoque</CardTitle>
              <CardDescription>Movimentação de estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center h-full">
                <span className="text-sm text-muted-foreground">
                  Variação de Estoque
                </span>
                <span className="text-2xl font-bold">
                  {formatValue(calculatedMetrics.stockVariation, 'm³', 3)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operação de Drenagem</CardTitle>
              <CardDescription>Volume drenado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center h-full">
                <span className="text-sm text-muted-foreground">
                  Volume Total Drenado
                </span>
                <span className="text-2xl font-bold">
                  {formatValue(calculatedMetrics.drained, 'm³', 3)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Operação de Transferência
              </CardTitle>
              <CardDescription>Detalhamento da transferência</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    Volume Transferido
                  </span>
                  <span className="font-medium">
                    {formatValue(calculatedMetrics.transferred, 'm³', 3)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    Água na Emulsão
                  </span>
                  <span className="font-medium">
                    {formatValue(
                      calculatedMetrics.transferWaterVolume,
                      'm³',
                      3,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    Óleo Bruto Transf.
                  </span>
                  <span className="font-medium">
                    {formatValue(
                      calculatedMetrics.transferOilUncorrectedVolume,
                      'm³',
                      3,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    Óleo Corrigido Transf.
                  </span>
                  <span className="font-medium text-primary">
                    {formatValue(
                      calculatedMetrics.transferOilCorrectedVolume,
                      'm³',
                      3,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    BSW Emulsão
                  </span>
                  <span className="font-medium">
                    {formatValue(calculatedMetrics.transferBswPercent, '%')}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    Temp. Fluido (°C)
                  </span>
                  <span className="font-medium">
                    {hasTransferOps &&
                    calculatedMetrics.transferFluidTemp !== null &&
                    calculatedMetrics.transferFluidTemp !== undefined
                      ? formatValue(
                          calculatedMetrics.transferFluidTemp,
                          '°C',
                          1,
                        )
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">
                    Massa Espec. Obs.
                  </span>
                  <span className="font-medium">
                    {formatValue(
                      calculatedMetrics.transferObservedDensityGcm3,
                      'g/cm³',
                      4,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">FCV</span>
                  <span className="font-medium">
                    {formatValue(calculatedMetrics.transferFcv, '', 6)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">FE</span>
                  <span className="font-medium">
                    {formatValue(calculatedMetrics.transferFe, '', 6)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm text-muted-foreground">FTC</span>
                  <span className="font-medium">
                    {formatValue(calculatedMetrics.transferFdt, '', 6)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1 col-span-1 sm:col-span-2 lg:col-span-3">
                  <span className="text-sm text-muted-foreground">Destino</span>
                  <span className="font-medium truncate ml-2">
                    {calculatedMetrics.transferDestinations.length > 0
                      ? calculatedMetrics.transferDestinations.join(', ')
                      : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
