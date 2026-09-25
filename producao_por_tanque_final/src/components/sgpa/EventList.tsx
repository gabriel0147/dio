import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SgpaEvent } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'

interface EventListProps {
  events: SgpaEvent[]
  onEdit: (event: SgpaEvent) => void
  onDelete?: (id: string) => void
}

export function EventList({ events, onEdit, onDelete }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-md">
        Nenhum evento registrado.
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-red-600 animate-pulse">ABERTO</Badge>
      case 'CLOSED':
        return <Badge variant="secondary">FECHADO</Badge>
      case 'CANCELLED':
        return <Badge variant="outline">CANCELADO</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Poço</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Causa</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Duração (min)</TableHead>
            <TableHead className="text-right">Perda (m³)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((ev) => (
            <TableRow key={ev.id}>
              <TableCell>
                {format(parseISO(ev.eventDate), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="font-medium">{ev.wellName}</TableCell>
              <TableCell>
                <Badge
                  variant={ev.eventType === 'STOP' ? 'destructive' : 'default'}
                >
                  {ev.eventType}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-xs">
                  <span className="font-semibold block">{ev.category}</span>
                  <span className="text-muted-foreground">{ev.causeName}</span>
                </div>
              </TableCell>
              <TableCell>
                {format(parseISO(ev.startAt), 'dd/MM HH:mm')}
              </TableCell>
              <TableCell>
                {ev.endAt ? format(parseISO(ev.endAt), 'dd/MM HH:mm') : '-'}
              </TableCell>
              <TableCell>{ev.durationMin || '-'}</TableCell>
              <TableCell className="text-right">
                {ev.estimatedLossM3 !== undefined && ev.estimatedLossM3 !== null
                  ? `${ev.estimatedLossM3.toFixed(2)} m³`
                  : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(ev.status)}</TableCell>
              <TableCell>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(ev)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(ev.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
