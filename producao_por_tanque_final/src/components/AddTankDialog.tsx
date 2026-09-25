import { useState, useMemo, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  tag: z.string().min(1, 'Tag é obrigatória'),
  productionFieldId: z.string().min(1, 'Campo de Produção é obrigatório'),
  wellId: z.string().optional(),
  geolocation: z.string().min(1, 'Geolocalização é obrigatória'),
})

interface AddTankDialogProps {
  className?: string
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
}

export function AddTankDialog({
  className,
  variant = 'default',
}: AddTankDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currentProject, addTank, productionFields, wells } = useProject()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tag: '',
      productionFieldId: '',
      wellId: '',
      geolocation: '',
    },
  })

  const selectedProductionFieldId = form.watch('productionFieldId')

  const filteredWells = useMemo(() => {
    if (!selectedProductionFieldId) return []
    return wells.filter(
      (w) => w.productionFieldId === selectedProductionFieldId,
    )
  }, [selectedProductionFieldId, wells])

  // Reset well if production field changes
  useEffect(() => {
    form.setValue('wellId', '')
  }, [selectedProductionFieldId, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentProject) return

    setIsSubmitting(true)
    try {
      await addTank(currentProject.id, {
        tag: values.tag,
        productionFieldId: values.productionFieldId,
        productionField: '', // Will be resolved by backend/service
        wellId: values.wellId || undefined,
        geolocation: values.geolocation,
      })
      setOpen(false)
      form.reset()
    } catch {
      // Error is handled in context/service with toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={variant}
          className={cn('w-full justify-start', className)}
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar Tanque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Tanque</DialogTitle>
          <DialogDescription>
            Insira os detalhes do novo tanque para o projeto.
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
                    <Input placeholder="Ex: TQ-02" {...field} />
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
                    <Input
                      placeholder="Ex: Campo Beta, Plataforma 2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Tanque'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
