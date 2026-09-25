import { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SrtWellTest, SrtTankSession } from '@/lib/types'
import { srtService } from '@/services/srtService'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import {
  Loader2,
  Calendar,
  ClipboardCheck,
  Beaker,
  Flame,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionDetailsDialogProps {
  sessionId: string | null
  session?: SrtTankSession // Context for the header
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SessionDetailsDialog({
  sessionId,
  session,
  open,
  onOpenChange,
}: SessionDetailsDialogProps) {
  const [tests, setTests] = useState<SrtWellTest[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && sessionId) {
      setLoading(true)
      srtService
        .getTests(sessionId)
        .then(setTests)
        .catch((err) => console.error('Failed to fetch tests:', err))
        .finally(() => setLoading(false))
    } else {
      setTests([])
    }
  }, [open, sessionId])

  const processedTests = useMemo(() => {
    return tests.map((test) => {
      const start = parseISO(test.testStartAt)
      const end = parseISO(test.testEndAt)
      const durationMin = differenceInMinutes(end, start)
      const durationH = durationMin / 60

      const safeDuration = durationH > 0 ? durationH : 0

      // Projections (24h)
      const potLiq24h =
        safeDuration > 0 ? (test.vLiqTest / safeDuration) * 24 : 0
      const potOil24h =
        safeDuration > 0 ? (test.vOilTest / safeDuration) * 24 : 0
      const potWat24h =
        safeDuration > 0 ? (test.vWatTest / safeDuration) * 24 : 0

      // BSW Total Calculation: (v_wat_test / v_liq_test) * 100
      const bswTotalPct =
        test.vLiqTest > 0 ? (test.vWatTest / test.vLiqTest) * 100 : 0

      return {
        ...test,
        durationH,
        potLiq24h,
        potOil24h,
        potWat24h,
        bswTotalPct,
      }
    })
  }, [tests])

  const formatNum = (val: number | undefined | null, decimals = 2) => {
    if (val === undefined || val === null) return '-'
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatDateTime = (isoString: string) => {
    try {
      return format(parseISO(isoString), 'dd/MM/yyyy HH:mm')
    } catch {
      return isoString
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valido':
        return <Badge className="bg-green-600 hover:bg-green-700">Válido</Badge>
      case 'vigente':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Vigente</Badge>
      case 'invalido':
        return <Badge variant="destructive">Inválido</Badge>
      default:
        return <Badge variant="secondary">Rascunho</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex flex-col gap-2">
            <span className="text-xl">Histórico Detalhado de Medições</span>
            {session && (
              <div className="flex flex-wrap gap-4 text-sm font-normal text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Beaker className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Tanque:</span>
                  {session.tankName}
                </div>
                {session.wellName && (
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-foreground">Poço:</span>
                    {session.wellName}
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-foreground">Início:</span>
                  {formatDateTime(session.startAt)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Status:</span>
                  {!session.endAt ? (
                    <Badge className="bg-green-600">Aberto</Badge>
                  ) : (
                    <Badge variant="secondary">Concluído</Badge>
                  )}
                </div>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            Medições e potenciais calculados para o planejamento selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 pt-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : processedTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20 h-40">
              <ClipboardCheck className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-lg font-medium">
                Nenhuma medição encontrada para esta sessão
              </p>
            </div>
          ) : (
            <div className="rounded-md border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[160px]">
                      Período / Duração
                    </TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="text-right min-w-[100px]">
                      Vol. Obs.
                      <br />
                      Líq (m³)
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">
                      Vol. Obs.
                      <br />
                      Óleo (m³)
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">
                      Vol. Obs.
                      <br />
                      Água (m³)
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">
                      Vol. Obs.
                      <br />
                      Gás (m³)
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">
                      BSW Emulsão
                      <br />
                      (%)
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">
                      BSW Total
                      <br />
                      (%)
                    </TableHead>
                    <TableHead className="text-right min-w-[110px] bg-blue-50/50 text-blue-900 dark:text-blue-100 dark:bg-blue-900/20 font-bold border-l">
                      Pot. Líq 24h
                      <br />
                      (m³/d)
                    </TableHead>
                    <TableHead className="text-right min-w-[110px] bg-emerald-50/50 text-emerald-900 dark:text-emerald-100 dark:bg-emerald-900/20 font-bold">
                      Pot. Óleo 24h
                      <br />
                      (m³/d)
                    </TableHead>
                    <TableHead className="text-right min-w-[110px] bg-cyan-50/50 text-cyan-900 dark:text-cyan-100 dark:bg-cyan-900/20 font-bold border-r">
                      Pot. Água 24h
                      <br />
                      (m³/d)
                    </TableHead>
                    <TableHead className="text-center min-w-[140px]">
                      Fatores de Correção
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedTests.map((test) => (
                    <TableRow key={test.id} className="hover:bg-muted/5">
                      <TableCell className="py-2">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold">
                            {formatDateTime(test.testStartAt)}
                          </span>
                          <span className="text-muted-foreground">
                            até {formatDateTime(test.testEndAt)}
                          </span>
                          <Badge
                            variant="outline"
                            className="w-fit mt-1 h-5 text-[10px] px-1.5 border-dashed"
                          >
                            {formatNum(test.durationH)} h
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>

                      {/* Observed Volumes */}
                      <TableCell className="text-right font-mono text-sm">
                        {formatNum(test.vLiqTest)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNum(test.vOilTest)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNum(test.vWatTest)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNum(test.vGasTest)}
                      </TableCell>

                      {/* BSW Emulsion */}
                      <TableCell className="text-right font-mono text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {test.status === 'rascunho' &&
                          (!test.bswEmulsionPct ||
                            test.bswEmulsionPct === 0) ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Aguardando dados de laboratório</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                          <span
                            className={cn(
                              test.status === 'rascunho' && !test.bswEmulsionPct
                                ? 'text-muted-foreground'
                                : 'font-semibold',
                            )}
                          >
                            {formatNum(test.bswEmulsionPct)}%
                          </span>
                        </div>
                      </TableCell>

                      {/* BSW Total */}
                      <TableCell className="text-right font-mono text-sm">
                        <span className="text-muted-foreground">
                          {formatNum(test.bswTotalPct)}%
                        </span>
                      </TableCell>

                      {/* 24h Potentials */}
                      <TableCell className="text-right font-mono text-sm font-bold bg-blue-50/30 dark:bg-blue-900/10 border-l border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300">
                        {formatNum(test.potLiq24h)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300">
                        {formatNum(test.potOil24h)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold bg-cyan-50/30 dark:bg-cyan-900/10 border-r border-cyan-100 dark:border-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                        {formatNum(test.potWat24h)}
                      </TableCell>

                      {/* Correction Factors */}
                      <TableCell>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                          <div className="flex flex-col p-1 bg-muted/30 rounded border">
                            <span className="text-muted-foreground font-semibold scale-90">
                              FCV
                            </span>
                            <span className="font-mono font-medium">
                              {formatNum(test.fcv, 4)}
                            </span>
                          </div>
                          <div className="flex flex-col p-1 bg-muted/30 rounded border">
                            <span className="text-muted-foreground font-semibold scale-90">
                              FE
                            </span>
                            <span className="font-mono font-medium">
                              {formatNum(test.fe, 4)}
                            </span>
                          </div>
                          <div className="flex flex-col p-1 bg-muted/30 rounded border">
                            <span className="text-muted-foreground font-semibold scale-90">
                              FTC
                            </span>
                            <span className="font-mono font-medium">
                              {formatNum(test.ftc ?? test.fdt, 4)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
