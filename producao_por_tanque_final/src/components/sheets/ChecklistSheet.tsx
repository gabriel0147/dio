import { useState, useEffect, useCallback } from 'react'
import { useProject } from '@/context/ProjectContext'
import { ChecklistForm } from '@/components/checklist/ChecklistForm'
import { Button } from '@/components/ui/button'
import {
  Plus,
  List,
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { checklistService } from '@/services/checklistService'
import { WellChecklist } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface ChecklistSheetProps {
  sheetId: string
}

export function ChecklistSheet({ sheetId }: ChecklistSheetProps) {
  const { currentProject } = useProject()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [history, setHistory] = useState<WellChecklist[]>([])
  const [loading, setLoading] = useState(false)

  // extract tankId from sheetId e.g. "check-UUID"
  const tankId = sheetId.replace('check-', '')
  const tank = currentProject?.tanks.find((t) => t.id === tankId)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await checklistService.getChecklists(tankId)
      setHistory(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [tankId])

  useEffect(() => {
    if (view === 'list') {
      loadHistory()
    }
  }, [view, loadHistory])

  const handleSuccess = () => {
    setView('list')
  }

  if (view === 'form') {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => setView('list')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
        </Button>
        <div className="bg-background rounded-lg border p-4 mb-4 shadow-sm">
          <h2 className="text-xl font-bold">Novo Checklist - {tank?.tag}</h2>
          <p className="text-muted-foreground text-sm">
            Preencha os dados do dia.
          </p>
        </div>
        <ChecklistForm tankId={tankId} onSuccess={handleSuccess} />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Checklist Operacional
          </h2>
          <p className="text-muted-foreground">
            Histórico de verificações diárias do tanque {tank?.tag}.
          </p>
        </div>
        <Button
          onClick={() => setView('form')}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-5 w-5" /> Novo Checklist
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Status Equip.</TableHead>
              <TableHead>Segurança</TableHead>
              <TableHead className="text-right">Horas Op.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  <List className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum checklist registrado.</p>
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(item.date), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {item.userId.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.pumpingUnitOn ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          ON
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-500"
                        >
                          OFF
                        </Badge>
                      )}
                      {!item.anomalyNone && (
                        <Badge variant="destructive">Anomalia</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.safetyEpi &&
                    item.safetyAreaSafe &&
                    !item.safetyLeakVisible ? (
                      <span className="text-green-600 flex items-center gap-1 text-sm">
                        <CheckCircle className="h-3 w-3" /> OK
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1 text-sm font-bold">
                        <AlertTriangle className="h-3 w-3" /> RISCO
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.hoursOperating}h
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
