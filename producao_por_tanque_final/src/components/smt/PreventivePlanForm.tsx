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
import { smtService } from '@/services/smtService'
import { SmtEquipment, SmtPreventivePlan } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  equipmentId: z.string().min(1, 'Equipamento é obrigatório'),
  periodicityType: z.enum(['days', 'hours']),
  interval: z.coerce.number().min(1, 'Intervalo deve ser maior que 0'),
  nextScheduledDate: z.string().optional(),
})

interface PreventivePlanFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  equipmentList: SmtEquipment[]
  plan?: SmtPreventivePlan | null
  onSuccess: () => void
}

export function PreventivePlanForm({
  open,
  onOpenChange,
  projectId,
  equipmentList,
  plan,
  onSuccess,
}: PreventivePlanFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentId: '',
      periodicityType: 'days',
      interval: 30,
      nextScheduledDate: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (plan) {
        form.reset({
          equipmentId: plan.equipmentId,
          periodicityType: plan.periodicityType,
          interval: plan.interval,
          nextScheduledDate: plan.nextScheduledDate || '',
        })
      } else {
        form.reset({
          equipmentId: '',
          periodicityType: 'days',
          interval: 30,
          nextScheduledDate: '',
        })
      }
    }
  }, [open, plan, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const payload = {
        projectId,
        equipmentId: values.equipmentId,
        periodicityType: values.periodicityType,
        interval: values.interval,
        nextScheduledDate: values.nextScheduledDate || null,
        checklist: {}, // Default empty checklist for now
      }

      if (plan) {
        await smtService.updatePreventivePlan(plan.id, payload, user.id)
        toast.success('Plano preventivo atualizado!')
      } else {
        await smtService.createPreventivePlan(payload, user.id)
        toast.success('Plano preventivo criado!')
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {plan ? 'Editar Plano Preventivo' : 'Novo Plano Preventivo'}
          </DialogTitle>
          <DialogDescription>
            Defina o equipamento, a periodicidade e o checklist preventivo.
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
                    defaultValue={field.value}
                    disabled={!!plan}
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
                name="periodicityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodicidade</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="hours">Horas de Operação</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="nextScheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima Data Planejada</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
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
