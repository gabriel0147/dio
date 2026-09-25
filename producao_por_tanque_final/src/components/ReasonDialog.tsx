import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  title?: string
  description?: string
  loading?: boolean
  confirmLabel?: string
  cancelLabel?: string
}

export function ReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Motivo da Alteração',
  description = 'Por favor, informe o motivo desta alteração para fins de auditoria.',
  loading = false,
  confirmLabel,
  cancelLabel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason)
      setReason('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo (Obrigatório)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da alteração..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel || 'Cancelar'}
          </Button>
          <Button onClick={handleConfirm} disabled={!reason.trim() || loading}>
            {loading ? 'Salvando...' : confirmLabel || 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
