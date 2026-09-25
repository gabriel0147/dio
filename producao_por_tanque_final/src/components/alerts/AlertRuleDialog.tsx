import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertRule } from '@/lib/types'
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

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  metricField: z.string().min(1, 'Métrica é obrigatória'),
  condition: z.enum(['gt', 'lt', 'eq', 'neq'], {
    required_error: 'Condição é obrigatória',
  }),
  thresholdValue: z.coerce.number({ invalid_type_error: 'Deve ser um número' }),
})

interface AlertRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: AlertRule | null
  onSave: (data: any) => void
}

export function AlertRuleDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: AlertRuleDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      metricField: 'corrected_oil_volume_m3',
      condition: 'gt',
      thresholdValue: 0,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        metricField: initialData.metricField,
        condition: initialData.condition,
        thresholdValue: initialData.thresholdValue,
      })
    } else {
      form.reset({
        name: '',
        metricField: 'corrected_oil_volume_m3',
        condition: 'gt',
        thresholdValue: 0,
      })
    }
  }, [initialData, form, open])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Regra' : 'Nova Regra de Alerta'}
          </DialogTitle>
          <DialogDescription>
            Defina a métrica, a condição e o valor que deve disparar o alerta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Regra</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Alerta de BSW Alto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metricField"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Métrica</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a métrica" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="corrected_oil_volume_m3">
                        Óleo Corrigido (m³)
                      </SelectItem>
                      <SelectItem value="uncorrected_oil_volume_m3">
                        Óleo Sem Correção (m³)
                      </SelectItem>
                      <SelectItem value="total_bsw_percent">
                        BSW Total (%)
                      </SelectItem>
                      <SelectItem value="emulsion_bsw_percent">
                        BSW Emulsão (%)
                      </SelectItem>
                      <SelectItem value="drained_volume_m3">
                        Volume Drenado (m³)
                      </SelectItem>
                      <SelectItem value="transferred_volume_m3">
                        Volume Transferido (m³)
                      </SelectItem>
                      <SelectItem value="stock_variation">
                        Variação de Estoque (m³)
                      </SelectItem>
                      <SelectItem value="calculated_well_production_m3">
                        Produção Poço (m³)
                      </SelectItem>
                      <SelectItem value="fluid_temp_c">
                        Temperatura Fluido (°C)
                      </SelectItem>
                      <SelectItem value="fcv">FCV</SelectItem>
                      <SelectItem value="fe">FE</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condição</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gt">Maior que (&gt;)</SelectItem>
                        <SelectItem value="lt">Menor que (&lt;)</SelectItem>
                        <SelectItem value="eq">Igual a (=)</SelectItem>
                        <SelectItem value="neq">Diferente de (!=)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thresholdValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Limiar</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
