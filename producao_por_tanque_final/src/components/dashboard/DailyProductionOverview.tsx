import { useMemo, useState, useEffect, Fragment } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Layers,
  Download,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { DailyProductionReport, Tank } from '@/lib/types'
import { checkAlerts } from '@/lib/alerts'
import { ReportDetailsDialog } from '@/components/reports/ReportDetailsDialog'
import { DateRangePicker } from '@/components/DateRangePicker'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'

interface DailyProductionOverviewProps {
  reports: DailyProductionReport[]
  isLoading: boolean
  groupByField: boolean
  onGroupByFieldChange: (value: boolean) => void
  onExport: () => void
  isExporting: boolean
  dateRange: DateRange | undefined
  onDateRangeChange: (date: DateRange | undefined) => void
  tanks: Tank[]
}

type SortConfig = {
  key: keyof DailyProductionReport | null
  direction: 'asc' | 'desc'
}

const hasMovementValue = (value: number) =>
  Math.abs(Number(value || 0)) > 0.000001

const getReportMovements = (report: DailyProductionReport) => {
  const movements: string[] = []

  if (hasMovementValue(report.stockVariation)) movements.push('Estoque')
  if (hasMovementValue(report.drainedVolumeM3)) movements.push('Drenagem')
  if (hasMovementValue(report.transferredVolumeM3)) {
    movements.push('Transferência')
  }

  return movements
}

export function DailyProductionOverview({
  reports,
  isLoading,
  groupByField,
  onGroupByFieldChange,
  onExport,
  isExporting,
  dateRange,
  onDateRangeChange,
  tanks,
}: DailyProductionOverviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  })
  const [selectedReport, setSelectedReport] =
    useState<DailyProductionReport | null>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, reports])

  const getTankInfo = (tankId: string) => {
    return tanks.find((t) => t.id === tankId)
  }

  // Client-side sort
  const sortedReports = useMemo(() => {
    // Ensure we always have an array to work with, protecting against undefined/null
    const safeReports = Array.isArray(reports) ? reports : []

    if (!sortConfig.key) return safeReports

    return [...safeReports].sort((a, b) => {
      const aVal = a[sortConfig.key!]
      const bVal = b[sortConfig.key!]

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [reports, sortConfig])

  // Pagination logic
  const totalPages = Math.ceil(sortedReports.length / pageSize)
  const paginatedReports = sortedReports.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const handleSort = (key: keyof DailyProductionReport) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const groupedReports = useMemo(() => {
    if (!groupByField) return null

    const groups: Record<string, DailyProductionReport[]> = {}

    // Use paginated list for grouping to respect pagination
    paginatedReports.forEach((report) => {
      const tank = tanks.find((t) => t.id === report.tankId)
      const fieldName = tank?.productionField || 'Sem Campo'
      if (!groups[fieldName]) groups[fieldName] = []
      groups[fieldName].push(report)
    })

    return groups
  }, [paginatedReports, groupByField, tanks])

  const renderSortIcon = (key: keyof DailyProductionReport) => {
    if (sortConfig.key !== key)
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />
    if (sortConfig.direction === 'asc')
      return <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    return <ArrowDown className="h-3 w-3 ml-1 text-primary" />
  }

  const renderHeaderCell = (
    label: string,
    key: keyof DailyProductionReport | 'tankId',
    align = 'right',
  ) => (
    <TableHead
      className={cn(
        'cursor-pointer select-none hover:bg-muted/50',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      onClick={() => handleSort(key as keyof DailyProductionReport)}
    >
      <div
        className={cn(
          'flex items-center gap-1',
          align === 'right' && 'justify-end',
        )}
      >
        {label}
        {renderSortIcon(key as keyof DailyProductionReport)}
      </div>
    </TableHead>
  )

  const renderReportsTable = (data: DailyProductionReport[]) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Tanque</TableHead>
            {renderHeaderCell('Poço', 'wellName', 'left')}
            {renderHeaderCell('Data', 'reportDate', 'left')}
            {renderHeaderCell('Status', 'status', 'left')}
            <TableHead className="min-w-[150px]">Movimento</TableHead>
            <TableHead className="w-[50px]">Alertas</TableHead>
            {renderHeaderCell('Prod. Poço (m³)', 'calculatedWellProductionM3')}
            {renderHeaderCell('Var. Estoque', 'stockVariation')}
            {renderHeaderCell('Drenado', 'drainedVolumeM3')}
            {renderHeaderCell('Transf.', 'transferredVolumeM3')}
            {renderHeaderCell('Óleo Corr.', 'correctedOilVolumeM3')}
            {renderHeaderCell('Óleo s/ Corr.', 'uncorrectedOilVolumeM3')}
            {renderHeaderCell('BSW Emul. (%)', 'emulsionBswPercent')}
            {renderHeaderCell('BSW Total (%)', 'totalBswPercent')}
            {renderHeaderCell('Temp. (°C)', 'fluidTempC')}
            {renderHeaderCell('FCV', 'fcv')}
            {renderHeaderCell('FE', 'fe')}
            {renderHeaderCell('Y', 'tempCorrectionFactorY')}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={19}
                className="h-24 text-center text-xs text-muted-foreground"
              >
                Nenhum relatório encontrado para esta página.
              </TableCell>
            </TableRow>
          ) : (
            data.map((report) => {
              const alerts = checkAlerts(report)
              const movements = getReportMovements(report)
              return (
                <TableRow
                  key={report.id}
                  className="text-xs hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <TableCell className="font-medium">
                    {getTankInfo(report.tankId)?.tag || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {report.wellName || 'Não identificado'}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(report.reportDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="capitalize">
                    {report.status === 'closed' ? 'Fechado' : 'Aberto'}
                  </TableCell>
                  <TableCell>
                    {movements.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {movements.map((movement) => (
                          <span
                            key={movement}
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                              movement === 'Estoque' &&
                                'border-emerald-200 bg-emerald-50 text-emerald-700',
                              movement === 'Drenagem' &&
                                'border-blue-200 bg-blue-50 text-blue-700',
                              movement === 'Transferência' &&
                                'border-amber-200 bg-amber-50 text-amber-700',
                            )}
                          >
                            {movement}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Sem movimento
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {alerts.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <ul className="text-xs space-y-1">
                            {alerts.map((a, idx) => (
                              <li key={idx}>{a.message}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.calculatedWellProductionM3.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.stockVariation.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.drainedVolumeM3.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.transferredVolumeM3.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {report.correctedOilVolumeM3.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.uncorrectedOilVolumeM3.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.emulsionBswPercent.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.totalBswPercent.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.fluidTempC.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.fcv.toFixed(6)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.fe.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.tempCorrectionFactorY.toFixed(6)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    )
  }

  return (
    <>
      <Card className="col-span-4">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <CardTitle>Visão Geral de Produção Diária</CardTitle>
            <CardDescription>
              Acompanhamento detalhado por dia em formato de planilha.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 border rounded-md p-2 bg-background">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Label
                htmlFor="group-toggle"
                className="text-sm font-medium cursor-pointer"
              >
                Agrupar por Campo
              </Label>
              <Switch
                id="group-toggle"
                checked={groupByField}
                onCheckedChange={onGroupByFieldChange}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>

            <DateRangePicker
              date={dateRange}
              setDate={onDateRangeChange}
              className="w-auto"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls: Rows per page */}
          <div className="flex justify-end items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Linhas por página:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : groupByField && groupedReports ? (
              Object.entries(groupedReports).map(([field, fieldReports]) => (
                <div key={field} className="border-b last:border-b-0">
                  <div className="bg-muted/30 px-4 py-2 font-semibold text-sm text-foreground border-b border-muted">
                    Campo: {field}
                  </div>
                  {renderReportsTable(fieldReports)}
                </div>
              ))
            ) : (
              renderReportsTable(paginatedReports)
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center py-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1),
                    )
                    .map((page, i, arr) => {
                      // Add ellipsis logic visual only
                      const prev = arr[i - 1]
                      const showEllipsis = prev && page - prev > 1

                      return (
                        <Fragment key={page}>
                          {showEllipsis && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              isActive={page === currentPage}
                              onClick={() => setCurrentPage(page)}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </Fragment>
                      )
                    })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportDetailsDialog
        report={selectedReport}
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
        tank={selectedReport ? getTankInfo(selectedReport.tankId) : undefined}
      />
    </>
  )
}
