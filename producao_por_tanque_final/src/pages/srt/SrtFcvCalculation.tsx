import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { fcvLogService, FcvLogEntry } from '@/services/fcvLogService'
import {
  calculateCrudeApi11To20,
  Api11CrudeResult,
  ALGORITHM_VERSION,
} from '@/lib/api11_1_crude'
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
  Activity,
  ArrowDown,
  Loader2,
  BookOpen,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

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
    .min(0.6, 'A massa específica deve ser no mínimo 0.600 g/cm³.')
    .max(1.1, 'A massa específica deve ser no máximo 1.100 g/cm³.'),
  pressaoKpag: z.coerce
    .number({
      invalid_type_error: 'A pressão deve ser um número.',
    })
    .min(0, 'Pressão deve ser positiva.')
    .optional()
    .default(0),
})

type FormValues = z.infer<typeof formSchema>

const COEFFICIENTS_TABLE = [
  { k: 'K₀', value: '341,0957' },
  { k: 'K₁', value: '0,0' },
  { k: 'K₂', value: '0,0' },
]

export default function SrtFcvCalculation() {
  const { user } = useAuth()
  const [result, setResult] = useState<Api11CrudeResult | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<FcvLogEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tempFluidoC: undefined,
      massaEspecificaObsGcCm3: undefined,
      pressaoKpag: 0,
    },
  })

  const fetchHistory = useCallback(async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const { data } = await fcvLogService.getLogs(user.id, 10)
      setHistory(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }, [user])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    setCalcError(null)
    setResult(null)

    try {
      // Local Calculation using the project library
      const res = calculateCrudeApi11To20({
        tempFluidoC: data.tempFluidoC,
        massaEspObs_gcc: data.massaEspecificaObsGcCm3,
      })

      setResult(res)

      if (user) {
        await fcvLogService.logCalculation({
          userId: user.id,
          fluidTempC: data.tempFluidoC,
          observedDensityGcm3: data.massaEspecificaObsGcCm3,
          densityAt20cGcm3: res.density20_gcc,
          fcv: res.fcv20,
          pressureKpag: data.pressaoKpag,
          algorithmVersion: ALGORITHM_VERSION,
          appliedNorm: 'API MPMS 11.1 (Local)',
        })
        fetchHistory()
      }
    } catch (error: any) {
      setCalcError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Cálculo do FCV (SRT)
        </h1>
        <p className="text-muted-foreground mt-1">
          Ferramenta local para cálculo de Fator de Correção de Volume e
          Densidade (API 11.1).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Parâmetros de Entrada
              </CardTitle>
              <CardDescription>
                Informe as condições medidas em campo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="massaEspecificaObsGcCm3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Massa Específica Obs. (g/cm³)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Ex: 0.920"
                              className="pl-9"
                              type="number"
                              step="0.0001"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pressaoKpag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pressão (kPa g)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Activity className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Ex: 0"
                              className="pl-9"
                              type="number"
                              step="0.1"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Opcional. Padrão: 0 (Atmosférica)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {calcError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>{calcError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Calcular'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico Recente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Carregando...
                </div>
              ) : history.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum cálculo recente.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs text-right">
                          Temp
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          Dens.
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          FCV
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(parseISO(log.calculatedAt), 'dd/MM HH:mm')}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {log.fluidTempC.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {log.densityAt20cGcm3.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-right font-medium">
                            {log.fcv.toFixed(6)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              <Card className="bg-primary/5 border-primary/20 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">
                    Resultados do Cálculo
                  </CardTitle>
                  <CardDescription>
                    Norma Aplicada: API MPMS 11.1 (Local)
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResultItem
                    label="FCV (CTPL)"
                    value={result.fcv20.toFixed(6)}
                    highlight
                  />
                  <ResultItem
                    label="Densidade @ 20°C"
                    value={result.density20_gcc.toFixed(4)}
                    unit="g/cm³"
                    highlight
                  />
                  <ResultItem
                    label="CTL (Correção Temp)"
                    value={result.ctl_60_to_20.toFixed(6)}
                  />
                  <ResultItem
                    label="CPL (Correção Pressão)"
                    value={'1.000000'}
                    subtext="Pressão Atmosférica"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Memorial de Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        Dados de Entrada
                      </h4>
                      <div className="rounded-md border p-3 bg-muted/10 space-y-1">
                        <div className="flex justify-between">
                          <span>Temperatura Obs.</span>
                          <span className="font-mono font-medium">
                            {form.getValues('tempFluidoC')} °C
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Densidade Obs.</span>
                          <span className="font-mono font-medium">
                            {form.getValues('massaEspecificaObsGcCm3')} g/cm³
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pressão</span>
                          <span className="font-mono font-medium">
                            {form.getValues('pressaoKpag')} kPa
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        Fatores Intermediários
                      </h4>
                      <div className="rounded-md border p-3 bg-muted/10 space-y-1">
                        <div className="flex justify-between">
                          <span>
                            Densidade Base (&rho;<sub>60</sub>)
                          </span>
                          <span className="font-mono font-medium">
                            {result.rho60_kgm3.toFixed(2)} kg/m³
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            Coef. Expansão (&alpha;<sub>60</sub>)
                          </span>
                          <span className="font-mono font-medium">
                            {result.alpha60.toFixed(7)} 1/°F
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border p-4 bg-muted/30 mt-4">
                    <h4 className="font-semibold mb-2">Resumo da Fórmula</h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">
                          1. Determinação de &rho;<sub>60</sub>:
                        </span>{' '}
                        Iteração convergente a partir de &rho;<sub>obs</sub> e T
                        <sub>obs</sub>.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          2. Cálculo do CTL:
                        </span>{' '}
                        VCF a partir de &rho;<sub>60</sub> para T<sub>obs</sub>{' '}
                        (API 11.1).
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          3. Cálculo do CPL:
                        </span>{' '}
                        Considerado unitário (1.0) para pressão atmosférica.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          4. FCV (CTPL):
                        </span>{' '}
                        Produto CTL &times; CPL.
                      </p>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-muted-foreground/20">
                        <ArrowDown className="h-4 w-4" />
                        <span className="font-mono font-bold text-foreground">
                          &rho;<sub>20</sub> = &rho;<sub>obs</sub> / FCV
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg min-h-[300px] text-muted-foreground bg-muted/5">
              <div className="text-center p-6">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">Aguardando Cálculo</h3>
                <p className="max-w-sm">
                  Preencha os parâmetros à esquerda e clique em "Calcular" para
                  visualizar os resultados e o memorial técnico.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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
                <strong>Pressão:</strong> Pressão atmosférica, considerada como
                0 kPa(g). Assume-se que o efeito da pressão no líquido (CPL) é
                unitário.
              </li>
              <li>
                <strong>CTPL:</strong> Fator de Correção Combinado é
                numericamente igual ao CTL (
                <em>Correction for Temperature on Liquid</em>), dado que CPL =
                1.
              </li>
              <li>
                <strong>Referência fiscal:</strong> Temperatura de 20 °C.
              </li>
            </ul>
          </section>

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
                <li>
                  <strong>Pressão de referência:</strong> pressão atmosférica (0
                  kPa(g)).
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

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                7
              </span>
              Conformidade regulatória
            </h3>
            <ul className="grid grid-cols-1 gap-2">
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                atende às disposições da Resolução Conjunta ANP/Inmetro nº
                01/2013;
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground items-start">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                utiliza exclusivamente normas técnicas reconhecidas pela ANP
                (API 11.1);
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
