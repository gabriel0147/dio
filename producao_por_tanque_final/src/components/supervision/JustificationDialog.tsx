import { useState, useEffect } from 'react'
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

interface JustificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tankTag: string
  type: 'production' | 'checklist'
  existingJustification?: string
  onSave: (text: string) => Promise<void>
}

export function JustificationDialog({
  open,
  onOpenChange,
  tankTag,
  type,
  existingJustification,
  onSave,
}: JustificationDialogProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setText(existingJustification || '')
    }
  }, [open, existingJustification])

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await onSave(text)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificativa - {tankTag}</DialogTitle>
          <DialogDescription>
            Informe o motivo da ausência de{' '}
            {type === 'production' ? 'Produção' : 'Checklist'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="justification">Motivo / Observação</Label>
          <Textarea
            id="justification"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Descreva o motivo..."
            className="mt-2"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? 'Salvando...' : 'Salvar Justificativa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
