import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { WellBSWRecord } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Droplets, TestTube } from 'lucide-react'

interface RecentBSWTableProps {
  data: WellBSWRecord[]
  isLoading: boolean
}

export function RecentBSWTable({ data, isLoading }: RecentBSWTableProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
        Carregando dados recentes...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhum dado de BSW encontrado.
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Data</TableHead>
            <TableHead>Poço</TableHead>
            <TableHead className="text-right">BSW Emulsão (%)</TableHead>
            <TableHead className="text-right">BSW Total (%)</TableHead>
            <TableHead className="text-center">Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record) => (
            <TableRow key={record.id} className="hover:bg-muted/30">
              <TableCell className="text-sm">
                {format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell className="font-medium">{record.wellName}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {record.bswEmulsionPct.toFixed(6)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {record.bswTotalPct.toFixed(6)}
              </TableCell>
              <TableCell className="text-center">
                {record.origin === 'Teste' ? (
                  <Badge
                    variant="secondary"
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 gap-1 pl-1 pr-2"
                  >
                    <TestTube className="h-3 w-3" />
                    Teste
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pl-1 pr-2"
                  >
                    <Droplets className="h-3 w-3" />
                    Lançado
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
