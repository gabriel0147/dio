import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import { checklistService } from '@/services/checklistService'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react'
import { format } from 'date-fns'

const checklistSchema = z.object({
  // Identification
  fieldId: z.string().min(1, 'Campo é obrigatório'),
  wellId: z.string().min(1, 'Poço é obrigatório'),
  date: z.string(),

  // Safety
  safetyEpi: z.boolean(),
  safetyAreaSafe: z.boolean(),
  safetyLeakVisible: z.boolean(),
  safetyObservation: z.string().optional(),

  // Equipment
  pumpingUnitOn: z.boolean(),
  pumpingUnitNormal: z.boolean(),
  pumpingUnitNoiseVibration: z.boolean(),
  pumpingUnitAbnormalType: z.string().optional(),

  motorOperating: z.boolean(),
  reducerNoLeak: z.boolean(),
  oilLevelStatus: z.enum(['ok', 'atencao']),

  // Operation
  hoursOperating: z.coerce.number().min(0).max(24),
  hasStopped: z.boolean(),
  stopReason: z.string().optional(),

  // Sonolog
  elevationMethod: z.enum(['bcp', 'bm']),

  // Common Sonolog Fields
  freqHz: z.coerce.number().optional(),
  rotationRpm: z.coerce.number().optional(),
  currentA: z.coerce.number().optional(),
  torquePercent: z.coerce.number().optional(),
  ptBar: z.coerce.number().optional(),
  prBar: z.coerce.number().optional(),
  subGasM: z.coerce.number().optional(),
  subNoGasM: z.coerce.number().optional(),

  // BM Specific
  bmCpm: z.coerce.number().optional(),
  bmEfficiencyPercent: z.coerce.number().optional(),
  bmPdM3d: z.coerce.number().optional(),
  bmRodsPercent: z.coerce.number().optional(),
  bmPprlLb: z.coerce.number().optional(),
  bmMprlLb: z.coerce.number().optional(),
  bmPeakTorque: z.coerce.number().optional(),
  bmDiffPercent: z.coerce.number().optional(),

  // Anomalies
  anomalyPumpBeat: z.boolean(),
  anomalyIrregularProduction: z.boolean(),
  anomalyAbnormalReturn: z.boolean(),
  anomalyAbnormalNoise: z.boolean(),
  anomalyMechanicalIssue: z.boolean(),
  anomalyElectricalIssue: z.boolean(),
  anomalyNone: z.boolean(),
  anomalyObservation: z.string().optional(),
})

interface ChecklistFormProps {
  tankId: string
  onSuccess: () => void
}

export function ChecklistForm({ tankId, onSuccess }: ChecklistFormProps) {
  const { currentProject, productionFields, wells } = useProject()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Find associated data
  const tank = currentProject?.tanks.find((t) => t.id === tankId)

  const form = useForm<z.infer<typeof checklistSchema>>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      fieldId: tank?.productionFieldId || '',
      wellId: tank?.wellId || '',
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      safetyEpi: true,
      safetyAreaSafe: true,
      safetyLeakVisible: false,
      pumpingUnitOn: true,
      pumpingUnitNormal: true,
      pumpingUnitNoiseVibration: false,
      motorOperating: true,
      reducerNoLeak: true,
      oilLevelStatus: 'ok',
      hoursOperating: 24,
      hasStopped: false,
      elevationMethod: 'bcp',
      anomalyNone: true,
      anomalyPumpBeat: false,
      anomalyIrregularProduction: false,
      anomalyAbnormalReturn: false,
      anomalyAbnormalNoise: false,
      anomalyMechanicalIssue: false,
      anomalyElectricalIssue: false,
    },
  })

  // Filter wells based on selected field
  const selectedFieldId = form.watch('fieldId')
  const filteredWells = wells.filter(
    (w) => w.productionFieldId === selectedFieldId,
  )

  // Watch for conditional logic
  const safetyEpi = form.watch('safetyEpi')
  const safetyAreaSafe = form.watch('safetyAreaSafe')
  const safetyLeakVisible = form.watch('safetyLeakVisible')
  const showSafetyWarning = !safetyEpi || !safetyAreaSafe || safetyLeakVisible

  const pumpingUnitNormal = form.watch('pumpingUnitNormal')
  const pumpingUnitNoiseVibration = form.watch('pumpingUnitNoiseVibration')
  const hasStopped = form.watch('hasStopped')
  const elevationMethod = form.watch('elevationMethod')

  const anomalyNone = form.watch('anomalyNone')
  const anomalyPumpBeat = form.watch('anomalyPumpBeat')
  const anomalyIrregularProduction = form.watch('anomalyIrregularProduction')
  const anomalyAbnormalReturn = form.watch('anomalyAbnormalReturn')
  const anomalyAbnormalNoise = form.watch('anomalyAbnormalNoise')
  const anomalyMechanicalIssue = form.watch('anomalyMechanicalIssue')
  const anomalyElectricalIssue = form.watch('anomalyElectricalIssue')

  const hasAnomaly =
    !anomalyNone ||
    anomalyPumpBeat ||
    anomalyIrregularProduction ||
    anomalyAbnormalReturn ||
    anomalyAbnormalNoise ||
    anomalyMechanicalIssue ||
    anomalyElectricalIssue

  // Handle anomaly exclusivity
  useEffect(() => {
    if (
      anomalyNone &&
      (anomalyPumpBeat ||
        anomalyIrregularProduction ||
        anomalyAbnormalReturn ||
        anomalyAbnormalNoise ||
        anomalyMechanicalIssue ||
        anomalyElectricalIssue)
    ) {
      form.setValue('anomalyNone', false)
    }
  }, [
    anomalyPumpBeat,
    anomalyIrregularProduction,
    anomalyAbnormalReturn,
    anomalyAbnormalNoise,
    anomalyMechanicalIssue,
    anomalyElectricalIssue,
    anomalyNone,
    form,
  ])

  const onSubmit = async (values: z.infer<typeof checklistSchema>) => {
    if (!user) return
    setIsSubmitting(true)

    try {
      const safeNum = (val: number | undefined) =>
        isNaN(Number(val)) ? 0 : Number(val)

      await checklistService.createChecklist({
        tankId,
        wellId: values.wellId,
        userId: user.id,
        date: values.date,

        safetyEpi: values.safetyEpi,
        safetyAreaSafe: values.safetyAreaSafe,
        safetyLeakVisible: values.safetyLeakVisible,
        safetyObservation: values.safetyObservation,

        pumpingUnitOn: values.pumpingUnitOn,
        pumpingUnitNormal: values.pumpingUnitNormal,
        pumpingUnitNoiseVibration: values.pumpingUnitNoiseVibration,
        pumpingUnitAbnormalType: values.pumpingUnitAbnormalType,

        motorOperating: values.motorOperating,
        reducerNoLeak: values.reducerNoLeak,
        oilLevelStatus: values.oilLevelStatus,

        hoursOperating: safeNum(values.hoursOperating),
        hasStopped: values.hasStopped,
        stopReason: values.stopReason,

        elevationMethod: values.elevationMethod,
        freqHz: safeNum(values.freqHz),
        rotationRpm: safeNum(values.rotationRpm),
        currentA: safeNum(values.currentA),
        torquePercent: safeNum(values.torquePercent),
        ptBar: safeNum(values.ptBar),
        prBar: safeNum(values.prBar),
        subGasM: safeNum(values.subGasM),
        subNoGasM: safeNum(values.subNoGasM),

        bmCpm: safeNum(values.bmCpm),
        bmEfficiencyPercent: safeNum(values.bmEfficiencyPercent),
        bmPdM3d: safeNum(values.bmPdM3d),
        bmRodsPercent: safeNum(values.bmRodsPercent),
        bmPprlLb: safeNum(values.bmPprlLb),
        bmMprlLb: safeNum(values.bmMprlLb),
        bmPeakTorque: safeNum(values.bmPeakTorque),
        bmDiffPercent: safeNum(values.bmDiffPercent),

        anomalyPumpBeat: values.anomalyPumpBeat,
        anomalyIrregularProduction: values.anomalyIrregularProduction,
        anomalyAbnormalReturn: values.anomalyAbnormalReturn,
        anomalyAbnormalNoise: values.anomalyAbnormalNoise,
        anomalyMechanicalIssue: values.anomalyMechanicalIssue,
        anomalyElectricalIssue: values.anomalyElectricalIssue,
        anomalyNone: values.anomalyNone,
        anomalyObservation: values.anomalyObservation,
      })

      toast.success('Checklist salvo com sucesso!')
      onSuccess()
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderToggle = (
    name: any,
    label: string,
    description?: string,
    invertColor = false,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
          <div className="space-y-0.5">
            <FormLabel className="text-base">{label}</FormLabel>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              className={invertColor ? 'data-[state=checked]:bg-red-500' : ''}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-6 flex items-center gap-2 text-muted-foreground bg-muted/20 p-3 rounded-lg border">
        <Smartphone className="h-5 w-5" />
        <span className="text-sm">
          Checklist Operacional Diário (Mobile First)
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* 1. Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Hora</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Operador</FormLabel>
                  <Input
                    value={user?.email || 'Desconhecido'}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </FormItem>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fieldId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o campo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productionFields.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wellId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poço</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedFieldId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o poço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredWells.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Safety */}
          <Card
            className={showSafetyWarning ? 'border-red-200 bg-red-50/10' : ''}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                2. Segurança (SMS)
                {showSafetyWarning && (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderToggle(
                'safetyEpi',
                'EPI Completo?',
                'Capacete, botas, óculos, luvas',
              )}
              {renderToggle(
                'safetyAreaSafe',
                'Área Segura?',
                'Sem riscos iminentes',
              )}
              {renderToggle(
                'safetyLeakVisible',
                'Vazamento Visível?',
                'Óleo ou gás no local',
                true,
              )}

              {showSafetyWarning && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-red-100 border border-red-200 text-red-800 p-4 rounded-md flex flex-col gap-3">
                    <p className="font-semibold text-sm">
                      Atenção: Condição insegura detectada.
                    </p>
                    <Button
                      variant="destructive"
                      type="button"
                      className="w-full"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" /> Comunicar
                      Supervisão
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name="safetyObservation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observação de Segurança</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descreva o risco ou vazamento..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Equipment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                3. Status dos Equipamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Unidade de Bombeio
                </h4>
                {renderToggle('pumpingUnitOn', 'Unidade Ligada?')}
                {renderToggle(
                  'pumpingUnitNormal',
                  'Funcionamento Geral Normal?',
                )}
                {(!pumpingUnitNormal || pumpingUnitNoiseVibration) && (
                  <FormField
                    control={form.control}
                    name="pumpingUnitAbnormalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Anormalidade</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ruido">Ruído</SelectItem>
                            <SelectItem value="vibracao">Vibração</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {renderToggle(
                  'pumpingUnitNoiseVibration',
                  'Ruído ou Vibração?',
                  undefined,
                  true,
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Motor e Redutor
                </h4>
                {renderToggle('motorOperating', 'Motor Operando?')}
                {renderToggle('reducerNoLeak', 'Redutor sem Vazamento?')}
                <FormField
                  control={form.control}
                  name="oilLevelStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível de Óleo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            className={
                              field.value === 'atencao'
                                ? 'border-yellow-500 bg-yellow-50'
                                : ''
                            }
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ok">OK</SelectItem>
                          <SelectItem value="atencao">ATENÇÃO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Daily Operation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Operação Diária</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hoursOperating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas Operando no Dia</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        max={24}
                        {...field}
                        className="h-12 text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderToggle(
                'hasStopped',
                'Houve Parada?',
                'Se sim, informe o motivo',
                true,
              )}

              {hasStopped && (
                <FormField
                  control={form.control}
                  name="stopReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da Parada</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="eletrica">Elétrica</SelectItem>
                          <SelectItem value="mecanica">Mecânica</SelectItem>
                          <SelectItem value="operacional">
                            Operacional
                          </SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* 5. Sonolog */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Sonolog (Parâmetros)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="elevationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Elevação</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === 'bcp' ? 'default' : 'outline'}
                        onClick={() => field.onChange('bcp')}
                        className="flex-1 h-12"
                      >
                        BCP
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'bm' ? 'default' : 'outline'}
                        onClick={() => field.onChange('bm')}
                        className="flex-1 h-12"
                      >
                        BM (Mecânico)
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="freqHz"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Freq. (Hz)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rotationRpm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rotação (RPM)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corrente (A)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="torquePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Torque (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ptBar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>P.T. (bar)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prBar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>P.R. (bar)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subGasM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub. c/ Gás (m)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subNoGasM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub. s/ Gás (m)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {elevationMethod === 'bm' && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Teste Dinamométrico (BM)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bmCpm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPM</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bmEfficiencyPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Eficiência (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {/* Add other BM fields similarly */}
                    <FormField
                      control={form.control}
                      name="bmPdM3d"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PD (m³/d)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bmRodsPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hastes 0,85 (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bmPprlLb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PPRL (lb)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bmMprlLb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MPRL (lb)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bmPeakTorque"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peak Torque (lb.in)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bmDiffPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dif (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-12" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Anomalies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                6. Anomalias Operacionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="anomalyNone"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked)
                          if (checked) {
                            form.setValue('anomalyPumpBeat', false)
                            form.setValue('anomalyIrregularProduction', false)
                            form.setValue('anomalyAbnormalReturn', false)
                            form.setValue('anomalyAbnormalNoise', false)
                            form.setValue('anomalyMechanicalIssue', false)
                            form.setValue('anomalyElectricalIssue', false)
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Nenhuma Anomalia</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-2 pl-2">
                <FormField
                  control={form.control}
                  name="anomalyPumpBeat"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue('anomalyNone', false)
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Checagem excessiva da Bomba de Fundo
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anomalyIrregularProduction"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue('anomalyNone', false)
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Produção irregular
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anomalyAbnormalReturn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue('anomalyNone', false)
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Retorno anormal
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anomalyAbnormalNoise"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue('anomalyNone', false)
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Ruído anormal
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anomalyMechanicalIssue"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue('anomalyNone', false)
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Problema Mecânico
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anomalyElectricalIssue"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue('anomalyNone', false)
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Problema Elétrico
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {hasAnomaly && (
                <FormField
                  control={form.control}
                  name="anomalyObservation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Detalhes da anomalia..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* 7. Save Button (Fixed at Bottom) */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10 md:static md:bg-transparent md:border-0 md:p-0">
            <Button
              size="lg"
              className="w-full h-14 text-lg shadow-lg"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-6 w-6" />
              )}
              SALVAR CHECKLIST
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
