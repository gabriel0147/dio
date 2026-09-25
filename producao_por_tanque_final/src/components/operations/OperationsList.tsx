import { useMemo, useState } from 'react'
import { TankOperation } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface OperationsListProps {
  operations: TankOperation[]
  onDelete?: (id: string) => void
  onEdit?: (op: TankOperation) => void
}

// Helper to format date string exactly as saved (preserving input representation)
const formatDateAsSaved = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const [datePart, timePartWithOffset] = dateStr.split(/[T ]/)
    if (!datePart || !timePartWithOffset) return dateStr

    const [year, month, day] = datePart.split('-')
    const [hour, minute] = timePartWithOffset.split(':')

    return `${day}/${month}/${year} ${hour}:${minute}`
  } catch {
    return dateStr
  }
}

export function OperationsList({
  operations,
  onDelete,
  onEdit,
}: OperationsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedOps = useMemo(() => {
    return [...operations].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    )
  }, [operations])

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = () => {
    if (deletingId && onDelete) {
      onDelete(deletingId)
      setDeletingId(null)
    }
  }

  if (operations.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Nenhuma operação registrada.
      </div>
    )
  }

  const deletingOp = operations.find((op) => op.id === deletingId)
  // Only show action column if at least one action is available
  const showActions = !!onDelete || !!onEdit

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Temp. (°C)</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Níveis (mm)</TableHead>
              <TableHead>Vol. Líq (m³)</TableHead>
              <TableHead>Vol. Corr. (m³)</TableHead>
              {showActions && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOps.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="text-xs">
                  <div>I: {formatDateAsSaved(op.startTime)}</div>
                  <div className="text-muted-foreground">
                    F: {formatDateAsSaved(op.endTime)}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      (op.type === 'production' ||
                        op.type === 'stock_variation') &&
                        'bg-green-100 text-green-800',
                      op.type === 'drainage' && 'bg-blue-100 text-blue-800',
                      op.type === 'transfer' && 'bg-orange-100 text-orange-800',
                    )}
                  >
                    {op.type === 'production'
                      ? 'Prod. (Legado)'
                      : op.type === 'stock_variation'
                        ? 'Var. Estoque'
                        : op.type === 'drainage'
                          ? 'Drenagem'
                          : 'Transf.'}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {op.tempFluidC !== undefined && op.tempFluidC !== null
                    ? op.tempFluidC.toFixed(1)
                    : '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {op.transferDestination || '-'}
                </TableCell>
                <TableCell className="text-xs">
                  <div>I: {op.initialLevelMm}</div>
                  <div>F: {op.finalLevelMm}</div>
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {op.volumeM3?.toFixed(3)}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {op.volumeCorrectedM3?.toFixed(3)}
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(op)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(op.id)}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente a operação de{' '}
              {deletingOp?.type === 'production'
                ? 'Produção'
                : deletingOp?.type === 'stock_variation'
                  ? 'Estoque'
                  : deletingOp?.type === 'drainage'
                    ? 'Drenagem'
                    : 'Transferência'}{' '}
              realizada em{' '}
              {deletingOp ? formatDateAsSaved(deletingOp.endTime) : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
