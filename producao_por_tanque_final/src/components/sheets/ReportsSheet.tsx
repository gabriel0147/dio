import { useState, useEffect, useCallback } from 'react'
import { useProject } from '@/context/ProjectContext'
import { DailyProductionReport } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DailyReportView } from '@/components/reports/DailyReportView'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ReportsSheetProps {
  sheetId: string
}

export function ReportsSheet({ sheetId }: ReportsSheetProps) {
  const { getReports, currentProjectRole } = useProject()
  const [activeTab, setActiveTab] = useState('daily')
  const [reportsHistory, setReportsHistory] = useState<DailyProductionReport[]>(
    [],
  )
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(
    null,
  )
  const [selectedHistoryWellId, setSelectedHistoryWellId] = useState<
    string | undefined
  >()

  const tankId = sheetId.replace('reports-', '')
  const isViewer = currentProjectRole === 'viewer'

  const loadHistory = useCallback(async () => {
    const reports = await getReports(tankId)
    setReportsHistory(reports)
  }, [getReports, tankId])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, loadHistory])

  const handleViewReport = (report: DailyProductionReport) => {
    // Parse date ensuring timezone consistency (simple YYYY-MM-DD)
    const [y, m, d] = report.reportDate.split('-').map(Number)
    const date = new Date(y, m - 1, d, 12, 0, 0)
    setSelectedHistoryDate(date)
    setSelectedHistoryWellId(report.wellId)
    setActiveTab('daily')
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Relatórios Consolidados
        </h2>
        <p className="text-muted-foreground">
          Fechamento diário e histórico de produção.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="daily">
            Relatório Diário{' '}
            {selectedHistoryDate ? '(Visualização)' : '(Atual)'}
          </TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <DailyReportView
            tankId={tankId}
            initialDate={selectedHistoryDate || new Date()}
            initialWellId={selectedHistoryWellId}
            onClearSelection={() => {
              setSelectedHistoryDate(null)
              setSelectedHistoryWellId(undefined)
            }}
            isViewer={isViewer}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Fechamentos</CardTitle>
              <CardDescription>
                Lista de relatórios de produção diária já consolidados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data do Relatório</TableHead>
                    <TableHead>Poço</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Prod. Poço (m³)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fechado em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        Nenhum relatório fechado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportsHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {format(
                            new Date(report.reportDate + 'T12:00:00'),
                            'dd/MM/yyyy',
                          )}
                        </TableCell>
                        <TableCell>
                          {report.wellName || 'Não identificado'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(
                            new Date(report.startDatetime),
                            'dd/MM HH:mm',
                          )}{' '}
                          -{' '}
                          {format(new Date(report.endDatetime), 'dd/MM HH:mm')}
                        </TableCell>
                        <TableCell>
                          {report.calculatedWellProductionM3.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Fechado</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {report.closedAt
                            ? format(
                                new Date(report.closedAt),
                                'dd/MM/yyyy HH:mm',
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
