import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Power, PowerOff, Ruler } from 'lucide-react'
import { SrtMobileTank } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

interface TankListProps {
  tanks: SrtMobileTank[]
  onEdit: (tank: SrtMobileTank) => void
  onToggleActive: (tank: SrtMobileTank) => void
}

export function TankList({ tanks, onEdit, onToggleActive }: TankListProps) {
  const navigate = useNavigate()

  if (tanks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        Nenhum tanque móvel cadastrado.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Capacidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tanks.map((tank) => (
            <TableRow key={tank.id}>
              <TableCell className="font-medium">{tank.tankName}</TableCell>
              <TableCell>
                {tank.capacity} {tank.unit}
              </TableCell>
              <TableCell>
                {tank.active ? (
                  <Badge className="bg-green-600">Ativo</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate"
                title={tank.notes || ''}
              >
                {tank.notes || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigate(`/srt/tanks/${tank.id}/calibration`)
                    }
                    title="Tabela de Arqueação"
                  >
                    <Ruler className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(tank)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleActive(tank)}
                    title={tank.active ? 'Desativar' : 'Ativar'}
                    className={
                      tank.active ? 'text-destructive' : 'text-green-600'
                    }
                  >
                    {tank.active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
