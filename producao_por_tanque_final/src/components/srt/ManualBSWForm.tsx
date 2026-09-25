import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Well } from '@/lib/types'
import { bswService, type ApplicableLabBsw } from '@/services/bswService'
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/context/ProjectContext'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { calculateSrtMeasurement } from '@/lib/srtMeasurements'

const formSchema = z
  .object({
    wellId: z.string().min(1, 'Poço é obrigatório'),
    tankId: z.string().min(1, 'Tanque é obrigatório'),
    measuredAt: z.string().min(1, 'Data e hora são obrigatórias'),
    totalVolumeM3: z.coerce.number().positive('VT deve ser maior que zero'),
    emulsionVolumeM3: z.coerce.number().min(0, 'VE deve ser positivo'),
  })
  .refine((values) => values.emulsionVolumeM3 <= values.totalVolumeM3, {
    message: 'VE não pode ser maior que VT',
    path: ['emulsionVolumeM3'],
  })

const toSixDecimals = (value: number) => {
  if (!Number.isFinite(value)) return '0.000000'
  return value.toFixed(6)
}

interface ManualBSWFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wells: Well[]
  onSuccess: () => void
}

export function ManualBSWForm({
  open,
  onOpenChange,
  wells,
  onSuccess,
}: ManualBSWFormProps) {
  const { user } = useAuth()
  const { currentProject } = useProject()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      wellId: '',
      tankId: '',
      measuredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      totalVolumeM3: 0,
      emulsionVolumeM3: 0,
    },
  })

  const totalVolumeM3 = form.watch('totalVolumeM3') || 0
  const emulsionVolumeM3 = form.watch('emulsionVolumeM3') || 0
  const selectedTankId = form.watch('tankId')
  const selectedWellId = form.watch('wellId')
  const measuredAt = form.watch('measuredAt')
  const [labBsw, setLabBsw] = useState<ApplicableLabBsw | null>(null)
  const [isLoadingLabBsw, setIsLoadingLabBsw] = useState(false)
  const tankOptions = useMemo(() => {
    return (currentProject?.tanks || [])
      .map((tank) => ({
        tankId: tank.id,
        tankName: tank.tag,
        wellId: tank.wellId,
        productionFieldId: tank.productionFieldId,
      }))
      .sort((a, b) => a.tankName.localeCompare(b.tankName))
  }, [currentProject?.tanks])
  const selectedTank = tankOptions.find((tank) => tank.tankId === selectedTankId)
  const wellOptions = useMemo(
    () =>
      wells
        .filter(
          (well) =>
            !!selectedTank &&
            well.productionFieldId === selectedTank.productionFieldId,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [selectedTank, wells],
  )

  useEffect(() => {
    if (!open || !selectedTankId || !selectedWellId || !measuredAt) {
      setLabBsw(null)
      return
    }

    let active = true
    setIsLoadingLabBsw(true)
    bswService
      .getApplicableLabBsw(
        selectedTankId,
        selectedWellId,
        new Date(measuredAt),
      )
      .then((result) => {
        if (active) setLabBsw(result)
      })
      .catch((error) => {
        console.error('Erro ao buscar BSWe laboratorial:', error)
        if (active) setLabBsw(null)
      })
      .finally(() => {
        if (active) setIsLoadingLabBsw(false)
      })

    return () => {
      active = false
    }
  }, [open, measuredAt, selectedTankId, selectedWellId])

  const calculation = useMemo(() => {
    if (!labBsw || totalVolumeM3 <= 0 || emulsionVolumeM3 > totalVolumeM3) {
      return null
    }
    try {
      return calculateSrtMeasurement({
        initialVolumeM3: 0,
        finalVolumeM3: totalVolumeM3,
        emulsionLevelVolumeM3: totalVolumeM3 - emulsionVolumeM3,
        bswEmulsionPct: labBsw.bswEmulsionPct,
        fcv: 1,
        fe: 1,
        ftc: 1,
        durationHours: 24,
      })
    } catch {
      return null
    }
  }, [emulsionVolumeM3, labBsw, totalVolumeM3])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    if (!labBsw || !calculation) {
      toast.error(
        'Não existe BSWe laboratorial válido para este tanque, poço e data.',
      )
      return
    }
    setIsSubmitting(true)
    try {
      await bswService.createManualEntry({
        tankId: values.tankId,
        wellId: values.wellId,
        date: new Date(values.measuredAt).toISOString(),
        totalVolumeM3: values.totalVolumeM3,
        emulsionVolumeM3: values.emulsionVolumeM3,
        freeWaterVolumeM3: calculation.freeWaterVolumeM3,
        emulsionWaterVolumeM3: calculation.emulsionWaterVolumeM3,
        oilVolumeM3: calculation.uncorrectedOilVolumeM3,
        totalWaterVolumeM3: calculation.totalWaterVolumeM3,
        bswEmulsionPct: labBsw.bswEmulsionPct,
        bswTotalPct: calculation.totalBswPct,
        sourceSrtTestId: labBsw.testId,
        userId: user.id,
      })
      toast.success('Registro de BSW salvo com sucesso!')
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error('Erro ao salvar registro: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Calcular BSW Total</DialogTitle>
          <DialogDescription>
            O BSWe é obtido automaticamente do último resultado laboratorial
            válido até a data da medição.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tankId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanque</FormLabel>
                  <Select
                    onValueChange={(tankId) => {
                      const tank = tankOptions.find(
                        (option) => option.tankId === tankId,
                      )
                      field.onChange(tankId)
                      form.setValue('wellId', tank?.wellId || '', {
                        shouldValidate: true,
                      })
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tanque" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {tankOptions.map((tank) => (
                          <SelectItem key={tank.tankId} value={tank.tankId}>
                            {tank.tankName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      {tankOptions.length === 0 && (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          Nenhum tanque com poço vinculado
                        </div>
                      )}
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
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedTankId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o poço" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {wellOptions.map((well) => (
                          <SelectItem key={well.id} value={well.id}>
                            {well.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="measuredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e hora da medição</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalVolumeM3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VT - Volume Total (m³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emulsionVolumeM3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VE - Volume da Emulsão (m³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>BSWe — Laboratório (%)</FormLabel>
                <FormControl>
                  <Input
                    value={labBsw ? toSixDecimals(labBsw.bswEmulsionPct) : ''}
                    placeholder={isLoadingLabBsw ? 'Buscando...' : 'Sem resultado válido'}
                    readOnly
                  />
                </FormControl>
                <FormDescription>
                  {labBsw
                    ? `Origem: BSW da Emulsão — Laboratório; teste de ${format(new Date(labBsw.testEndAt), 'dd/MM/yyyy HH:mm')} (${labBsw.testId}).`
                    : 'Cadastre primeiro o BSW da emulsão no laboratório.'}
                </FormDescription>
              </FormItem>
              <FormItem>
                <FormLabel>BSWt - BSW Total (%)</FormLabel>
                <FormControl>
                  <Input
                    value={calculation ? toSixDecimals(calculation.totalBswPct) : ''}
                    readOnly
                  />
                </FormControl>
                <FormDescription>Calculado automaticamente.</FormDescription>
              </FormItem>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">VAL</span>
                <div className="font-mono">
                  {toSixDecimals(calculation?.freeWaterVolumeM3 || 0)} m³
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">VAE</span>
                <div className="font-mono">
                  {toSixDecimals(calculation?.emulsionWaterVolumeM3 || 0)} m³
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">VO</span>
                <div className="font-mono">
                  {toSixDecimals(calculation?.uncorrectedOilVolumeM3 || 0)} m³
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">VA</span>
                <div className="font-mono">
                  {toSixDecimals(calculation?.totalWaterVolumeM3 || 0)} m³
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isLoadingLabBsw || !labBsw || !calculation}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Lançamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
