import { FormEvent, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  CurrentSealState,
  RegisterSealEventInput,
  SealEventType,
} from '@/lib/seal-management'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const eventTypeOptions: { value: SealEventType; label: string }[] = [
  { value: 'initial_installation', label: 'Instalação inicial' },
  { value: 'authorized_break', label: 'Rompimento autorizado' },
  { value: 'removal', label: 'Retirada' },
  { value: 'replacement', label: 'Substituição' },
  { value: 'reinstallation', label: 'Reinstalação' },
  { value: 'damaged', label: 'Lacre danificado' },
  { value: 'lost', label: 'Lacre extraviado' },
  { value: 'inspection', label: 'Inspeção sem alteração' },
  { value: 'other', label: 'Outro' },
]

const removalTypes = new Set<SealEventType>([
  'authorized_break',
  'removal',
  'replacement',
  'reinstallation',
  'damaged',
  'lost',
])

const installationTypes = new Set<SealEventType>([
  'initial_installation',
  'replacement',
  'reinstallation',
])

const toLocalDateTime = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

const parseSealList = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

interface SealEventDialogProps {
  point: CurrentSealState
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: RegisterSealEventInput) => Promise<void>
}

export function SealEventDialog({
  point,
  open,
  onOpenChange,
  onSubmit,
}: SealEventDialogProps) {
  const defaultType: SealEventType =
    point.currentSealNumbers.length === 0
      ? 'initial_installation'
      : 'replacement'
  const [eventType, setEventType] = useState<SealEventType>(defaultType)
  const [removedSeals, setRemovedSeals] = useState(
    point.currentSealNumbers.join(', '),
  )
  const [installedSeals, setInstalledSeals] = useState('')
  const [effectiveAt, setEffectiveAt] = useState(toLocalDateTime)
  const [responsibleName, setResponsibleName] = useState('Operador de campo')
  const [removalReason, setRemovalReason] = useState('')
  const [finalPosition, setFinalPosition] = useState(point.requiredPosition)
  const [observations, setObservations] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showsRemoval = removalTypes.has(eventType)
  const showsInstallation = installationTypes.has(eventType)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        sealPointId: point.id,
        eventType,
        removedSeals: showsRemoval ? parseSealList(removedSeals) : [],
        installedSeals: showsInstallation ? parseSealList(installedSeals) : [],
        effectiveAt: new Date(effectiveAt).toISOString(),
        removalReason: showsRemoval ? removalReason : undefined,
        responsibleName:
          showsRemoval || showsInstallation ? responsibleName : undefined,
        finalPosition: showsInstallation ? finalPosition : undefined,
        observations,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle className="text-xl">Registrar evento</DialogTitle>
            <DialogDescription>
              {point.tankTag} · {point.componentName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seal-event-type">Tipo de evento</Label>
              <Select
                value={eventType}
                onValueChange={(value) => setEventType(value as SealEventType)}
              >
                <SelectTrigger id="seal-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seal-effective-at">Data e hora</Label>
              <Input
                id="seal-effective-at"
                type="datetime-local"
                value={effectiveAt}
                onChange={(event) => setEffectiveAt(event.target.value)}
                required
              />
            </div>

            {showsRemoval ? (
              <div className="space-y-2">
                <Label htmlFor="removed-seals">Lacres retirados</Label>
                <Input
                  id="removed-seals"
                  value={removedSeals}
                  onChange={(event) => setRemovedSeals(event.target.value)}
                  placeholder="Separe múltiplos lacres por vírgula"
                  required
                />
              </div>
            ) : null}

            {showsInstallation ? (
              <div className="space-y-2">
                <Label htmlFor="installed-seals">Novos lacres</Label>
                <Input
                  id="installed-seals"
                  value={installedSeals}
                  onChange={(event) => setInstalledSeals(event.target.value)}
                  placeholder="Ex.: 1627753"
                  required
                />
              </div>
            ) : null}

            {showsRemoval || showsInstallation ? (
              <div className="space-y-2">
                <Label htmlFor="seal-responsible">Responsável</Label>
                <Input
                  id="seal-responsible"
                  value={responsibleName}
                  onChange={(event) => setResponsibleName(event.target.value)}
                  required
                />
              </div>
            ) : null}

            {showsRemoval ? (
              <div className="space-y-2">
                <Label htmlFor="removal-reason">Motivo da retirada</Label>
                <Input
                  id="removal-reason"
                  value={removalReason}
                  onChange={(event) => setRemovalReason(event.target.value)}
                  placeholder="Ex.: manutenção programada"
                  required
                />
              </div>
            ) : null}

            {showsInstallation ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="final-position">Posição final</Label>
                <Input
                  id="final-position"
                  value={finalPosition}
                  onChange={(event) => setFinalPosition(event.target.value)}
                  required
                />
                <p className="text-xs text-slate-500">
                  Posição requerida: {point.requiredPosition}
                </p>
              </div>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="seal-observations">Observações</Label>
              <Textarea
                id="seal-observations"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Contexto operacional, ordem de serviço ou ressalvas"
                className="min-h-24 resize-y"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 px-6 py-4">
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
              className="bg-teal-700 hover:bg-teal-800"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Registrar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const sealEventTypeLabels = Object.fromEntries(
  eventTypeOptions.map((option) => [option.value, option.label]),
) as Record<SealEventType, string>
