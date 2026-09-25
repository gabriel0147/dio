import { useState } from 'react'
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
import { sbpService } from '@/services/sbpService'
import { SbpAsset } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

const formSchema = z.object({
  assetNumber: z.string().min(1, 'Nº do Ativo é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  acquisitionDate: z.string().optional(),
  acquisitionValue: z.coerce.number().optional(),
  estimatedUsefulLife: z.coerce.number().optional(),
  location: z.string().optional(),
  responsible: z.string().optional(),
  situation: z.enum(['active', 'in_use', 'idle', 'retired']),
})

interface AssetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  asset?: SbpAsset | null
  onSuccess: () => void
}

export function AssetForm({
  open,
  onOpenChange,
  projectId,
  asset,
  onSuccess,
}: AssetFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetNumber: '',
      description: '',
      category: 'Equipamento',
      acquisitionDate: '',
      acquisitionValue: 0,
      estimatedUsefulLife: 0,
      location: '',
      responsible: '',
      situation: 'active',
    },
  })

  useEffect(() => {
    if (open) {
      if (asset) {
        form.reset({
          assetNumber: asset.assetNumber,
          description: asset.description,
          category: asset.category,
          acquisitionDate: asset.acquisitionDate || '',
          acquisitionValue: asset.acquisitionValue || 0,
          estimatedUsefulLife: asset.estimatedUsefulLife || 0,
          location: asset.location || '',
          responsible: asset.responsible || '',
          situation: asset.situation,
        })
      } else {
        form.reset({
          assetNumber: '',
          description: '',
          category: 'Equipamento',
          acquisitionDate: '',
          acquisitionValue: 0,
          estimatedUsefulLife: 0,
          location: '',
          responsible: '',
          situation: 'active',
        })
      }
    }
  }, [open, asset, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const payload = {
        projectId,
        assetNumber: values.assetNumber,
        description: values.description,
        category: values.category,
        acquisitionDate: values.acquisitionDate || null,
        acquisitionValue: values.acquisitionValue || null,
        estimatedUsefulLife: values.estimatedUsefulLife || null,
        location: values.location || null,
        responsible: values.responsible || null,
        situation: values.situation,
      }

      if (asset) {
        await sbpService.updateAsset(asset.id, payload, user.id)
        toast.success('Ativo atualizado!')
      } else {
        await sbpService.createAsset(payload, user.id)
        toast.success('Ativo criado!')
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{asset ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
          <DialogDescription>
            Informe os dados patrimoniais e a situação atual do ativo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº do Ativo (BP)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
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
                        <SelectItem value="Equipamento">Equipamento</SelectItem>
                        <SelectItem value="Veículo">Veículo</SelectItem>
                        <SelectItem value="Imóvel">Imóvel</SelectItem>
                        <SelectItem value="TI">TI</SelectItem>
                        <SelectItem value="Mobiliário">Mobiliário</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="acquisitionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Aquisição</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acquisitionValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedUsefulLife"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vida Útil (anos)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização Física</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="situation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
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
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="in_use">Em Uso</SelectItem>
                        <SelectItem value="idle">Ocioso</SelectItem>
                        <SelectItem value="retired">Baixado</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
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
