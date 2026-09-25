import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { smtService } from '@/services/smtService'
import { sbpService } from '@/services/sbpService'
import { SmtEquipment, SbpAsset } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().optional(),
  location: z.string().optional(),
  costCenter: z.string().optional(),
  status: z.enum(['active', 'in_maintenance', 'inactive', 'scrapped', 'new']),
  sbpAssetId: z.string().optional(),
  parentId: z.string().optional(),
})

interface EquipmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  equipment?: SmtEquipment | null
  equipmentList: SmtEquipment[]
  onSuccess: () => void
}

export function EquipmentForm({
  open,
  onOpenChange,
  projectId,
  equipment,
  equipmentList,
  onSuccess,
}: EquipmentFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assets, setAssets] = useState<SbpAsset[]>([])
  const [parentOpen, setParentOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      category: 'Outro',
      manufacturer: '',
      model: '',
      serialNumber: '',
      acquisitionDate: '',
      location: '',
      costCenter: '',
      status: 'active',
      sbpAssetId: 'none',
      parentId: 'none',
    },
  })

  // Watch for changes in sbpAssetId to auto-fill code
  const watchedSbpAssetId = form.watch('sbpAssetId')

  useEffect(() => {
    if (open) {
      sbpService.getAssets(projectId).then(setAssets)
      if (equipment) {
        form.reset({
          code: equipment.code,
          name: equipment.name,
          category: equipment.category,
          manufacturer: equipment.manufacturer || '',
          model: equipment.model || '',
          serialNumber: equipment.serialNumber || '',
          acquisitionDate: equipment.acquisitionDate || '',
          location: equipment.location || '',
          costCenter: equipment.costCenter || '',
          status: equipment.status,
          sbpAssetId: equipment.sbpAssetId || 'none',
          parentId: equipment.parentId || 'none',
        })
      } else {
        form.reset({
          code: '',
          name: '',
          category: 'Outro',
          manufacturer: '',
          model: '',
          serialNumber: '',
          acquisitionDate: '',
          location: '',
          costCenter: '',
          status: 'new',
          sbpAssetId: 'none',
          parentId: 'none',
        })
      }
    }
  }, [open, equipment, projectId, form])

  // Sync Code with SBP Asset Number
  useEffect(() => {
    if (watchedSbpAssetId && watchedSbpAssetId !== 'none') {
      const asset = assets.find((a) => a.id === watchedSbpAssetId)
      if (asset) {
        form.setValue('code', asset.assetNumber)
      }
    }
  }, [watchedSbpAssetId, assets, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const payload = {
        projectId,
        code: values.code,
        name: values.name,
        category: values.category,
        manufacturer: values.manufacturer,
        model: values.model,
        serialNumber: values.serialNumber,
        acquisitionDate: values.acquisitionDate || null,
        location: values.location,
        costCenter: values.costCenter,
        status: values.status,
        sbpAssetId: values.sbpAssetId === 'none' ? null : values.sbpAssetId,
        parentId: values.parentId === 'none' ? null : values.parentId,
      }

      if (equipment) {
        await smtService.updateEquipment(equipment.id, payload, user.id)
        toast.success('Equipamento atualizado!')
      } else {
        await smtService.createEquipment(payload, user.id)
        toast.success('Equipamento criado!')
      }
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const parentOptions = equipment
    ? equipmentList.filter((e) => e.id !== equipment.id)
    : equipmentList

  const isCodeDisabled = !!watchedSbpAssetId && watchedSbpAssetId !== 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipment ? 'Editar Equipamento' : 'Novo Equipamento'}
          </DialogTitle>
          <DialogDescription>
            Cadastre a identificação, a hierarquia e a situação operacional do
            equipamento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isCodeDisabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Equipamento Pai (Opcional)</FormLabel>
                  <Popover open={parentOpen} onOpenChange={setParentOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value && field.value !== 'none'
                            ? parentOptions.find((e) => e.id === field.value)
                                ?.name
                            : 'Selecione um equipamento pai...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar equipamento..." />
                        <CommandList>
                          <CommandEmpty>
                            Nenhum equipamento encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                field.onChange('none')
                                setParentOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === 'none'
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              Nenhum
                            </CommandItem>
                            {parentOptions.map((eq) => (
                              <CommandItem
                                key={eq.id}
                                value={eq.name}
                                onSelect={() => {
                                  field.onChange(eq.id)
                                  setParentOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === eq.id
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {eq.name} ({eq.code})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="Bomba">Bomba</SelectItem>
                        <SelectItem value="Motor">Motor</SelectItem>
                        <SelectItem value="Compressor">Compressor</SelectItem>
                        <SelectItem value="Válvula">Válvula</SelectItem>
                        <SelectItem value="Instrumento">Instrumento</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
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
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="in_maintenance">
                          Em Manutenção
                        </SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="scrapped">Sucateado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fabricante</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº Série</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
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
            </div>
            <FormField
              control={form.control}
              name="sbpAssetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a Bem Patrimonial (SBP)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ativo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.assetNumber} - {asset.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
