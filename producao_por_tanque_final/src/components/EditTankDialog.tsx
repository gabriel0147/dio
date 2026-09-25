import { useState, useEffect, useMemo } from 'react'
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
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { Tank } from '@/lib/types'

const formSchema = z.object({
  tag: z.string().min(1, 'Tag é obrigatória'),
  productionFieldId: z.string().min(1, 'Campo de Produção é obrigatório'),
  wellId: z.string().optional(),
  geolocation: z.string().min(1, 'Geolocalização é obrigatória'),
  reason: z.string().min(5, 'O motivo é obrigatório e deve ser detalhado'),
})

interface EditTankDialogProps {
  tank: Tank
}

export function EditTankDialog({ tank }: EditTankDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateTank, productionFields, wells } = useProject()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tag: tank.tag,
      productionFieldId: tank.productionFieldId,
      wellId: tank.wellId || '',
      geolocation: tank.geolocation,
      reason: '',
    },
  })

  // Reset form when tank changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        tag: tank.tag,
        productionFieldId: tank.productionFieldId,
        wellId: tank.wellId || '',
        geolocation: tank.geolocation,
        reason: '',
      })
    }
  }, [open, tank, form])

  const selectedProductionFieldId = form.watch('productionFieldId')

  const filteredWells = useMemo(() => {
    if (!selectedProductionFieldId) return []
    return wells.filter(
      (w) => w.productionFieldId === selectedProductionFieldId,
    )
  }, [selectedProductionFieldId, wells])

  // Reset well if production field changes
  useEffect(() => {
    const currentWellId = form.getValues('wellId')
    if (currentWellId) {
      const well = wells.find((w) => w.id === currentWellId)
      if (well && well.productionFieldId !== selectedProductionFieldId) {
        form.setValue('wellId', '')
      }
    }
  }, [selectedProductionFieldId, wells, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      await updateTank(
        tank.id,
        {
          tag: values.tag,
          productionFieldId: values.productionFieldId,
          wellId: values.wellId || undefined,
          geolocation: values.geolocation,
        },
        values.reason,
      )
      setOpen(false)
    } catch {
      // Error handled in context
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          title="Editar Tanque"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Tanque {tank.tag}</DialogTitle>
          <DialogDescription>
            Atualize os detalhes do tanque. O motivo é obrigatório para
            auditoria.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag do Tanque</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productionFieldId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campo de Produção</FormLabel>
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
                      {productionFields.map((pf) => (
                        <SelectItem key={pf.id} value={pf.id}>
                          {pf.name}
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
                    value={field.value}
                    disabled={!selectedProductionFieldId}
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
            <FormField
              control={form.control}
              name="geolocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geolocalização</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Alteração (Obrigatório)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da alteração..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
