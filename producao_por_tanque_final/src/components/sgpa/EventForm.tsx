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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'
import { sgpaService } from '@/services/sgpaService'
import { srtService } from '@/services/srtService'
import { SgpaEvent, SgpaCause, SgpaAsset, SrtWellTest } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2, Upload, AlertCircle, Info, X } from 'lucide-react'
import { format, differenceInMinutes, parseISO } from 'date-fns'
import {
  SGPA_ATTACHMENT_ACCEPT,
  SGPA_ATTACHMENT_MAX_COUNT,
  validateSgpaAttachment,
} from '@/lib/sgpaAttachments'

const normalizeCauseCategory = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const toDateTimeLocalNow = () => format(new Date(), "yyyy-MM-dd'T'HH:mm")

const normalizeOptionalText = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const eventSchema = z.object({
  wellId: z.string().min(1, 'Poço é obrigatório'),
  eventDate: z.string().min(1, 'Data de referência é obrigatória'),
  eventType: z.enum(['STOP', 'DERATE']),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']),
  startAt: z.string().min(1, 'Início é obrigatório'),
  endAt: z.string().optional(),
  category: z.enum([
    'Operacional',
    'Mecânica',
    'Elétrica',
    'Processo',
    'Externa',
    'Segurança',
    'Medição',
  ]),
  causeId: z.string().optional(),
  assetId: z.string().optional(),
  failureFlag: z.boolean(),
  impactFactor: z.coerce.number().min(0).max(1).optional(),
  workOrderRef: z.string().optional(),
  notes: z.string().optional(),
  estimatedLossM3: z.number().optional(),
})

interface EventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialEvent?: SgpaEvent | null
  preselectedDate?: Date
}

export function EventForm({
  open,
  onOpenChange,
  onSuccess,
  initialEvent,
  preselectedDate,
}: EventFormProps) {
  const { user } = useAuth()
  const { wells } = useProject()
  const [causes, setCauses] = useState<SgpaCause[]>([])
  const [assets, setAssets] = useState<SgpaAsset[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [removedAttachments, setRemovedAttachments] = useState<string[]>([])
  const [wellPotential, setWellPotential] = useState<SrtWellTest | null>(null)
  const [potentialWarning, setPotentialWarning] = useState<string | null>(null)

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      wellId: '',
      eventDate: format(preselectedDate || new Date(), 'yyyy-MM-dd'),
      eventType: 'STOP',
      status: 'OPEN',
      startAt: '',
      endAt: '',
      category: 'Operacional',
      failureFlag: false,
      impactFactor: 1,
      workOrderRef: '',
      notes: '',
      // estimatedLossM3 is undefined by default to show as empty/dash if not calculated
    },
  })

  // Load catalogs
  useEffect(() => {
    if (open) {
      sgpaService.getCauses(true).then(setCauses)
      sgpaService.getAssets(undefined, true).then(setAssets)
    }
  }, [open])

  // Set initial data
  useEffect(() => {
    if (open && initialEvent) {
      form.reset({
        wellId: initialEvent.wellId,
        eventDate: initialEvent.eventDate,
        eventType: initialEvent.eventType,
        status: initialEvent.status,
        startAt: format(new Date(initialEvent.startAt), "yyyy-MM-dd'T'HH:mm"),
        endAt: initialEvent.endAt
          ? format(new Date(initialEvent.endAt), "yyyy-MM-dd'T'HH:mm")
          : '',
        category: initialEvent.category,
        causeId: initialEvent.causeId || undefined,
        assetId: initialEvent.assetId || undefined,
        failureFlag: initialEvent.failureFlag,
        impactFactor: initialEvent.impactFactor ?? 1,
        workOrderRef: initialEvent.workOrderRef || '',
        notes: initialEvent.notes || '',
        estimatedLossM3: initialEvent.estimatedLossM3 ?? undefined,
      })
      setAttachments(initialEvent.attachments || [])
      setPendingFiles([])
      setRemovedAttachments([])
    } else if (open && !initialEvent) {
      form.reset({
        wellId: '',
        eventDate: format(preselectedDate || new Date(), 'yyyy-MM-dd'),
        eventType: 'STOP',
        status: 'OPEN',
        startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endAt: '',
        category: 'Operacional',
        failureFlag: false,
        impactFactor: 1,
        workOrderRef: '',
        notes: '',
        estimatedLossM3: undefined,
      })
      setAttachments([])
      setPendingFiles([])
      setRemovedAttachments([])
      setWellPotential(null)
      setPotentialWarning(null)
    }
  }, [open, initialEvent, preselectedDate, form])

  const selectedWellId = form.watch('wellId')
  const startAt = form.watch('startAt')
  const endAt = form.watch('endAt')
  const eventType = form.watch('eventType')
  const impactFactor = form.watch('impactFactor')

  // Fetch Well Potential from SRT
  useEffect(() => {
    if (selectedWellId) {
      srtService.getWellPotential(selectedWellId).then((test) => {
        setWellPotential(test)
        if (!test) {
          setPotentialWarning(
            'Nenhum teste de potencial (apropriação/vigente) encontrado para este poço. O cálculo de perda não será realizado.',
          )
          // Reset loss if no test found
          form.setValue('estimatedLossM3', undefined)
        } else {
          setPotentialWarning(null)
        }
      })
    } else {
      setWellPotential(null)
      setPotentialWarning(null)
      form.setValue('estimatedLossM3', undefined)
    }
  }, [selectedWellId, form])

  // Calculate Production Loss (IPNP)
  useEffect(() => {
    if (!wellPotential || !startAt || !endAt) {
      // If essential data is missing, we clear the calculated field
      if (!startAt || !endAt) form.setValue('estimatedLossM3', undefined)
      return
    }

    try {
      const start = parseISO(startAt)
      const end = parseISO(endAt)
      const durationMin = differenceInMinutes(end, start)

      if (durationMin <= 0) {
        form.setValue('estimatedLossM3', 0)
        return
      }

      // Calculate Potencial 24h from test
      const testStart = new Date(wellPotential.testStartAt)
      const testEnd = new Date(wellPotential.testEndAt)
      const testDurationH =
        (testEnd.getTime() - testStart.getTime()) / (1000 * 60 * 60)

      if (testDurationH <= 0) {
        form.setValue('estimatedLossM3', 0)
        return
      }

      // Updated Logic: Always use uncorrected oil volume (vOilTest) for loss calculation
      const oilVolume = wellPotential.vOilTest

      const potential24h = (oilVolume / testDurationH) * 24

      let loss = 0
      // Loss Formula: (Daily Oil Production from Test / 24) * Duration of Event in Hours
      // (potential24h / 24) is hourly rate.
      // durationMin / 60 is event duration in hours.
      const hourlyRate = potential24h / 24
      const eventDurationHours = durationMin / 60

      if (eventType === 'STOP') {
        loss = hourlyRate * eventDurationHours
      } else if (eventType === 'DERATE') {
        const factor = impactFactor !== undefined ? impactFactor : 1
        loss = hourlyRate * eventDurationHours * factor
      }

      form.setValue('estimatedLossM3', Number(loss.toFixed(2)))
    } catch (e) {
      console.error('Error calculating loss:', e)
    }
  }, [wellPotential, startAt, endAt, eventType, impactFactor, form])

  // Filter causes by category
  const selectedCategory = form.watch('category')
  const filteredCauses = causes.filter(
    (c) =>
      normalizeCauseCategory(c.category) ===
      normalizeCauseCategory(selectedCategory),
  )

  useEffect(() => {
    const currentCauseId = form.getValues('causeId')
    if (!currentCauseId) return

    const causeStillAvailable = filteredCauses.some(
      (c) => c.id === currentCauseId,
    )
    if (!causeStillAvailable) {
      form.setValue('causeId', '')
    }
  }, [filteredCauses, form, selectedCategory])

  // Filter assets by well
  const filteredAssets = assets.filter((a) => a.wellId === selectedWellId)

  // Conditional Logic
  const failureFlag = form.watch('failureFlag')
  const status = form.watch('status')

  useEffect(() => {
    const currentEndAt = form.getValues('endAt')

    if (status === 'CLOSED' && !currentEndAt) {
      form.setValue('endAt', toDateTimeLocalNow(), { shouldValidate: true })
      return
    }

    if (status !== 'CLOSED' && currentEndAt) {
      form.setValue('endAt', '')
    }
  }, [status, form])

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    e.target.value = ''

    const availableSlots =
      SGPA_ATTACHMENT_MAX_COUNT - attachments.length - pendingFiles.length
    if (availableSlots <= 0) {
      toast.error(`O limite é de ${SGPA_ATTACHMENT_MAX_COUNT} anexos.`)
      return
    }

    const validFiles = selectedFiles.filter((file) => {
      const validationError = validateSgpaAttachment(file)
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`)
        return false
      }
      return true
    })

    const filesToAdd = validFiles.slice(0, availableSlots)
    if (validFiles.length > availableSlots) {
      toast.error(`O limite é de ${SGPA_ATTACHMENT_MAX_COUNT} anexos.`)
    }

    setPendingFiles((current) => [...current, ...filesToAdd])
  }

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    if (!user) return

    // Validation
    if (status === 'CLOSED' && !values.endAt) {
      form.setError('endAt', {
        message: 'Data fim é obrigatória para eventos fechados.',
      })
      return
    }
    if (values.endAt && values.startAt > values.endAt) {
      form.setError('endAt', { message: 'Data fim deve ser após o início.' })
      return
    }
    if (failureFlag && !values.assetId) {
      form.setError('assetId', {
        message: 'Ativo é obrigatório quando há falha.',
      })
      return
    }

    setIsSubmitting(true)
    setUploading(pendingFiles.length > 0)
    const uploadedAttachments: string[] = []
    try {
      for (const file of pendingFiles) {
        uploadedAttachments.push(await sgpaService.uploadAttachment(file))
      }

      const savedAttachments = [...attachments, ...uploadedAttachments]
      const payload = {
        ...values,
        startAt: new Date(values.startAt).toISOString(),
        endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
        causeId: values.causeId || null,
        assetId: values.assetId || null,
        workOrderRef: normalizeOptionalText(values.workOrderRef),
        notes: normalizeOptionalText(values.notes),
        attachments: savedAttachments,
        // Ensure we send null if estimatedLossM3 is undefined (cleared)
        estimatedLossM3:
          values.estimatedLossM3 !== undefined ? values.estimatedLossM3 : null,
      }

      if (initialEvent) {
        await sgpaService.updateEvent(initialEvent.id, payload, user.id)
        toast.success('Evento atualizado.')
      } else {
        await sgpaService.createEvent(payload, user.id)
        toast.success('Evento criado.')
      }

      if (removedAttachments.length > 0) {
        try {
          await sgpaService.removeAttachments(removedAttachments)
        } catch (cleanupError) {
          console.error(
            'Error removing replaced SGPA attachments:',
            cleanupError,
          )
          toast.warning(
            'Evento salvo, mas não foi possível remover todos os anexos antigos.',
          )
        }
      }

      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      if (uploadedAttachments.length > 0) {
        try {
          await sgpaService.removeAttachments(uploadedAttachments)
        } catch (rollbackError) {
          console.error('Error rolling back SGPA attachments:', rollbackError)
        }
      }

      const message =
        e?.message || e?.error_description || 'Erro ao salvar evento.'
      console.error('Error saving SGPA event:', e)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialEvent
              ? 'Editar Evento'
              : 'Registrar Evento (Parada/Restrição)'}
          </DialogTitle>
          <DialogDescription>
            Informe o período, a causa e o impacto operacional do evento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Referência</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                      value={field.value}
                      disabled={!!initialEvent}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wells.map((w) => (
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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPEN">Aberto</SelectItem>
                        <SelectItem value="CLOSED">Fechado</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fim {status === 'OPEN' && '(Opcional)'}
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STOP">Parada (STOP)</SelectItem>
                        <SelectItem value="DERATE">
                          Restrição (DERATE)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {eventType === 'DERATE' && (
                <FormField
                  control={form.control}
                  name="impactFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fator de Impacto (0-1)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="p-4 border rounded-md bg-muted/20 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                Cálculo de Perda de Produção (IPNP)
              </h4>

              {potentialWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>{potentialWarning}</AlertDescription>
                </Alert>
              )}

              {wellPotential && !potentialWarning && (
                <Alert variant="default" className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Baseado no teste de{' '}
                    {format(new Date(wellPotential.testEndAt), 'dd/MM/yyyy')} -
                    V. Óleo (Não Corrigido): {wellPotential.vOilTest} m³
                  </AlertDescription>
                </Alert>
              )}

              {!selectedWellId && (
                <div className="text-xs text-muted-foreground">
                  Selecione um poço para buscar o potencial.
                </div>
              )}

              <FormField
                control={form.control}
                name="estimatedLossM3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perda Estimada (m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly
                        className="bg-muted font-bold"
                        placeholder="-"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria da Causa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          'Operacional',
                          'Mecânica',
                          'Elétrica',
                          'Processo',
                          'Externa',
                          'Segurança',
                          'Medição',
                        ].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                name="causeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Causa Específica</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedCategory}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a causa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCauses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.causeName}
                          </SelectItem>
                        ))}
                        {filteredCauses.length === 0 && (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Nenhuma causa ativa encontrada para esta categoria.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border p-4 rounded-md">
              <FormField
                control={form.control}
                name="failureFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Falha de Equipamento (Failure Flag)</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {failureFlag && (
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ativo Falho</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedWellId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o ativo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAssets.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.tag} ({a.assetType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="workOrderRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem de Serviço (Ref)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: OS-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações / Detalhes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Anexos (Evidências)</FormLabel>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    uploading ||
                    attachments.length + pendingFiles.length >=
                      SGPA_ATTACHMENT_MAX_COUNT
                  }
                  onClick={() =>
                    document.getElementById('sgpa-upload')?.click()
                  }
                >
                  <Upload className="mr-2 h-4 w-4" /> Anexar
                </Button>
                <Input
                  id="sgpa-upload"
                  type="file"
                  accept={SGPA_ATTACHMENT_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={handleFileSelection}
                />
                <span className="text-xs text-muted-foreground">
                  {attachments.length + pendingFiles.length} de{' '}
                  {SGPA_ATTACHMENT_MAX_COUNT} anexos
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, WebP ou PDF, com até 5 MB por arquivo. O envio ocorre
                somente ao salvar.
              </p>

              {(attachments.length > 0 || pendingFiles.length > 0) && (
                <div className="mt-2 space-y-1">
                  {attachments.map((url, index) => (
                    <div
                      key={url}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">Anexo salvo {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover anexo salvo ${index + 1}`}
                        onClick={() => {
                          setAttachments((current) =>
                            current.filter((attachment) => attachment !== url),
                          )
                          setRemovedAttachments((current) => [...current, url])
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {pendingFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${file.name}`}
                        onClick={() =>
                          setPendingFiles((current) =>
                            current.filter(
                              (_, pendingIndex) => pendingIndex !== index,
                            ),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                type="button"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Evento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
