import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { srtService } from '@/services/srtService'
import { useProject } from '@/context/ProjectContext'
import { SrtMobileTank, SrtTankSession } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'

const sessionSchema = z.object({
  tankId: z.string().min(1, 'Tanque é obrigatório'),
  wellId: z.string().min(1, 'Poço é obrigatório'),
  startAt: z.string().min(1, 'Data de início é obrigatória'),
  notes: z.string().optional(),
})

interface NewSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (session: SrtTankSession) => void
  initialSession?: SrtTankSession | null
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onSuccess,
  initialSession,
}: NewSessionDialogProps) {
  const { user } = useAuth()
  const { wells, currentProject } = useProject()
  const [activeTanks, setActiveTanks] = useState<SrtMobileTank[]>([])
  const [loadingTanks, setLoadingTanks] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      tankId: '',
      wellId: '',
      startAt: '',
      notes: '',
    },
  })

  const selectedTankId = form.watch('tankId')
  const selectedTank = activeTanks.find((tank) => tank.id === selectedTankId)
  const isWellLocked = !!selectedTank?.wellId

  const filteredWells = useMemo(() => {
    if (isWellLocked && selectedTank?.wellId) {
      return wells.filter((well) => well.id === selectedTank.wellId)
    }

    return wells
  }, [isWellLocked, selectedTank, wells])
  const wellNameById = useMemo(
    () => new Map(wells.map((well) => [well.id, well.name])),
    [wells],
  )
  const isEditing = !!initialSession

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return ''
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
    if (match) return `${match[1]}T${match[2]}`
    return ''
  }

  useEffect(() => {
    if (!selectedTankId) {
      form.setValue('wellId', '')
      return
    }

    const tank = activeTanks.find((item) => item.id === selectedTankId)
    if (!tank && initialSession?.tankId === selectedTankId) {
      form.setValue('wellId', initialSession.wellId || '')
      return
    }

    if (tank?.wellId) {
      form.setValue('wellId', tank.wellId)
      return
    }

    form.setValue('wellId', '')
  }, [selectedTankId, activeTanks, form, initialSession])

  const loadTanks = useCallback(async () => {
    if (!currentProject) {
      setActiveTanks([])
      return
    }

    try {
      setLoadingTanks(true)
      const data = await srtService.getAvailableTanks(currentProject.id)
      const selectedIsMissing =
        initialSession &&
        !data.some((tank) => tank.id === initialSession.tankId)

      setActiveTanks(
        selectedIsMissing
          ? [
              {
                id: initialSession.tankId,
                projectId: currentProject.id,
                tankName: initialSession.tankName || 'Tanque atual',
                capacity: 0,
                unit: 'm3',
                notes: '',
                active: true,
                wellId: initialSession.wellId,
                createdAt: initialSession.createdAt,
                updatedAt: initialSession.updatedAt,
              },
              ...data,
            ]
          : data,
      )
    } catch (error) {
      console.error('Failed to load tanks:', error)
      toast.error('Erro ao carregar tanques disponíveis.')
    } finally {
      setLoadingTanks(false)
    }
  }, [currentProject, initialSession])

  useEffect(() => {
    if (!open) return

    void loadTanks()

    if (initialSession) {
      form.reset({
        tankId: initialSession.tankId,
        wellId: initialSession.wellId || '',
        startAt: formatDateForInput(initialSession.startAt),
        notes: initialSession.notes || '',
      })
      return
    }

    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    form.reset({
      tankId: '',
      wellId: '',
      startAt: now.toISOString().slice(0, 16),
      notes: '',
    })
  }, [form, initialSession, loadTanks, open])

  const onSubmit = async (values: z.infer<typeof sessionSchema>) => {
    if (!user || !currentProject) return

    const currentSelectedTank = activeTanks.find(
      (tank) => tank.id === values.tankId,
    )
    if (
      currentSelectedTank?.wellId &&
      values.wellId !== currentSelectedTank.wellId
    ) {
      toast.error(
        'O poço selecionado não corresponde ao poço vinculado ao tanque.',
      )
      return
    }

    setIsSubmitting(true)
    try {
      if (initialSession) {
        const nextStartAt = new Date(values.startAt).toISOString()
        await srtService.updateSession(
          initialSession.id,
          {
            projectId: currentProject.id,
            tankId: values.tankId,
            wellId: values.wellId,
            startAt: nextStartAt,
            notes: values.notes,
          },
          user.id,
        )

        const selectedWell = wells.find((well) => well.id === values.wellId)
        const hydratedSession: SrtTankSession = {
          ...initialSession,
          tankId: values.tankId,
          tankName: currentSelectedTank?.tankName || initialSession.tankName,
          wellId: values.wellId,
          wellName: selectedWell?.name,
          startAt: nextStartAt,
          notes: values.notes,
          updatedAt: new Date().toISOString(),
        }

        toast.success('Planejamento atualizado com sucesso!')
        onSuccess(hydratedSession)
        return
      }

      const createdSession = await srtService.startSession(
        currentProject.id,
        values.tankId,
        user.id,
        values.notes,
        new Date(values.startAt).toISOString(),
        values.wellId,
      )

      const selectedWell = wells.find((well) => well.id === values.wellId)
      const hydratedSession: SrtTankSession = {
        ...createdSession,
        tankName: currentSelectedTank?.tankName,
        wellName: selectedWell?.name,
        responsibleUserName: user.email || undefined,
      }

      toast.success('Planejamento criado com sucesso!')
      form.reset()
      onSuccess(hydratedSession)
    } catch (error: any) {
      console.error('Error creating session:', error)
      toast.error('Erro ao criar planejamento: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? 'Editar Planejamento de Teste'
              : 'Novo Planejamento de Teste'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite os dados principais do planejamento selecionado.'
              : 'Crie uma nova sessao de teste associando um tanque a um poco. Somente tanques disponiveis sem planejamento ativo serao listados.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tankId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanque</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingTanks}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingTanks
                                ? 'Carregando...'
                                : 'Selecione o tanque'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id}>
                            {tank.tankName}
                            {tank.wellId
                              ? ` - ${wellNameById.get(tank.wellId) || 'poço vinculado'}`
                              : ''}
                            {tank.capacity > 0
                              ? ` (${tank.capacity} ${tank.unit})`
                              : ''}
                          </SelectItem>
                        ))}
                        {!loadingTanks && activeTanks.length === 0 && (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Nenhum tanque ativo disponível
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
                    <div className="flex items-center gap-2">
                      <FormLabel>Poço</FormLabel>
                      {isWellLocked && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o poço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredWells.map((well) => (
                          <SelectItem key={well.id} value={well.id}>
                            {well.name}
                          </SelectItem>
                        ))}
                        {filteredWells.length === 0 && (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Nenhum poço disponível
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {isWellLocked && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Vinculado automaticamente ao tanque.
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre o planejamento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Salvando...' : 'Criando...'}
                  </>
                ) : isEditing ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Planejamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
