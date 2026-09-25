import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProject } from '@/context/ProjectContext'
import {
  calculateCrudeApi11To20,
  Api11CrudeResult,
  ALGORITHM_VERSION,
} from '@/lib/api11_1_crude'
import { cn } from '@/lib/utils'
import { fcvLogService, FcvLogEntry } from '@/services/fcvLogService'
import { useAuth } from '@/hooks/use-auth'
import { DateRangePicker } from '@/components/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertCircle,
  Calculator,
  Droplets,
  Thermometer,
  FileText,
  BookOpen,
  CheckCircle2,
  Download,
  HardHat,
} from 'lucide-react'
import { toast } from 'sonner'
import { ReasonDialog } from '@/components/ReasonDialog'
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

// Validation Schema
const formSchema = z.object({
  tempFluidoC: z.coerce
    .number({
      required_error: 'A temperatura é obrigatória.',
      invalid_type_error: 'A temperatura deve ser um número.',
    })
    .min(-50, 'Temperatura muito baixa.')
    .max(150, 'Temperatura muito alta.'),
  massaEspecificaObsGcCm3: z.coerce
    .number({
      required_error: 'A massa específica é obrigatória.',
      invalid_type_error: 'A massa específica deve ser um número.',
    })
    .min(0.87, 'A massa específica deve ser no mínimo 0.870 g/cm³.')
    .max(0.999, 'A massa específica deve ser no máximo 0.999 g/cm³.'),
})

type FormValues = z.infer<typeof formSchema>

// Constants for the Memorial
const COEFFICIENTS_TABLE = [
  { k: 'K₀', value: '341,0957' },
  { k: 'K₁', value: '0,0' },
  { k: 'K₂', value: '0,0' },
]

export default function FcvCalculation() {
  const { projectId } = useParams()
  const { projects, currentProject, setCurrentProject } = useProject()
  const { user, role } = useAuth()
  const [result, setResult] = useState<Api11CrudeResult | null>(null)
  const [activeLog, setActiveLog] = useState<FcvLogEntry | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [history, setHistory] = useState<FcvLogEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [pendingCalculation, setPendingCalculation] =
    useState<FormValues | null>(null)
  const [matchingCalculation, setMatchingCalculation] =
    useState<FcvLogEntry | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const recalculateRequestedRef = useRef(false)

  // Export State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [isExporting, setIsExporting] = useState(false)

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tempFluidoC: undefined,
      massaEspecificaObsGcCm3: undefined,
    },
  })

  // Ensure project context is set correctly
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const { data } = await fcvLogService.getLogs(undefined, 10)
      setHistory(data)
    } catch (error) {
      console.error('Erro ao carregar histórico de FCV:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const showExistingCalculation = (log: FcvLogEntry) => {
    setActiveLog(log)
    setResult(
      calculateCrudeApi11To20({
        tempFluidoC: log.fluidTempC,
        massaEspObs_gcc: log.observedDensityGcm3,
      }),
    )
    form.setValue('tempFluidoC', log.fluidTempC)
    form.setValue('massaEspecificaObsGcCm3', log.observedDensityGcm3)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setCalcError(null)
      setActiveLog(null)

      const existingCalculation = await fcvLogService.findMatchingCalculation(
        data.tempFluidoC,
        data.massaEspecificaObsGcCm3,
      )

      if (existingCalculation) {
        setPendingCalculation(data)
        setMatchingCalculation(existingCalculation)
        return
      }

      setPendingCalculation(data)
      setMatchingCalculation(null)
      setReasonOpen(true)
    } catch (error: any) {
      setCalcError(error.message)
      setResult(null)
      setActiveLog(null)
    }
  }

  const executeCalculation = async (reason: string) => {
    if (!pendingCalculation) return

    setIsCalculating(true)
    try {
      const data = pendingCalculation

      const res = calculateCrudeApi11To20({
        tempFluidoC: data.tempFluidoC,
        massaEspObs_gcc: data.massaEspecificaObsGcCm3,
      })
      setResult(res)

      // Automated Logging
      if (user) {
        await fcvLogService.logCalculation({
          userId: user.id,
          fluidTempC: data.tempFluidoC,
          observedDensityGcm3: data.massaEspecificaObsGcCm3,
          densityAt20cGcm3: res.density20_gcc,
          fcv: res.fcv20,
          pressureKpag: 0,
          algorithmVersion: ALGORITHM_VERSION,
          appliedNorm: 'API MPMS 11.1',
          calculationReason: reason,
          requestedByUserId: user.id,
        })
        fetchHistory()
      }
      setReasonOpen(false)
      setPendingCalculation(null)
      setMatchingCalculation(null)
    } catch (error: any) {
      setCalcError(error.message)
      setResult(null)
      setActiveLog(null)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleUseExistingCalculation = () => {
    if (!matchingCalculation) return
    showExistingCalculation(matchingCalculation)
    toast.info('Cálculo existente carregado do histórico.')
    setMatchingCalculation(null)
    setPendingCalculation(null)
  }

  const handleRecalculate = () => {
    recalculateRequestedRef.current = true
    setMatchingCalculation(null)
    setReasonOpen(true)
  }

  const handleExport = async (format: 'csv' | 'json') => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Selecione um período para exportar.')
      return
    }
    setIsExporting(true)
    const toastId = toast.loading('Gerando arquivo de exportação...')
    try {
      const blob = await fcvLogService.exportLogs(
        dateRange.from,
        dateRange.to,
        format,
      )
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fcv_logs_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download iniciado!', { id: toastId })
    } catch (error: any) {
      toast.error('Erro na exportação: ' + error.message, { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando projeto...</p>
        </div>
      </div>
    )
  }

  const isTechnicalRole =
    role === 'petroleum_engineer' || role === 'admin' || role === 'director'

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cálculo do FCV</h1>
          <p className="text-muted-foreground mt-1">
            Calculadora de Fator de Correção de Volume e Documentação Técnica.
          </p>
        </div>
        {role === 'petroleum_engineer' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-semibold">
            <HardHat className="h-4 w-4" />
            Acesso Técnico (Engenharia)
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Parâmetros de Entrada
              </CardTitle>
              <CardDescription>
                Insira a temperatura do fluido e a massa específica observada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="tempFluidoC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperatura do Fluido (°C)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Thermometer className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Ex: 42.5"
                              className="pl-9"
                              type="number"
                              step="0.1"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Temperatura observada no momento da medição.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="massaEspecificaObsGcCm3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Massa Específica Observada (g/cm³)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Ex: 0.920"
                              className="pl-9"
                              type="number"
                              step="0.001"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Valor deve estar entre 0.870 e 0.999.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {calcError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erro no cálculo</AlertTitle>
                      <AlertDescription>{calcError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full">
                    Calcular FCV
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico Recente</CardTitle>
              <CardDescription>
                Últimos cálculos registrados no log fiscal.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Carregando histórico...
                </div>
              ) : history.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Nenhum cálculo recente.
                </div>
              ) : (
                <div className="max-h-[300px] w-full overflow-y-auto">
                  <table className="w-full table-fixed text-xs">
                    <thead className="sticky top-0 z-[1] border-b bg-card">
                      <tr>
                        <th className="w-[82px] px-2 py-3 text-left font-medium text-muted-foreground">
                          Data
                        </th>
                        <th className="px-2 py-3 text-left font-medium text-muted-foreground">
                          Solic.
                        </th>
                        <th className="w-[54px] px-2 py-3 text-right font-medium text-muted-foreground">
                          Temp
                        </th>
                        <th className="w-[62px] px-2 py-3 text-right font-medium text-muted-foreground">
                          Dens.
                        </th>
                        <th className="w-[78px] px-2 py-3 text-right font-medium text-muted-foreground">
                          FCV
                        </th>
                        <th className="w-[42px] px-2 py-3 text-right font-medium text-muted-foreground">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="whitespace-nowrap px-2 py-4">
                            {format(parseISO(log.calculatedAt), 'dd/MM HH:mm')}
                          </td>
                          <td className="truncate px-2 py-4">
                            {log.requestedByName || 'Usuário'}
                          </td>
                          <td className="px-2 py-4 text-right">
                            {log.fluidTempC.toFixed(1)}
                          </td>
                          <td className="px-2 py-4 text-right">
                            {log.observedDensityGcm3.toFixed(4)}
                          </td>
                          <td className="px-2 py-4 text-right font-mono font-medium">
                            {log.fcv.toFixed(6)}
                          </td>
                          <td className="px-1 py-4 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-xs"
                              onClick={() => showExistingCalculation(log)}
                            >
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              <Card className="bg-primary/5 border-primary/20 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">
                    Resultados do Cálculo
                  </CardTitle>
                  <CardDescription>
                    {activeLog
                      ? `Cálculo carregado do histórico em ${format(parseISO(activeLog.calculatedAt), 'dd/MM/yyyy HH:mm')}.`
                      : 'Estimativa baseada nos parâmetros fornecidos (API 11.1).'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResultItem
                    label="FCV (Fator de Correção)"
                    value={result.fcv20.toFixed(6)}
                    highlight
                  />
                  <ResultItem
                    label="Massa Específica a 20°C"
                    value={result.density20_gcc.toFixed(4)}
                    unit="g/cm³"
                    highlight
                  />
                  <ResultItem
                    label="Densidade Base @ 60°F"
                    value={result.rho60_kgm3.toFixed(2)}
                    unit="kg/m³"
                  />
                  <ResultItem
                    label="Coeficiente Alpha (60°F)"
                    value={result.alpha60.toFixed(7)}
                    subtext="1/°F"
                  />
                  {activeLog && (
                    <>
                      <ResultItem
                        label="Solicitante"
                        value={
                          activeLog.requestedByName || 'Usuário registrado'
                        }
                      />
                      <ResultItem
                        label="Motivo"
                        value={activeLog.calculationReason || 'Não informado'}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes da Fórmula</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      Referência:
                    </span>{' '}
                    Base 20.0 °C
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Método:
                    </span>{' '}
                    Iteração de ponto fixo (Newton-like) para convergência de
                    ρ₆₀.
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Alpha (α₆₀):
                    </span>{' '}
                    {result.alpha60.toFixed(7)} (calculado via K₀, K₁, K₂).
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Resultado Final:
                    </span>{' '}
                    A densidade a 20°C ({result.density20_gcc}) é obtida
                    aplicando o fator FCV ({result.fcv20}) sobre a densidade
                    observada ({form.getValues('massaEspecificaObsGcCm3')}).
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[300px] border-dashed">
              <div className="text-center p-6 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum cálculo realizado
                </h3>
                <p>
                  Preencha o formulário ao lado e clique em "Calcular FCV" para
                  ver os resultados aqui.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Export Section - Visible to Technical Roles */}
      {isTechnicalRole && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Cálculos (Fiscal Log)</CardTitle>
            <CardDescription>
              Exporte os logs de todos os cálculos realizados para auditoria e
              conformidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full md:w-auto"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" /> JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Memorandum Section */}
      <Card className="mt-8 border-t-4 border-t-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Documentação Técnica
            </span>
          </div>
          <CardTitle className="text-2xl">
            Memorial Técnico do Método de Correção de Densidade e Volume –
            Petróleo Bruto
          </CardTitle>
          <CardDescription>
            Metodologia detalhada para o cálculo do Fator de Correção de Volume
            (FCV) e padronização da densidade em conformidade regulatória.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                1
              </span>
              Finalidade e enquadramento regulatório
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed text-justify">
              Este documento descreve a metodologia de cálculo utilizada para a
              correção de volumes de petróleo bruto para a condição padrão de
              referência, em conformidade com a{' '}
              <strong>
                Resolução Conjunta ANP/Inmetro nº 01, de 10 de junho de 2013
              </strong>
              . O objetivo é padronizar a quantificação volumétrica fiscal e de
              apropriação, convertendo volumes medidos nas condições observadas
              de temperatura para a temperatura de referência de 20 °C.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                2
              </span>
              Referências normativas
            </h3>
            <div className="rounded-md border p-4 bg-muted/10">
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Resolução Conjunta ANP/Inmetro nº 01/2013:</strong>{' '}
                    Aprova o Regulamento Técnico de Medição de Petróleo e Gás
                    Natural.
                  </span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>API MPMS Chapter 11.1:</strong>{' '}
                    <em>
                      Temperature and Pressure Volume Correction Factors for
                      Generalized Crude Oils, Refined Products, and Lubricating
                      Oils
                    </em>
                    . Norma internacional base para as tabelas de correção.
                  </span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>ASTM D1250:</strong>{' '}
                    <em>
                      Standard Guide for Use of the Petroleum Measurement Tables
                    </em>
                    .
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                3
              </span>
              Produto, instrumento e condições de aplicação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-md bg-card">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Produto
                </span>
                <p className="font-medium">
                  Petróleo Bruto (Crude Oil – Commodity Group A)
                </p>
              </div>
              <div className="p-3 border rounded-md bg-card">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Instrumento
                </span>
                <p className="font-medium">
                  Densímetro (medição de massa específica)
                </p>
              </div>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground ml-2">
              <li>
                <strong>FCV:</strong> Fator de Correção de Volume calculado a
                partir da temperatura do fluido e da massa específica observada.
              </li>
              <li>
                <strong>Referência fiscal:</strong> Temperatura de 20 °C.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                4
              </span>
              Grandezas medidas e dados de entrada
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Os cálculos dependem exclusivamente das seguintes variáveis de
              entrada, obtidas no ponto de medição fiscal:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex items-center gap-3 p-3 border rounded-md bg-muted/20">
                <Thermometer className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-sm">Temp. Fluido (°C)</p>
                  <p className="text-xs text-muted-foreground">
                    Temperatura observada no momento da medição.
                  </p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 p-3 border rounded-md bg-muted/20">
                <Droplets className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-sm">
                    Massa Específica Observada (g/cm³)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Densidade do fluido nas condições observadas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                5
              </span>
              Metodologia de cálculo
            </h3>
            <div className="pl-4 border-l-2 border-muted space-y-6 text-sm">
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  5.1 Conversão de unidades
                </h4>
                <p className="text-muted-foreground">
                  A densidade observada é convertida para kg/m³ para os
                  cálculos:
                </p>
                <div className="mt-2 font-mono bg-muted/30 p-2 rounded inline-block">
                  ρ<sub>obs</sub> [kg/m³] = ρ<sub>obs</sub> [g/cm³] × 1000
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">
                  5.2 Determinação da densidade a 60 °F (ρ₆₀)
                </h4>
                <p className="text-muted-foreground text-justify">
                  Utiliza-se um processo iterativo para determinar a densidade
                  base a 60 °F a partir da densidade e temperatura observadas,
                  respeitando a relação fundamental:
                </p>
                <div className="mt-2 font-mono bg-muted/30 p-2 rounded inline-block">
                  ρ<sub>obs</sub> = ρ<sub>60</sub> · CTL<sub>60→Tobs</sub>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">
                  5.3 Cálculo do coeficiente térmico de expansão α₆₀
                </h4>
                <p className="text-muted-foreground mb-2">
                  Para Petróleo Bruto (Grupo A), o coeficiente é calculado pela
                  fórmula:
                </p>
                <div className="font-mono bg-muted/30 p-2 rounded inline-block mb-3">
                  α<sub>60</sub> = K₀/ρ<sub>60</sub>² + K₁/ρ<sub>60</sub> + K₂
                </div>
                <div className="max-w-sm border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-24">Coeficiente</TableHead>
                        <TableHead>Valor (Grupo A)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {COEFFICIENTS_TABLE.map((row) => (
                        <TableRow key={row.k}>
                          <TableCell className="font-mono font-medium">
                            {row.k}
                          </TableCell>
                          <TableCell>{row.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">
                  5.4 Cálculo do CTL (Correction for Temperature of Liquid)
                </h4>
                <p className="text-muted-foreground mb-2">
                  O fator de correção é obtido pela exponencial:
                </p>
                <div className="font-mono bg-muted/30 p-2 rounded inline-block mb-3">
                  CTL = exp{`{-x · [1 + 0,8x + y]}`}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                  <div className="bg-muted/10 p-2 rounded">
                    <strong>x</strong> = CT · α<sub>60</sub> · (T - T
                    <sub>base</sub>)
                  </div>
                  <div className="bg-muted/10 p-2 rounded">
                    <strong>y</strong> = CT · α<sub>60</sub> · δT
                  </div>
                  <div className="bg-muted/10 p-2 rounded">
                    <strong>δT</strong> = 2 · (T<sub>base</sub> - T<sub>60</sub>
                    )
                  </div>
                  <div className="bg-muted/10 p-2 rounded">
                    <strong>CT</strong> = 9/5 (Fator de escala)
                  </div>
                  <div className="bg-muted/10 p-2 rounded">
                    <strong>
                      T<sub>60</sub>
                    </strong>{' '}
                    = 15,56 °C
                  </div>
                  <div className="bg-muted/10 p-2 rounded">
                    <strong>
                      T<sub>base</sub>
                    </strong>{' '}
                    = 20,0 °C
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">
                  5.5 Cálculo da densidade corrigida para 20 °C
                </h4>
                <div className="font-mono bg-muted/30 p-2 rounded inline-block">
                  ρ<sub>20</sub> = ρ<sub>60</sub> · CTL<sub>60→20</sub>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">
                  5.6 Cálculo do Fator de Correção de Volume (FCV)
                </h4>
                <p className="text-muted-foreground">
                  O FCV para a condição de 20 °C é a razão entre a densidade
                  observada e a densidade a 20 °C (conservação de massa):
                </p>
                <div className="mt-2 font-mono bg-muted/30 p-2 rounded inline-block">
                  FCV<sub>20</sub> = ρ<sub>obs</sub> / ρ<sub>20</sub>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                6
              </span>
              Base de referência metrológica
            </h3>
            <div className="rounded-md border p-4 bg-muted/10">
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Temperatura de referência:</strong> 20 °C, conforme
                  declarado no RTM;
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4 text-justify leading-relaxed">
                A temperatura ambiente não é utilizada como referência de
                correção, uma vez que a Resolução Conjunta ANP/Inmetro nº
                01/2013 exige que a correção volumétrica seja realizada em
                relação à condição de referência declarada no RTM, e não à
                condição ambiental.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                7
              </span>
              Conformidade regulatória
            </h3>
            <p className="text-sm text-muted-foreground mb-2 font-medium">
              O método de cálculo descrito:
            </p>
            <ul className="grid grid-cols-1 gap-2">
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                atende às disposições da Resolução Conjunta ANP/Inmetro nº
                01/2013;
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                utiliza exclusivamente normas técnicas reconhecidas pela ANP;
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                é determinístico, rastreável, reproduzível e auditável;
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                não admite intervenção manual ou ajuste de parâmetros pelo
                operador;
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                é compatível com aplicações de medição fiscal, balanço de
                produção e transferência de custódia, desde que integrado a um
                sistema de medição aprovado.
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!matchingCalculation}
        onOpenChange={(open) => {
          if (!open) {
            if (recalculateRequestedRef.current) {
              recalculateRequestedRef.current = false
              return
            }
            setMatchingCalculation(null)
            setPendingCalculation(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cálculo já existente</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um registro fiscal com os mesmos parâmetros. Você pode
              usar o resultado existente ou refazer o cálculo informando um novo
              motivo de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleUseExistingCalculation}>
              Usar existente
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRecalculate}>
              Refazer cálculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReasonDialog
        open={reasonOpen}
        onOpenChange={(open) => {
          setReasonOpen(open)
          if (!open && !isCalculating) setPendingCalculation(null)
        }}
        onConfirm={executeCalculation}
        title="Motivo do cálculo FCV"
        description="Informe o motivo para registrar este cálculo no histórico fiscal."
        confirmLabel="Calcular e registrar"
        loading={isCalculating}
      />
    </div>
  )
}

function ResultItem({
  label,
  value,
  unit,
  subtext,
  highlight = false,
}: {
  label: string
  value: string | number
  unit?: string
  subtext?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-card',
        highlight ? 'border-primary/30 bg-primary/5' : 'border-border',
      )}
    >
      <div className="text-sm font-medium text-muted-foreground mb-1">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-bold tracking-tight',
          highlight ? 'text-primary' : 'text-card-foreground',
        )}
      >
        {value}
        {unit && (
          <span className="text-sm font-normal ml-1 text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
      )}
    </div>
  )
}
