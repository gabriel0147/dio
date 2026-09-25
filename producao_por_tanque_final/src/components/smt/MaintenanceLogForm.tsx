import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { smtService } from '@/services/smtService'
import { SmtEquipment, SmtMaintenanceLog } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  equipmentId: z.string().min(1, 'Equipamento é obrigatório'),
  type: z.enum(['preventive', 'corrective'], {
    required_error: 'Tipo é obrigatório',
    invalid_type_error: 'Tipo é obrigatório',
  }),
  status: z.enum(['open', 'in_progress', 'finished'], {
    required_error: 'Status é obrigatório',
    invalid_type_error: 'Status é obrigatório',
  }),
  failureDescription: z.string().optional(),
  cause: z.string().optional(),
  actionTaken: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  responsibleUserId: z.string().optional(),
})

interface MaintenanceLogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  equipmentList: SmtEquipment[]
  log?: SmtMaintenanceLog | null
  onSuccess: () => void
}

export function MaintenanceLogForm({
  open,
  onOpenChange,
  projectId,
  equipmentList,
  log,
  onSuccess,
}: MaintenanceLogFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentId: '',
      type: 'corrective',
      status: 'open',
      failureDescription: '',
      cause: '',
      actionTaken: '',
      startAt: '',
      endAt: '',
      responsibleUserId: user?.id || '',
    },
  })

  useEffect(() => {
    if (open) {
      if (log) {
        form.reset({
          equipmentId: log.equipmentId,
          type: log.type,
          status: log.status,
          failureDescription: log.failureDescription || '',
          cause: log.cause || '',
          actionTaken: log.actionTaken || '',
          startAt: log.startAt
            ? new Date(log.startAt).toISOString().slice(0, 16)
            : '',
          endAt: log.endAt
            ? new Date(log.endAt).toISOString().slice(0, 16)
            : '',
          responsibleUserId: log.responsibleUserId || user?.id,
        })
      } else {
        form.reset({
          equipmentId: '',
          type: 'corrective',
          status: 'open',
          failureDescription: '',
          cause: '',
          actionTaken: '',
          startAt: new Date().toISOString().slice(0, 16),
          endAt: '',
          responsibleUserId: user?.id,
        })
      }
    }
  }, [open, log, user, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const payload = {
        projectId,
        equipmentId: values.equipmentId,
        type: values.type,
        status: values.status,
        failureDescription: values.failureDescription,
        cause: values.cause,
        actionTaken: values.actionTaken,
        startAt: values.startAt ? new Date(values.startAt).toISOString() : null,
        endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
        responsibleUserId: values.responsibleUserId,
        preventivePlanId: null, // Logic for preventive plan linking can be added later
      }

      if (log) {
        await smtService.updateMaintenanceLog(log.id, payload, user.id)
        toast.success('Registro atualizado!')
      } else {
        await smtService.createMaintenanceLog(payload, user.id)
        toast.success('Registro criado!')
      }
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {log ? 'Editar Manutenção' : 'Registrar Manutenção'}
          </DialogTitle>
          <DialogDescription>
            Registre o período, o tipo e os detalhes do serviço de manutenção.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="equipmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipamento</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!log}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o equipamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {equipmentList.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name} ({eq.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corrective">Corretiva</SelectItem>
                        <SelectItem value="preventive">Preventiva</SelectItem>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Execução</SelectItem>
                        <SelectItem value="finished">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="failureDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Falha / Serviço</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cause"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Causa Raiz</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[60px]" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionTaken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ação Tomada</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[60px]" />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
