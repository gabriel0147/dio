import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, StopCircle, Eye, Pencil, Trash2 } from 'lucide-react'
import { SrtTankSession } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

interface SessionListProps {
  sessions: SrtTankSession[]
  onCloseSession?: (id: string) => void
  onViewSession?: (id: string) => void
  onEditSession?: (session: SrtTankSession) => void
  onDeleteSession?: (session: SrtTankSession) => void
}

export function SessionList({
  sessions,
  onCloseSession,
  onViewSession,
  onEditSession,
  onDeleteSession,
}: SessionListProps) {
  const navigate = useNavigate()

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        Nenhum planejamento encontrado.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanque</TableHead>
            <TableHead>Poço</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const isOpen = !session.endAt
            return (
              <TableRow key={session.id}>
                <TableCell className="font-medium">
                  {session.tankName}
                </TableCell>
                <TableCell>{session.wellName || '-'}</TableCell>
                <TableCell>
                  {format(parseISO(session.startAt), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  {session.endAt
                    ? format(parseISO(session.endAt), 'dd/MM/yyyy HH:mm')
                    : '-'}
                </TableCell>
                <TableCell>{session.responsibleUserName || 'N/A'}</TableCell>
                <TableCell>
                  {isOpen ? (
                    <Badge className="bg-green-600 animate-pulse">Aberto</Badge>
                  ) : (
                    <Badge variant="secondary">Concluído</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onViewSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewSession(session.id)}
                        title="Ver Detalhes e Medições"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    )}
                    {onEditSession && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditSession(session)}
                        title="Editar planejamento"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    )}
                    {isOpen && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() =>
                          navigate(`/srt/tests/new?sessionId=${session.id}`)
                        }
                      >
                        <Play className="h-3 w-3 mr-1" /> Lançar Teste
                      </Button>
                    )}
                    {isOpen && onCloseSession && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onCloseSession(session.id)}
                      >
                        <StopCircle className="h-3 w-3 mr-1" /> Concluir
                      </Button>
                    )}
                    {onDeleteSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSession(session)}
                        className="text-destructive hover:text-destructive/90"
                        title="Excluir planejamento"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
